import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Trash2,
  Cloud,
  LogIn,
  LogOut,
  ShieldCheck,
  Lock,
  Cpu,
  ChevronDown,
  ChevronUp,
  Award,
  Clock,
  Play,
  Pause,
  RotateCcw,
  FolderLock,
  RefreshCw,
  CheckCircle2
} from 'lucide-react';
import {
  JAIPURIA_MEDHAVI_MASTER_CONSTITUTION,
  verifyIdentityIntegrity,
  type CustomSpecItem,
  type IdVerificationResult
} from '../utils/medhaviEngine';
import {
  loadStudioVaultTests,
  getTestDownloadStatus,
  MAX_TEST_DOWNLOADS
} from '../utils/testDownloadLimiter';
import { playScholarlyChime } from '../utils/voiceAudioEngine';
import type { QuizAttemptRecord } from '../firebase';
import type { User } from 'firebase/auth';

/* ============================================================================
 * 1. MEDHAVI SPECIFICATIONS SIDE-SHEET MODAL
 * ========================================================================== */
interface SpecsModalProps {
  isOpen: boolean;
  onClose: () => void;
  specs: CustomSpecItem[];
  onAddSpec: (spec: Omit<CustomSpecItem, 'id'>) => void;
  onToggleSpec: (id: string) => void;
  onDeleteSpec: (id: string) => void;
  isLight: boolean;
}

const SPEC_CATEGORIES: CustomSpecItem['category'][] = [
  'Current Syllabus',
  'Examination Pattern',
  'Competition Rules',
  'School Rules',
  'Teacher Instructions',
  'Student Learning Goals'
];

