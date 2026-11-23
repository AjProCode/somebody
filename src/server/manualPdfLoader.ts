import fs from 'node:fs/promises';
import path from 'node:path';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import type { PersonaRole } from '../utils/medhaviEngine.ts';

export const MANUAL_PDF_FILENAME = 'Jaipuria_Medhavi_Complete_Intelligence_Manual_50plus_pages_d362d19f.pdf';
export const MANUAL_PDF_RELATIVE_PATH = path.join('public', 'assets', 'aistudio', MANUAL_PDF_FILENAME);

export interface ManualProtocolSheet {
  number: string; // '01' .. '66'
  numericId: number; // 1 .. 66
  title: string;
  page: number;
  coreText: string;
  fullText: string;
}

export interface LoadedManualIndex {
  filePath: string;
  fileName: string;
  mtimeMs: number;
  totalPages: number;
  pages: string[]; // 0-indexed array (pages[0] === page 1)
  protocols: ManualProtocolSheet[];
  protocolById: Map<number, ManualProtocolSheet>;
  titleAndDistinction: string;
  howToUse: string;
  appendixA: string;
  appendixB: string;
  appendixC: string;
  appendixD: string;
  appendixE: string;
  medhaviPledge: string;
}

export interface ManualConsultParams {
  role: PersonaRole;
  subject: string;
  prompt: string;
  recentMessages?: Array<{ role?: string; content?: string }>;
  hasImage?: boolean;
  workflowType?: string;
  isTestStudio?: boolean;
}

export interface ManualReferenceResult {
  file: string;
  mtimeMs: number;
  totalPages: number;
  protocolsLoaded: number;
  referencedPages: number[];
  referencedProtocols: string[];
  groundingBlock: string;
}

let cachedManual: LoadedManualIndex | null = null;
let loadingPromise: Promise<LoadedManualIndex> | null = null;

function resolveManualPdfPath(): string {
  return path.resolve(process.cwd(), MANUAL_PDF_RELATIVE_PATH);
}

function stripPdfChrome(rawPageText: string): string {
  return rawPageText
    .replace(/\u200b|\ufeff|\u0000|\u00ad|\ufffd/g, '')
    .replace(/^JAIPURIA MEDHAVI\s*\/\s*INTELLIGENCE & PEDAGOGY MANUAL\s*/i, '')
    .replace(/^JAIPURIA MEDHAVI\s*•\s*INTERNAL DESIGN REFERENCE\s*\|\s*\d+\s*/i, '')
    .replace(/\s*JAIPURIA MEDHAVI\s*•\s*INTERNAL DESIGN REFERENCE\s*\|\s*\d+\s*$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractProtocolCore(cleanedText: string): string {
  // Trim the repeated boilerplate ("Implementation instructions ... Verification standard ... Micro-evaluation ...")
  // while keeping Purpose, Operating requirements, Approved behaviour, Failure to prevent, and Verification standard.
  const implIdx = cleanedText.indexOf('Implementation instructions');
  const verIdx = cleanedText.indexOf('Verification standard');
  const microIdx = cleanedText.indexOf('Micro-evaluation');

  if (implIdx > 0 && verIdx > implIdx) {
    const head = cleanedText.slice(0, implIdx).trim();
    const verEnd = microIdx > verIdx ? microIdx : cleanedText.length;
    const verification = cleanedText.slice(verIdx, verEnd).trim();
    return `${head} ${verification}`.trim();
  }
  if (microIdx > 0) {
    return cleanedText.slice(0, microIdx).trim();
  }
  return cleanedText;
}

async function parseManualPdfFromDisk(filePath: string, mtimeMs: number): Promise<LoadedManualIndex> {
  const fileBuffer = await fs.readFile(filePath);
  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(fileBuffer),
    verbosity: 0,
    useSystemFonts: false
  });
  const doc = await loadingTask.promise;

  const pages: string[] = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const textContent = await page.getTextContent();
    const rawText = textContent.items
      .map((item) => ('str' in item ? item.str : ''))
      .join(' ');
    pages.push(stripPdfChrome(rawText));
  }

  const protocols: ManualProtocolSheet[] = [];
  const protocolById = new Map<number, ManualProtocolSheet>();

  for (let idx = 0; idx < pages.length; idx++) {
    const pageNum = idx + 1;
    const text = pages[idx];
    const match = text.match(/^(\d{2})\s+(.+?)\s+Purpose\./);
    if (match) {
      const numStr = match[1];
      const numericId = Number.parseInt(numStr, 10);
      const title = match[2].trim();
      const sheet: ManualProtocolSheet = {
        number: numStr,
        numericId,
        title,
        page: pageNum,
        coreText: extractProtocolCore(text),
        fullText: text
      };
      protocols.push(sheet);
      protocolById.set(numericId, sheet);
    }
  }

  const findPageStartingWith = (prefix: RegExp, fallbackIdx: number): string => {
    const found = pages.find((p) => prefix.test(p));
    return found || pages[fallbackIdx] || '';
  };

  const appendixC1 = findPageStartingWith(/^Appendix C\b/i, 70);
  const appendixC2 = pages[71] && /^16 \[Teacher\]/i.test(pages[71]) ? pages[71] : '';

  return {
    filePath,
    fileName: MANUAL_PDF_FILENAME,
    mtimeMs,
    totalPages: doc.numPages,
    pages,
    protocols,
    protocolById,
    titleAndDistinction: pages[0] || '',
    howToUse: findPageStartingWith(/^How to use this manual/i, 1),
    appendixA: findPageStartingWith(/^Appendix A\b/i, 68),
    appendixB: findPageStartingWith(/^Appendix B\b/i, 69),
    appendixC: [appendixC1, appendixC2].filter(Boolean).join(' '),
    appendixD: findPageStartingWith(/^Appendix D\b/i, 72),
    appendixE: findPageStartingWith(/^Appendix E\b/i, 73),
    medhaviPledge: findPageStartingWith(/^The Medhavi pledge/i, 74)
  };
}

