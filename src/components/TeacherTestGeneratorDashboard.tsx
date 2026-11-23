import React, { useState, useEffect, useCallback } from 'react';
import {
  FileText,
  Sliders,
  Download,
  Lock,
  ShieldAlert,
  ShieldCheck,
  EyeOff,
  Eye,
  Sparkles,
  Loader2,
  FolderLock,
  KeyRound,
  Trash2,
  X,
  Activity
} from 'lucide-react';
import {
  LOCKED_GRADE,
  parseMedhaviResponse,
  verifyInstitutionalPassword,
  type IdVerificationResult,
  type CustomSpecItem
} from '../utils/medhaviEngine';
import {
  computeTopicFormatKey,
  getTopicFormatLockStatus,
  getTestDownloadStatus,
  consumeAndDownloadTest,
  loadStudioVaultTests,
  saveStudioVaultTest,
  deleteStudioVaultTest,
  purgeStudioVaultTestContent,
  MAX_TEST_DOWNLOADS,
  type StudioVaultTestRecord
} from '../utils/testDownloadLimiter';
import { renderScholarlyMarkdown } from '../utils/markdownRenderer';
import { formatHistoryTimestamp } from '../utils/studioHistory';

export interface TeacherTestGeneratorDashboardProps {
  isLight: boolean;
  activeSubject: string;
  verifiedIdentity: IdVerificationResult;
  selectedModel: string;
  customSpecs: CustomSpecItem[];
  curtainUnlockedInSession: boolean;
  onUnlockCurtainInSession: () => void;
  onShowToast: (message: string, type?: 'info' | 'error' | 'success') => void;
}

type StudioTestFormatKey =
  | 'unit_test'
  | 'periodic'
  | 'half_yearly'
  | 'worksheet'
  | 'diagnostic_quiz'
  | 'revision_test';

interface SecurityAuditEntry {
  id: string;
  time: string;
  event: string;
  severity: 'info' | 'warn' | 'critical';
}

const FORMAT_SPECS: Record<
  StudioTestFormatKey,
  { label: string; marks: number; duration: string; qCount: string; structureHint: string }
> = {
  unit_test: {
    label: 'ICSE Unit Test',
    marks: 25,
    duration: '45 Minutes',
    qCount: '8–10 Questions',
    structureHint: 'Section A (10M Objective & Short) + Section B (15M Structured Step-Marked)'
  },
  periodic: {
    label: 'ICSE Periodic Assessment',
    marks: 40,
    duration: '90 Minutes',
    qCount: '14–16 Questions',
    structureHint: 'Section A (20M Compulsory) + Section B (20M Analytical Sub-parts)'
  },
  half_yearly: {
    label: 'ICSE Term Examination',
    marks: 80,
    duration: '2.5 Hours',
    qCount: 'Section A + B',
    structureHint: 'Section A (40M Compulsory Objective/2M) + Section B (40M Structured 3M/3M/4M)'
  },
  worksheet: {
    label: 'ICSE Practice Worksheet',
    marks: 20,
    duration: '40 Minutes',
    qCount: '10 Graded Problems',
    structureHint: 'Part I Concept Drill (8M) + Part II CISCE Application Problems (12M)'
  },
  diagnostic_quiz: {
    label: 'ICSE Diagnostic Competency Quiz',
    marks: 15,
    duration: '20 Minutes',
    qCount: '10 Competency Items',
    structureHint: '10 ICSE Class 7 Conceptual & Assertion-Reasoning MCQs + 5M Short Check'
  },
  revision_test: {
    label: 'Jaipuria ICSE Revision Test',
    marks: 30,
    duration: '45 Minutes',
    qCount: '15 High-Logic MCQs',
    structureHint: '15 Analytical ICSE Class 7 Problems (+2 / -1 Scoring)'
  }
};

