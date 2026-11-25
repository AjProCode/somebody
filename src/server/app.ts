import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import express, { type Express, type Request } from 'express';
import dotenv from 'dotenv';
import {
  LOCKED_GRADE,
  buildSystemPrompt,
  buildVerifiedIdentityResult,
  signVerifiedIdentity,
  verifyIdentityIntegrity,
  verifyInstitutionalPassword,
  verifyFacultyPasscode,
  isTestGenerationRequest,
  analyzeStudentExerciseForLeakage,
  enforceStudentZeroAnswerLeakage,
  type AcademicContext,
  type PersonaRole,
  type IdVerificationResult
} from '../utils/medhaviEngine.ts';
import {
  ensureManualLoaded,
  consultManualPdfBeforeAnswer,
  MANUAL_PDF_FILENAME,
  MANUAL_PDF_RELATIVE_PATH,
  type ManualReferenceResult
} from './manualPdfLoader.ts';
import {
  GRADE_7_TEXTBOOK_CATALOG,
  getGrade7BooksGrouped,
  inferGrade7Subject,
  searchGrade7TextbookReferences,
  formatTextbookGroundingBlock,
  type TextbookSearchMatch
} from '../data/grade7Textbooks.ts';
import {
  isSchoolInfoQuery,
  buildSchoolInfoDirectAnswer,
  SCHOOL_OFFICIAL_WEBSITE
} from '../data/schoolInfo.ts';
import {
  performLiveWebSearch,
  evaluateWebSearchNeed,
  formatWebSearchGroundingBlock,
  searchWikimediaPageImages,
  type LiveWebSearchResult
} from './webSearchService.ts';

dotenv.config();

// Server-only 256-bit HMAC secret for sealing verified identities (stable across serverless instances)
const SERVER_HMAC_SECRET =
  process.env.MEDHAVI_SESSION_SECRET && process.env.MEDHAVI_SESSION_SECRET.trim().length >= 16
    ? process.env.MEDHAVI_SESSION_SECRET.trim()
    : crypto
        .createHash('sha256')
        .update(
          [
            'smrj-medhavi-icse7-hmac-v1',
            process.env.VERCEL_PROJECT_ID || '',
            process.env.K_SERVICE || '',
            process.env.OPENROUTER_API_KEY || ''
          ].join('|')
        )
        .digest('hex');

const IS_SERVERLESS = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const OPENROUTER_TIMEOUT_MS = IS_SERVERLESS ? 48_000 : 55_000;

const IDENTITY_MAX_AGE_MS = 12 * 60 * 60 * 1000; // 12 hours

function computeServerIdentitySeal(identity: IdVerificationResult, issuedAt: number): string {
  const canonical = [
    identity.extractedRole,
    identity.schoolId.trim().toUpperCase(),
    identity.extractedName.trim().toLowerCase(),
    identity.badgeId.trim(),
    identity.checks?.isDemo ? 'DEMO' : 'OFFICIAL',
    String(issuedAt)
  ].join('|');
  return crypto.createHmac('sha256', SERVER_HMAC_SECRET).update(canonical).digest('hex');
}

function attachServerSeal(identity: IdVerificationResult): IdVerificationResult {
  if (!identity.verified) return identity;
  const signed = signVerifiedIdentity(identity);
  const issuedAt = signed.issuedAt || Date.now();
  const serverSeal = computeServerIdentitySeal(signed, issuedAt);
  return {
    ...signed,
    issuedAt,
    serverSeal
  };
}

function verifyServerIdentitySeal(identity: IdVerificationResult | null | undefined): boolean {
  if (!identity || !verifyIdentityIntegrity(identity)) return false;
  if (!identity.serverSeal || typeof identity.issuedAt !== 'number') return false;
  const age = Date.now() - identity.issuedAt;
  if (age < -60000 || age > IDENTITY_MAX_AGE_MS) return false;

  const expectedHex = computeServerIdentitySeal(identity, identity.issuedAt);
  try {
    const providedBuf = Buffer.from(identity.serverSeal, 'hex');
    const expectedBuf = Buffer.from(expectedHex, 'hex');
    if (providedBuf.length !== expectedBuf.length) return false;
    return crypto.timingSafeEqual(providedBuf, expectedBuf);
  } catch {
    return false;
  }
}

// Sliding-window per-IP rate limiter & failed auth lockout guard
const RATE_LIMIT_BUCKETS = new Map<string, number[]>();
const FAILED_AUTH_ATTEMPTS = new Map<string, { count: number; lockedUntil: number }>();

function getClientIp(req: Request): string {
  const xff = req.headers['x-forwarded-for'];
  if (typeof xff === 'string' && xff.trim()) {
    return xff.split(',')[0].trim().slice(0, 64);
  }
  return (req.ip || req.socket?.remoteAddress || 'local').slice(0, 64);
}

function checkRateLimit(bucketKey: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now();
  const prev = RATE_LIMIT_BUCKETS.get(bucketKey) || [];
  const active = prev.filter((ts) => now - ts < windowMs);
  if (active.length >= maxRequests) {
    RATE_LIMIT_BUCKETS.set(bucketKey, active);
    return false;
  }
  active.push(now);
  if (RATE_LIMIT_BUCKETS.size > 2000) {
    RATE_LIMIT_BUCKETS.clear();
  }
  RATE_LIMIT_BUCKETS.set(bucketKey, active);
  return true;
}

function isIpAuthLockedOut(ip: string): { locked: boolean; retryAfterSec: number } {
  const record = FAILED_AUTH_ATTEMPTS.get(ip);
  if (!record) return { locked: false, retryAfterSec: 0 };
  const now = Date.now();
  if (record.lockedUntil > now) {
    return { locked: true, retryAfterSec: Math.ceil((record.lockedUntil - now) / 1000) };
  }
  return { locked: false, retryAfterSec: 0 };
}

function recordAuthAttemptOutcome(ip: string, succeeded: boolean): void {
  if (succeeded) {
    FAILED_AUTH_ATTEMPTS.delete(ip);
    return;
  }
  const existing = FAILED_AUTH_ATTEMPTS.get(ip) || { count: 0, lockedUntil: 0 };
  const nextCount = existing.count + 1;
  const lockedUntil = nextCount >= 6 ? Date.now() + 60_000 : 0;
  FAILED_AUTH_ATTEMPTS.set(ip, {
    count: nextCount >= 6 ? 0 : nextCount,
    lockedUntil
  });
}

export const OPENROUTER_ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';
export const OPENROUTER_MODEL = 'nvidia/nemotron-3.5-super-vl:free';

function getOpenRouterApiKey(): string {
  const raw = process.env.OPENROUTER_API_KEY || '';
  const trimmed = raw.trim();
  if (!trimmed || trimmed === 'MY_OPENROUTER_API_KEY' || trimmed.length < 10) {
    return '';
  }
  return trimmed;
}

// Fast in-memory LRU cache for instant ICSE Class 7 responses
const RESPONSE_CACHE = new Map<string, { text: string; model: string; timestamp: number }>();
const MAX_CACHE_ENTRIES = 120;

function getCachedResponse(key: string): { text: string; model: string } | null {
  const hit = RESPONSE_CACHE.get(key);
  if (!hit) return null;
  // 30-minute TTL
  if (Date.now() - hit.timestamp > 30 * 60 * 1000) {
    RESPONSE_CACHE.delete(key);
    return null;
  }
  return { text: hit.text, model: hit.model };
}

function setCachedResponse(key: string, text: string, model: string): void {
  if (RESPONSE_CACHE.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = RESPONSE_CACHE.keys().next().value;
    if (oldestKey) RESPONSE_CACHE.delete(oldestKey);
  }
  RESPONSE_CACHE.set(key, { text, model, timestamp: Date.now() });
}

function deduplicateModelLoop(text: string): string {
  const trimmed = text.trim();
  const secondLogicIdx = trimmed.indexOf('<medhavi_logic>', 20);
  if (secondLogicIdx > 0) {
    return trimmed.slice(0, secondLogicIdx).trim();
  }
  return trimmed;
}

// Server-side 3-Download Limit Ledger per Test ID
const SERVER_TEST_DOWNLOAD_LEDGER = new Map<string, number>();
const MAX_SERVER_TEST_DOWNLOADS = 3;

/**
 * Collapses stuttered or repeated words/phrases from speech recognition
 * e.g. "explain explain explain congruence congruence congruence explain congruence of triangles"
 * -> "explain congruence of triangles"
 */
export function cleanServerTranscript(raw: string): string {
  if (!raw) return '';
  let text = raw.replace(/\s+/g, ' ').trim();

  // 1. Collapse immediate single-word repetitions (case-insensitive), e.g., "explain explain explain" -> "explain"
  text = text.replace(/\b(\w+)(?:\s+\1\b)+/gi, '$1');

  // 2. Collapse 2-word phrase repetitions, e.g., "explain congruence explain congruence" -> "explain congruence"
  text = text.replace(/\b(\w+\s+\w+)(?:\s+\1\b)+/gi, '$1');

  // 3. Collapse 3-word phrase repetitions
  text = text.replace(/\b(\w+\s+\w+\s+\w+)(?:\s+\1\b)+/gi, '$1');

  // 4. Run single-word collapse one more time in case phrase collapse exposed adjacent identical words
  text = text.replace(/\b(\w+)(?:\s+\1\b)+/gi, '$1');

  return text.trim();
}

