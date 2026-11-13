/**
 * Strict 3-Download Limit Enforcer & Encrypted Assessment Vault
 * for Seth M.R. Jaipuria School (SMRJ) · Jaipuria Medhavi (ICSE Class 7).
 *
 * Security Architecture:
 * - Enforces that any Faculty-generated Question Paper, Unit Test, Periodic Assessment,
 *   or Revision Test can ONLY be downloaded a maximum of 3 times.
 * - Encrypts Teacher Vault test markdown at rest in localStorage (`medhavi_restricted_studio_vault_v2_enc`)
 *   with a stream cipher + per-record MAC so assessment text is never stored in plaintext.
 * - Syncs download consumption with `/api/test-downloads/consume` using server-sealed Teacher identity.
 */

import { constantTimeEquals, type IdVerificationResult } from './medhaviEngine';

export const MAX_TEST_DOWNLOADS = 3;
const LEDGER_STORAGE_KEY = 'medhavi_test_download_ledger_v2';
const LEDGER_SECRET_SALT = 'SMRJ-ICSE-CL7-DOWNLOAD-GUARD-2026';

interface LedgerEntry {
  count: number;
  lastDownloadedAt: number;
  sig: string;
}

type DownloadLedger = Record<string, LedgerEntry>;

function computeEntrySignature(testId: string, count: number): string {
  const raw = `${LEDGER_SECRET_SALT}|${testId}|${count}`;
  let h1 = 0xdeadbeef ^ raw.length;
  let h2 = 0x41c6ce57 ^ raw.length;
  for (let i = 0; i < raw.length; i++) {
    const ch = raw.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36).toUpperCase();
}

/**
 * Generates a deterministic Test ID from the test title/subject/content
 * so the 3-download cap persists across re-renders and sessions.
 */
export function computeTestId(titleOrSubject: string, contentSnippet: string = ''): string {
  const normTitle = titleOrSubject.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  const normSnippet = contentSnippet
    .trim()
    .slice(0, 1000)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 500);

  const normalized = `${normTitle}|${normSnippet}`;
  let hash = 5381;
  for (let i = 0; i < normalized.length; i++) {
    hash = (hash * 33) ^ normalized.charCodeAt(i);
  }
  return `icse-test-${(hash >>> 0).toString(36)}`;
}

function readVerifiedLedger(): DownloadLedger {
  try {
    const raw = localStorage.getItem(LEDGER_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as DownloadLedger;
    if (!parsed || typeof parsed !== 'object') return {};

    const cleanLedger: DownloadLedger = {};
    for (const [testId, entry] of Object.entries(parsed)) {
      if (!entry || typeof entry.count !== 'number' || typeof entry.sig !== 'string') continue;
      const expectedSig = computeEntrySignature(testId, entry.count);
      // If tampered in DevTools, immediately lock at MAX_TEST_DOWNLOADS
      if (!constantTimeEquals(entry.sig, expectedSig)) {
        cleanLedger[testId] = {
          count: MAX_TEST_DOWNLOADS,
          lastDownloadedAt: Date.now(),
          sig: computeEntrySignature(testId, MAX_TEST_DOWNLOADS)
        };
      } else {
        cleanLedger[testId] = entry;
      }
    }
    return cleanLedger;
  } catch {
    return {};
  }
}

function writeVerifiedLedger(ledger: DownloadLedger): void {
  try {
    localStorage.setItem(LEDGER_STORAGE_KEY, JSON.stringify(ledger));
  } catch {
    // Ignore storage quota errors
  }
}

export function getTestDownloadStatus(testId: string): {
  used: number;
  remaining: number;
  max: number;
  locked: boolean;
} {
  const ledger = readVerifiedLedger();
  const entry = ledger[testId];
  const used = entry ? Math.min(MAX_TEST_DOWNLOADS, Math.max(0, entry.count)) : 0;
  const remaining = Math.max(0, MAX_TEST_DOWNLOADS - used);
  return {
    used,
    remaining,
    max: MAX_TEST_DOWNLOADS,
    locked: used >= MAX_TEST_DOWNLOADS
  };
}

export interface StudioVaultTestRecord {
  testId: string;
  facultyId: string;
  subject: string;
  topic: string;
  formatKey: string;
  formatLabel: string;
  marks: number;
  duration: string;
  difficulty: string;
  title: string;
  content: string;
  createdAt: number;
  purged?: boolean;
}

interface EncryptedVaultRecord {
  testId: string;
  facultyId: string;
  subject: string;
  topic: string;
  formatKey: string;
  formatLabel: string;
  marks: number;
  duration: string;
  difficulty: string;
  title: string;
  ciphertext: string;
  mac: string;
  createdAt: number;
  purged?: boolean;
}

const LEGACY_VAULT_STORAGE_KEY = 'medhavi_restricted_studio_vault_v1';
const ENCRYPTED_VAULT_STORAGE_KEY = 'medhavi_restricted_studio_vault_v2_enc';
const STUDIO_TOPIC_MAP_KEY = 'medhavi_restricted_topic_lock_v1';
const VAULT_CIPHER_PEPPER = 'SMRJ-VAULT-CIPHER-KEY-ICSE-CL7-2026';

function deriveStreamByte(keySeed: string, index: number): number {
  let state = 2166136261 ^ index;
  const ch = keySeed.charCodeAt(index % keySeed.length);
  state = Math.imul(state ^ ch, 16777619);
  state ^= state >>> 13;
  state = Math.imul(state, 0x5bd1e995);
  return (state >>> 0) & 0xff;
}

function encryptVaultContent(plaintext: string, testId: string, facultyId: string): string {
  if (!plaintext) return '';
  const encoder = new TextEncoder();
  const bytes = encoder.encode(plaintext);
  const seed = `${VAULT_CIPHER_PEPPER}|${testId}|${facultyId.trim().toUpperCase()}`;
  const out = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) {
    out[i] = bytes[i] ^ deriveStreamByte(seed, i);
  }
  let binary = '';
  for (let i = 0; i < out.length; i++) {
    binary += String.fromCharCode(out[i]);
  }
  return `ENC1:${btoa(binary)}`;
}