export const TeacherTestGeneratorDashboard: React.FC<TeacherTestGeneratorDashboardProps> = ({
  isLight,
  activeSubject,
  verifiedIdentity,
  selectedModel,
  customSpecs,
  curtainUnlockedInSession,
  onUnlockCurtainInSession,
  onShowToast
}) => {
  // Vault Clearance Gate (Requires institutional password confirmation inside the isolated studio)
  const [vaultUnlocked, setVaultUnlocked] = useState<boolean>(false);
  const [vaultPasswordInput, setVaultPasswordInput] = useState<string>('');
  const [showVaultPass, setShowVaultPass] = useState<boolean>(false);
  const [vaultGateError, setVaultGateError] = useState<string | null>(null);

  // Studio Form State (Strictly NO recitation options)
  const [topic, setTopic] = useState<string>('');
  const [testFormat, setTestFormat] = useState<StudioTestFormatKey>('unit_test');
  const [difficultyTier, setDifficultyTier] = useState<'Standard' | 'Challenging' | 'Advanced'>(
    'Standard'
  );
  const [includeAnswerKey, setIncludeAnswerKey] = useState<boolean>(true);
  const [includeMarkingScheme, setIncludeMarkingScheme] = useState<boolean>(true);

  // Isolated Encrypted Studio Vault & Streaming State
  const [vaultRecords, setVaultRecords] = useState<StudioVaultTestRecord[]>(() =>
    loadStudioVaultTests(verifiedIdentity.schoolId)
  );
  const [activeTestId, setActiveTestId] = useState<string | null>(() => {
    const initial = loadStudioVaultTests(verifiedIdentity.schoolId);
    return initial[0]?.testId || null;
  });
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [streamingContent, setStreamingContent] = useState<string>('');
  const [streamingTitle, setStreamingTitle] = useState<string>('');
  const [refreshTick, setRefreshTick] = useState<number>(0);

  // Privacy Curtain State (Session-scoped first-trigger password gate)
  const [privacyCurtainActive, setPrivacyCurtainActive] = useState<boolean>(false);
  const [privacyCurtainReason, setPrivacyCurtainReason] = useState<string>('');
  const [curtainPasswordInput, setCurtainPasswordInput] = useState<string>('');
  const [curtainGateError, setCurtainGateError] = useState<string | null>(null);
  const [securityAlertCount, setSecurityAlertCount] = useState<number>(0);
  const [auditLog, setAuditLog] = useState<SecurityAuditEntry[]>([]);

  const pushAuditEvent = useCallback(
    (event: string, severity: SecurityAuditEntry['severity'] = 'info') => {
      const now = new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
      setAuditLog((prev) =>
        [
          {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            time: now,
            event,
            severity
          },
          ...prev
        ].slice(0, 12)
      );
    },
    []
  );

  const refreshVault = useCallback(() => {
    setVaultRecords(loadStudioVaultTests(verifiedIdentity.schoolId));
    setRefreshTick((t) => t + 1);
  }, [verifiedIdentity.schoolId]);

  useEffect(() => {
    refreshVault();
  }, [refreshVault]);

  // Scoped Studio Lockdown Listeners: Anti-Copy, Anti-Cut, Anti-ContextMenu, Anti-Print, Anti-DevTools & Focus-Loss Blackout
  useEffect(() => {
    if (!vaultUnlocked) return;

    const triggerCurtain = (reason: string, severity: SecurityAuditEntry['severity'] = 'warn') => {
      setPrivacyCurtainActive(true);
      setPrivacyCurtainReason(reason);
      setSecurityAlertCount((c) => c + 1);
      pushAuditEvent(reason, severity);
    };

    const handleBlockedClipboard = (e: ClipboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setSecurityAlertCount((c) => c + 1);
      pushAuditEvent('Blocked clipboard copy/cut attempt inside Studio', 'warn');
      onShowToast(
        'Studio Restriction: Copying or cutting ICSE test content is strictly disabled.',
        'error'
      );
    };

    const handleBlockedContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const keyLower = e.key.toLowerCase();
      const isPrintOrSave = (e.ctrlKey || e.metaKey) && (keyLower === 'p' || keyLower === 's');
      const isViewSource = (e.ctrlKey || e.metaKey) && keyLower === 'u';
      const isDevTools =
        e.key === 'F12' ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && ['i', 'j', 'c'].includes(keyLower));
      const isCopyCut = (e.ctrlKey || e.metaKey) && (keyLower === 'c' || keyLower === 'x');
      const isMacShot = e.metaKey && e.shiftKey && ['3', '4', '5'].includes(e.key);
      const isWinSnip = e.metaKey && e.shiftKey && keyLower === 's';
      const isPrintScreen = e.key === 'PrintScreen';

      if (isPrintScreen || isMacShot || isWinSnip || isPrintOrSave || isDevTools || isViewSource) {
        e.preventDefault();
        e.stopPropagation();
        try {
          void navigator.clipboard?.writeText('');
        } catch {
          // ignore
        }
        triggerCurtain(
          isDevTools || isViewSource
            ? 'Inspector / source shortcut intercepted. Assessment viewport concealed.'
            : 'Screenshot or print shortcut intercepted. Viewport concealed under institutional policy.',
          'critical'
        );
        onShowToast(
          'Security Lockdown: Screenshots, printing, and inspector shortcuts are prohibited in the Restricted Test Studio.',
          'error'
        );
      } else if (isCopyCut) {
        const target = e.target as HTMLElement | null;
        const isFormInput =
          target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA');
        if (!isFormInput) {
          e.preventDefault();
          e.stopPropagation();
          setSecurityAlertCount((c) => c + 1);
          pushAuditEvent('Blocked keyboard copy shortcut on protected paper', 'warn');
          onShowToast('Studio Restriction: Keyboard copy is blocked on assessments.', 'error');
        }
      }
    };

    const handleWindowBlur = () => {
      if (activeTestId || isGenerating) {
        triggerCurtain(
          'Window focus lost (external capture guard). Verify or click below to restore secure viewing.',
          'warn'
        );
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden && (activeTestId || isGenerating)) {
        triggerCurtain(
          'Browser tab switched while Restricted Test Studio was active. Viewport concealed.',
          'warn'
        );
      }
    };

    const handleDownloadSync = () => refreshVault();

    window.addEventListener('copy', handleBlockedClipboard, true);
    window.addEventListener('cut', handleBlockedClipboard, true);
    window.addEventListener('contextmenu', handleBlockedContextMenu, true);
    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('blur', handleWindowBlur);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('medhavi:test-download-updated', handleDownloadSync);

    return () => {
      window.removeEventListener('copy', handleBlockedClipboard, true);
      window.removeEventListener('cut', handleBlockedClipboard, true);
      window.removeEventListener('contextmenu', handleBlockedContextMenu, true);
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('blur', handleWindowBlur);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('medhavi:test-download-updated', handleDownloadSync);
    };
  }, [vaultUnlocked, activeTestId, isGenerating, onShowToast, refreshVault, pushAuditEvent]);

  const handleUnlockVault = (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyInstitutionalPassword(vaultPasswordInput)) {
      setVaultGateError('Incorrect institutional security password. Studio remains sealed.');
      return;
    }
    setVaultGateError(null);
    setVaultPasswordInput('');
    setVaultUnlocked(true);
    pushAuditEvent(
      `Vault unsealed by ${verifiedIdentity.extractedName} (${verifiedIdentity.schoolId})`,
      'info'
    );
    onShowToast('Restricted ICSE Test Generation Studio unlocked for verified faculty.', 'success');
  };

  // First-time Privacy Curtain password verification (resets ONLY on logout/login via App.tsx)
  const handleUnlockCurtainFirstTime = (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyInstitutionalPassword(curtainPasswordInput)) {
      setCurtainGateError('Invalid institutional faculty password. Viewport remains concealed.');
      pushAuditEvent('Failed first-time Privacy Curtain password check', 'critical');
      return;
    }
    setCurtainGateError(null);
    setCurtainPasswordInput('');
    onUnlockCurtainInSession();
    setPrivacyCurtainActive(false);
    pushAuditEvent(
      'First-trigger Privacy Curtain verified with Faculty Password (session unlocked)',
      'info'
    );
    onShowToast(
      'Privacy Curtain verified. Subsequent triggers in this login session will restore with 1 click.',
      'success'
    );
  };

  const handleToggleManualCurtain = () => {
    if (!privacyCurtainActive) {
      setPrivacyCurtainReason('Manually concealed by educator for classroom projection privacy.');
      setPrivacyCurtainActive(true);
      pushAuditEvent('Educator engaged manual Privacy Curtain', 'info');
    } else if (curtainUnlockedInSession) {
      setPrivacyCurtainActive(false);
      pushAuditEvent('Educator restored viewport (session pre-verified)', 'info');
    }
  };

  const handleConfirmDeleteVaultTest = (testId: string) => {
    deleteStudioVaultTest(testId);
    setConfirmDeleteId(null);
    refreshVault();
    if (activeTestId === testId) {
      const remainingList = loadStudioVaultTests(verifiedIdentity.schoolId);
      setActiveTestId(remainingList[0]?.testId || null);
    }
    pushAuditEvent(`Deleted assessment ${testId} from encrypted vault`, 'info');
    onShowToast('Assessment paper permanently deleted from the Studio Vault.', 'success');
  };

  const handleGenerateIsolatedTest = async () => {
    if (isGenerating) return;

    const cleanTopic = topic.trim() || `ICSE Class 7 ${activeSubject} Core Syllabus`;
    const spec = FORMAT_SPECS[testFormat];

    // Anti-Duplication Security Check: Prevent regenerating the same Subject + Topic + Format
    const dupCheck = getTopicFormatLockStatus(activeSubject, cleanTopic, testFormat);
    if (dupCheck.exists) {
      if (dupCheck.locked) {
        onShowToast(
          `Anti-Duplication Lock: "${cleanTopic}" (${spec.label}) already used all 3/3 downloads and cannot be regenerated.`,
          'error'
        );
        setActiveTestId(dupCheck.testId);
        return;
      }
      const existingInVault = vaultRecords.find((r) => r.testId === dupCheck.testId);
      if (existingInVault) {
        setActiveTestId(existingInVault.testId);
        onShowToast(
          `Anti-Duplication Guard: Loaded existing "${spec.label}" on "${cleanTopic}" (${dupCheck.remaining}/${MAX_TEST_DOWNLOADS} downloads remaining).`,
          'info'
        );
        return;
      }
    }

    const deterministicTestId = computeTopicFormatKey(activeSubject, cleanTopic, testFormat);
    const paperTitle = `ICSE Class 7 ${activeSubject} — ${spec.label}: ${cleanTopic}`;

    const prompt = `[RESTRICTED ICSE TEST GENERATION VAULT]
Generate an official, ready-to-administer ICSE (CISCE) Class 7 written assessment for Seth M.R. Jaipuria School, Lucknow:
- Board: ICSE (CISCE — Council for the Indian School Certificate Examinations) EXCLUSIVE
- Grade: Class 7 (Locked)
- Subject: ${activeSubject}
- Syllabus Topic / Chapter: ${cleanTopic}
- Assessment Type: ${spec.label}
- Maximum Marks: ${spec.marks} Marks
- Time Allowed: ${spec.duration}
- Difficulty Calibration: ${difficultyTier}
- Required Structure: ${spec.structureHint}
- Strict Guidelines:
  * Written ICSE assessment only (strictly NO oral recitation tasks).
  * Clearly show marks in brackets [ ] beside every question and sub-part.
  ${
    includeAnswerKey
      ? '* Include a complete step-by-step ICSE Answer Key at the end.'
      : '* Do NOT include answers (Question Paper only).'
  }
  ${
    includeMarkingScheme
      ? '* Include CISCE Question-wise Step Marking distribution (formula, working, SI units / terminology).'
      : ''
  }
  * Open with official header: "SETH M.R. JAIPURIA SCHOOL, LUCKNOW · ICSE (CISCE) CLASS 7 ${activeSubject.toUpperCase()} ASSESSMENT".`;

    setIsGenerating(true);
    setPrivacyCurtainActive(false);
    setStreamingContent('');
    setStreamingTitle(paperTitle);
    setActiveTestId(deterministicTestId);

    try {
      let accumulated = '';
      try {
        const resp = await fetch('/api/chat/stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [{ role: 'user', content: prompt }],
            context: {
              role: 'teacher',
              grade: LOCKED_GRADE,
              subject: activeSubject,
              intelligenceMode: 'pedagogical',
              model: selectedModel,
              customSpecs,
              workflowType: 'question_paper_generator',
              isTestStudio: true
            },
            verifiedIdentity
          })
        });

        if (resp.ok && resp.body) {
          const reader = resp.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';

          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const chunks = buffer.split('\n\n');
            buffer = chunks.pop() || '';
            for (const block of chunks) {
              const line = block.trim();
              if (!line.startsWith('data:')) continue;
              try {
                const evt = JSON.parse(line.replace(/^data:\s*/, ''));
                if (evt.type === 'delta' && evt.content) {
                  accumulated += evt.content;
                  setStreamingContent(accumulated);
                }
              } catch {
                // ignore partial chunk
              }
            }
          }
        }
      } catch {
        // Fallback to unary /api/chat below
      }

      if (!accumulated.trim()) {
        const fallbackResp = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [{ role: 'user', content: prompt }],
            context: {
              role: 'teacher',
              grade: LOCKED_GRADE,
              subject: activeSubject,
              intelligenceMode: 'pedagogical',
              model: selectedModel,
              customSpecs,
              workflowType: 'question_paper_generator',
              isTestStudio: true
            },
            verifiedIdentity
          })
        });
        if (fallbackResp.ok) {
          const data = await fallbackResp.json();
          if (data.reply) accumulated = data.reply;
        }
      }

      if (!accumulated.trim()) {
        throw new Error('Could not generate assessment in Restricted Studio.');
      }

      const parsed = parseMedhaviResponse(accumulated);
      const cleanPaperMarkdown = parsed.cleanMarkdown || accumulated;

      const record: StudioVaultTestRecord = {
        testId: deterministicTestId,
        facultyId: verifiedIdentity.schoolId,
        subject: activeSubject,
        topic: cleanTopic,
        formatKey: testFormat,
        formatLabel: spec.label,
        marks: spec.marks,
        duration: spec.duration,
        difficulty: difficultyTier,
        title: paperTitle,
        content: cleanPaperMarkdown,
        createdAt: Date.now(),
        purged: false
      };

      saveStudioVaultTest(record);
      refreshVault();
      setActiveTestId(deterministicTestId);
      setStreamingContent('');
      pushAuditEvent(`Encrypted & stored "${spec.label}" (${cleanTopic}) in Vault`, 'info');
      onShowToast(
        `${spec.label} encrypted inside Restricted Studio Vault (${MAX_TEST_DOWNLOADS} downloads permitted).`,
        'success'
      );
    } catch (err: any) {
      onShowToast(err?.message || 'Test generation failed inside Restricted Studio.', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const activeRecord = vaultRecords.find((r) => r.testId === activeTestId) || null;
  void refreshTick;
  const activeDlStatus = activeRecord
    ? getTestDownloadStatus(activeRecord.testId)
    : { used: 0, remaining: MAX_TEST_DOWNLOADS, max: MAX_TEST_DOWNLOADS, locked: false };

  const handleDownloadActiveVaultTest = async () => {
    if (!activeRecord) return;
    if (activeDlStatus.locked || activeRecord.purged || !activeRecord.content) {
      purgeStudioVaultTestContent(activeRecord.testId);
      refreshVault();
      onShowToast(
        'Security Lock: Maximum 3/3 downloads reached. Assessment ciphertext is permanently purged.',
        'error'
      );
      return;
    }

    const renderedHtml = renderScholarlyMarkdown(activeRecord.content);
    const res = await consumeAndDownloadTest({
      testId: activeRecord.testId,
      title: activeRecord.title,
      subject: activeRecord.subject,
      bodyHtmlOrText: renderedHtml,
      isHtml: true,
      schoolId: verifiedIdentity.schoolId,
      verifiedIdentity
    });

    if (res.remaining === 0 || !res.allowed) {
      purgeStudioVaultTestContent(activeRecord.testId);
      pushAuditEvent(`3/3 downloads reached for ${activeRecord.testId} — content purged`, 'warn');
    } else {
      pushAuditEvent(
        `Authorized copy ${res.used}/${MAX_TEST_DOWNLOADS} exported (${res.remaining} left)`,
        'info'
      );
    }
    refreshVault();
    onShowToast(res.message, res.allowed ? 'success' : 'error');
  };

  // =========================================================================
  // GATE VIEW: INSTITUTIONAL VAULT PASSCODE VERIFICATION
  // =========================================================================
  if (!vaultUnlocked) {
    return (
      <div className="test-studio-vault max-w-xl mx-auto py-8">
        <div
          className={`rounded-xl p-6 sm:p-8 border space-y-6 ${
            isLight
              ? 'editorial-surface border-[#0B2559]/15 text-[#0B2559]'
              : 'editorial-surface border-[#F5B700]/25 text-slate-100'
          }`}
        >
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs text-amber-500 font-semibold font-mono uppercase tracking-wider">
              <FolderLock className="w-4 h-4 shrink-0" />
              <span>Zero-Trust Encrypted Assessment Vault</span>
            </div>
            <h1 className="text-2xl font-bold font-display">
              Restricted ICSE Test Generation Studio
            </h1>
            <p className={`text-sm leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
              All ICSE Class 7 unit tests, periodic papers, term examinations, worksheets, and quizzes are isolated inside this encrypted studio. Faculty cannot generate or view assessments outside this vault.
            </p>
          </div>

          <div
            className={`rounded-xl p-4 border text-xs space-y-1.5 ${
              isLight
                ? 'bg-slate-50 border-slate-200 text-slate-700'
                : 'bg-slate-900/60 border-slate-800 text-slate-300'
            }`}
          >
            <div className="font-semibold text-amber-500">Enforced Zero-Trust Restrictions</div>
            <div>1. Stream-cipher encryption at rest + automatic purge after 3 authorized downloads.</div>
            <div>2. Anti-duplication topic &amp; format lock prevents regenerating exhausted papers.</div>
            <div>3. Copy, cut, right-click, print, DevTools shortcuts, and focus-loss capture are blocked.</div>
            <div>
              4. First Privacy Curtain engagement per login session requires Institutional Password verification.
            </div>
          </div>

          <form onSubmit={handleUnlockVault} className="space-y-4">
            <div className="space-y-1.5">
              <label
                htmlFor="studio-vault-password"
                className={`block text-xs font-semibold ${
                  isLight ? 'text-slate-700' : 'text-slate-300'
                }`}
              >
                Confirm Institutional Faculty Password ({verifiedIdentity.extractedName} ·{' '}
                {verifiedIdentity.schoolId})
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-amber-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="studio-vault-password"
                  type={showVaultPass ? 'text' : 'password'}
                  value={vaultPasswordInput}
                  onChange={(e) => {
                    setVaultPasswordInput(e.target.value);
                    if (vaultGateError) setVaultGateError(null);
                  }}
                  placeholder="Enter institutional password to unseal studio"
                  className={`w-full pl-10 pr-10 py-2.5 rounded-xl border text-sm outline-none transition-colors ${
                    isLight
                      ? 'bg-white border-slate-300 text-slate-900 focus:border-amber-500'
                      : 'bg-slate-950/80 border-slate-700 text-slate-100 focus:border-amber-400'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowVaultPass((prev) => !prev)}
                  aria-label={showVaultPass ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-amber-500"
                >
                  {showVaultPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {vaultGateError && (
                <p className="text-xs text-rose-500 font-medium">{vaultGateError}</p>
              )}
            </div>

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-bold bg-[#F5B700] text-[#0B2559] hover:bg-[#E0A800] transition-colors cursor-pointer whitespace-nowrap"
            >
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>Unlock Restricted ICSE Test Studio</span>
            </button>
          </form>
        </div>
      </div>
    );
  }

  // =========================================================================
  // UNSEALED ISOLATED TEST GENERATION STUDIO & VAULT VIEWER
  // =========================================================================
  const streamingParsed = streamingContent ? parseMedhaviResponse(streamingContent) : null;

  return (
    <div
      className="test-studio-vault space-y-6 pb-12 no-select"
      onDragStart={(e) => e.preventDefault()}
    >
      {/* Studio Lockdown Status Header */}
      <div
        className={`rounded-xl p-5 sm:p-6 border flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${
          isLight
            ? 'editorial-surface border-[#0B2559]/15 text-[#0B2559]'
            : 'editorial-surface border-[#F5B700]/25 text-slate-100'
        }`}
      >
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2 text-xs text-amber-500 font-medium tabular-nums">
            <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
            <span>Encrypted ICSE Vault</span>
            <span aria-hidden="true">·</span>
            <span>3-Download Cap Only</span>
            <span aria-hidden="true">·</span>
            <span>
              Curtain Gate:{' '}
              {curtainUnlockedInSession ? 'Session Verified (1-Click)' : 'Password Armed (1st Trigger)'}
            </span>
            {securityAlertCount > 0 && (
              <>
                <span aria-hidden="true">·</span>
                <span className="text-rose-400 font-semibold">
                  {securityAlertCount} Blocked Capture Attempt{securityAlertCount === 1 ? '' : 's'}
                </span>
              </>
            )}
          </div>
          <h1 className="text-xl sm:text-2xl font-bold font-display">
            ICSE Class 7 Restricted Test Generation Studio
          </h1>
          <p className={`text-xs sm:text-sm ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
            Authorized Educator: <strong>{verifiedIdentity.extractedName}</strong> (
            {verifiedIdentity.schoolId}) · Class 7 ICSE (CISCE)
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleToggleManualCurtain}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              isLight
                ? 'border-slate-300 bg-slate-50 text-slate-800 hover:border-amber-500'
                : 'border-slate-700 bg-slate-900/70 text-slate-200 hover:border-amber-400/60'
            }`}
          >
            {privacyCurtainActive ? (
              <>
                <Eye className="w-3.5 h-3.5 text-amber-500" />
                <span>
                  {curtainUnlockedInSession ? 'Reveal Viewport' : 'Password Required Below'}
                </span>
              </>
            ) : (
              <>
                <EyeOff className="w-3.5 h-3.5 text-amber-500" />
                <span>Conceal Screen</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              setVaultUnlocked(false);
              onShowToast('Restricted Test Studio sealed.', 'info');
            }}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              isLight
                ? 'border-rose-300 bg-rose-50 text-rose-800 hover:bg-rose-100'
                : 'border-rose-500/40 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Lock Vault</span>
          </button>
        </div>
      </div>

      {/* Studio Vault Inventory with Inline 2-Step Delete Confirmation (Zero window.confirm, Zero Nested <button>) */}
      <div
        className={`rounded-xl p-4 border space-y-2.5 ${
          isLight
            ? 'editorial-surface border-[#0B2559]/15 text-[#0B2559]'
            : 'editorial-surface border-[#F5B700]/20 text-slate-100'
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-amber-500">
            Encrypted Assessment Vault History ({vaultRecords.length})
          </h3>
          <span className={`text-[11px] tabular-nums ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
            Max {MAX_TEST_DOWNLOADS} Downloads / Sheet
          </span>
        </div>

        {vaultRecords.length === 0 ? (
          <p className={`text-xs py-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
            No assessments stored in this faculty vault yet.
          </p>
        ) : (
          <div
            className={`space-y-1 ${
              vaultRecords.length > 8 ? 'max-h-64 overflow-y-auto pr-0.5' : ''
            }`}
          >
            {vaultRecords.map((item) => {
              const dl = getTestDownloadStatus(item.testId);
              const isSelected = activeTestId === item.testId;
              const isConfirmingDelete = confirmDeleteId === item.testId;

              return (
                <div
                  key={item.testId}
                  className={`w-full px-2.5 py-1.5 rounded-lg border transition-colors flex items-center justify-between gap-2 ${
                    isSelected
                      ? isLight
                        ? 'border-[#0B2559] bg-[#FEF3C7] text-[#0B2559]'
                        : 'border-[#F5B700] bg-[#F5B700]/15 text-slate-100'
                      : isLight
                      ? 'border-slate-300 hover:border-[#0B2559] bg-white text-[#0B2559]'
                      : 'border-slate-700 hover:border-[#F5B700] bg-slate-900 text-slate-200'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTestId(item.testId);
                      setConfirmDeleteId(null);
                    }}
                    className="min-w-0 flex-1 flex items-center gap-2 text-left cursor-pointer"
                    title={`${item.topic} · ${item.formatLabel} · ${item.marks}M`}
                  >
                    <span className="text-xs font-semibold truncate">{item.topic}</span>
                    <span
                      className={`text-[10px] font-mono whitespace-nowrap shrink-0 tabular-nums ${
                        isLight ? 'text-slate-600' : 'text-slate-400'
                      }`}
                    >
                      {item.marks}M · {formatHistoryTimestamp(item.createdAt)}
                    </span>
                  </button>

                  <div className="flex items-center gap-1 shrink-0">
                    {isConfirmingDelete ? (
                      <>
                        <button
                          type="button"
                          onClick={() => handleConfirmDeleteVaultTest(item.testId)}
                          className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-[#D9483B] text-white hover:opacity-90 transition-opacity cursor-pointer"
                        >
                          Delete
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          aria-label={`Cancel delete ${item.topic}`}
                          className={`p-0.5 rounded-md border transition-colors cursor-pointer ${
                            isLight
                              ? 'border-slate-300 text-slate-700 hover:bg-slate-100'
                              : 'border-slate-700 text-slate-300 hover:bg-slate-800'
                          }`}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </>
                    ) : (
                      <>
                        <span
                          className={`text-[10px] font-mono font-semibold shrink-0 tabular-nums ${
                            dl.locked
                              ? 'text-[#D9483B]'
                              : isLight
                              ? 'text-[#047857]'
                              : 'text-emerald-400'
                          }`}
                        >
                          {dl.locked ? 'PURGED' : `${dl.remaining}/${MAX_TEST_DOWNLOADS}`}
                        </span>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(item.testId)}
                          className="p-1 rounded-md text-slate-500 hover:text-[#D9483B] hover:bg-rose-500/10 transition-colors cursor-pointer"
                          title="Delete test paper from vault"
                          aria-label={`Delete ${item.topic} from vault`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Main Two-Zone Studio Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 5 Columns: Test Architect + Audit Log */}
        <div className="lg:col-span-5 space-y-5">
          <div
            className={`rounded-xl p-5 border space-y-4 ${
              isLight
                ? 'editorial-surface border-[#0B2559]/15 text-[#0B2559]'
                : 'editorial-surface border-[#F5B700]/20 text-slate-100'
            }`}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <Sliders className="w-4 h-4 text-amber-500" />
                <span>Configure ICSE Class 7 Assessment</span>
              </h2>
              <span className={`text-xs tabular-nums ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                Written Only
              </span>
            </div>

            {/* Syllabus Topic Input */}
            <div className="space-y-1.5">
              <label
                htmlFor="restricted-test-topic"
                className={`block text-xs font-semibold ${
                  isLight ? 'text-slate-700' : 'text-slate-300'
                }`}
              >
                ICSE Chapter or Syllabus Scope
              </label>
              <input
                id="restricted-test-topic"
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g., Rational Numbers, Heat Transfer, or Active & Passive Voice"
                className={`w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none transition-colors select-text ${
                  isLight
                    ? 'bg-white border-slate-300 text-slate-900 focus:border-amber-500'
                    : 'bg-slate-900/85 border-slate-700 text-slate-100 focus:border-amber-400'
                }`}
              />
            </div>

            {/* Assessment Format Selector */}
            <div className="space-y-1.5">
              <span
                className={`block text-xs font-semibold ${
                  isLight ? 'text-slate-700' : 'text-slate-300'
                }`}
              >
                Assessment Format
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {(Object.keys(FORMAT_SPECS) as StudioTestFormatKey[]).map((key) => {
                  const item = FORMAT_SPECS[key];
                  const selected = testFormat === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setTestFormat(key)}
                      className={`p-3 rounded-xl border text-left transition-colors cursor-pointer ${
                        selected
                          ? isLight
                            ? 'border-amber-500 bg-amber-50 text-slate-900'
                            : 'border-amber-400/80 bg-amber-500/15 text-slate-100'
                          : isLight
                          ? 'border-slate-200 bg-slate-50/70 hover:border-slate-300 text-slate-700'
                          : 'border-slate-800 bg-slate-900/40 hover:border-slate-700 text-slate-300'
                      }`}
                    >
                      <div className="text-xs font-semibold truncate">{item.label}</div>
                      <div
                        className={`text-[11px] mt-0.5 tabular-nums ${
                          isLight ? 'text-slate-500' : 'text-slate-400'
                        }`}
                      >
                        {item.marks}M · {item.duration}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Cognitive Tier */}
            <div className="space-y-1.5">
              <span
                className={`block text-xs font-semibold ${
                  isLight ? 'text-slate-700' : 'text-slate-300'
                }`}
              >
                Difficulty Calibration
              </span>
              <div className="grid grid-cols-3 gap-2">
                {(['Standard', 'Challenging', 'Advanced'] as const).map((tier) => (
                  <button
                    key={tier}
                    type="button"
                    onClick={() => setDifficultyTier(tier)}
                    className={`py-2 px-2.5 rounded-xl border text-xs font-medium truncate transition-colors cursor-pointer ${
                      difficultyTier === tier
                        ? isLight
                          ? 'border-amber-500 bg-amber-100 text-amber-950 font-semibold'
                          : 'border-amber-400 bg-amber-500/20 text-amber-300'
                        : isLight
                        ? 'border-slate-200 bg-slate-50 text-slate-700 hover:border-amber-400'
                        : 'border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    {tier}
                  </button>
                ))}
              </div>
            </div>

            {/* Rubric & Key Checkboxes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              <label
                className={`flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer text-xs ${
                  isLight
                    ? 'border-slate-200 bg-slate-50 text-slate-800'
                    : 'border-slate-800 bg-slate-900/40 text-slate-300'
                }`}
              >
                <input
                  type="checkbox"
                  checked={includeAnswerKey}
                  onChange={(e) => setIncludeAnswerKey(e.target.checked)}
                  className="rounded text-amber-500 focus:ring-amber-400 w-4 h-4"
                />
                <span>Include Answer Key</span>
              </label>

              <label
                className={`flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer text-xs ${
                  isLight
                    ? 'border-slate-200 bg-slate-50 text-slate-800'
                    : 'border-slate-800 bg-slate-900/40 text-slate-300'
                }`}
              >
                <input
                  type="checkbox"
                  checked={includeMarkingScheme}
                  onChange={(e) => setIncludeMarkingScheme(e.target.checked)}
                  className="rounded text-amber-500 focus:ring-amber-400 w-4 h-4"
                />
                <span>Step Marking Scheme</span>
              </label>
            </div>

            <button
              type="button"
              disabled={isGenerating}
              onClick={() => void handleGenerateIsolatedTest()}
              className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-bold bg-[#F5B700] text-[#0B2559] hover:bg-[#E0A800] disabled:opacity-60 transition-colors cursor-pointer whitespace-nowrap"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                  <span>Encrypting Inside Restricted Vault...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 shrink-0" />
                  <span>Generate in Restricted Studio</span>
                </>
              )}
            </button>
          </div>

          {/* Live Studio Security Audit Log */}
          {auditLog.length > 0 && (
            <div
              className={`rounded-2xl p-4 border space-y-2 ${
                isLight
                  ? 'bg-slate-50 border-slate-200 text-slate-800'
                  : 'bg-slate-950/60 border-slate-800 text-slate-300'
              }`}
            >
              <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-amber-500 font-bold">
                <span className="flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5" />
                  <span>Vault Security Audit Trail</span>
                </span>
                <span>{auditLog.length} Events</span>
              </div>
              <div className="space-y-1 max-h-28 overflow-y-auto text-[11px] font-mono">
                {auditLog.map((entry) => (
                  <div key={entry.id} className="flex items-start gap-2">
                    <span className="text-slate-500 shrink-0">{entry.time}</span>
                    <span
                      className={
                        entry.severity === 'critical'
                          ? 'text-rose-400 font-semibold'
                          : entry.severity === 'warn'
                          ? 'text-amber-400'
                          : isLight
                          ? 'text-slate-700'
                          : 'text-slate-300'
                      }
                    >
                      {entry.event}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right 7 Columns: Protected Assessment Viewport */}
        <div className="lg:col-span-7">
          <div
            className={`rounded-xl border overflow-hidden relative min-h-[520px] flex flex-col justify-between ${
              isLight
                ? 'editorial-surface border-[#0B2559]/15 text-[#0B2559]'
                : 'editorial-surface border-[#F5B700]/20 text-slate-100'
            }`}
          >
            {/* Top Viewport Action Bar — ONLY place with the 3-Download Limiter */}
            <div
              className={`px-5 py-3.5 border-b flex flex-wrap items-center justify-between gap-3 ${
                isLight ? 'border-[#0B2559]/12 bg-[#F7F9FC]' : 'border-[#0B2559] bg-[#060E20]/70'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="w-4 h-4 text-[#F5B700] shrink-0" />
                <span className="text-xs font-semibold truncate">
                  {isGenerating
                    ? streamingTitle
                    : activeRecord
                    ? activeRecord.title
                    : 'Protected ICSE Assessment Viewport'}
                </span>
              </div>

              {activeRecord && !isGenerating && (
                <button
                  type="button"
                  disabled={activeDlStatus.locked || Boolean(activeRecord.purged)}
                  onClick={() => void handleDownloadActiveVaultTest()}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border transition-colors whitespace-nowrap shrink-0 tabular-nums cursor-pointer ${
                    activeDlStatus.locked || activeRecord.purged
                      ? 'border-rose-500/40 bg-rose-500/10 text-rose-400 cursor-not-allowed'
                      : 'border-[#F5B700] bg-[#F5B700] text-[#0B2559] hover:bg-[#E0A800]'
                  }`}
                >
                  {activeDlStatus.locked || activeRecord.purged ? (
                    <>
                      <Lock className="w-3.5 h-3.5 shrink-0" />
                      <span>Locked &amp; Purged (3/3 Used)</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-3.5 h-3.5 shrink-0" />
                      <span>
                        Download Test ({activeDlStatus.remaining}/{MAX_TEST_DOWNLOADS} left)
                      </span>
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Assessment Body Area */}
            <div className="flex-1 p-5 sm:p-7 relative">
              {privacyCurtainActive ? (
                <div className="py-12 px-4 flex flex-col items-center justify-center text-center space-y-5">
                  <div className="p-3.5 rounded-2xl bg-amber-500/15 border border-amber-500/30">
                    <EyeOff className="w-7 h-7 text-amber-500" />
                  </div>
                  <div className="space-y-1.5 max-w-md">
                    <h3 className="text-base font-bold font-display">
                      Security Privacy Curtain Engaged
                    </h3>
                    <p
                      className={`text-xs leading-relaxed ${
                        isLight ? 'text-slate-600' : 'text-slate-400'
                      }`}
                    >
                      {privacyCurtainReason ||
                        'Assessment viewport is currently concealed to prevent unauthorized screen capture or shoulder-surfing.'}
                    </p>
                  </div>

                  {!curtainUnlockedInSession ? (
                    <form
                      onSubmit={handleUnlockCurtainFirstTime}
                      className="w-full max-w-xs space-y-3"
                    >
                      <div className="space-y-1.5 text-left">
                        <label
                          htmlFor="curtain-pass"
                          className="block text-[11px] uppercase font-mono font-bold text-amber-500"
                        >
                          First-Trigger Security Check · Enter Faculty Password
                        </label>
                        <input
                          id="curtain-pass"
                          type="password"
                          autoFocus
                          value={curtainPasswordInput}
                          onChange={(e) => {
                            setCurtainPasswordInput(e.target.value);
                            if (curtainGateError) setCurtainGateError(null);
                          }}
                          placeholder="Institutional Faculty Password"
                          className={`w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none select-text ${
                            isLight
                              ? 'bg-white border-slate-300 text-slate-900 focus:border-amber-500'
                              : 'bg-slate-900 border-slate-700 text-slate-100 focus:border-amber-400'
                          }`}
                        />
                        {curtainGateError && (
                          <p className="text-xs text-rose-500 font-medium">{curtainGateError}</p>
                        )}
                      </div>
                      <button
                        type="submit"
                        className="w-full py-2.5 rounded-xl text-xs font-bold bg-[#F5B700] text-[#0B2559] hover:bg-[#E0A800] transition-colors cursor-pointer"
                      >
                        Verify Password &amp; Uncurtain Viewport
                      </button>
                    </form>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setPrivacyCurtainActive(false);
                        pushAuditEvent('Restored viewport (session pre-verified)', 'info');
                      }}
                      className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[#F5B700] text-[#0B2559] hover:bg-[#E0A800] transition-colors cursor-pointer"
                    >
                      Restore Secure Viewport
                    </button>
                  )}
                </div>
              ) : isGenerating ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-xs text-amber-500 font-medium">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Drafting encrypted ICSE Class 7 paper inside Studio Vault...</span>
                  </div>
                  {streamingParsed?.cleanMarkdown ? (
                    <div
                      className="medhavi-prose text-sm leading-relaxed medhavi-security-shield no-select"
                      dangerouslySetInnerHTML={{
                        __html: renderScholarlyMarkdown(streamingParsed.cleanMarkdown)
                      }}
                    />
                  ) : (
                    <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                      Preparing Section A &amp; Section B questions with CISCE step marking...
                    </p>
                  )}
                </div>
              ) : !activeRecord ? (
                <div className="py-24 px-4 flex flex-col items-center justify-center text-center space-y-3">
                  <FolderLock className="w-8 h-8 text-amber-500/80" />
                  <div className="space-y-1 max-w-sm">
                    <h3 className="text-base font-semibold font-display">
                      Isolated Test Viewport Ready
                    </h3>
                    <p className={`text-xs leading-relaxed ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                      Select a chapter and assessment format on the left to generate an official ICSE Class 7 paper. Generated papers are encrypted at rest and auto-purge permanently after 3 downloads.
                    </p>
                  </div>
                </div>
              ) : activeDlStatus.locked || activeRecord.purged || !activeRecord.content ? (
                <div className="py-24 px-4 flex flex-col items-center justify-center text-center space-y-4">
                  <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30">
                    <Lock className="w-8 h-8 text-rose-500" />
                  </div>
                  <div className="space-y-1.5 max-w-md">
                    <h3 className="text-base font-bold text-rose-500 font-display">
                      Assessment Permanently Purged (3/3 Downloads Used)
                    </h3>
                    <p className={`text-xs leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                      <strong>{activeRecord.title}</strong> has reached the maximum institutional download limit ({MAX_TEST_DOWNLOADS}/{MAX_TEST_DOWNLOADS}). Its ciphertext has been wiped from the Studio Vault and cannot be viewed, copied, or regenerated.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div
                    className={`px-3.5 py-2 rounded-xl border text-[11px] font-mono flex flex-wrap items-center justify-between gap-2 tabular-nums ${
                      isLight
                        ? 'bg-amber-50/70 border-amber-200 text-amber-900'
                        : 'bg-amber-500/10 border-amber-500/25 text-amber-300'
                    }`}
                  >
                    <span>
                      CONFIDENTIAL · {verifiedIdentity.extractedName.toUpperCase()} (
                      {verifiedIdentity.schoolId})
                    </span>
                    <span>
                      COPY &amp; SCREENSHOT PROHIBITED · {activeDlStatus.remaining}/
                      {MAX_TEST_DOWNLOADS} DOWNLOADS LEFT
                    </span>
                  </div>

                  <div
                    className="medhavi-prose text-sm sm:text-base leading-relaxed medhavi-security-shield no-select"
                    dangerouslySetInnerHTML={{
                      __html: renderScholarlyMarkdown(activeRecord.content)
                    }}
                  />
                </div>
              )}
            </div>

            {/* Bottom Security Footer */}
            <div
              className={`px-5 py-3 border-t text-[11px] flex flex-wrap items-center justify-between gap-2 ${
                isLight
                  ? 'border-slate-200 bg-slate-50 text-slate-500'
                  : 'border-slate-800/80 bg-slate-900/40 text-slate-400'
              }`}
            >
              <span>Seth M.R. Jaipuria School · ICSE Class 7 Assessment Isolation Protocol</span>
              <span className="font-mono tabular-nums">Vault Seal: {verifiedIdentity.badgeId}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