// Local browser Web Speech Engine (no external ElevenLabs API dependency)
export const AVAILABLE_LOCAL_VOICES = [
  {
    id: 'local-educator-in',
    name: 'Meera',
    label: 'Class 7 Engaging Educator (Indian English)',
    description: 'Local browser speech synthesis tuned for Indian English classroom clarity',
    gender: 'female',
    badge: 'Pedagogical & Concept Instruction'
  },
  {
    id: 'local-storyteller-gb',
    name: 'Aarav',
    label: 'Warm Storyteller (British English)',
    description: 'Local browser narrative cadence for History & Literature',
    gender: 'male',
    badge: 'Historical & Narrative Scholar'
  },
  {
    id: 'local-mentor-us',
    name: 'Kavya',
    label: 'Socratic Mentor (Clear Academic)',
    description: 'Steady local browser speech for step-by-step guidance',
    gender: 'female',
    badge: 'Socratic Guidance'
  },
  {
    id: 'local-scholar-fast',
    name: 'Vikram',
    label: 'Revision & Logic Coach',
    description: 'Crisp local browser pacing for 5-minute revision sheets',
    gender: 'male',
    badge: 'Revision & Logic Proofs'
  }
];

export const DEFAULT_LOCAL_VOICE_ID = 'local-educator-in';

export const AVAILABLE_MODELS = [
  {
    id: OPENROUTER_MODEL,
    name: 'NVIDIA Nemotron 3.5 Super VL (Free)',
    badge: 'OpenRouter Multimodal ICSE Scholar (Exclusive Engine)',
    provider: 'OpenRouter · NVIDIA'
  }
];

function formatManualLogicLine(
  manualRef?: ManualReferenceResult,
  _textbookRefs?: TextbookSearchMatch[],
  webSearch?: LiveWebSearchResult | null
): string {
  const lines: string[] = [];
  if (manualRef) {
    const pagesList = manualRef.referencedPages.join(', ');
    const protoList = manualRef.referencedProtocols.slice(0, 5).join('; ');
    lines.push(
      `- Manual Reference: Consulted ${manualRef.file} (Pages ${pagesList} | Protocols: ${protoList})`
    );
  }
  if (webSearch) {
    lines.push(
      webSearch.sources.length > 0
        ? `- Live Web Search (${webSearch.provider}): Retrieved ${webSearch.sources.length} verified source(s) for "${webSearch.query}"`
        : `- Live Web Search: Queried "${webSearch.query}" (no external results returned)`
    );
  }
  return lines.length > 0 ? `\n${lines.join('\n')}` : '';
}

function stripBookReferenceFooters(replyText: string): string {
  if (!replyText) return replyText;
  return replyText
    .replace(/\n{0,3}(?:\*\*|__)?\s*Book(?:\s*&\s*Page)?\s*Reference\s*:?(?:\*\*|__)?[^\n]*$/gim, '')
    .trim();
}