function decryptVaultContent(ciphertext: string, testId: string, facultyId: string): string {
  if (!ciphertext || !ciphertext.startsWith('ENC1:')) return '';
  try {
    const rawBase64 = ciphertext.slice(5);
    const binary = atob(rawBase64);
    const bytes = new Uint8Array(binary.length);
    const seed = `${VAULT_CIPHER_PEPPER}|${testId}|${facultyId.trim().toUpperCase()}`;
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i) ^ deriveStreamByte(seed, i);
    }
    return new TextDecoder().decode(bytes);
  } catch {
    return '';
  }
}

function computeVaultRecordMac(
  testId: string,
  facultyId: string,
  ciphertext: string,
  purged: boolean
): string {
  const payload = `${VAULT_CIPHER_PEPPER}|MAC|${testId}|${facultyId
    .trim()
    .toUpperCase()}|${purged ? '1' : '0'}|${ciphertext.length}|${ciphertext.slice(0, 128)}`;
  let h1 = 0x811c9dc5;
  let h2 = 0x9e3779b9;
  for (let i = 0; i < payload.length; i++) {
    const c = payload.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 16777619);
    h2 = Math.imul(h2 ^ c, 2246822519);
  }
  return `VMAC-${(h1 >>> 0).toString(36).toUpperCase()}-${(h2 >>> 0).toString(36).toUpperCase()}`;
}