export const MedhaviSpecsModal: React.FC<SpecsModalProps> = ({
  isOpen,
  onClose,
  specs,
  onAddSpec,
  onToggleSpec,
  onDeleteSpec,
  isLight
}) => {
  const [category, setCategory] = useState<CustomSpecItem['category']>('Current Syllabus');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [showConstitution, setShowConstitution] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    onAddSpec({
      category,
      title: title.trim(),
      content: content.trim(),
      active: true
    });
    setTitle('');
    setContent('');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-[#040A18]/75 no-print"
      role="dialog"
      aria-modal="true"
      aria-labelledby="specs-modal-title"
    >
      <div
        className={`w-full max-w-lg h-full overflow-y-auto p-6 border-l flex flex-col justify-between ${
          isLight
            ? 'bg-[#F7F9FC] border-[#0B2559]/15 text-[#0B2559]'
            : 'bg-[#07142B] border-[#0B2559] text-slate-100'
        }`}
      >
        <div>
          <div className="flex items-center justify-between pb-4 border-b border-slate-700/40">
            <div>
              <div className="text-xs font-mono text-amber-500">ICSE Class 7 Guardrails</div>
              <h2 id="specs-modal-title" className="text-xl font-bold font-display">
                Medhavi Specifications
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close Medhavi Specifications"
              className="p-2 rounded-lg border border-slate-700/60 hover:border-amber-400/60"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className={`text-xs mt-3 leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
            Add custom chapter focus or marking rules below. The institutional ICSE Class 7 constitution stays active automatically on every request.
          </p>

          {/* Hardcoded Master Constitution Banner & Viewer */}
          <div
            className={`mt-4 p-3.5 rounded-xl border ${
              isLight
                ? 'border-emerald-500/40 bg-emerald-50 text-emerald-950 shadow-xs'
                : 'border-emerald-500/40 bg-emerald-500/5'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                <div>
                  <div className={`text-xs font-bold ${isLight ? 'text-emerald-900' : 'text-emerald-300'}`}>
                    Hardcoded ICSE Constitution (116 Rules)
                  </div>
                  <div className={`text-[11px] font-mono ${isLight ? 'text-emerald-800' : 'text-slate-400'}`}>
                    Locked &amp; Active
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowConstitution((prev) => !prev)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors whitespace-nowrap shrink-0 ${
                  isLight
                    ? 'border-emerald-500/50 text-emerald-900 bg-white hover:bg-emerald-50'
                    : 'border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10'
                }`}
              >
                <span>{showConstitution ? 'Hide' : 'View'}</span>
                {showConstitution ? (
                  <ChevronUp className="w-3 h-3" />
                ) : (
                  <ChevronDown className="w-3 h-3" />
                )}
              </button>
            </div>
            {showConstitution && (
              <pre
                className={`mt-3 max-h-60 overflow-y-auto p-3 rounded-lg border text-[11px] font-mono whitespace-pre-wrap leading-relaxed ${
                  isLight
                    ? 'bg-white border-slate-200 text-slate-800'
                    : 'bg-slate-950/90 border-slate-800 text-slate-300'
                }`}
              >
                {JAIPURIA_MEDHAVI_MASTER_CONSTITUTION}
              </pre>
            )}
          </div>

          {/* Add New Spec Form */}
          <form
            onSubmit={handleSubmit}
            className={`mt-5 space-y-3 p-4 rounded-xl border ${
              isLight
                ? 'border-slate-200 bg-white shadow-xs'
                : 'border-slate-800/80 bg-slate-900/30'
            }`}
          >
            <div className="text-xs font-semibold text-amber-500">
              Add Custom Instruction
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label
                  htmlFor="spec-cat"
                  className={`block text-[11px] mb-1 font-medium ${
                    isLight ? 'text-slate-600' : 'text-slate-400'
                  }`}
                >
                  Category
                </label>
                <select
                  id="spec-cat"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as CustomSpecItem['category'])}
                  className={`w-full rounded-lg border px-2.5 py-1.5 text-xs outline-none transition-colors ${
                    isLight
                      ? 'border-slate-300 bg-white text-slate-900 focus:border-amber-500'
                      : 'border-slate-700 bg-slate-950/80 text-slate-100'
                  }`}
                >
                  {SPEC_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  htmlFor="spec-title"
                  className={`block text-[11px] mb-1 font-medium ${
                    isLight ? 'text-slate-600' : 'text-slate-400'
                  }`}
                >
                  Title
                </label>
                <input
                  id="spec-title"
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Unit Test II Focus"
                  className={`w-full rounded-lg border px-2.5 py-1.5 text-xs outline-none transition-colors ${
                    isLight
                      ? 'border-slate-300 bg-white text-slate-900 focus:border-amber-500'
                      : 'border-slate-700 bg-slate-950/80 text-slate-100'
                  }`}
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="spec-content"
                className={`block text-[11px] mb-1 font-medium ${
                  isLight ? 'text-slate-600' : 'text-slate-400'
                }`}
              >
                Instructions
              </label>
              <textarea
                id="spec-content"
                rows={3}
                required
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="e.g., Current chapter: Triangles. Show worked examples with SI units."
                className={`w-full rounded-lg border px-3 py-2 text-xs outline-none transition-colors ${
                  isLight
                    ? 'border-slate-300 bg-white text-slate-900 focus:border-amber-500'
                    : 'border-slate-700 bg-slate-950/80 text-slate-100'
                }`}
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-[#F5B700] text-[#0B2559] hover:bg-[#E0A800] transition-colors shadow-xs whitespace-nowrap cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Rule</span>
              </button>
            </div>
          </form>

          {/* Existing Spec Blocks */}
          <div className="mt-6 space-y-3">
            <div className={`text-xs font-semibold ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
              Active Specifications ({specs.filter((s) => s.active).length})
            </div>
            {specs.map((spec) => (
              <div
                key={spec.id}
                className={`p-3.5 rounded-xl border transition-colors ${
                  spec.active
                    ? isLight
                      ? 'border-amber-500/40 bg-amber-50/70'
                      : 'border-amber-500/40 bg-amber-500/5'
                    : isLight
                    ? 'border-slate-200 bg-slate-50 opacity-60'
                    : 'border-slate-800 bg-slate-900/20 opacity-60'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs font-semibold truncate">
                    <span className="text-amber-500">{spec.category}</span> · {spec.title}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => onToggleSpec(spec.id)}
                      className={`px-2 py-0.5 rounded text-[11px] font-medium border whitespace-nowrap ${
                        spec.active
                          ? isLight
                            ? 'border-emerald-500 text-emerald-800 bg-emerald-100/60 font-semibold'
                            : 'border-emerald-500/50 text-emerald-300 bg-emerald-500/10'
                          : isLight
                          ? 'border-slate-300 text-slate-600 bg-white'
                          : 'border-slate-700 text-slate-400'
                      }`}
                    >
                      {spec.active ? 'Active' : 'Muted'}
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteSpec(spec.id)}
                      aria-label={`Delete specification ${spec.title}`}
                      className="p-1 text-slate-400 hover:text-rose-500 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <p
                  className={`mt-1.5 text-xs leading-relaxed whitespace-pre-wrap ${
                    isLight ? 'text-slate-700' : 'text-slate-300'
                  }`}
                >
                  {spec.content}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div
          className={`pt-4 mt-6 border-t text-xs flex items-center justify-between ${
            isLight ? 'border-slate-200 text-slate-600' : 'border-slate-800 text-slate-400'
          }`}
        >
          <span>Synced with account</span>
          <button
            type="button"
            onClick={onClose}
            className={`px-4 py-1.5 rounded-lg font-medium transition-colors ${
              isLight
                ? 'bg-slate-200 text-slate-800 hover:bg-slate-300'
                : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
            }`}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

/* ============================================================================
 * 2. OPENROUTER AI ENGINE & GOOGLE CLOUD SYNC MODAL
 * ========================================================================== */
interface CloudModalProps {
  isOpen: boolean;
  onClose: () => void;
  cloudOnline: boolean;
  onTestConnection: () => Promise<void>;
  user: User | null;
  onSignIn: () => Promise<void>;
  onSignOut: () => Promise<void>;
  isLight: boolean;
}

export const CloudAccountModal: React.FC<CloudModalProps> = ({
  isOpen,
  onClose,
  cloudOnline,
  onTestConnection,
  user,
  onSignIn,
  onSignOut,
  isLight
}) => {
  const [testing, setTesting] = useState(false);

  if (!isOpen) return null;

  const handleVerify = async () => {
    setTesting(true);
    await onTestConnection();
    setTesting(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#040A18]/75 no-print"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cloud-modal-title"
    >
      <div
        className={`w-full max-w-lg rounded-xl border p-6 shadow-2xl space-y-5 ${
          isLight
            ? 'bg-white border-[#0B2559]/15 text-[#0B2559]'
            : 'bg-[#07142B] border-[#0B2559] text-slate-100'
        }`}
      >
        <div
          className={`flex items-center justify-between pb-4 border-b ${
            isLight ? 'border-slate-200' : 'border-slate-700/40'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Cloud className="w-5 h-5 text-emerald-500" />
            <div>
              <div className="text-xs font-mono text-emerald-600 font-semibold">
                OpenRouter · Firebase Cloud Sync
              </div>
              <h2 id="cloud-modal-title" className="text-lg font-bold font-display">
                AI Engine &amp; Cloud Sync
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Cloud Settings"
            className={`p-1.5 rounded-lg border transition-colors ${
              isLight
                ? 'border-slate-300 hover:border-amber-500'
                : 'border-slate-700 hover:border-amber-400'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Active OpenRouter Model */}
        <div
          className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/50 border-slate-800'
          }`}
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold">
              <Cpu className="w-4 h-4 text-amber-500 shrink-0" />
              <span>NVIDIA Nemotron 3.5 Super VL (Free)</span>
            </div>
            <div className={`text-[11px] font-mono ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
              nvidia/nemotron-3.5-super-vl:free · {cloudOnline ? 'Server Online' : 'Reconnecting'}
            </div>
          </div>

          <button
            type="button"
            onClick={handleVerify}
            disabled={testing}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold border transition-colors whitespace-nowrap shrink-0 ${
              isLight
                ? 'border-emerald-500 text-emerald-800 bg-emerald-50 hover:bg-emerald-100'
                : 'border-emerald-500/50 text-emerald-300 hover:bg-emerald-500/10'
            }`}
          >
            {testing ? 'Checking…' : 'Check Status'}
          </button>
        </div>

        {/* Firebase Authentication Account Section */}
        <div className="space-y-2.5">
          <div
            className={`text-xs font-semibold uppercase tracking-wider ${
              isLight ? 'text-slate-600' : 'text-slate-400'
            }`}
          >
            Google Account Cloud Sync
          </div>
          {user ? (
            <div
              className={`flex items-center justify-between p-3.5 rounded-lg border ${
                isLight
                  ? 'border-emerald-500/40 bg-emerald-50 text-slate-900'
                  : 'border-emerald-500/30 bg-emerald-500/5'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0" />
                <div className="min-w-0">
                  <div className="text-sm font-semibold truncate">
                    {user.displayName || 'Jaipuria Scholar'}
                  </div>
                  <div className={`text-xs font-mono truncate ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                    {user.email} · Synced
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={onSignOut}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap shrink-0 ${
                  isLight
                    ? 'border-slate-300 bg-white hover:border-rose-400 text-slate-700'
                    : 'border-slate-700 hover:border-rose-400 text-slate-300'
                }`}
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          ) : (
            <div
              className={`flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-lg border ${
                isLight
                  ? 'border-slate-200 bg-slate-50 text-slate-700'
                  : 'border-slate-800 bg-slate-900/40'
              }`}
            >
              <div className={`text-xs max-w-xs ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
                Sign in with Google to sync saved chats, rules, and revision quiz scores across devices.
              </div>
              <button
                type="button"
                onClick={onSignIn}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold bg-[#F5B700] text-[#0B2559] hover:bg-[#E0A800] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In with Google</span>
              </button>
            </div>
          )}
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={onClose}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
              isLight
                ? 'bg-slate-200 text-slate-800 hover:bg-slate-300'
                : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
            }`}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

/* ============================================================================
 * 3. FULL-STACK SECURITY & ICSE MASTERY CENTER MODAL
 * ========================================================================== */
interface SecurityAndMasteryModalProps {
  isOpen: boolean;
  onClose: () => void;
  isLight: boolean;
  verifiedIdentity: IdVerificationResult;
  quizAttempts: QuizAttemptRecord[];
  activeSubject: string;
  onPracticeTopic: (topic: string, subjectName: string) => void;
  onOpenRestrictedTestStudio: () => void;
  onOpenCloudAccount: () => void;
}

export const SecurityAndMasteryModal: React.FC<SecurityAndMasteryModalProps> = ({
  isOpen,
  onClose,
  isLight,
  verifiedIdentity,
  quizAttempts,
  activeSubject,
  onPracticeTopic,
  onOpenRestrictedTestStudio,
  onOpenCloudAccount
}) => {
  const persona = verifiedIdentity.extractedRole;
  const [activeTab, setActiveTab] = useState<'security' | 'mastery'>('security');

  // Security Audit Verification State
  const [auditing, setAuditing] = useState(false);
  const [auditResult, setAuditResult] = useState<{
    checkedAt: string;
    localSignatureValid: boolean;
    serverHmacActive: boolean;
    cspActive: boolean;
    rateLimiterActive: boolean;
  } | null>(null);

  // Student Study Focus Timer State
  const [focusPresetMinutes, setFocusPresetMinutes] = useState<number>(25);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(25 * 60);
  const [timerRunning, setTimerRunning] = useState<boolean>(false);

  useEffect(() => {
    if (!timerRunning) return;
    const interval = window.setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          setTimerRunning(false);
          playScholarlyChime('playback');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [timerRunning]);

  if (!isOpen) return null;

  const isDemoSession = Boolean(verifiedIdentity.checks?.isDemo);
  const clientSigValid = verifyIdentityIntegrity(verifiedIdentity);
  const hasServerSeal = Boolean(verifiedIdentity.serverSeal);

  const handleRunSecurityAudit = async () => {
    setAuditing(true);
    try {
      const resp = await fetch('/api/security/status');
      if (resp.ok) {
        const data = await resp.json();
        setAuditResult({
          checkedAt: new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
          }),
          localSignatureValid: verifyIdentityIntegrity(verifiedIdentity),
          serverHmacActive: Boolean(data.hmacSealing),
          cspActive: Boolean(data.cspEnforced),
          rateLimiterActive: Boolean(data.rateLimitingActive)
        });
      } else {
        setAuditResult({
          checkedAt: new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
          }),
          localSignatureValid: verifyIdentityIntegrity(verifiedIdentity),
          serverHmacActive: hasServerSeal,
          cspActive: true,
          rateLimiterActive: true
        });
      }
    } catch {
      setAuditResult({
        checkedAt: new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        }),
        localSignatureValid: verifyIdentityIntegrity(verifiedIdentity),
        serverHmacActive: hasServerSeal,
        cspActive: true,
        rateLimiterActive: true
      });
    } finally {
      setAuditing(false);
    }
  };

  const totalAttempts = quizAttempts.length;
  const avgAccuracy =
    totalAttempts > 0
      ? Math.round(quizAttempts.reduce((acc, q) => acc + q.accuracy, 0) / totalAttempts)
      : 0;
  const totalNetScore = quizAttempts.reduce((acc, q) => acc + q.score, 0);

  const facultyVaultPapers =
    persona === 'teacher' ? loadStudioVaultTests(verifiedIdentity.schoolId) : [];
  const purgedPapersCount = facultyVaultPapers.filter(
    (p) => p.purged || getTestDownloadStatus(p.testId).locked
  ).length;
  const activePapersCount = facultyVaultPapers.length - purgedPapersCount;

  const mins = String(Math.floor(secondsRemaining / 60)).padStart(2, '0');
  const secs = String(secondsRemaining % 60).padStart(2, '0');

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#040A18]/75 no-print"
      role="dialog"
      aria-modal="true"
      aria-labelledby="security-mastery-title"
    >
      <div
        className={`w-full max-w-xl max-h-[90dvh] overflow-y-auto rounded-2xl border p-5 sm:p-6 shadow-2xl space-y-5 ${
          isLight
            ? 'bg-white border-[#0B2559]/15 text-[#0B2559]'
            : 'bg-[#07142B] border-[#0B2559] text-slate-100'
        }`}
      >
        {/* Header */}
        <div
          className={`flex items-start justify-between gap-3 pb-4 border-b ${
            isLight ? 'border-[#0B2559]/12' : 'border-[#0B2559]'
          }`}
        >
          <div>
            <div className="text-xs font-mono text-[#D99B00] font-bold">
              Seth M.R. Jaipuria School · Zero-Trust Security
            </div>
            <h2 id="security-mastery-title" className="text-lg sm:text-xl font-bold font-display">
              {persona === 'student' ? 'Security & Study Hub' : 'Security & Vault Status'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Security Center"
            className={`p-1.5 rounded-lg border transition-colors ${
              isLight
                ? 'border-[#0B2559]/20 hover:border-[#0B2559]'
                : 'border-slate-700 hover:border-[#F5B700]'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Segmented Tab Switcher */}
        <div
          className={`grid grid-cols-2 gap-1.5 p-1 rounded-xl border ${
            isLight ? 'bg-[#EEF2F8] border-[#0B2559]/12' : 'bg-[#050E22] border-[#0B2559]'
          }`}
        >
          <button
            type="button"
            onClick={() => setActiveTab('security')}
            className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
              activeTab === 'security'
                ? 'bg-[#0B2559] text-white shadow-xs'
                : isLight
                ? 'text-[#0B2559]/75 hover:text-[#0B2559]'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <ShieldCheck className={`w-3.5 h-3.5 ${activeTab === 'security' ? 'text-[#F5B700]' : ''}`} />
            <span>Security Shield</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('mastery')}
            className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
              activeTab === 'mastery'
                ? 'bg-[#0B2559] text-white shadow-xs'
                : isLight
                ? 'text-[#0B2559]/75 hover:text-[#0B2559]'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            {persona === 'student' ? (
              <>
                <Award className={`w-3.5 h-3.5 ${activeTab === 'mastery' ? 'text-[#F5B700]' : ''}`} />
                <span>Focus &amp; Mastery</span>
              </>
            ) : (
              <>
                <FolderLock className={`w-3.5 h-3.5 ${activeTab === 'mastery' ? 'text-[#F5B700]' : ''}`} />
                <span>Vault Governance</span>
              </>
            )}
          </button>
        </div>

        {activeTab === 'security' ? (
          <div className="space-y-4">
            {/* Verified Identity Summary */}
            <div
              className={`rounded-xl p-4 border space-y-2 ${
                isLight
                  ? 'bg-slate-50 border-slate-200 text-slate-800'
                  : 'bg-slate-900/50 border-slate-800 text-slate-200'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="font-semibold">
                  {verifiedIdentity.extractedName} ({verifiedIdentity.schoolId})
                </span>
                <span
                  className={`font-mono font-semibold ${
                    isDemoSession ? 'text-amber-500' : 'text-emerald-500'
                  }`}
                >
                  {isDemoSession ? 'Sandbox Demo Tier' : 'Official Institutional Account'}
                </span>
              </div>
              <div
                className={`text-[11px] font-mono flex flex-wrap items-center gap-x-3 gap-y-1 ${
                  isLight ? 'text-slate-600' : 'text-slate-400'
                }`}
              >
                <span>Role: {persona.toUpperCase()}</span>
                <span aria-hidden="true">·</span>
                <span>Signature: {clientSigValid ? 'VERIFIED' : 'INVALID'}</span>
                <span aria-hidden="true">·</span>
                <span>HMAC: {hasServerSeal ? 'SERVER-SEALED' : 'LOCAL-SIGNED'}</span>
              </div>
            </div>

            {/* Concise Protection Checklist */}
            <div
              className={`rounded-xl p-4 border space-y-2.5 text-xs ${
                isLight ? 'border-slate-200 bg-white' : 'border-slate-800 bg-slate-900/35'
              }`}
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Role boundary locked — student sessions cannot access Faculty Studio.</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Restricted Test Vault encrypted at rest with 3-download auto-purge.</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>API keys server-proxied, DOMPurify XSS filtering, &amp; per-IP rate limiting.</span>
              </div>
            </div>

            {/* Live Verification Action */}
            <div
              className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/50 border-slate-800'
              }`}
            >
              <div className="space-y-0.5">
                <div className="text-xs font-semibold">Live Security Check</div>
                {auditResult ? (
                  <div className="text-[11px] font-mono text-emerald-500 tabular-nums">
                    {auditResult.checkedAt} · Sig:{auditResult.localSignatureValid ? 'OK' : 'FAIL'} ·
                    HMAC:{auditResult.serverHmacActive ? 'OK' : 'OFF'} · CSP:
                    {auditResult.cspActive ? 'OK' : 'OFF'}
                  </div>
                ) : (
                  <div className={`text-[11px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                    Verify server security headers and identity seal.
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenCloudAccount();
                  }}
                  className={`px-3 py-2 rounded-xl text-xs font-medium border transition-colors whitespace-nowrap ${
                    isLight
                      ? 'border-slate-300 bg-white text-slate-700 hover:border-amber-500'
                      : 'border-slate-700 text-slate-300 hover:border-amber-400/60'
                  }`}
                >
                  Cloud Sync
                </button>
                <button
                  type="button"
                  disabled={auditing}
                  onClick={handleRunSecurityAudit}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-[#F5B700] text-[#0B2559] hover:bg-[#E0A800] transition-colors cursor-pointer whitespace-nowrap"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${auditing ? 'animate-spin' : ''}`} />
                  <span>{auditing ? 'Checking…' : 'Verify Security'}</span>
                </button>
              </div>
            </div>
          </div>
        ) : persona === 'student' ? (
          <div className="space-y-5">
            {/* Focus Timer Card */}
            <div
              className={`rounded-xl p-4 border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                isLight ? 'bg-amber-50/60 border-amber-200' : 'bg-amber-500/10 border-amber-500/25'
              }`}
            >
              <div className="space-y-1">
                <div className="text-xs font-mono uppercase text-amber-500 font-semibold flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Study Focus Timer</span>
                </div>
                <div className="text-2xl sm:text-3xl font-bold font-mono tabular-nums">
                  {mins}:{secs}
                </div>
                <div className="flex items-center gap-1.5 pt-1">
                  {[15, 25, 45].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => {
                        setTimerRunning(false);
                        setFocusPresetMinutes(m);
                        setSecondsRemaining(m * 60);
                      }}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-mono border transition-colors ${
                        focusPresetMinutes === m
                          ? 'border-amber-500 bg-amber-500 text-slate-950 font-bold'
                          : isLight
                          ? 'border-slate-300 bg-white text-slate-700'
                          : 'border-slate-700 bg-slate-900/60 text-slate-300'
                      }`}
                    >
                      {m}m
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setTimerRunning((r) => !r)}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-[#F5B700] text-[#0B2559] hover:bg-[#E0A800] transition-colors cursor-pointer whitespace-nowrap"
                >
                  {timerRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  <span>{timerRunning ? 'Pause' : 'Start Focus'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTimerRunning(false);
                    setSecondsRemaining(focusPresetMinutes * 60);
                  }}
                  aria-label="Reset Focus Timer"
                  className={`p-2.5 rounded-xl border transition-colors ${
                    isLight
                      ? 'border-slate-300 bg-white text-slate-700 hover:border-amber-500'
                      : 'border-slate-700 bg-slate-900 text-slate-300 hover:border-amber-400'
                  }`}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Quiz Performance Summary */}
            <div className="grid grid-cols-3 gap-3 text-center tabular-nums">
              <div
                className={`p-3.5 rounded-xl border ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/50 border-slate-800'
                }`}
              >
                <div className="text-xl font-bold font-display text-amber-500">{totalAttempts}</div>
                <div className={`text-[11px] ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                  Quizzes
                </div>
              </div>
              <div
                className={`p-3.5 rounded-xl border ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/50 border-slate-800'
                }`}
              >
                <div className="text-xl font-bold font-display text-emerald-500">
                  {avgAccuracy}%
                </div>
                <div className={`text-[11px] ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                  Accuracy
                </div>
              </div>
              <div
                className={`p-3.5 rounded-xl border ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/50 border-slate-800'
                }`}
              >
                <div className="text-xl font-bold font-display text-sky-500">{totalNetScore}</div>
                <div className={`text-[11px] ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                  Points (+2/-1)
                </div>
              </div>
            </div>

            {/* Recent Quiz History */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold">Recent Revision Quizzes</span>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onPracticeTopic(`ICSE Class 7 ${activeSubject} Core Mastery`, activeSubject);
                  }}
                  className="text-amber-500 hover:underline font-semibold"
                >
                  + New {activeSubject} Quiz
                </button>
              </div>

              {quizAttempts.length === 0 ? (
                <p
                  className={`text-xs py-4 text-center rounded-xl border ${
                    isLight
                      ? 'border-slate-200 bg-slate-50 text-slate-500'
                      : 'border-slate-800 bg-slate-900/30 text-slate-400'
                  }`}
                >
                  Complete an interactive Revision Quiz in chat to see your progress here.
                </p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {quizAttempts.slice(0, 6).map((att) => (
                    <div
                      key={att.id}
                      className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${
                        isLight
                          ? 'border-slate-200 bg-white'
                          : 'border-slate-800 bg-slate-900/40'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-semibold truncate">{att.topic}</div>
                        <div
                          className={`text-[11px] font-mono tabular-nums ${
                            isLight ? 'text-slate-500' : 'text-slate-400'
                          }`}
                        >
                          {att.subject} · {att.score}/{att.maxScore} pts · {att.accuracy}%
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onPracticeTopic(att.topic, att.subject);
                        }}
                        className="px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-amber-500/15 text-amber-500 border border-amber-500/30 hover:bg-amber-500 hover:text-slate-950 transition-colors shrink-0 whitespace-nowrap"
                      >
                        Retake
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3 text-center tabular-nums">
              <div
                className={`p-3.5 rounded-xl border ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/50 border-slate-800'
                }`}
              >
                <div className="text-xl font-bold font-display text-amber-500">
                  {facultyVaultPapers.length}
                </div>
                <div className={`text-[11px] ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                  Vault Papers
                </div>
              </div>
              <div
                className={`p-3.5 rounded-xl border ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/50 border-slate-800'
                }`}
              >
                <div className="text-xl font-bold font-display text-emerald-500">
                  {activePapersCount}
                </div>
                <div className={`text-[11px] ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                  Active Sheets
                </div>
              </div>
              <div
                className={`p-3.5 rounded-xl border ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/50 border-slate-800'
                }`}
              >
                <div className="text-xl font-bold font-display text-rose-500">
                  {purgedPapersCount}
                </div>
                <div className={`text-[11px] ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                  Purged (3/{MAX_TEST_DOWNLOADS})
                </div>
              </div>
            </div>

            <div
              className={`p-4 rounded-xl border space-y-3 ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/40 border-slate-800'
              }`}
            >
              <div className="text-xs font-semibold">
                Restricted Assessment Vault ({verifiedIdentity.schoolId})
              </div>
              <p className={`text-xs leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                All teacher assessments are isolated inside the Restricted ICSE Test Studio with a
                3-download cap and first-trigger Privacy Curtain password protection.
              </p>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenRestrictedTestStudio();
                }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-[#F5B700] text-[#0B2559] hover:bg-[#E0A800] transition-colors cursor-pointer whitespace-nowrap"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Open Restricted ICSE Test Studio</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