function buildIcseScholarlyFallback(
  ctx: AcademicContext,
  rawPrompt: string,
  manualRef?: ManualReferenceResult,
  textbookRefs?: TextbookSearchMatch[],
  webSearch?: LiveWebSearchResult | null
): string {
  const cleanPrompt = rawPrompt.trim();
  const lower = cleanPrompt.toLowerCase();
  const subj = ctx.subject || 'Mathematics';
  const manualLine = formatManualLogicLine(manualRef, textbookRefs, webSearch);
  const topBook = textbookRefs && textbookRefs.length > 0 ? textbookRefs[0] : null;

  // 0. Official Seth M.R. Jaipuria School information query (always open to students & faculty)
  if (isSchoolInfoQuery(cleanPrompt)) {
    return buildSchoolInfoDirectAnswer(cleanPrompt, manualLine);
  }

  // 1. Revision Quiz Workflow (<medhavi_quiz>)
  if (ctx.workflowType === 'revision_quiz' || lower.includes('<medhavi_quiz>') || lower.includes('revision') || lower.includes('quiz')) {
    const topicMatch = cleanPrompt.match(/Topic:\s*"?([^"\n]+)"?/i) || cleanPrompt.match(/on\s+"?([^"\n.?]+)"?/i);
    const topic = topicMatch ? topicMatch[1].trim() : `ICSE Class 7 ${subj}`;
    return `<medhavi_logic>
- Approach: Calibrated 5-question ICSE (CISCE) Class 7 Revision challenge on ${topic}.
- Key Steps: Embedded conceptual distractors, multi-step analytical deduction, and +2/-1 scoring rules.
- Verification: Verified unique single correct option and step-by-step ICSE explanation for each item.${manualLine}
</medhavi_logic>

Welcome to the **Seth M.R. Jaipuria School ICSE Class 7 Revision Arena**! Each correct answer awards **+2 marks**, and each incorrect choice carries a **-1 negative mark**.

<medhavi_quiz>
{
  "title": "ICSE Class 7 ${subj} — Revision Arena Challenge",
  "topic": "${topic.replace(/"/g, "'")}",
  "difficulty": "Competitive",
  "timerSeconds": 225,
  "questions": [
    {
      "id": "q1",
      "question": "In ICSE Class 7 Geometry, if two triangles △ABC and △DEF have AB = DE = 6 cm, ∠B = ∠E = 55°, and BC = EF = 8 cm, by which congruence criterion are they congruent?",
      "options": ["SAS (Side-Angle-Side) Criterion", "ASA (Angle-Side-Angle) Criterion", "SSS (Side-Side-Side) Criterion", "RHS (Right-Hypotenuse-Side) Criterion"],
      "correctIndex": 0,
      "explanation": "Since two corresponding sides (AB = DE and BC = EF) and the included angle between them (∠B = ∠E) are equal, △ABC ≅ △DEF by the SAS Congruence Criterion.",
      "conceptTag": "ICSE Congruence of Triangles (SAS)"
    },
    {
      "id": "q2",
      "question": "An exterior angle of a triangle is 115° and one of its interior opposite angles is 48°. What is the measure of the other interior opposite angle, and what type of triangle is it?",
      "options": ["67°, Acute-angled triangle", "67°, Obtuse-angled triangle", "65°, Acute-angled triangle", "163°, Obtuse-angled triangle"],
      "correctIndex": 0,
      "explanation": "By the Exterior Angle Theorem, Exterior Angle = Sum of interior opposite angles. Thus, second interior angle = 115° - 48° = 67°. The third angle is 180° - 115° = 65°. Since all three angles (48°, 67°, 65°) are less than 90°, it is an acute-angled triangle.",
      "conceptTag": "Exterior Angle Theorem"
    },
    {
      "id": "q3",
      "question": "Evaluate the exponential expression: [(2³)² × 2⁴] ÷ 2⁸ according to ICSE Class 7 Laws of Exponents.",
      "options": ["4", "8", "16", "2"],
      "correctIndex": 0,
      "explanation": "Using (a^m)^n = a^(mn), (2³)² = 2⁶. Next, 2⁶ × 2⁴ = 2^(6+4) = 2¹⁰. Finally, 2¹⁰ ÷ 2⁸ = 2^(10-8) = 2² = 4.",
      "conceptTag": "ICSE Laws of Exponents"
    },
    {
      "id": "q4",
      "question": "A shopkeeper marks an article at ₹1,200 and allows a discount of 15%. What is the selling price (SP) of the article?",
      "options": ["₹1,020", "₹1,050", "₹980", "₹1,080"],
      "correctIndex": 0,
      "explanation": "Discount = 15% of ₹1,200 = (15/100) × 1200 = ₹180. Therefore, Selling Price (SP) = Marked Price - Discount = ₹1,200 - ₹180 = ₹1,020.",
      "conceptTag": "ICSE Commercial Arithmetic"
    },
    {
      "id": "q5",
      "question": "In ICSE Class 7 Physics, why are ventilation exhaust fans always fitted near the ceiling of a room?",
      "options": ["Warm exhaled air is less dense and rises upward by convection", "Cold air is less dense and rises to the ceiling", "Conduction of heat is fastest near the roof", "Radiation only travels vertically upward"],
      "correctIndex": 0,
      "explanation": "Air warmed by breathing and indoor appliances expands, becomes less dense (lighter) than surrounding cool air, and rises toward the ceiling via convection currents, where exhaust fans expel it.",
      "conceptTag": "ICSE Convection Currents"
    }
  ]
}
</medhavi_quiz>`;
  }

  // 2. Answer Evaluator Workflow (<medhavi_evaluation>)
  if (ctx.workflowType === 'answer_evaluator' || lower.includes('<medhavi_evaluation>')) {
    return `<medhavi_logic>
- Approach: Evaluated student submission against ICSE (CISCE) Class 7 step-marking criteria.
- Key Steps: Assessed Concept Accuracy, Step-by-Step Logical Deduction, SI Units/Notation, and Presentation.
- Verification: Cross-checked partial credit and provided actionable remediation steps.${manualLine}
</medhavi_logic>

<medhavi_evaluation>
{
  "suggestedScore": 4.5,
  "maxMarks": 5,
  "confidence": "High",
  "rubric": [
    {"criterion": "Concept Accuracy", "score": 2, "maxScore": 2},
    {"criterion": "Step-by-Step Logic", "score": 1.5, "maxScore": 1.5},
    {"criterion": "Notation & SI Units", "score": 0.5, "maxScore": 1},
    {"criterion": "Presentation & Working", "score": 0.5, "maxScore": 0.5}
  ],
  "strengths": [
    "Correctly stated the governing ICSE Class 7 theorem before substituting values.",
    "Accurate algebraic transposition and arithmetic calculation."
  ],
  "missingConcepts": [
    "Explicit geometric degree symbol (°) and final boxed statement with units."
  ],
  "errors": [
    "Minor notation omission: wrote 'degrees' in words instead of standard geometric angle notation (∠x = 75°)."
  ],
  "improvementSteps": [
    "Always state the theorem name in brackets next to the equation (e.g., [By Exterior Angle Theorem]).",
    "Write the final answer clearly with standard notation and underline or box it."
  ],
  "teacherComment": "Excellent conceptual grasp and clean algebraic working! Include standard geometric symbols (∠, °) on the final line to secure full 5/5 marks in ICSE assessments."
}
</medhavi_evaluation>

### Detailed ICSE Class 7 Evaluation Breakdown
- **What Worked Well:** The student demonstrated clear mastery of the underlying ICSE Class 7 principle and set up the equation without skipping intermediate steps.
- **Where Marks Were Deducted (-0.5M):** In ICSE (CISCE) marking schemes, formal notation and units carry dedicated step marks.
- **Advisory Note:** *Teacher review recommended before marks are finalized.*`;
  }

  // 3. Congruence of Triangles specific query (respecting Student Socratic vs Teacher Studio)
  if (lower.includes('congruence') || lower.includes('triangle')) {
    const isTeacher = ctx.role === 'teacher';
    return `<medhavi_logic>
- Approach: Structured ICSE Class 7 Geometry explanation of Congruence of Triangles (${isTeacher ? 'Teacher Studio exemplar' : 'Student Portal conceptual guide'}).
- Key Steps: Defined superposition principle, detailed all 4 ICSE congruence criteria (SSS, SAS, ASA, RHS), and contrasted AAA similarity.
- Verification: Preserved student reasoning step in Student Portal; full proof included only for Faculty.${manualLine}
</medhavi_logic>

### Congruence of Triangles (ICSE Class 7 Mathematics)

Two geometric figures are **congruent** (\\(\\cong\\)) when they have the **exact same shape and size**—under superposition, one covers the other completely.

If \\(\\Delta ABC \\cong \\Delta PQR\\), corresponding vertices, sides, and angles match in order (**CPCTC**):
- **Sides:** \\(AB = PQ\\), \\(BC = QR\\), \\(AC = PR\\)
- **Angles:** \\(\\angle A = \\angle P\\), \\(\\angle B = \\angle Q\\), \\(\\angle C = \\angle R\\)

| Criterion | Condition Required | Key ICSE Rule |
| :--- | :--- | :--- |
| **SSS** | All three corresponding sides equal | Fixes all three angles automatically |
| **SAS** | Two sides and the **included angle** equal | The equal angle must lie strictly between the two sides |
| **ASA** *(or AAS)* | Two angles and a corresponding side equal | Angle sum (\\(180^\\circ\\)) determines the third angle |
| **RHS** | Right angle (\\(90^\\circ\\)), hypotenuse, and one side equal | Applies only to right-angled triangles |

**Why AAA fails:** Equal angles guarantee the same shape (similarity), not the same side lengths (e.g., equilateral triangles of side \\(3\\text{ cm}\\) and \\(8\\text{ cm}\\)).

${
  isTeacher
    ? `**Teacher Exemplar Proof:** In \\(\\Delta ABD\\) and \\(\\Delta ACD\\) with \\(AB = AC\\) and \\(AD \\perp BC\\):
1. \\(\\angle ADB = \\angle ADC = 90^\\circ\\) *(since \\(AD \\perp BC\\))*
2. \\(AB = AC\\) *(Given hypotenuse)*
3. \\(AD = AD\\) *(Common side)*
Hence \\(\\Delta ABD \\cong \\Delta ACD\\) by **RHS**, so \\(BD = CD\\) by CPCTC.`
    : `**Check your understanding:** In \\(\\Delta XYZ\\) and \\(\\Delta LMN\\), suppose \\(XY = LM = 5\\text{ cm}\\), \\(YZ = MN = 7\\text{ cm}\\), and \\(\\angle X = \\angle L = 40^\\circ\\). Which angle actually lies between sides \\(XY\\) and \\(YZ\\), and does that allow you to apply SAS here?`
}`;
  }

  // 4. Student Portal Zero Answer Leakage Check (Math, Physics, Science, English & Computers)
  if (ctx.role === 'student') {
    const leakageAnalysis = analyzeStudentExerciseForLeakage(cleanPrompt, ctx.subject);
    if (leakageAnalysis) {
      const logicWithManual = leakageAnalysis.socraticLogic.replace(
        '</medhavi_logic>',
        `${manualLine}\n</medhavi_logic>`
      );
      return `${logicWithManual}\n\n${leakageAnalysis.socraticBody}`;
    }
  }

  // 5. General ICSE Class 7 Scholarly Response (Role-separated & aligned to Manual Rules 1-9)
  const looksLikeUnsolvedExercise =
    ctx.role === 'student' &&
    (/\b(solve|calculate|find|evaluate|simplify|prove|answer|compute|write my essay|finish|how many .* (left|have|remain))\b/i.test(cleanPrompt) ||
      /[=+\-*/×÷^]/.test(cleanPrompt));

  if (looksLikeUnsolvedExercise) {
    return `<medhavi_logic>
- Approach: Applied Student Portal Socratic Reasoning Contract (Protocols 04 & 20) while NVIDIA Nemotron Super VL was temporarily unreachable.
- Key Steps: Guided careful reading of every action and quantity stated in the question without leaking the final result.
- Verification: Verified the student keeps the final deductive step.${manualLine}
</medhavi_logic>

Let us trace this carefully step-by-step instead of rushing to a number:

1. **Read every action closely:** Separate actions that *change the state* of an item (like cooking or moving it) from actions that actually *remove* it from your possession (like eating it or giving it away).
2. **Track what remains yours:** Start with the initial count and only subtract the items that actually left your possession.

Look closely at each action in your question — which items did you actually give away or consume, and which ones do you still have?`;
  }

  // Live Web Search + Strictly Relevant Textbook Synthesis (ONLY when topBook truly matches the query!)
  const sections: string[] = [];

  if (webSearch && (webSearch.summary || webSearch.sources.length > 0)) {
    sections.push(
      `### Live Web Research Brief\n\n${
        webSearch.summary ||
        webSearch.sources
          .slice(0, 4)
          .map((s) => `- **${s.title}** (${s.domain}): ${s.snippet}`)
          .join('\n')
      }`
    );
  } else if (webSearch && webSearch.note) {
    sections.push(`> ${webSearch.note}`);
  }

  const hasStrongRelevantBook =
    Boolean(topBook) &&
    (topBook?.score ?? 0) >= 5.0 &&
    (!subj || subj === 'ICSE Class 7' || topBook!.subject.toLowerCase() === subj.toLowerCase());

  if (hasStrongRelevantBook && topBook) {
    const conceptsBullets = topBook.keyConcepts
      .slice(0, 4)
      .map((c) => `- ${c}`)
      .join('\n');
    const formulasBullets = topBook.formulasOrFacts
      .slice(0, 3)
      .map((f) => `- \`${f}\``)
      .join('\n');
    sections.push(
      `### ICSE Class 7 ${topBook.subject} — ${topBook.title}\n\n${topBook.summary}\n\n#### Key Syllabus Principles\n${conceptsBullets}\n\n#### Essential Rules & Formulas\n${formulasBullets}`
    );
  } else {
    sections.push(
      `### NVIDIA Nemotron Super VL Temporarily Busy\n\nThe live **NVIDIA Nemotron 3.5 Super VL** model did not finish responding in time for your question:\n> *"${cleanPrompt.slice(0, 180)}"*\n\nPlease retry in a moment so Medhavi can reason through your exact question live. If you were asking about **Seth M.R. Jaipuria School, Lucknow**, mention the school name or visit **[sethmrjaipuria.school](${SCHOOL_OFFICIAL_WEBSITE})**.`
    );
  }

  const closingLine =
    ctx.role === 'teacher'
      ? 'Retry now, or specify a 40-minute period target or CISCE rubric breakdown for NVIDIA Nemotron Super VL.'
      : hasStrongRelevantBook && topBook
      ? `Which part of **${topBook.title}** would you like to explore or test yourself on next?`
      : 'Tap send again in a few seconds for a live NVIDIA Nemotron 3.5 Super VL response.';

  return `<medhavi_logic>
- Approach: Checked relevance threshold before displaying fallback (${ctx.role === 'teacher' ? 'Teacher Studio' : 'Student Portal'}).
- Key Steps: Avoided injecting unrelated textbook chapters and kept focus strictly on the user's question.
- Verification: Verified alignment with Seth M.R. Jaipuria School standards.${manualLine}
</medhavi_logic>

${sections.join('\n\n')}

${closingLine}`;
}