function readEncryptedVaultAll(): EncryptedVaultRecord[] {
  try {
    // One-time migration from legacy plaintext vault -> encrypted v2 vault
    const legacyRaw = localStorage.getItem(LEGACY_VAULT_STORAGE_KEY);
    if (legacyRaw) {
      try {
        const legacyItems = JSON.parse(legacyRaw) as StudioVaultTestRecord[];
        localStorage.removeItem(LEGACY_VAULT_STORAGE_KEY);
        if (Array.isArray(legacyItems) && legacyItems.length > 0) {
          const migrated: EncryptedVaultRecord[] = legacyItems.map((item) => {
            const dl = getTestDownloadStatus(item.testId);
            const isPurged = Boolean(item.purged || dl.locked);
            const cipher = isPurged
              ? ''
              : encryptVaultContent(item.content || '', item.testId, item.facultyId);
            return {
              testId: item.testId,
              facultyId: item.facultyId,
              subject: item.subject,
              topic: item.topic,
              formatKey: item.formatKey,
              formatLabel: item.formatLabel,
              marks: item.marks,
              duration: item.duration,
              difficulty: item.difficulty,
              title: item.title,
              ciphertext: cipher,
              mac: computeVaultRecordMac(item.testId, item.facultyId, cipher, isPurged),
              createdAt: item.createdAt || Date.now(),
              purged: isPurged
            };
          });
          localStorage.setItem(ENCRYPTED_VAULT_STORAGE_KEY, JSON.stringify(migrated));
          return migrated;
        }
      } catch {
        localStorage.removeItem(LEGACY_VAULT_STORAGE_KEY);
      }
    }

    const raw = localStorage.getItem(ENCRYPTED_VAULT_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as EncryptedVaultRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeEncryptedVaultAll(records: EncryptedVaultRecord[]): void {
  try {
    localStorage.setItem(ENCRYPTED_VAULT_STORAGE_KEY, JSON.stringify(records));
  } catch {
    // Ignore storage errors
  }
}

export function computeTopicFormatKey(subject: string, topic: string, formatKey: string): string {
  const s = subject.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  const t = topic.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  const f = formatKey.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  return computeTestId(`studio-lock-${s}-${f}`, t);
}

export function getTopicFormatLockStatus(subject: string, topic: string, formatKey: string): {
  exists: boolean;
  testId: string;
  used: number;
  remaining: number;
  locked: boolean;
} {
  const canonicalTestId = computeTopicFormatKey(subject, topic, formatKey);
  let mappedTestId = canonicalTestId;
  try {
    const raw = localStorage.getItem(STUDIO_TOPIC_MAP_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Record<string, string>;
      if (parsed && parsed[canonicalTestId]) {
        mappedTestId = parsed[canonicalTestId];
      }
    }
  } catch {
    // ignore
  }
  const status = getTestDownloadStatus(mappedTestId);
  const vault = readEncryptedVaultAll();
  const existsInVault = status.used > 0 || vault.some((item) => item.testId === mappedTestId);

  return {
    exists: existsInVault,
    testId: mappedTestId,
    used: status.used,
    remaining: status.remaining,
    locked: status.locked
  };
}

export function loadStudioVaultTests(facultyId: string): StudioVaultTestRecord[] {
  const encrypted = readEncryptedVaultAll();
  const normFac = facultyId.trim().toUpperCase();

  return encrypted
    .filter((item) => item && item.facultyId.trim().toUpperCase() === normFac)
    .map((item) => {
      const dl = getTestDownloadStatus(item.testId);
      const isPurged = Boolean(item.purged || dl.locked);
      const expectedMac = computeVaultRecordMac(
        item.testId,
        item.facultyId,
        item.ciphertext || '',
        Boolean(item.purged)
      );
      const macValid = typeof item.mac === 'string' && constantTimeEquals(item.mac, expectedMac);

      if (isPurged || !macValid) {
        return {
          testId: item.testId,
          facultyId: item.facultyId,
          subject: item.subject,
          topic: item.topic,
          formatKey: item.formatKey,
          formatLabel: item.formatLabel,
          marks: item.marks,
          duration: item.duration,
          difficulty: item.difficulty,
          title: item.title,
          content: '',
          createdAt: item.createdAt,
          purged: true
        };
      }

      const plaintext = decryptVaultContent(item.ciphertext, item.testId, item.facultyId);
      return {
        testId: item.testId,
        facultyId: item.facultyId,
        subject: item.subject,
        topic: item.topic,
        formatKey: item.formatKey,
        formatLabel: item.formatLabel,
        marks: item.marks,
        duration: item.duration,
        difficulty: item.difficulty,
        title: item.title,
        content: plaintext,
        createdAt: item.createdAt,
        purged: !plaintext
      };
    });
}

export function saveStudioVaultTest(record: StudioVaultTestRecord): void {
  try {
    const canonicalKey = computeTopicFormatKey(record.subject, record.topic, record.formatKey);
    const rawMap = localStorage.getItem(STUDIO_TOPIC_MAP_KEY);
    const mapObj: Record<string, string> = rawMap ? JSON.parse(rawMap) : {};
    mapObj[canonicalKey] = record.testId;
    localStorage.setItem(STUDIO_TOPIC_MAP_KEY, JSON.stringify(mapObj));

    const existing = readEncryptedVaultAll();
    const dl = getTestDownloadStatus(record.testId);
    const isPurged = Boolean(record.purged || dl.locked);
    const cipher = isPurged
      ? ''
      : encryptVaultContent(record.content || '', record.testId, record.facultyId);

    const encRecord: EncryptedVaultRecord = {
      testId: record.testId,
      facultyId: record.facultyId,
      subject: record.subject,
      topic: record.topic,
      formatKey: record.formatKey,
      formatLabel: record.formatLabel,
      marks: record.marks,
      duration: record.duration,
      difficulty: record.difficulty,
      title: record.title,
      ciphertext: cipher,
      mac: computeVaultRecordMac(record.testId, record.facultyId, cipher, isPurged),
      createdAt: record.createdAt || Date.now(),
      purged: isPurged
    };

    const next = [encRecord, ...existing.filter((r) => r.testId !== record.testId)].slice(0, 25);
    writeEncryptedVaultAll(next);
  } catch {
    // ignore storage errors
  }
}

export function purgeStudioVaultTestContent(testId: string): void {
  const existing = readEncryptedVaultAll();
  if (existing.length === 0) return;
  const updated = existing.map((item) =>
    item.testId === testId
      ? {
          ...item,
          ciphertext: '',
          purged: true,
          mac: computeVaultRecordMac(item.testId, item.facultyId, '', true)
        }
      : item
  );
  writeEncryptedVaultAll(updated);
}

export function deleteStudioVaultTest(testId: string): void {
  try {
    const existing = readEncryptedVaultAll();
    const next = existing.filter((item) => item.testId !== testId);
    writeEncryptedVaultAll(next);

    const rawMap = localStorage.getItem(STUDIO_TOPIC_MAP_KEY);
    if (rawMap) {
      const mapObj = JSON.parse(rawMap) as Record<string, string>;
      for (const [key, val] of Object.entries(mapObj)) {
        if (val === testId) {
          delete mapObj[key];
        }
      }
      localStorage.setItem(STUDIO_TOPIC_MAP_KEY, JSON.stringify(mapObj));
    }
  } catch {
    // ignore
  }
}

/**
 * Checks whether a chat message or markdown block represents an ICSE Test,
 * Question Paper, Worksheet, Diagnostic Assessment, or Quiz.
 */
export function isTestOrAssessmentContent(content: string): boolean {
  if (!content) return false;
  if (/<medhavi_quiz>/i.test(content)) return true;
  const lower = content.toLowerCase();
  return (
    (lower.includes('question paper') ||
      lower.includes('unit test') ||
      lower.includes('periodic assessment') ||
      lower.includes('internal assessment') ||
      lower.includes('practice worksheet') ||
      lower.includes('icse worksheet') ||
      lower.includes('maximum marks') ||
      lower.includes('section a') ||
      lower.includes('marking scheme')) &&
    (lower.includes('marks') || lower.includes('question 1') || lower.includes('q1.'))
  );
}

/**
 * Consumes 1 download credit (up to MAX_TEST_DOWNLOADS = 3) both locally and on the server,
 * and triggers a browser download of the formatted ICSE Class 7 test paper.
 * Strictly reserved for the Dedicated Restricted Test Generation Studio.
 */
export async function consumeAndDownloadTest(params: {
  testId: string;
  title: string;
  subject: string;
  content?: string;
  bodyHtmlOrText?: string;
  isHtml?: boolean;
  schoolId?: string;
  verifiedIdentity?: IdVerificationResult;
}): Promise<{
  allowed: boolean;
  used: number;
  remaining: number;
  message: string;
}> {
  const {
    testId,
    title,
    subject,
    content,
    bodyHtmlOrText: rawBody,
    isHtml = false,
    schoolId = 'ANON',
    verifiedIdentity
  } = params;
  const bodyHtmlOrText = rawBody ?? content ?? '';
  const ledger = readVerifiedLedger();
  const currentEntry = ledger[testId];
  let currentUsed = currentEntry ? currentEntry.count : 0;

  if (currentEntry && !constantTimeEquals(currentEntry.sig, computeEntrySignature(testId, currentEntry.count))) {
    currentUsed = MAX_TEST_DOWNLOADS;
  }

  if (currentUsed >= MAX_TEST_DOWNLOADS) {
    purgeStudioVaultTestContent(testId);
    return {
      allowed: false,
      used: MAX_TEST_DOWNLOADS,
      remaining: 0,
      message: `Download limit reached (${MAX_TEST_DOWNLOADS}/${MAX_TEST_DOWNLOADS} used). Each ICSE test can only be downloaded 3 times.`
    };
  }

  // Sync with server-side download limiter using server-sealed Faculty identity
  try {
    const resp = await fetch('/api/test-downloads/consume', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ testId, schoolId, verifiedIdentity })
    });
    if (resp.status === 403 || resp.status === 429) {
      const errData = await resp.json().catch(() => ({}));
      return {
        allowed: false,
        used: currentUsed,
        remaining: Math.max(0, MAX_TEST_DOWNLOADS - currentUsed),
        message:
          errData?.error ||
          'Unauthorized download attempt blocked by Institutional Security Gate.'
      };
    }
    if (resp.ok) {
      const serverData = await resp.json();
      if (serverData && typeof serverData.used === 'number') {
        if (!serverData.allowed || serverData.used > MAX_TEST_DOWNLOADS) {
          ledger[testId] = {
            count: MAX_TEST_DOWNLOADS,
            lastDownloadedAt: Date.now(),
            sig: computeEntrySignature(testId, MAX_TEST_DOWNLOADS)
          };
          writeVerifiedLedger(ledger);
          purgeStudioVaultTestContent(testId);
          return {
            allowed: false,
            used: MAX_TEST_DOWNLOADS,
            remaining: 0,
            message:
              serverData.message ||
              `Download limit reached (${MAX_TEST_DOWNLOADS}/${MAX_TEST_DOWNLOADS} used). Each ICSE test can only be downloaded 3 times.`
          };
        }
        currentUsed = Math.max(currentUsed + 1, serverData.used);
      } else {
        currentUsed += 1;
      }
    } else {
      currentUsed += 1;
    }
  } catch {
    currentUsed += 1;
  }

  const finalUsed = Math.min(MAX_TEST_DOWNLOADS, currentUsed);
  const remaining = Math.max(0, MAX_TEST_DOWNLOADS - finalUsed);

  ledger[testId] = {
    count: finalUsed,
    lastDownloadedAt: Date.now(),
    sig: computeEntrySignature(testId, finalUsed)
  };
  writeVerifiedLedger(ledger);
  if (finalUsed >= MAX_TEST_DOWNLOADS) {
    purgeStudioVaultTestContent(testId);
  }

  const safeTitle = title.replace(/[<>&"]/g, '');
  const safeSubject = subject.replace(/[<>&"]/g, '');
  const formattedBody = isHtml
    ? bodyHtmlOrText
    : `<pre style="white-space: pre-wrap; font-family: Georgia, 'Times New Roman', serif; line-height: 1.65; font-size: 14px;">${bodyHtmlOrText.replace(
        /</g,
        '&lt;'
      )}</pre>`;

  const htmlDoc = `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${safeTitle} — ICSE Class 7 Assessment (Copy ${finalUsed} of ${MAX_TEST_DOWNLOADS})</title>
  <style>
    body {
      font-family: Georgia, 'Times New Roman', serif;
      color: #0f172a;
      background: #ffffff;
      max-width: 820px;
      margin: 0 auto;
      padding: 32px 24px;
      line-height: 1.6;
    }
    .header {
      border-bottom: 2px solid #0f172a;
      padding-bottom: 14px;
      margin-bottom: 22px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .badge {
      font-family: monospace;
      font-size: 11px;
      background: #fef3c7;
      color: #92400e;
      border: 1px solid #f59e0b;
      padding: 4px 10px;
      border-radius: 6px;
      font-weight: bold;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 12px 0;
    }
    th, td {
      border: 1px solid #cbd5e1;
      padding: 8px 10px;
      text-align: left;
      font-size: 13px;
    }
    th {
      background: #f8fafc;
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div style="font-size: 11px; font-weight: bold; letter-spacing: 1px; color: #b45309;">
        SETH M.R. JAIPURIA SCHOOL, LUCKNOW · ICSE (CISCE) CLASS 7 EXCLUSIVE
      </div>
      <h1 style="margin: 6px 0 4px; font-size: 22px;">${safeTitle}</h1>
      <div style="font-size: 12px; color: #475569;">
        Subject: <strong>${safeSubject}</strong> · Board: <strong>ICSE (CISCE) Class 7</strong>
      </div>
    </div>
    <div class="badge">
      AUTHORIZED COPY ${finalUsed} OF ${MAX_TEST_DOWNLOADS}
    </div>
  </div>
  <main>
    ${formattedBody}
  </main>
  <footer style="margin-top: 32px; padding-top: 12px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #64748b; display: flex; justify-content: space-between;">
    <span>Tamso Ma Jyotirgamaya · Jaipuria Medhavi ICSE Assessment Security</span>
    <span>Download ${finalUsed}/${MAX_TEST_DOWNLOADS} (${remaining} remaining)</span>
  </footer>
</body>
</html>`;

  const blob = new Blob([htmlDoc], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const slug = safeTitle
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 45);
  a.href = url;
  a.download = `${slug || 'icse-class7-test'}-copy-${finalUsed}-of-${MAX_TEST_DOWNLOADS}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  window.dispatchEvent(new CustomEvent('medhavi:test-download-updated', { detail: { testId } }));

  return {
    allowed: true,
    used: finalUsed,
    remaining,
    message:
      remaining > 0
        ? `Test downloaded (Copy ${finalUsed} of ${MAX_TEST_DOWNLOADS}). ${remaining} download${
            remaining === 1 ? '' : 's'
          } remaining.`
        : `Final allowed copy downloaded (${MAX_TEST_DOWNLOADS} of ${MAX_TEST_DOWNLOADS}). Assessment ciphertext has been permanently purged from the vault.`
  };
}