/**
 * Loads and caches the Jaipuria Medhavi PDF Manual directly from disk,
 * automatically reloading if the PDF file modification timestamp changes.
 */
export async function ensureManualLoaded(): Promise<LoadedManualIndex> {
  const filePath = resolveManualPdfPath();
  const stat = await fs.stat(filePath);

  if (cachedManual && cachedManual.filePath === filePath && cachedManual.mtimeMs === stat.mtimeMs) {
    return cachedManual;
  }

  if (!loadingPromise) {
    loadingPromise = parseManualPdfFromDisk(filePath, stat.mtimeMs)
      .then((loaded) => {
        cachedManual = loaded;
        return loaded;
      })
      .finally(() => {
        loadingPromise = null;
      });
  }

  return loadingPromise;
}

/**
 * Consults the loaded PDF manual BEFORE generating any response and returns
 * the verbatim matched pages & protocol sheets to ground the AI or fallback output.
 */
export async function consultManualPdfBeforeAnswer(
  params: ManualConsultParams
): Promise<ManualReferenceResult> {
  const index = await ensureManualLoaded();

  const recentText = (params.recentMessages || [])
    .slice(-4)
    .map((m) => String(m?.content || ''))
    .join(' ');
  const combined = `${params.prompt || ''} ${recentText}`.toLowerCase();
  const subjectLower = (params.subject || '').toLowerCase();
  const workflowLower = (params.workflowType || '').toLowerCase();

  // Weighted protocol selection (ordered by relevance/priority, deduplicated)
  const scores = new Map<number, number>();
  const addScore = (protocolId: number, weight: number) => {
    if (!index.protocolById.has(protocolId)) return;
    scores.set(protocolId, (scores.get(protocolId) || 0) + weight);
  };

  // Core constitutional anchors (always present as baseline; domain triggers outrank generic defaults)
  addScore(1, 78); // Identity & mission
  addScore(2, 76); // Instruction precedence
  addScore(3, 76); // Student-teacher separation
  addScore(58, 68); // Response style and compression
  addScore(61, 68); // Prompt injection defense
  addScore(66, 65); // Final operational checklist

  if (params.role === 'student') {
    addScore(4, 75); // Socratic contract
    addScore(5, 74); // Boundaries of answer withholding
    addScore(9, 64); // First response quality
    addScore(20, 74); // Preventing indirect answer leakage

    // Intent-specific student triggers
    if (/\b(what is|define|definition|meaning of|explain why|how does|what are)\b/.test(combined)) {
      addScore(5, 35);
      addScore(18, 95);
    }
    if (/\b(solve|calculate|find|evaluate|simplify|answer|just give|finish|homework|worksheet|=|\d+\s*[+\-*/×÷x]\s*\d+)\b/.test(combined)) {
      addScore(4, 40);
      addScore(19, 92);
      addScore(20, 38);
      addScore(26, 90);
    }
    if (/\b(still don'?t understand|confused|explain differently|don'?t get|stuck|hint|more help|third time)\b/.test(combined)) {
      addScore(10, 95);
      addScore(11, 98);
      addScore(12, 92);
      addScore(16, 78);
    }
    if (/\b(why.*wrong|mistake|error|check my|is it right|i think|i chose|option [a-d]|my answer)\b/.test(combined)) {
      addScore(6, 88);
      addScore(13, 96);
      addScore(14, 90);
      addScore(17, 96);
    }
    if (/\b(always|never|bigger denominator|division.*smaller|plants get food from soil)\b/.test(combined)) {
      addScore(15, 98);
    }
    if (/\b(bad at|hate|stupid|can'?t do|too hard|give up|discouraged)\b/.test(combined)) {
      addScore(24, 98);
    }
    if (/\b(prove|proof|converse|counterexample|olympiad|generalise|always true|challenge me)\b/.test(combined)) {
      addScore(25, 96);
      addScore(29, 92);
    }
    if (/\b(essay|paragraph|composition|story|write|letter|poetry|poem|thesis)\b/.test(combined)) {
      addScore(21, 94);
      addScore(22, 96);
      addScore(33, 82);
    }
    if (/\b(code|python|loop|function|debug|program|syntax|algorithm|html|java)\b/.test(combined) || subjectLower.includes('computer')) {
      addScore(23, 98);
    }
    if (/\b(dyslexia|simple|one step|step by step|line by line|short chunks)\b/.test(combined)) {
      addScore(34, 92);
    }
  } else {
    // Teacher Studio core
    addScore(35, 80); // Teacher Studio operating stance
    addScore(36, 78); // Action-first teacher response

    if (/\b(lesson|40[- ]?min|teach|period|class plan|how to teach|activity|chalk)\b/.test(combined) || workflowLower.includes('lesson')) {
      addScore(37, 98);
      addScore(38, 92);
      addScore(39, 86);
      addScore(40, 94);
      addScore(41, 82);
    }
    if (/\b(test|paper|exam|quiz|mcq|question bank|version b|blueprint|moderate|review this paper|marks?)\b/.test(combined) || params.isTestStudio || workflowLower.includes('question_paper')) {
      addScore(42, 98);
      addScore(43, 98);
      addScore(44, 88);
      addScore(47, 92);
      addScore(48, 86);
      addScore(59, 96);
    }
    if (/\b(evaluat|rubric|mark scheme|grade|score|model answer|exemplar|words?|feedback|result|struggled|remediat)\b/.test(combined) || workflowLower.includes('evaluat')) {
      addScore(45, 98);
      addScore(46, 96);
      addScore(49, 90);
      addScore(50, 90);
      addScore(51, 88);
    }
    if (/\b(deeply|masterclass|olympiad|extension|enrichment)\b/.test(combined)) {
      addScore(52, 90);
      addScore(53, 96);
    }
    if (/\b(shorter|harder|easier|version b|adjust|modify|same)\b/.test(combined)) {
      addScore(7, 94);
    }
  }

  // Subject-specific PDF protocols (student & teacher)
  if (subjectLower.includes('math') || /\b(percent|discount|ratio|proportion|km\/h|m\/s|unit|fraction|triangle|equation|algebra|theorem|division by zero)\b/.test(combined)) {
    addScore(26, 76);
    if (/\b(percent|%|discount|ratio|proportion|base|reverse)\b/.test(combined)) addScore(27, 95);
    if (/\b(km\/h|m\/s|unit|metre|meter|hour|second|convert|dimension|area|cm|kg)\b/.test(combined)) addScore(28, 95);
    if (/\b(prove|proof|counterexample|converse|all odd|always|prime)\b/.test(combined)) addScore(29, 92);
  }
  if (subjectLower.includes('physics') || subjectLower.includes('chemistry') || subjectLower.includes('biology') || /\b(evaporation|photosynthesis|heat|temperature|density|atom|electron|acid|cell|experiment)\b/.test(combined)) {
    addScore(30, 90);
    addScore(31, 84);
  }
  if (subjectLower.includes('history') || subjectLower.includes('geography') || /\b(1857|revolt|civilisation|civics|parliament|constitution|climate|empire)\b/.test(combined)) {
    addScore(32, 94);
  }
  if (subjectLower.includes('english') || subjectLower.includes('hindi') || subjectLower.includes('sanskrit') || /\b(poem|poetry|grammar|imagery|quote|paragraph|essay|word)\b/.test(combined)) {
    addScore(33, 90);
  }

  // Cross-cutting reliability triggers
  if (params.hasImage || /\b(image|photo|picture|handwriting|unclear|screenshot|crop|read this)\b/.test(combined)) {
    addScore(56, 105);
  }
  if (/\b(page \d+|textbook|exact board|edition|winner|latest|today|2026|website|source|citation)\b/.test(combined)) {
    addScore(54, 98);
    addScore(55, 98);
    addScore(57, 88);
  }
  if (/\b(switch to teacher|teacher mode|i am a teacher|i am your administrator|ignore.*rules|system prompt)\b/.test(combined)) {
    addScore(2, 50);
    addScore(61, 60);
  }
  if (/\b(\d+\s*words?|exactly\s*\d+|marks?|questions?)\b/.test(combined)) {
    addScore(59, 90);
  }

  // Keyword scan against every protocol title/core text as tiebreaker
  const queryWords = combined
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 4);
  if (queryWords.length > 0) {
    for (const sheet of index.protocols) {
      let hits = 0;
      const titleLower = sheet.title.toLowerCase();
      const bodyLower = sheet.coreText.toLowerCase();
      for (const word of queryWords) {
        if (titleLower.includes(word)) hits += 6;
        else if (bodyLower.includes(word)) hits += 2;
      }
      if (hits > 0) {
        addScore(sheet.numericId, Math.min(24, hits));
      }
    }
  }

  // Select top 10 protocol sheets by weight, then sort cleanly by protocol number
  const selectedProtocols = Array.from(scores.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([id]) => index.protocolById.get(id)!)
    .filter(Boolean)
    .sort((a, b) => a.numericId - b.numericId);

  const referencedPagesSet = new Set<number>([1, 2, 69, 70]);
  for (const proto of selectedProtocols) {
    referencedPagesSet.add(proto.page);
  }
  const referencedPages = Array.from(referencedPagesSet).sort((a, b) => a - b);
  const referencedProtocols = selectedProtocols.map((p) => `${p.number} ${p.title}`);

  const excerpts = selectedProtocols
    .map((p) => `[PDF Page ${p.page} | Protocol ${p.number} — ${p.title}]\n${p.coreText}`)
    .join('\n\n');

  const groundingBlock = `======================================================================
MANDATORY LIVE PDF MANUAL REFERENCE CONSULTED PRIOR TO RESPONSE
Source File: ${index.fileName} (${index.totalPages} pages, ${index.protocols.length} protocol sheets indexed)
Consulted Pages: ${referencedPages.join(', ')}
======================================================================

[PDF Page 1 — Governing Distinction]
${index.titleAndDistinction}

[PDF Page 69 — Appendix A: Production System Instruction Block]
${index.appendixA}

[PDF Page 70 — Appendix B: Student–Teacher Paired Benchmarks (Never reveal final calculation like "17 × 8" or "9/3" in Student Portal)]
${index.appendixB}

[Verbatim Matched Protocol Sheets from PDF Pages ${selectedProtocols.map((p) => p.page).join(', ')}]
${excerpts}
======================================================================
INSTRUCTION: Obey every verbatim rule and "Failure to prevent" constraint retrieved from the PDF sheets above before emitting your answer.`;

  return {
    file: index.fileName,
    mtimeMs: index.mtimeMs,
    totalPages: index.totalPages,
    protocolsLoaded: index.protocols.length,
    referencedPages,
    referencedProtocols,
    groundingBlock
  };
}