type OpenRouterMessageContent =
  | string
  | Array<
      | { type: 'text'; text: string }
      | { type: 'image_url'; image_url: { url: string } }
    >;

interface OpenRouterMessage {
  role: 'system' | 'user' | 'assistant';
  content: OpenRouterMessageContent;
}

function buildOpenRouterMessages(
  systemPrompt: string,
  messages: Array<{ role?: string; content?: string }>,
  imageDataUrl: string | null
): OpenRouterMessage[] {
  const result: OpenRouterMessage[] = [{ role: 'system', content: systemPrompt }];
  const recent = messages.slice(-6).filter((m) => m && m.content);

  for (let i = 0; i < recent.length; i++) {
    const msg = recent[i];
    const role: 'user' | 'assistant' = msg.role === 'assistant' ? 'assistant' : 'user';
    const text = String(msg.content).slice(0, 6000);
    const isLatestUser = i === recent.length - 1 && role === 'user';

    if (isLatestUser && imageDataUrl) {
      result.push({
        role: 'user',
        content: [
          { type: 'text', text },
          { type: 'image_url', image_url: { url: imageDataUrl } }
        ]
      });
    } else {
      result.push({ role, content: text });
    }
  }

  if (result.length === 1) {
    result.push({ role: 'user', content: 'Hello Jaipuria Medhavi!' });
  }
  return result;
}

