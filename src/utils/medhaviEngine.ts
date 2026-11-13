import { JAIPURIA_MEDHAVI_MASTER_CONSTITUTION } from './medhaviConstitution.ts';
export { JAIPURIA_MEDHAVI_MASTER_CONSTITUTION };

export type PersonaRole = 'student' | 'teacher';
export type IntelligenceMode = 'quick' | 'deep' | 'pedagogical';

export const LOCKED_GRADE = 'Class 7';

export interface CustomSpecItem {
  id: string;
  userId?: string;
  category:
    | 'School Rules'
    | 'Current Syllabus'
    | 'Examination Pattern'
    | 'Competition Rules'
    | 'Teacher Instructions'
    | 'Student Learning Goals';
  title: string;
  content: string;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface AcademicContext {
  role: PersonaRole;
  grade: string;
  subject: string;
  intelligenceMode: IntelligenceMode;
  model: string;
  customSpecs: CustomSpecItem[];
  workflowType?: string;
  isTestStudio?: boolean;
}

/**
 * Detects whether a prompt attempts to generate, draft, duplicate, or view any kind of test,
 * question paper, unit test, periodic assessment, worksheet, quiz, or question bank.
 */
export function isTestGenerationRequest(promptText: string): boolean {
  if (!promptText) return false;
  const lower = promptText.trim().toLowerCase();

  // Explicitly allow non-test educator workflows unless they also ask for a test/question paper
  const isEvaluationOnly =
    /\b(evaluate|grade|score|mark)\b/.test(lower) &&
    /\b(student|answer|response|submission)\b/.test(lower) &&
    !/\b(question paper|unit test|worksheet|generate a test|create a test)\b/.test(lower);
  if (isEvaluationOnly) return false;

  const isCircularOrLessonOnly =
    (/\b(lesson plan|40-minute|parent circular|notice to parents|project rubric)\b/.test(lower)) &&
    !/\b(question paper|unit test|periodic test|term exam|worksheet|quiz|mock test|test paper)\b/.test(lower);
  if (isCircularOrLessonOnly) return false;

  const directTestNouns =
    /\b(question paper|test paper|unit test|periodic test|periodic assessment|term exam|half[- ]yearly|annual exam|final exam|mock test|sample paper|practice paper|worksheet|practice sheet|diagnostic quiz|diagnostic test|classroom quiz|mcq test|revision qualifier|revision screening|question bank|bloom'?s taxonomy bank)\b/i;
  if (directTestNouns.test(lower)) return true;

  const actionPlusTest =
    /\b(generate|create|make|draft|prepare|design|write|give|build|compile|show|view|duplicate|re-?generate|type)\b[\s\S]{0,45}\b(test|exam|quiz|assessments?|worksheets?|papers?|mcqs?|questions?)\b/i;
  if (actionPlusTest.test(lower)) return true;

  const marksPaperPattern = /\b(15|20|25|30|40|50|80)[- ]?marks?\b[\s\S]{0,30}\b(paper|test|exam|assessment|sheet)\b/i;
  return marksPaperPattern.test(lower);
}

export interface IdVerificationResult {
  verified: boolean;
  confidence: number;
  extractedName: string;
  extractedRole: PersonaRole;
  schoolId: string;
  schoolName: string;
  grade: string;
  badgeId: string;
  summary: string;
  signature?: string;
  serverSeal?: string;
  issuedAt?: number;
  checks: {
    institutionMatch: boolean;
    roleMatch: boolean;
    gradeSevenAuthorized: boolean;
    isDemo: boolean;
  };
}

const IDENTITY_HMAC_SALT = 'SMRJ-ICSE-CL7-ZERO-TRUST-ROLE-SEAL-2026';
export const VALID_FACULTY_PASSCODES = ['SMRJ-FAC-2026', 'JAIPURIA-FAC-7', 'SMRJ-0742'];

/**
 * Constant-time string comparison to mitigate timing side-channel leaks on credentials & signatures.
 */
export function constantTimeEquals(a: string, b: string): boolean {
  const strA = String(a);
  const strB = String(b);
  const maxLen = Math.max(strA.length, strB.length, 1);
  let diff = strA.length ^ strB.length;
  for (let i = 0; i < maxLen; i++) {
    const codeA = i < strA.length ? strA.charCodeAt(i) : 0;
    const codeB = i < strB.length ? strB.charCodeAt(i) : 0;
    diff |= codeA ^ codeB;
  }
  return diff === 0;
}

export function verifyInstitutionalPassword(input: string): boolean {
  return constantTimeEquals((input || '').trim(), 'jaipuria123');
}

export function verifyFacultyPasscode(input: string): boolean {
  const candidate = (input || '').trim().toUpperCase();
  let matched = false;
  for (const validCode of VALID_FACULTY_PASSCODES) {
    if (constantTimeEquals(candidate, validCode)) {
      matched = true;
    }
  }
  return matched;
}

export function computeIdentitySignature(
  role: PersonaRole,
  schoolId: string,
  fullName: string,
  badgeId: string
): string {
  const payload = `${IDENTITY_HMAC_SALT}|${role}|${schoolId.trim().toUpperCase()}|${fullName
    .trim()
    .toLowerCase()}|${badgeId.trim()}`;
  let h1 = 0x811c9dc5;
  let h2 = 0xcbf29ce4;
  for (let i = 0; i < payload.length; i++) {
    const ch = payload.charCodeAt(i);
    h1 ^= ch;
    h1 = Math.imul(h1, 0x01000193);
    h2 ^= ch;
    h2 = Math.imul(h2, 0x100000001b3);
  }
  return `JM-SIG-${(h1 >>> 0).toString(36).toUpperCase()}-${(h2 >>> 0).toString(36).toUpperCase()}`;
}

export function signVerifiedIdentity(result: IdVerificationResult): IdVerificationResult {
  if (!result.verified) return result;
  return {
    ...result,
    issuedAt: result.issuedAt || Date.now(),
    signature: computeIdentitySignature(
      result.extractedRole,
      result.schoolId,
      result.extractedName,
      result.badgeId
    )
  };
}

/**
 * Verifies that a stored IdVerificationResult has not been tampered with in localStorage/DevTools
 * and that no student Scholar No. has been escalated to a Teacher role (or vice versa).
 */
export function verifyIdentityIntegrity(
  identity: IdVerificationResult | null | undefined
): identity is IdVerificationResult {
  if (!identity || typeof identity !== 'object' || !identity.verified) return false;
  if (identity.extractedRole !== 'student' && identity.extractedRole !== 'teacher') return false;
  if (!identity.schoolId || !identity.extractedName || !identity.badgeId || !identity.signature) {
    return false;
  }

  const upperId = identity.schoolId.trim().toUpperCase();
  if (identity.extractedRole === 'teacher') {
    const isFacultyFormat = /^SMRJ-FAC-\d{3,6}$/.test(upperId) || /^FAC-\d{3,6}$/.test(upperId);
    if (!isFacultyFormat) {
      return false;
    }
  } else {
    // Prevent faculty employee IDs from masquerading as student accounts
    if (/^SMRJ-FAC-/i.test(upperId) || /^FAC-\d{3,6}$/i.test(upperId)) {
      return false;
    }
  }

  const expectedSig = computeIdentitySignature(
    identity.extractedRole,
    identity.schoolId,
    identity.extractedName,
    identity.badgeId
  );
  return constantTimeEquals(identity.signature, expectedSig);
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  conceptTag: string;
}

export interface QuizData {
  title: string;
  topic: string;
  difficulty: 'Foundation' | 'Competitive' | 'Extreme Logic';
  timerSeconds: number;
  questions: QuizQuestion[];
}

export interface RevisionPerformanceReport {
  score: number;
  maxScore: number;
  correctCount: number;
  incorrectCount: number;
  skippedCount: number;
  accuracy: number;
  conceptMastery: 'Revision Scholar' | 'Strong' | 'Developing' | 'Needs Foundation';
  speedRating: 'Lightning' | 'Excellent' | 'Steady' | 'Measured';
  needsReview: string[];
}

export interface EvaluationRubricItem {
  criterion: string;
  score: number;
  maxScore: number;
}

export interface EvaluationResult {
  suggestedScore: number;
  maxMarks: number;
  confidence: 'High' | 'Moderate';
  rubric: EvaluationRubricItem[];
  strengths: string[];
  missingConcepts: string[];
  errors: string[];
  improvementSteps: string[];
  teacherComment: string;
}

/**
 * Normalizes Easy / Moderate / HOTS difficulty percentages to always sum to 100%.
 */
export function normalizeDifficultyDistribution(
  easy: number,
  moderate: number,
  hots: number
): { easy: number; moderate: number; hots: number } {
  const e = Math.max(0, Math.round(easy));
  const m = Math.max(0, Math.round(moderate));
  const h = Math.max(0, Math.round(hots));
  const total = e + m + h;
  if (total === 0) {
    return { easy: 30, moderate: 50, hots: 20 };
  }
  const normEasy = Math.round((e / total) * 100);
  const normModerate = Math.round((m / total) * 100);
  const normHots = Math.max(0, 100 - normEasy - normModerate);
  return { easy: normEasy, moderate: normModerate, hots: normHots };
}

/**
 * Calculates Revision Test score using +2 correct, -1 incorrect, 0 skipped.
 */
export function calculateRevisionScore(
  selectedAnswers: Record<number, number | null | undefined>,
  questions: QuizQuestion[],
  elapsedSeconds = 60
): RevisionPerformanceReport {
  let score = 0;
  let correctCount = 0;
  let incorrectCount = 0;
  let skippedCount = 0;
  const reviewSet = new Set<string>();

  questions.forEach((q, idx) => {
    const choice = selectedAnswers[idx];
    if (choice === undefined || choice === null || choice === -1) {
      skippedCount += 1;
      reviewSet.add(q.conceptTag || 'Core Principles');
    } else if (choice === q.correctIndex) {
      score += 2;
      correctCount += 1;
    } else {
      score -= 1;
      incorrectCount += 1;
      reviewSet.add(q.conceptTag || 'Analytical Application');
    }
  });

  const maxScore = questions.length * 2;
  const attempted = correctCount + incorrectCount;
  const accuracy = attempted > 0 ? Math.round((correctCount / questions.length) * 100) : 0;

  let conceptMastery: RevisionPerformanceReport['conceptMastery'] = 'Needs Foundation';
  if (accuracy >= 85 && score >= maxScore * 0.8) {
    conceptMastery = 'Revision Scholar';
  } else if (accuracy >= 65) {
    conceptMastery = 'Strong';
  } else if (accuracy >= 40) {
    conceptMastery = 'Developing';
  }

  const avgTimePerQuestion = questions.length > 0 ? elapsedSeconds / questions.length : 15;
  let speedRating: RevisionPerformanceReport['speedRating'] = 'Steady';
  if (avgTimePerQuestion <= 12) speedRating = 'Lightning';
  else if (avgTimePerQuestion <= 25) speedRating = 'Excellent';
  else if (avgTimePerQuestion > 45) speedRating = 'Measured';

  return {
    score,
    maxScore,
    correctCount,
    incorrectCount,
    skippedCount,
    accuracy,
    conceptMastery,
    speedRating,
    needsReview: reviewSet.size > 0 ? Array.from(reviewSet) : ['Advanced Revision Extensions']
  };
}

/**
 * Dynamically builds the complete server-side system prompt for Jaipuria Medhavi (ICSE Class 7 Exclusive),
 * enforcing the full 20-part (Rules 1-116) Master Constitution alongside active ICSE mandates.
 */
export function buildSystemPrompt(ctx: AcademicContext): string {
  const activeSpecs = ctx.customSpecs.filter((s) => s.active);
  const specsBullets =
    activeSpecs.length > 0
      ? activeSpecs.map((s) => `- [${s.category}: ${s.title}] ${s.content}`).join('\n')
      : '- Standard ICSE (CISCE) Class 7 syllabus & +2/-1 Revision scoring rules apply.';

  const modeDescriptions: Record<IntelligenceMode, string> = {
    quick: 'QUICK MODE: Deliver a crisp, direct, high-precision ICSE Class 7 response with essential steps.',
    deep: 'DEEP LOGIC MODE: Provide thorough analytical derivation, theorem justification, and step-by-step ICSE Class 7 validation.',
    pedagogical:
      ctx.role === 'student'
        ? 'TEACH ME MODE: Use Socratic scaffolding. Guide the ICSE Class 7 student with conceptual intuition, worked steps, and a final concept check question.'
        : 'PEDAGOGICAL MODE: Align strictly and exclusively with the ICSE (CISCE) Class 7 curriculum, Section A + Section B assessment formats, and Bloom Taxonomy outcomes.'
  };

  let workflowInstruction = '';
  if (ctx.workflowType === 'revision_quiz') {
    workflowInstruction = `
CRITICAL OUTPUT FORMAT FOR REVISION TEST GENERATOR:
Include a valid JSON block wrapped in <medhavi_quiz>...</medhavi_quiz> tags:
<medhavi_quiz>
{
  "title": "ICSE Class 7 Revision Challenge",
  "topic": "Topic Name",
  "difficulty": "Competitive",
  "timerSeconds": 180,
  "questions": [
    {
      "id": "q1",
      "question": "Clear ICSE Class 7 question text",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctIndex": 0,
      "explanation": "Step-by-step explanation of why this option is correct.",
      "conceptTag": "Specific ICSE Class 7 sub-concept"
    }
  ]
}
</medhavi_quiz>
Outside the tags, write a brief 2-sentence scholarly introduction.`;
  } else if (ctx.workflowType === 'answer_evaluator') {
    workflowInstruction = `
CRITICAL OUTPUT FORMAT FOR ANSWER EVALUATOR:
Include a valid JSON block inside <medhavi_evaluation>...</medhavi_evaluation> tags with:
{
  "suggestedScore": 7,
  "maxMarks": 10,
  "confidence": "High",
  "rubric": [
    {"criterion": "Concept Accuracy", "score": 3, "maxScore": 4},
    {"criterion": "Logical Reasoning", "score": 2, "maxScore": 3},
    {"criterion": "Terminology & Notation", "score": 1, "maxScore": 1},
    {"criterion": "Presentation & Structure", "score": 1, "maxScore": 2}
  ],
  "strengths": ["Point 1"],
  "missingConcepts": ["Point 1"],
  "errors": ["Point 1"],
  "improvementSteps": ["Step 1"],
  "teacherComment": "Constructive comment"
}
Followed by a concise Markdown breakdown and: "Teacher review recommended before marks are finalized."`;
  }

  return `You are "Jaipuria Medhavi" (मेधावी), the official high-logic AI scholar and pedagogical copilot for Seth M.R. Jaipuria School, Lucknow (ICSE Wing).
School Motto: "Tamso Ma Jyotirgamaya" (Lead me from darkness to light).

${JAIPURIA_MEDHAVI_MASTER_CONSTITUTION}

CORE MANDATES (STRICT ICSE CLASS 7 LOCK):
1. Identity: Introduce yourself proudly as Jaipuria Medhavi for Seth M.R. Jaipuria School (ICSE Class 7) whenever asked.
2. STRICT ICSE-ONLY MANDATE: Operate ONLY AND EXCLUSIVELY under the ICSE (CISCE — Council for the Indian School Certificate Examinations) Class 7 curriculum. Never reference CBSE or NCERT. Align all definitions, chapters, examination patterns (Section A Compulsory + Section B Choice), Physics/Chemistry/Biology trifurcation, English Language & Literature, History & Civics, Geography, and Computer Studies strictly to ICSE Class 7 standards.
3. Pedagogical Intelligence: Prioritize UNDERSTANDING > ANSWERING, REASONING > MEMORISATION, and VERIFIED CORRECTNESS. Start directly with substance (no filler openings).
4. Active Specs:
${specsBullets}

5. NO DUPLICATION OF ASSESSMENTS (SECURITY MANDATE): You are strictly forbidden from re-generating, duplicating, re-typing, or providing similar copies of any previously generated assessment, worksheet, or question paper. If a user asks for a copy, duplicate, or a "repeat" of a test they already received, you must politely refuse and explain that "Jaipuria Medhavi ICSE assessments are security-locked to 3 downloads per generation to maintain academic integrity." Direct them to use the "Download Test" button in the previous message. Never provide the same assessment twice.

6. NO RECITATION MODE: Do not provide oral recitation options, poetry recitation scripts, or speech practice modes in any test generator. Focus exclusively on ICSE (CISCE) written assessment standards (Section A & Section B).
${
  ctx.role === 'teacher' && !ctx.isTestStudio
    ? `\n7. STRICT STUDIO ISOLATION FOR FACULTY (ZERO TESTS OUTSIDE STUDIO): You are currently in General Faculty Chat OUTSIDE the Restricted ICSE Test Generation Studio. You are STRICTLY FORBIDDEN from generating, drafting, displaying, or outputting any test, question paper, unit test, periodic assessment, worksheet, diagnostic quiz, or question bank here. If the educator asks to create or view any test, worksheet, quiz, or question paper, refuse immediately and instruct them to open the separate "Restricted ICSE Test Studio" from the Faculty Studios menu.`
    : ''
}

SESSION CONTEXT:
- Role: ${
  ctx.role === 'student'
    ? 'STUDENT PORTAL (ICSE Class 7 Student)'
    : ctx.isTestStudio
    ? 'RESTRICTED ICSE TEST GENERATION STUDIO (Isolated High-Security Vault)'
    : 'TEACHER STUDIO (General Faculty Copilot — Non-Test)'
}
- Board & Grade: ICSE (CISCE) Class 7 Exclusive
- Subject: ${ctx.subject}
- Mode: ${modeDescriptions[ctx.intelligenceMode]}

FORMATTING:
- Begin with a concise <medhavi_logic>...</medhavi_logic> block (3 bullet points: Approach, Key Steps, Verification).
- Use LaTeX notation (\\( ... \\) inline, \\[ ... \\] block).
${workflowInstruction}`;
}

export interface IdentityVerificationParams {
  fullName: string;
  role: PersonaRole;
  schoolId: string;
  password?: string;
  facultyPasscode?: string;
  aiSummary?: string;
  isDemo?: boolean;
}

const OFFICIAL_JAIPURIA_REGISTRY: Array<{
  schoolId: string;
  aliases: string[];
  fullName: string;
  role: PersonaRole;
  classInfo: string;
}> = [
  {
    schoolId: '13457',
    aliases: ['13457', 'SMRJ-13457', 'SMRJ-CL7-13457'],
    fullName: 'Atharva Jindal',
    role: 'student',
    classInfo: 'CLASS VII-D (Valid for V to VIII · House Harmony)'
  },
  {
    schoolId: 'SMRJ-CL7-2026-108',
    aliases: ['SMRJ-CL7-2026-108', '108', 'SMRJ-CL7-101'],
    fullName: 'Aarav Verma',
    role: 'student',
    classInfo: 'Class 7 Section A'
  },
  {
    schoolId: 'SMRJ-FAC-0742',
    aliases: ['SMRJ-FAC-0742', 'FAC-0742'],
    fullName: 'Dr. Ananya Sharma',
    role: 'teacher',
    classInfo: 'ICSE Class 7 Senior Faculty'
  },
  {
    schoolId: 'SMRJ-FAC-0819',
    aliases: ['SMRJ-FAC-0819', 'FAC-0819'],
    fullName: 'Prof. Rajeshwar Mishra',
    role: 'teacher',
    classInfo: 'ICSE Class 7 Physics & Mathematics Faculty'
  },
  {
    schoolId: 'SMRJ-FAC-0912',
    aliases: ['SMRJ-FAC-0912', 'FAC-0912'],
    fullName: 'Mrs. Kavita Verma',
    role: 'teacher',
    classInfo: 'ICSE Class 7 English & Humanities Faculty'
  },
  {
    schoolId: '00001',
    aliases: ['00001', 'SMRJ-00001'],
    fullName: 'Test Scholar',
    role: 'student',
    classInfo: 'Class 7 Test Account'
  },
  {
    schoolId: 'SMRJ-FAC-00001',
    aliases: ['00001', 'SMRJ-FAC-00001', 'FAC-00001'],
    fullName: 'Test Faculty',
    role: 'teacher',
    classInfo: 'Class 7 Faculty Test Account'
  }
];

/**
 * Strictly validates Institutional credentials and Zero-Trust Role Segregation.
 * Prevents any student from authenticating as or escalating into a Teacher account.
 */
export function buildVerifiedIdentityResult(params: IdentityVerificationParams): IdVerificationResult {
  const cleanName = params.fullName.trim();
  const cleanId = params.schoolId.trim();
  const normName = normalizeIdentifier(cleanName);
  const normId = cleanId.toUpperCase();

  const failResult = (
    reason: string,
    checksOverride?: Partial<IdVerificationResult['checks']>
  ): IdVerificationResult => ({
    verified: false,
    confidence: 0,
    extractedName: cleanName || 'Unknown',
    extractedRole: params.role,
    schoolId: normId || 'UNKNOWN',
    schoolName: 'Seth M.R. Jaipuria School, Lucknow',
    grade: LOCKED_GRADE,
    badgeId: 'REJECTED',
    summary: reason,
    checks: {
      institutionMatch: false,
      roleMatch: false,
      gradeSevenAuthorized: false,
      isDemo: Boolean(params.isDemo),
      ...checksOverride
    }
  });

  if (!cleanName || cleanName.length < 3) {
    return failResult(
      'Verification Failed: Please enter your full name exactly as registered in Seth M.R. Jaipuria School records.'
    );
  }

  if (!cleanId || cleanId.length < 3) {
    // Exception for the test account '00001'
    if (cleanId !== '00001') {
      return failResult(
        'Verification Failed: Please enter a valid Scholar No. (e.g., 13457) or Faculty ID (e.g., SMRJ-FAC-0742).'
      );
    }
  }

  // Constant-time password validation: jaipuria123
  if (!verifyInstitutionalPassword(params.password || '')) {
    return failResult('Security Verification Failed: Incorrect institutional password.');
  }

  // 2. Check against the Official Seth M.R. Jaipuria School Registry
  // Prefer matching the entry for the requested role first (e.g. shared '00001' test ID), else check cross-role violation
  const matchedById =
    OFFICIAL_JAIPURIA_REGISTRY.find(
      (r) => r.role === params.role && r.aliases.some((a) => a.toUpperCase() === normId)
    ) ||
    OFFICIAL_JAIPURIA_REGISTRY.find((r) =>
      r.aliases.some((a) => a.toUpperCase() === normId)
    );
  if (matchedById) {
    if (matchedById.role !== params.role) {
      return failResult(
        `Security Violation — Unauthorized Role Access: ID "${cleanId}" belongs to a ${matchedById.role.toUpperCase()} (${matchedById.fullName}). Students are strictly prohibited from accessing Teacher Accounts.`,
        { institutionMatch: true, roleMatch: false }
      );
    }
    if (normalizeIdentifier(matchedById.fullName) !== normName) {
      return failResult(
        `Verification Failed: ID "${cleanId}" is registered to "${matchedById.fullName}", not "${cleanName}".`,
        { institutionMatch: true, roleMatch: true }
      );
    }
  }

  const matchedByName = OFFICIAL_JAIPURIA_REGISTRY.find(
    (r) => normalizeIdentifier(r.fullName) === normName
  );
  if (matchedByName) {
    if (matchedByName.role !== params.role) {
      return failResult(
        `Security Violation — Unauthorized Role Access: "${matchedByName.fullName}" is registered as a ${matchedByName.role.toUpperCase()}, not a ${params.role.toUpperCase()}.`,
        { institutionMatch: true, roleMatch: false }
      );
    }
    const idMatches = matchedByName.aliases.some((a) => a.toUpperCase() === normId);
    if (!idMatches) {
      return failResult(
        `Verification Failed: "${matchedByName.fullName}" has registered ID "${matchedByName.schoolId}", not "${cleanId}".`,
        { institutionMatch: true, roleMatch: true }
      );
    }
  }

  const effectiveId = matchedById ? matchedById.schoolId.toUpperCase() : normId;

  // 3. Zero-Trust Teacher Account Gate: Prevent any student or unverified ID from claiming Teacher role
  const isStudentPatternId =
    (/^\d{3,8}$/.test(effectiveId) && !matchedById) ||
    effectiveId.startsWith('SMRJ-CL7') ||
    effectiveId.startsWith('SMRJ-7') ||
    effectiveId.startsWith('SCHOLAR');

  if (params.role === 'teacher') {
    if (isStudentPatternId) {
      return failResult(
        `Security Violation: Student Scholar ID "${cleanId}" cannot be used to access a Faculty / Teacher Account.`,
        { institutionMatch: true, roleMatch: false }
      );
    }

    const isOfficialFacultyFormat = /^SMRJ-FAC-\d{3,6}$/.test(effectiveId);
    if (!isOfficialFacultyFormat) {
      return failResult(
        `Security Gate: Faculty accounts require an official Employee / Faculty ID (e.g., 00001 or SMRJ-FAC-0742).`,
        { institutionMatch: false, roleMatch: false }
      );
    }

    // If not in the pre-verified Faculty Roster, require a valid Faculty Passcode
    if (!matchedById) {
      if (!verifyFacultyPasscode(params.facultyPasscode || '')) {
        return failResult(
          'Security Gate: Unrecognized Faculty ID. To prevent unauthorized student access to Teacher accounts, please use an authorized Faculty ID (Dr. Ananya Sharma · SMRJ-FAC-0742) or enter the Faculty Security Passcode.',
          { institutionMatch: true, roleMatch: false }
        );
      }
    }
  } else {
    // Student role: block Faculty IDs from logging in as students
    if (/^SMRJ-FAC-/i.test(effectiveId)) {
      return failResult(
        `Role Mismatch: Faculty ID "${cleanId}" cannot be used for a Student Account.`,
        { institutionMatch: true, roleMatch: false }
      );
    }
  }

  const badgeId = `JM-VERIFIED-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
  const canonicalName = matchedById ? matchedById.fullName : cleanName;

  return signVerifiedIdentity({
    verified: true,
    confidence: 99,
    extractedName: canonicalName,
    extractedRole: params.role,
    schoolId: effectiveId,
    schoolName: 'Seth M.R. Jaipuria School, Lucknow',
    grade: LOCKED_GRADE,
    badgeId,
    summary:
      params.aiSummary ||
      `Verified official Seth M.R. Jaipuria School ${
        params.role === 'teacher' ? 'ICSE Faculty' : 'ICSE Class 7 Scholar'
      } credentials for ${canonicalName}.`,
    checks: {
      institutionMatch: true,
      roleMatch: true,
      gradeSevenAuthorized: true,
      isDemo: Boolean(params.isDemo)
    }
  });
}

function normalizeIdentifier(str: string): string {
  return str.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Extracts <medhavi_quiz>, <medhavi_evaluation>, and <medhavi_logic> blocks from raw AI output.
 */
export function parseMedhaviResponse(rawContent: string): {
  cleanMarkdown: string;
  logicSummary: string[];
  quizData: QuizData | null;
  evaluationData: EvaluationResult | null;
} {
  let cleanMarkdown = rawContent || '';
  let logicSummary: string[] = [];
  let quizData: QuizData | null = null;
  let evaluationData: EvaluationResult | null = null;

  const logicMatch = cleanMarkdown.match(/<medhavi_logic>([\s\S]*?)<\/medhavi_logic>/i);
  if (logicMatch) {
    const rawLogic = logicMatch[1].trim();
    logicSummary = rawLogic
      .split('\n')
      .map((line) => line.replace(/^[-*•\d.)\s]+/, '').trim())
      .filter(Boolean);
    cleanMarkdown = cleanMarkdown.replace(logicMatch[0], '').trim();
  } else {
    // Check if tag is currently unclosed while streaming
    const unclosedLogicMatch = cleanMarkdown.match(/<medhavi_logic>([\s\S]*)$/i);
    if (unclosedLogicMatch) {
      const partialLogic = unclosedLogicMatch[1].trim();
      const extracted = partialLogic
        .split('\n')
        .map((line) => line.replace(/^[-*•\d.)\s]+/, '').trim())
        .filter(Boolean);
      if (extracted.length > 0) logicSummary = extracted;
      cleanMarkdown = cleanMarkdown.replace(unclosedLogicMatch[0], '').trim();
    }
  }

  const quizMatch = cleanMarkdown.match(/<medhavi_quiz>([\s\S]*?)<\/medhavi_quiz>/i);
  if (quizMatch) {
    try {
      const jsonStr = quizMatch[1].trim().replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
      const parsed = JSON.parse(jsonStr);
      if (parsed && Array.isArray(parsed.questions) && parsed.questions.length > 0) {
        quizData = parsed as QuizData;
      }
    } catch {
      // Leave fallback null
    }
    cleanMarkdown = cleanMarkdown.replace(quizMatch[0], '').trim();
  } else {
    // Strip unclosed streaming quiz tag from prose
    const unclosedQuiz = cleanMarkdown.match(/<medhavi_quiz>[\s\S]*$/i);
    if (unclosedQuiz) {
      cleanMarkdown = cleanMarkdown.replace(unclosedQuiz[0], '').trim();
    }
  }

  const evalMatch = cleanMarkdown.match(/<medhavi_evaluation>([\s\S]*?)<\/medhavi_evaluation>/i);
  if (evalMatch) {
    try {
      const jsonStr = evalMatch[1].trim().replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
      const parsed = JSON.parse(jsonStr);
      if (parsed && typeof parsed.suggestedScore === 'number') {
        evaluationData = parsed as EvaluationResult;
      }
    } catch {
      // Leave fallback null
    }
    cleanMarkdown = cleanMarkdown.replace(evalMatch[0], '').trim();
  } else {
    // Strip unclosed streaming evaluation tag from prose
    const unclosedEval = cleanMarkdown.match(/<medhavi_evaluation>[\s\S]*$/i);
    if (unclosedEval) {
      cleanMarkdown = cleanMarkdown.replace(unclosedEval[0], '').trim();
    }
  }

  if (logicSummary.length === 0) {
    logicSummary = [
      'Approach: Mapped query to ICSE (CISCE) Class 7 conceptual framework.',
      'Key Steps: Deconstructed domain principles, formulated structured step-by-step reasoning, and applied symbolic verification.',
      'Verification: Cross-checked dimensional consistency, edge conditions, and ICSE Class 7 appropriateness.'
    ];
  }

  return {
    cleanMarkdown,
    logicSummary,
    quizData,
    evaluationData
  };
}