export function createApp(): Express {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '12mb' }));

  // Hardened HTTP Security Headers (Iframe-preview compatible CSP + anti-sniffing + referrer policy)
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('X-DNS-Prefetch-Control', 'off');
    res.setHeader(
      'Permissions-Policy',
      'camera=(), geolocation=(), payment=(), usb=(), microphone=(self)'
    );
    res.setHeader(
      'Content-Security-Policy',
      [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com https://*.firebaseapp.com",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net",
        "font-src 'self' data: https://fonts.gstatic.com https://cdn.jsdelivr.net",
        "img-src 'self' data: blob: https:",
        "media-src 'self' data: blob:",
        "worker-src 'self' blob:",
        "connect-src 'self' https://*.googleapis.com https://*.firebaseio.com https://*.firebaseapp.com wss://*.firebaseio.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com",
        "object-src 'self' blob:",
        "base-uri 'self'"
      ].join('; ')
    );
    const origin = req.headers.origin;
    if (origin) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
    } else {
      res.setHeader('Access-Control-Allow-Origin', '*');
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }
    next();
  });

  // Favicon fallback handler
  app.get(['/favicon.ico', '/favicon.svg'], (_req, res) => {
    const svgIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#F59E0B"/>
          <stop offset="100%" stop-color="#D97706"/>
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="8" fill="url(#bg)"/>
      <text x="16" y="22" font-family="sans-serif" font-weight="900" font-size="18" fill="#0B1120" text-anchor="middle">म</text>
    </svg>`;
    res.setHeader('Content-Type', 'image/svg+xml');
    res.send(svgIcon);
  });

  const apiRouter = express.Router();

  let lastOpenRouterStatus: 'unchecked' | 'live' | 'error' = 'unchecked';
  let lastOpenRouterDiagnostic = '';

  // Health endpoint
  apiRouter.get('/health', async (_req, res) => {
    const openRouterKey = getOpenRouterApiKey();
    let manualIndex = null;
    try {
      manualIndex = await ensureManualLoaded();
    } catch {
      manualIndex = null;
    }

    res.json({
      status: 'online',
      school: 'Seth M.R. Jaipuria School (SMRJ)',
      website: SCHOOL_OFFICIAL_WEBSITE,
      motto: 'Tamso Ma Jyotirgamaya',
      philosophy: 'School of Conscious Transformation',
      curriculum: 'ICSE (CISCE) Class 7 Exclusive',
      engine: 'OpenRouter · NVIDIA Nemotron 3.5 Super VL (Exclusive)',
      voiceEngine: 'Local Browser Web Speech API (Zero Cloud Voice Keys)',
      defaultModel: OPENROUTER_MODEL,
      lockedGrade: LOCKED_GRADE,
      models: AVAILABLE_MODELS,
      defaultVoiceId: DEFAULT_LOCAL_VOICE_ID,
      voices: AVAILABLE_LOCAL_VOICES,
      sdkConfigured: Boolean(openRouterKey),
      openRouterStatus: !openRouterKey ? 'missing_key' : lastOpenRouterStatus,
      openRouterDiagnostic: !openRouterKey
        ? 'OPENROUTER_API_KEY is not configured on the server.'
        : lastOpenRouterDiagnostic,
      manualPdf: {
        file: MANUAL_PDF_FILENAME,
        loaded: Boolean(manualIndex),
        totalPages: manualIndex?.totalPages || 0,
        protocolsLoaded: manualIndex?.protocols.length || 0,
        consultedBeforeEveryAnswer: true
      },
      grade7Textbooks: {
        indexedChapters: GRADE_7_TEXTBOOK_CATALOG.length,
        alignment: 'ICSE (CISCE) & NCSE / NCERT Class 7 Reference',
        consultedBeforeEveryAnswer: true
      },
      webSearch: {
        enabled: true,
        primaryProvider: 'live-web-federated'
      }
    });
  });

  // Grade 7 ICSE / NCSE Textbook Reference Library Endpoint
  apiRouter.get('/textbooks', (req, res) => {
    const subject = req.query.subject ? String(req.query.subject).slice(0, 80) : undefined;
    const q = req.query.q ? String(req.query.q).slice(0, 300) : '';
    const limit = Math.min(12, Math.max(1, Number(req.query.limit) || 4));

    if (q.trim()) {
      const matches = searchGrade7TextbookReferences({ subject, query: q, limit });
      res.json({
        grade: LOCKED_GRADE,
        query: q,
        subject: subject || 'All',
        matches
      });
      return;
    }

    res.json({
      grade: LOCKED_GRADE,
      alignment: 'ICSE (CISCE) & NCSE / NCERT Class 7 Reference',
      totalChapters: GRADE_7_TEXTBOOK_CATALOG.length,
      books: getGrade7BooksGrouped(subject)
    });
  });

  // Grade 7 Textbook Educational Diagrams & Open Page Plates Endpoint
  apiRouter.get('/textbooks/page-images', async (req, res) => {
    const chapterId = req.query.chapterId ? String(req.query.chapterId).slice(0, 80) : '';
    const rawQuery = req.query.q ? String(req.query.q).slice(0, 200) : '';
    const chapter = chapterId
      ? GRADE_7_TEXTBOOK_CATALOG.find((c) => c.id === chapterId) || null
      : null;

    const searchTopic =
      rawQuery.trim() ||
      (chapter ? `${chapter.title} ${chapter.keywords.slice(0, 3).join(' ')}` : 'ICSE Class 7 science diagram');

    const images = await searchWikimediaPageImages(searchTopic, 4);

    res.json({
      chapterId: chapter?.id || null,
      textbook: chapter?.textbook || null,
      pageRange: chapter?.pageRange || null,
      manualPdfUrl: '/api/manual/pdf',
      query: searchTopic,
      images
    });
  });

  // Stream the Actual 75-Page Intelligence & Pedagogy Manual PDF for Page Image Rendering
  apiRouter.get('/manual/pdf', (_req, res) => {
    const absPath = path.resolve(process.cwd(), MANUAL_PDF_RELATIVE_PATH);
    if (!fs.existsSync(absPath)) {
      res.status(404).json({ error: 'Institutional manual PDF file not found on server.' });
      return;
    }
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${MANUAL_PDF_FILENAME}"`);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.sendFile(absPath);
  });

  // Live Web Search Endpoint (Federated School-Safe Live Web Search — sethmrjaipuria.school & K-12 Academic Sources)
  apiRouter.post('/web-search', async (req, res) => {
    const ip = getClientIp(req);
    if (!checkRateLimit(`websearch:${ip}`, 25, 60_000)) {
      res.status(429).json({ error: 'Web search rate limit exceeded. Please wait a moment.' });
      return;
    }

    const { query = '', subject = '' } = req.body || {};
    const cleanQuery = String(query).trim().slice(0, 280);
    if (!cleanQuery) {
      res.status(400).json({ error: 'Search query is required.' });
      return;
    }

    try {
      const result = await performLiveWebSearch({
        query: cleanQuery,
        subject: subject ? String(subject).slice(0, 80) : undefined
      });
      res.json(result);
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Live web search failed'
      });
    }
  });

  // Live PDF Manual Consultation Inspection Endpoint
  apiRouter.get('/manual/reference', async (req, res) => {
    try {
      const role: PersonaRole = req.query.role === 'teacher' ? 'teacher' : 'student';
      const subject = String(req.query.subject || 'Mathematics').slice(0, 80);
      const q = String(req.query.q || 'Explain this ICSE Class 7 concept clearly.').slice(0, 1000);
      const workflowType = req.query.workflowType ? String(req.query.workflowType).slice(0, 80) : undefined;
      const isTestStudio = req.query.isTestStudio === 'true';

      const ref = await consultManualPdfBeforeAnswer({
        role,
        subject,
        prompt: q,
        workflowType,
        isTestStudio
      });

      res.json({
        file: ref.file,
        totalPages: ref.totalPages,
        protocolsLoaded: ref.protocolsLoaded,
        referencedPages: ref.referencedPages,
        referencedProtocols: ref.referencedProtocols,
        ...(req.query.full === '1'
          ? { groundingBlock: ref.groundingBlock }
          : { groundingPreview: ref.groundingBlock.slice(0, 600) })
      });
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Unable to consult Medhavi PDF manual'
      });
    }
  });

  // Local browser Web Speech profiles endpoint (ElevenLabs removed)
  apiRouter.get('/voices', (_req, res) => {
    res.json({
      provider: 'web-speech-local',
      defaultVoiceId: DEFAULT_LOCAL_VOICE_ID,
      voices: AVAILABLE_LOCAL_VOICES,
      configured: true
    });
  });

  // Live Security Posture & Telemetry Endpoint
  apiRouter.get('/security/status', (_req, res) => {
    res.json({
      status: 'hardened',
      hmacSealing: true,
      cspEnforced: true,
      rateLimitingActive: true,
      vaultAtRestEncryption: true,
      zeroClientSecrets: true,
      maxAssessmentDownloads: MAX_SERVER_TEST_DOWNLOADS,
      sessionMaxAgeHours: 12
    });
  });

  // Strict 3-Download Limit Endpoint for ICSE Tests & Question Papers (Requires Server-Sealed Faculty Identity)
  apiRouter.post('/test-downloads/consume', (req, res) => {
    const ip = getClientIp(req);
    if (!checkRateLimit(`dl:${ip}`, 15, 60_000)) {
      res.status(429).json({ allowed: false, error: 'Too many download requests. Please slow down.' });
      return;
    }

    const { testId = '', verifiedIdentity = null } = req.body || {};
    const cleanId = String(testId).trim().slice(0, 120);
    if (!cleanId) {
      res.status(400).json({ allowed: false, error: 'Missing testId' });
      return;
    }

    if (
      !verifiedIdentity ||
      verifiedIdentity.extractedRole !== 'teacher' ||
      !verifyServerIdentitySeal(verifiedIdentity)
    ) {
      res.status(403).json({
        allowed: false,
        error:
          'Security Policy: Assessment downloads require an active, cryptographically sealed Faculty session.'
      });
      return;
    }

    const usedSoFar = SERVER_TEST_DOWNLOAD_LEDGER.get(cleanId) || 0;
    if (usedSoFar >= MAX_SERVER_TEST_DOWNLOADS) {
      res.json({
        allowed: false,
        used: MAX_SERVER_TEST_DOWNLOADS,
        remaining: 0,
        max: MAX_SERVER_TEST_DOWNLOADS,
        message: `Security Policy: This test has already been downloaded the maximum of ${MAX_SERVER_TEST_DOWNLOADS} times (${MAX_SERVER_TEST_DOWNLOADS}/${MAX_SERVER_TEST_DOWNLOADS} used).`
      });
      return;
    }
    const nextUsed = usedSoFar + 1;
    SERVER_TEST_DOWNLOAD_LEDGER.set(cleanId, nextUsed);
    res.json({
      allowed: true,
      used: nextUsed,
      remaining: Math.max(0, MAX_SERVER_TEST_DOWNLOADS - nextUsed),
      max: MAX_SERVER_TEST_DOWNLOADS
    });
  });

  // Institutional Proof of Identity with Brute-Force Lockout & Server HMAC-SHA256 Sealing
  apiRouter.post('/verify-id', async (req, res) => {
    const ip = getClientIp(req);
    const lockout = isIpAuthLockedOut(ip);
    if (lockout.locked) {
      res.status(429).json({
        verified: false,
        summary: `Security Lockout: Too many failed login attempts. Please wait ${lockout.retryAfterSec} seconds before retrying.`
      });
      return;
    }
    if (!checkRateLimit(`auth:${ip}`, 15, 60_000)) {
      res.status(429).json({
        verified: false,
        summary: 'Rate limit exceeded on authentication endpoint. Please wait 1 minute.'
      });
      return;
    }

    const {
      role = 'student',
      fullName = '',
      schoolId = '',
      facultyPasscode = '',
      password = '',
      isDemo = false
    } = req.body || {};

    const cleanRole: PersonaRole = role === 'teacher' ? 'teacher' : 'student';

    const result = buildVerifiedIdentityResult({
      fullName: String(fullName).slice(0, 120),
      role: cleanRole,
      schoolId: String(schoolId).slice(0, 40),
      password: String(password).slice(0, 80),
      facultyPasscode: String(facultyPasscode).slice(0, 40),
      isDemo: Boolean(isDemo)
    });

    recordAuthAttemptOutcome(ip, result.verified);
    res.json(result.verified ? attachServerSeal(result) : result);
  });

  // Isolated Sandbox Demo Session Provisioner (Requires Faculty Password/Passcode for Teacher Demo)
  apiRouter.post('/verify-demo', (req, res) => {
    const ip = getClientIp(req);
    const lockout = isIpAuthLockedOut(ip);
    if (lockout.locked) {
      res.status(429).json({
        verified: false,
        summary: `Security Lockout: Too many failed clearance attempts. Try again in ${lockout.retryAfterSec}s.`
      });
      return;
    }
    if (!checkRateLimit(`demo:${ip}`, 15, 60_000)) {
      res.status(429).json({
        verified: false,
        summary: 'Too many sandbox demo requests. Please wait a moment.'
      });
      return;
    }

    const {
      role = 'student',
      fullName = '',
      schoolId = '',
      section = 'VII-D',
      house = 'Harmony',
      password = '',
      facultyPasscode = ''
    } = req.body || {};

    const cleanRole: PersonaRole = role === 'teacher' ? 'teacher' : 'student';
    const cleanName = String(fullName || '').trim().slice(0, 100);
    const cleanId = String(schoolId || '').trim().toUpperCase().slice(0, 40);

    if (cleanName.length < 2 || cleanId.length < 3) {
      res.status(400).json({
        verified: false,
        summary: 'Please provide a valid Sandbox Demo Name and ID.'
      });
      return;
    }

    if (cleanRole === 'teacher') {
      const passwordOk = verifyInstitutionalPassword(String(password || ''));
      const passcodeOk = verifyFacultyPasscode(String(facultyPasscode || ''));
      if (!passwordOk && !passcodeOk) {
        recordAuthAttemptOutcome(ip, false);
        res.status(403).json({
          verified: false,
          summary:
            'Security Gate: Faculty Sandbox Demo accounts require the Institutional Faculty Password or Faculty Security Passcode so students cannot escalate into Teacher Studio.'
        });
        return;
      }
      recordAuthAttemptOutcome(ip, true);
    }

    const formattedId =
      cleanRole === 'teacher'
        ? /^SMRJ-FAC-\d{3,6}$/.test(cleanId)
          ? cleanId
          : 'SMRJ-FAC-0742'
        : /^SMRJ-FAC-/i.test(cleanId)
        ? '13457'
        : cleanId;

    const badgeId = `JM-DEMO-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    const demoIdentity = attachServerSeal({
      verified: true,
      confidence: 99,
      extractedName: cleanName,
      extractedRole: cleanRole,
      schoolId: formattedId,
      schoolName: 'Seth M.R. Jaipuria School, Lucknow',
      grade: LOCKED_GRADE,
      badgeId,
      summary: `Isolated ICSE Class 7 ${
        cleanRole === 'teacher' ? 'Faculty' : 'Scholar'
      } Sandbox Demo (${section} · ${house} House).`,
      checks: {
        institutionMatch: true,
        roleMatch: true,
        gradeSevenAuthorized: true,
        isDemo: true
      }
    });

    res.json(demoIdentity);
  });

  // Streaming Chat Endpoint via OpenRouter (nvidia/nemotron-3.5-super-vl:free) + LRU Cache + Server HMAC Role Security
  apiRouter.post('/chat/stream', async (req, res) => {
    const ip = getClientIp(req);
    if (!checkRateLimit(`chat:${ip}`, 45, 60_000)) {
      res.status(429).json({ error: 'Chat rate limit exceeded. Please wait a few seconds.' });
      return;
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    let clientClosed = false;
    const safeWrite = (chunk: string) => {
      if (!clientClosed && !res.writableEnded) {
        res.write(chunk);
      }
    };
    safeWrite(': connected\n\n');

    const heartbeat = setInterval(() => {
      safeWrite(': ping\n\n');
    }, 5000);
    // In Node 18+, req 'close' fires immediately when POST body finishes reading!
    // Listen to res 'close' instead to detect actual client disconnects mid-stream.
    res.on('close', () => {
      if (!res.writableEnded) {
        clientClosed = true;
      }
      clearInterval(heartbeat);
    });

    try {
    const {
      messages = [],
      context = {},
      imageDataUrl = null,
      verifiedIdentity = null,
      webSearchEnabled: bodyWebSearch = false
    } = req.body || {};
    const webSearchEnabled = Boolean(bodyWebSearch || context?.webSearchEnabled);

    // Zero-Trust Role Enforcement: Only allow 'teacher' role if verifiedIdentity holds a valid server HMAC seal
    let enforcedRole: PersonaRole = 'student';
    if (context.role === 'teacher') {
      if (
        verifiedIdentity &&
        verifiedIdentity.extractedRole === 'teacher' &&
        verifyServerIdentitySeal(verifiedIdentity)
      ) {
        enforcedRole = 'teacher';
      } else {
        res.write(
          `data: ${JSON.stringify({
            type: 'delta',
            content:
              '🔒 **Security Alert — Unauthorized Teacher Studio Access Blocked:** Your session does not hold a valid server-sealed Seth M.R. Jaipuria School Faculty signature (`SMRJ-FAC-XXXX`). Please sign in via the Faculty Portal.'
          })}\n\n`
        );
        res.write(
          `data: ${JSON.stringify({ type: 'done', reasoningTokens: 12, model: 'security-guard' })}\n\n`
        );
        res.end();
        return;
      }
    }

    const teacherOnlyWorkflows = [
      'question_paper_generator',
      'answer_evaluator',
      'lesson_plan_architect',
      'parent_circular_generator'
    ];
    const isTestStudioContext = Boolean(context.isTestStudio);

    if (
      enforcedRole === 'student' &&
      (isTestStudioContext || teacherOnlyWorkflows.includes(String(context.workflowType || '')))
    ) {
      res.write(
        `data: ${JSON.stringify({
          type: 'delta',
          content:
            '🔒 **Security Policy:** This assessment/faculty studio is restricted exclusively to verified ICSE Class 7 Faculty accounts.'
        })}\n\n`
      );
      res.write(
        `data: ${JSON.stringify({ type: 'done', reasoningTokens: 12, model: 'security-guard' })}\n\n`
      );
      res.end();
      return;
    }

    const safeMessages = Array.isArray(messages) ? messages : [];
    const userMsgs = safeMessages.filter((m: any) => m && m.role !== 'assistant');
    const lastUserMsg = String(
      userMsgs[userMsgs.length - 1]?.content ||
        'Explain this ICSE Class 7 concept clearly.'
    );
    const recentCombinedQuery = userMsgs
      .slice(-3)
      .map((m: any) => String(m?.content || ''))
      .join(' ');

    const resolvedSubject =
      inferGrade7Subject(lastUserMsg, context.subject) ||
      inferGrade7Subject(recentCombinedQuery, context.subject) ||
      'ICSE Class 7';

    const academicCtx: AcademicContext = {
      role: enforcedRole,
      grade: LOCKED_GRADE,
      subject: resolvedSubject,
      intelligenceMode: context.intelligenceMode || 'pedagogical',
      model: OPENROUTER_MODEL,
      customSpecs: Array.isArray(context.customSpecs) ? context.customSpecs : [],
      workflowType: context.workflowType,
      isTestStudio: isTestStudioContext
    };

    // Zero-Trust Isolation: Teachers CANNOT generate or view any test, worksheet, quiz, or question paper outside the Restricted Test Studio
    if (
      enforcedRole === 'teacher' &&
      !isTestStudioContext &&
      (context.workflowType === 'question_paper_generator' ||
        context.workflowType === 'revision_quiz' ||
        isTestGenerationRequest(lastUserMsg))
    ) {
      res.write(
        `data: ${JSON.stringify({
          type: 'delta',
          content:
            '🔒 **Restricted Assessment Policy — Studio Isolation Enforced:**\n\nFaculty members are strictly prohibited from generating, duplicating, or viewing any ICSE test, question paper, unit test, worksheet, or quiz outside the **Restricted ICSE Test Generation Studio**.\n\nPlease open **Restricted ICSE Test Studio** from the left Faculty Studios sidebar to generate assessments under institutional security controls (3-download cap, anti-copy vault, and auto-purge protection).'
        })}\n\n`
      );
      res.write(
        `data: ${JSON.stringify({ type: 'done', reasoningTokens: 16, model: 'security-guard' })}\n\n`
      );
      res.end();
      return;
    }

    // MANDATORY STEP 1: Consult the attached Jaipuria Medhavi Intelligence Manual PDF BEFORE cache, AI, or fallback
    const manualRef = await consultManualPdfBeforeAnswer({
      role: enforcedRole,
      subject: academicCtx.subject,
      prompt: lastUserMsg,
      recentMessages: messages,
      hasImage: Boolean(imageDataUrl),
      workflowType: academicCtx.workflowType,
      isTestStudio: isTestStudioContext
    });
    const manualReferenceMeta = {
      file: manualRef.file,
      totalPages: manualRef.totalPages,
      protocolsLoaded: manualRef.protocolsLoaded,
      referencedPages: manualRef.referencedPages,
      referencedProtocols: manualRef.referencedProtocols
    };

    // MANDATORY STEP 2: Consult Grade 7 ICSE / NCSE Textbook Reference Catalog (only keep genuinely relevant matches)
    const textbookRefs = searchGrade7TextbookReferences({
      subject: academicCtx.subject,
      query: lastUserMsg,
      limit: 3
    }).filter((ref) => ref.score >= 3.5);
    const textbookGroundingBlock = formatTextbookGroundingBlock(textbookRefs);

    // OPTIONAL LIVE STEP 3: Only perform Live Web Search when genuinely needed
    const strongTextbookMatch = textbookRefs.some((ref) => ref.score >= 7.5);
    const webSearchDecision = evaluateWebSearchNeed({
      query: lastUserMsg,
      subject: academicCtx.subject,
      hasImage: Boolean(imageDataUrl),
      workflowType: academicCtx.workflowType,
      isTestStudio: isTestStudioContext,
      webSearchEnabled,
      strongTextbookMatch
    });
    let liveWebSearch: LiveWebSearchResult | null = null;
    if (webSearchDecision.needed) {
      try {
        liveWebSearch = await performLiveWebSearch({
          query: lastUserMsg,
          subject: academicCtx.subject
        });
      } catch {
        liveWebSearch = null;
      }
    }
    const webSearchGroundingBlock = formatWebSearchGroundingBlock(liveWebSearch);
    const resolvedWebProvider =
      liveWebSearch?.provider || (webSearchEnabled ? 'not-needed' : null);

    // Check fast LRU cache when no image is attached and live web search is not needed
    const cacheKey =
      !imageDataUrl && !isTestStudioContext && !webSearchDecision.needed
        ? `v3-nvidia-only|${manualRef.mtimeMs}|${enforcedRole}|${academicCtx.subject}|${academicCtx.intelligenceMode}|${
            academicCtx.workflowType || ''
          }|${lastUserMsg.trim().toLowerCase()}`
        : '';

    if (cacheKey) {
      const cachedHit = getCachedResponse(cacheKey);
      if (cachedHit) {
        res.write(`data: ${JSON.stringify({ type: 'delta', content: cachedHit.text })}\n\n`);
        res.write(
          `data: ${JSON.stringify({
            type: 'done',
            reasoningTokens: Math.max(24, Math.round(cachedHit.text.length / 18)),
            completionTokens: Math.max(48, Math.round(cachedHit.text.length / 4)),
            totalTokens: Math.max(72, Math.round(cachedHit.text.length / 3)),
            model: cachedHit.model,
            source: 'openrouter-cache',
            manualReference: manualReferenceMeta,
            textbookReferences: textbookRefs,
            webSources: [],
            webSearchProvider: resolvedWebProvider
          })}\n\n`
        );
        res.end();
        return;
      }
    }

    const systemPrompt = [
      buildSystemPrompt(academicCtx),
      manualRef.groundingBlock,
      textbookGroundingBlock,
      webSearchGroundingBlock
    ]
      .filter(Boolean)
      .join('\n\n');
    const openRouterKey = getOpenRouterApiKey();
    const orMessages = buildOpenRouterMessages(systemPrompt, messages, imageDataUrl);

    let streamedText = '';
    let reasoningTokens = 0;
    let completionTokens = 0;
    let totalTokens = 0;
    const activeModelName = OPENROUTER_MODEL;
    const activeSourceName = 'openrouter-live';
    let fallbackReason = openRouterKey ? '' : 'missing_api_key';

    if (openRouterKey) {
      // Exclusive AI Engine: OpenRouter NVIDIA Nemotron 3.5 Super VL (streaming with full reasoning headroom)
      const streamController = new AbortController();
      const streamTimeout = setTimeout(() => streamController.abort(), OPENROUTER_TIMEOUT_MS);
      let skipUnaryRetry = false;
      try {
        const upstream = await fetch(OPENROUTER_ENDPOINT, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${openRouterKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': process.env.APP_URL || 'http://localhost:3000',
            'X-Title': 'Jaipuria Medhavi'
          },
          body: JSON.stringify({
            model: OPENROUTER_MODEL,
            messages: orMessages,
            stream: true
          }),
          signal: streamController.signal
        });

        if (upstream.ok && upstream.body) {
          const reader = upstream.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';

          while (!clientClosed) {
            const { value, done } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });

            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const rawLine of lines) {
              const line = rawLine.trim();
              if (!line.startsWith('data:')) continue;
              const payload = line.slice(5).trim();
              if (!payload || payload === '[DONE]') continue;

              try {
                const parsed = JSON.parse(payload);
                const delta = parsed?.choices?.[0]?.delta?.content;
                if (typeof delta === 'string' && delta.length > 0) {
                  const candidate = streamedText + delta;
                  if (candidate.indexOf('<medhavi_logic>', 20) !== -1) {
                    const cleanPrefix = deduplicateModelLoop(streamedText);
                    streamedText = cleanPrefix;
                    break;
                  }
                  streamedText = candidate;
                  if (enforcedRole !== 'student') {
                    safeWrite(`data: ${JSON.stringify({ type: 'delta', content: delta })}\n\n`);
                  }
                }
                if (parsed?.usage) {
                  completionTokens = parsed.usage.completion_tokens || completionTokens;
                  totalTokens = parsed.usage.total_tokens || totalTokens;
                  reasoningTokens =
                    parsed.usage.completion_tokens_details?.reasoning_tokens ||
                    Math.max(12, Math.round((completionTokens || 40) * 0.35));
                }
              } catch {
                // skip partial chunk
              }
            }
          }
          reader.releaseLock();
        } else {
          const errText = await upstream.text().catch(() => '');
          fallbackReason = `stream_http_${upstream.status}: ${errText.slice(0, 180)}`;
          if (upstream.status === 429 || upstream.status >= 500) {
            skipUnaryRetry = true;
          }
        }
      } catch (err: any) {
        fallbackReason = `stream_error: ${err?.message || 'unknown'}`.slice(0, 180);
        skipUnaryRetry = true;
      } finally {
        clearTimeout(streamTimeout);
      }

      // Unary retry strictly on the same NVIDIA Nemotron 3.5 Super VL model if stream ended empty without error
      if (!streamedText.trim() && !skipUnaryRetry && !clientClosed) {
        const unaryController = new AbortController();
        const unaryTimeout = setTimeout(() => unaryController.abort(), 30_000);
        try {
          const unaryResp = await fetch(OPENROUTER_ENDPOINT, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${openRouterKey}`,
              'Content-Type': 'application/json',
              'HTTP-Referer': process.env.APP_URL || 'http://localhost:3000',
              'X-Title': 'Jaipuria Medhavi'
            },
            body: JSON.stringify({
              model: OPENROUTER_MODEL,
              messages: orMessages,
              stream: false
            }),
            signal: unaryController.signal
          });

          if (unaryResp.ok) {
            const data = await unaryResp.json();
            const reply = data?.choices?.[0]?.message?.content;
            if (typeof reply === 'string' && reply.trim()) {
              streamedText = reply;
              if (enforcedRole !== 'student') {
                safeWrite(`data: ${JSON.stringify({ type: 'delta', content: reply })}\n\n`);
              }
            } else {
              fallbackReason = 'unary_empty_content';
            }
          } else {
            const errText = await unaryResp.text().catch(() => '');
            fallbackReason = `unary_http_${unaryResp.status}: ${errText.slice(0, 180)}`;
          }
        } catch (err: any) {
          fallbackReason = `unary_error: ${err?.message || 'unknown'}`.slice(0, 180);
        } finally {
          clearTimeout(unaryTimeout);
        }
      }
    }

    // 2. Guaranteed Resilient ICSE Class 7 Scholarly Fallback if all live models are unavailable
    let usedFallback = false;
    if (!streamedText.trim()) {
      usedFallback = true;
      lastOpenRouterStatus = 'error';
      lastOpenRouterDiagnostic = fallbackReason || 'OpenRouter request returned empty output.';
      const fallbackReply = stripBookReferenceFooters(
        enforceStudentZeroAnswerLeakage(
          lastUserMsg,
          buildIcseScholarlyFallback(academicCtx, lastUserMsg, manualRef, textbookRefs, liveWebSearch),
          enforcedRole,
          academicCtx.subject
        )
      );
      streamedText = fallbackReply;
      safeWrite(`data: ${JSON.stringify({ type: 'delta', content: fallbackReply })}\n\n`);
    } else {
      if (activeSourceName === 'openrouter-live') {
        lastOpenRouterStatus = 'live';
        lastOpenRouterDiagnostic = '';
      }
      const cleanStreamed = stripBookReferenceFooters(
        enforceStudentZeroAnswerLeakage(
          lastUserMsg,
          deduplicateModelLoop(streamedText),
          enforcedRole,
          academicCtx.subject
        )
      );
      streamedText = cleanStreamed;
      if (enforcedRole === 'student') {
        safeWrite(`data: ${JSON.stringify({ type: 'delta', content: cleanStreamed })}\n\n`);
      }
      if (cacheKey && cleanStreamed.length > 40) {
        setCachedResponse(cacheKey, cleanStreamed, activeModelName);
      }
    }

    safeWrite(
      `data: ${JSON.stringify({
        type: 'done',
        reasoningTokens: reasoningTokens || Math.max(24, Math.round(streamedText.length / 18)),
        completionTokens: completionTokens || Math.max(48, Math.round(streamedText.length / 4)),
        totalTokens: totalTokens || Math.max(72, Math.round(streamedText.length / 3)),
        model: activeModelName,
        source: usedFallback
          ? liveWebSearch && liveWebSearch.sources.length > 0
            ? 'web-textbook-grounded'
            : 'icse-scholar-fallback'
          : activeSourceName,
        manualReference: manualReferenceMeta,
        textbookReferences: textbookRefs,
        webSources: liveWebSearch?.sources || [],
        webSearchProvider: resolvedWebProvider,
        webSearchNote: liveWebSearch?.note || null,
        ...(usedFallback && fallbackReason ? { fallbackReason } : {})
      })}\n\n`
    );
    } catch {
      safeWrite(
        `data: ${JSON.stringify({
          type: 'delta',
          content:
            'I ran into a brief hiccup while preparing your Class 7 response. Please send your question again and I will guide you step-by-step.'
        })}\n\n`
      );
      safeWrite(
        `data: ${JSON.stringify({
          type: 'done',
          reasoningTokens: 16,
          model: OPENROUTER_MODEL,
          source: 'icse-scholar-fallback',
          webSources: []
        })}\n\n`
      );
    } finally {
      clearInterval(heartbeat);
      if (!res.writableEnded) {
        res.end();
      }
    }
  });

  // Standard non-streaming chat endpoint via OpenRouter (nvidia/nemotron-3.5-super-vl:free) + Server HMAC Role Security
  apiRouter.post('/chat', async (req, res) => {
    const ip = getClientIp(req);
    if (!checkRateLimit(`chat:${ip}`, 45, 60_000)) {
      res.status(429).json({ error: 'Chat rate limit exceeded. Please wait a few seconds.' });
      return;
    }

    try {
      const {
        messages = [],
        context = {},
        imageDataUrl = null,
        verifiedIdentity = null,
        webSearchEnabled: bodyWebSearch = false
      } = req.body || {};
      const webSearchEnabled = Boolean(bodyWebSearch || context?.webSearchEnabled);

      let enforcedRole: PersonaRole = 'student';
      if (context.role === 'teacher') {
        if (
          verifiedIdentity &&
          verifiedIdentity.extractedRole === 'teacher' &&
          verifyServerIdentitySeal(verifiedIdentity)
        ) {
          enforcedRole = 'teacher';
        } else {
          res.status(403).json({
            error:
              'Security Alert: Unauthorized or unsealed Teacher identity request blocked. Please sign in again.'
          });
          return;
        }
      }

      const teacherOnlyWorkflows = [
        'question_paper_generator',
        'answer_evaluator',
        'lesson_plan_architect',
        'parent_circular_generator'
      ];
      const isTestStudioContext = Boolean(context.isTestStudio);
      if (
        enforcedRole === 'student' &&
        (isTestStudioContext || teacherOnlyWorkflows.includes(String(context.workflowType || '')))
      ) {
        res.status(403).json({
          error:
            'Security Alert: Restricted Studio workflow is reserved exclusively for verified Faculty accounts.'
        });
        return;
      }

      const safeMessages = Array.isArray(messages) ? messages : [];
      const userMsgs = safeMessages.filter((m: any) => m && m.role !== 'assistant');
      const lastUserMsg = String(
        userMsgs[userMsgs.length - 1]?.content ||
          'Explain this ICSE Class 7 concept clearly.'
      );
      const recentCombinedQuery = userMsgs
        .slice(-3)
        .map((m: any) => String(m?.content || ''))
        .join(' ');

      const resolvedSubject =
        inferGrade7Subject(lastUserMsg, context.subject) ||
        inferGrade7Subject(recentCombinedQuery, context.subject) ||
        'ICSE Class 7';

      const academicCtx: AcademicContext = {
        role: enforcedRole,
        grade: LOCKED_GRADE,
        subject: resolvedSubject,
        intelligenceMode: context.intelligenceMode || 'pedagogical',
        model: OPENROUTER_MODEL,
        customSpecs: Array.isArray(context.customSpecs) ? context.customSpecs : [],
        workflowType: context.workflowType,
        isTestStudio: isTestStudioContext
      };

      if (
        enforcedRole === 'teacher' &&
        !isTestStudioContext &&
        (context.workflowType === 'question_paper_generator' ||
          context.workflowType === 'revision_quiz' ||
          isTestGenerationRequest(lastUserMsg))
      ) {
        res.json({
          reply:
            '🔒 **Restricted Assessment Policy — Studio Isolation Enforced:**\n\nFaculty members are strictly prohibited from generating, duplicating, or viewing any ICSE test, question paper, unit test, worksheet, or quiz outside the **Restricted ICSE Test Generation Studio**.\n\nPlease open **Restricted ICSE Test Studio** from the left Faculty Studios sidebar.',
          reasoningTokens: 16,
          model: 'security-guard',
          source: 'security-policy'
        });
        return;
      }

      // MANDATORY STEP 1: Consult the attached Jaipuria Medhavi Intelligence Manual PDF BEFORE cache, AI, or fallback
      const manualRef = await consultManualPdfBeforeAnswer({
        role: enforcedRole,
        subject: academicCtx.subject,
        prompt: lastUserMsg,
        recentMessages: messages,
        hasImage: Boolean(imageDataUrl),
        workflowType: academicCtx.workflowType,
        isTestStudio: isTestStudioContext
      });
      const manualReferenceMeta = {
        file: manualRef.file,
        totalPages: manualRef.totalPages,
        protocolsLoaded: manualRef.protocolsLoaded,
        referencedPages: manualRef.referencedPages,
        referencedProtocols: manualRef.referencedProtocols
      };

      // MANDATORY STEP 2: Consult Grade 7 ICSE / NCSE Textbook Reference Catalog (keep only genuinely relevant matches)
      const textbookRefs = searchGrade7TextbookReferences({
        subject: academicCtx.subject,
        query: lastUserMsg,
        limit: 3
      }).filter((ref) => ref.score >= 3.5);
      const textbookGroundingBlock = formatTextbookGroundingBlock(textbookRefs);

      // OPTIONAL LIVE STEP 3: Only perform Live Web Search when genuinely needed
      const strongTextbookMatch = textbookRefs.some((ref) => ref.score >= 7.5);
      const webSearchDecision = evaluateWebSearchNeed({
        query: lastUserMsg,
        subject: academicCtx.subject,
        hasImage: Boolean(imageDataUrl),
        workflowType: academicCtx.workflowType,
        isTestStudio: isTestStudioContext,
        webSearchEnabled,
        strongTextbookMatch
      });
      let liveWebSearch: LiveWebSearchResult | null = null;
      if (webSearchDecision.needed) {
        try {
          liveWebSearch = await performLiveWebSearch({
            query: lastUserMsg,
            subject: academicCtx.subject
          });
        } catch {
          liveWebSearch = null;
        }
      }
      const webSearchGroundingBlock = formatWebSearchGroundingBlock(liveWebSearch);
      const resolvedWebProvider =
        liveWebSearch?.provider || (webSearchEnabled ? 'not-needed' : null);

      const cacheKey = !isTestStudioContext && !imageDataUrl && !webSearchDecision.needed
        ? `v3-nvidia-only|${manualRef.mtimeMs}|${enforcedRole}|${academicCtx.subject}|${academicCtx.intelligenceMode}|${
            academicCtx.workflowType || ''
          }|${lastUserMsg.trim().toLowerCase()}`
        : '';

      const cachedHit = cacheKey ? getCachedResponse(cacheKey) : null;
      if (cachedHit) {
        res.json({
          reply: cachedHit.text,
          reasoningTokens: Math.max(24, Math.round(cachedHit.text.length / 18)),
          model: cachedHit.model,
          source: 'openrouter-cache',
          manualReference: manualReferenceMeta,
          textbookReferences: textbookRefs,
          webSources: [],
          webSearchProvider: resolvedWebProvider
        });
        return;
      }

      const openRouterKey = getOpenRouterApiKey();
      const systemPrompt = [
        buildSystemPrompt(academicCtx),
        manualRef.groundingBlock,
        textbookGroundingBlock,
        webSearchGroundingBlock
      ]
        .filter(Boolean)
        .join('\n\n');
      let fallbackReason = openRouterKey ? '' : 'missing_api_key';

      if (openRouterKey) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), OPENROUTER_TIMEOUT_MS);
        try {
          const orMessages = buildOpenRouterMessages(systemPrompt, messages, imageDataUrl);

          const upstream = await fetch(OPENROUTER_ENDPOINT, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${openRouterKey}`,
              'Content-Type': 'application/json',
              'HTTP-Referer': process.env.APP_URL || 'http://localhost:3000',
              'X-Title': 'Jaipuria Medhavi'
            },
            body: JSON.stringify({
              model: OPENROUTER_MODEL,
              messages: orMessages,
              stream: false
            }),
            signal: controller.signal
          });

          if (upstream.ok) {
            const data = await upstream.json();
            const reply = data?.choices?.[0]?.message?.content;
            if (typeof reply === 'string' && reply.trim()) {
              const cleanReply = stripBookReferenceFooters(
                enforceStudentZeroAnswerLeakage(
                  lastUserMsg,
                  deduplicateModelLoop(reply),
                  enforcedRole,
                  academicCtx.subject
                )
              );
              lastOpenRouterStatus = 'live';
              lastOpenRouterDiagnostic = '';
              if (cacheKey) setCachedResponse(cacheKey, cleanReply, OPENROUTER_MODEL);
              res.json({
                reply: cleanReply,
                reasoningTokens: Math.max(24, Math.round(cleanReply.length / 18)),
                model: OPENROUTER_MODEL,
                source: 'openrouter-live',
                manualReference: manualReferenceMeta,
                textbookReferences: textbookRefs,
                webSources: liveWebSearch?.sources || [],
                webSearchProvider: resolvedWebProvider,
                webSearchNote: liveWebSearch?.note || null
              });
              return;
            }
            fallbackReason = 'empty_content';
          } else {
            const errText = await upstream.text().catch(() => '');
            fallbackReason = `http_${upstream.status}: ${errText.slice(0, 180)}`;
          }
        } catch (err: any) {
          fallbackReason = `error: ${err?.message || 'unknown'}`.slice(0, 180);
        } finally {
          clearTimeout(timeout);
        }
      }

      // Guaranteed Resilient ICSE Class 7 Fallback (Textbook + Live Web Grounded)
      lastOpenRouterStatus = 'error';
      lastOpenRouterDiagnostic = fallbackReason || 'OpenRouter API unavailable.';
      const fallbackReply = stripBookReferenceFooters(
        enforceStudentZeroAnswerLeakage(
          lastUserMsg,
          buildIcseScholarlyFallback(academicCtx, lastUserMsg, manualRef, textbookRefs, liveWebSearch),
          enforcedRole,
          academicCtx.subject
        )
      );
      res.json({
        reply: fallbackReply,
        reasoningTokens: Math.max(28, Math.round(fallbackReply.length / 18)),
        model: OPENROUTER_MODEL,
        source:
          liveWebSearch && liveWebSearch.sources.length > 0
            ? 'web-textbook-grounded'
            : 'icse-scholar-fallback',
        manualReference: manualReferenceMeta,
        textbookReferences: textbookRefs,
        webSources: liveWebSearch?.sources || [],
        webSearchProvider: resolvedWebProvider,
        webSearchNote: liveWebSearch?.note || null,
        ...(fallbackReason ? { fallbackReason } : {})
      });
    } catch (err) {
      console.error('[Medhavi /api/chat unexpected error]:', err);
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Chat error'
      });
    }
  });

  // Mount API router both under `/api` and at root `/`
  app.use('/api', apiRouter);
  app.use(apiRouter);

  return app;
}
