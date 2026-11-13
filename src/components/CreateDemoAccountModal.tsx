import React, { useState } from 'react';
import {
  X,
  Sparkles,
  GraduationCap,
  BookOpen,
  ShieldCheck,
  ShieldAlert,
  Check,
  ArrowRight,
  RefreshCw,
  KeyRound,
  Lock
} from 'lucide-react';
import {
  LOCKED_GRADE,
  verifyInstitutionalPassword,
  verifyFacultyPasscode,
  signVerifiedIdentity,
  type PersonaRole,
  type IdVerificationResult
} from '../utils/medhaviEngine';

export interface DemoAccountConfig {
  role: PersonaRole;
  fullName: string;
  schoolId: string;
  section: string;
  house: string;
  seedSampleChats: boolean;
  seedQuizHistory: boolean;
}

interface CreateDemoAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  isLight: boolean;
  lockedRole?: PersonaRole;
  onActivateDemoAccount: (result: IdVerificationResult, config: DemoAccountConfig) => void;
}

export const DEMO_PRESETS: Array<{
  id: string;
  role: PersonaRole;
  name: string;
  schoolId: string;
  section: string;
  house: string;
  tagline: string;
  features: string[];
}> = [
  {
    id: 'student-atharva',
    role: 'student',
    name: 'Atharva Jindal',
    schoolId: '13457',
    section: 'VII-D',
    house: 'Harmony',
    tagline: 'ICSE Class 7 Scholar · Sandbox Preview',
    features: [
      'ICSE Socratic Solver (Guided Step-by-Step Solving)',
      '5-Minute ICSE Exam Revision & Voice Notes',
      'Student Revision Test Generator (Copy & Unlimited Exports)',
      'Live Two-Way Voice Chat & Interactive Quiz Arena'
    ]
  },
  {
    id: 'student-aarav',
    role: 'student',
    name: 'Aarav Verma',
    schoolId: 'SMRJ-CL7-2026-108',
    section: 'VII-A',
    house: 'Courage',
    tagline: 'ICSE Class 7 Scholar · Sandbox Preview',
    features: [
      'Full ICSE Class 7 Student Dock Access',
      'Physics, Chemistry, Biology & Maths Revision Practice',
      'ICSE Revision Flashcards & Computer Studies Lab'
    ]
  },
  {
    id: 'teacher-ananya',
    role: 'teacher',
    name: 'Dr. Ananya Sharma',
    schoolId: 'SMRJ-FAC-0742',
    section: 'ICSE Class VII Faculty',
    house: 'Wisdom',
    tagline: 'ICSE Class 7 Senior Faculty · Password-Gated Sandbox',
    features: [
      'Isolated Restricted ICSE Test Studio (Max 3 Downloads)',
      '40-Minute CISCE / ICSE Pedagogical Lesson Architect',
      'Descriptive ICSE AI Answer Evaluator & Step Rubrics',
      'Bilingual English & Hindi Parent Circulars'
    ]
  }
];

export const CreateDemoAccountModal: React.FC<CreateDemoAccountModalProps> = ({
  isOpen,
  onClose,
  isLight,
  lockedRole,
  onActivateDemoAccount
}) => {
  const [activeTab, setActiveTab] = useState<'presets' | 'custom'>('presets');

  // Gate state for Faculty Preset Demo (Prevents 1-click student privilege escalation)
  const [pendingFacultyPresetId, setPendingFacultyPresetId] = useState<string | null>(null);
  const [presetFacultyAuthInput, setPresetFacultyAuthInput] = useState('');
  const [isSealing, setIsSealing] = useState(false);

  // Custom Demo Account Form State
  const [role, setRole] = useState<PersonaRole>('student');
  const [fullName, setFullName] = useState('Reshu Agarwal');
  const [schoolId, setSchoolId] = useState(() => `SMRJ-7${Math.floor(1000 + Math.random() * 9000)}`);
  const [facultyPasscode, setFacultyPasscode] = useState('');
  const [securityError, setSecurityError] = useState<string | null>(null);
  const [section, setSection] = useState('VII-B');
  const [house, setHouse] = useState('Harmony');
  const [seedSampleChats, setSeedSampleChats] = useState(true);
  const [seedQuizHistory, setSeedQuizHistory] = useState(true);

  const visiblePresets =
    lockedRole === 'student'
      ? DEMO_PRESETS.filter((p) => p.role === 'student')
      : DEMO_PRESETS;

  const requestServerSealedDemo = async (params: {
    role: PersonaRole;
    fullName: string;
    schoolId: string;
    authCredential?: string;
  }): Promise<IdVerificationResult | null> => {
    setIsSealing(true);
    try {
      const resp = await fetch('/api/verify-demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: params.role,
          fullName: params.fullName,
          schoolId: params.schoolId,
          password: params.authCredential,
          facultyPasscode: params.authCredential
        })
      });

      if (resp.status === 403 || resp.status === 429) {
        const errJson = await resp.json().catch(() => ({}));
        setSecurityError(
          errJson?.summary ||
            errJson?.error ||
            'Faculty Demo clearance denied. Please verify your institutional password or passcode.'
        );
        return null;
      }

      if (resp.ok) {
        const sealed: IdVerificationResult = await resp.json();
        return sealed;
      }
    } catch {
      // Offline fallback ONLY for Student Demo Sandbox (never unsealed Teacher escalation)
    } finally {
      setIsSealing(false);
    }

    if (params.role === 'teacher') {
      const validCred =
        verifyInstitutionalPassword(params.authCredential || '') ||
        verifyFacultyPasscode(params.authCredential || '');
      if (!validCred) {
        setSecurityError(
          'Security Policy: Institutional Faculty Password or Faculty Passcode is required.'
        );
        return null;
      }
    }

    return signVerifiedIdentity({
      verified: true,
      confidence: 99,
      extractedName: params.fullName,
      extractedRole: params.role,
      schoolId: params.schoolId,
      schoolName: 'Seth M.R. Jaipuria School, Lucknow (Demo Sandbox)',
      grade: LOCKED_GRADE,
      badgeId: `JM-DEMO-${params.schoolId.slice(-4)}`,
      summary: `Verified Seth M.R. Jaipuria School ICSE ${
        params.role === 'teacher' ? 'Faculty' : 'Class 7 Scholar'
      } Sandbox Profile (${params.schoolId}) for ${params.fullName}.`,
      checks: {
        institutionMatch: true,
        roleMatch: true,
        gradeSevenAuthorized: true,
        isDemo: true
      }
    });
  };

  const handleLaunchPreset = async (preset: (typeof DEMO_PRESETS)[0], providedCredential?: string) => {
    setSecurityError(null);
    if (lockedRole === 'student' && preset.role === 'teacher') {
      setSecurityError(
        'Security Lock: Student accounts cannot escalate to Faculty profiles. Log out first to authenticate as Faculty.'
      );
      return;
    }

    // Require explicit Faculty credential confirmation before launching any Teacher preset
    if (preset.role === 'teacher') {
      if (pendingFacultyPresetId !== preset.id) {
        setPendingFacultyPresetId(preset.id);
        setPresetFacultyAuthInput('');
        return;
      }
      const cleanCred = (providedCredential ?? presetFacultyAuthInput).trim();
      const localOk =
        verifyInstitutionalPassword(cleanCred) || verifyFacultyPasscode(cleanCred);
      if (!localOk) {
        setSecurityError(
          'Faculty Sandbox Clearance Denied: Enter the valid Institutional Faculty Password or Passcode.'
        );
        return;
      }
    }

    const sealedResult = await requestServerSealedDemo({
      role: preset.role,
      fullName: preset.name,
      schoolId: preset.schoolId,
      authCredential: preset.role === 'teacher' ? presetFacultyAuthInput.trim() : undefined
    });

    if (!sealedResult || !sealedResult.verified) return;

    onActivateDemoAccount(sealedResult, {
      role: preset.role,
      fullName: preset.name,
      schoolId: preset.schoolId,
      section: preset.section,
      house: preset.house,
      seedSampleChats: true,
      seedQuizHistory: preset.role === 'student'
    });
    setPendingFacultyPresetId(null);
    setPresetFacultyAuthInput('');
    onClose();
  };

  const handleCreateCustomDemo = async (e: React.FormEvent) => {
    e.preventDefault();
    setSecurityError(null);
    const effectiveRole: PersonaRole = lockedRole === 'student' ? 'student' : role;
    const cleanName =
      fullName.trim() || (effectiveRole === 'teacher' ? 'Demo ICSE Faculty' : 'Demo ICSE Scholar');
    const cleanId =
      schoolId.trim().toUpperCase() ||
      (effectiveRole === 'teacher'
        ? 'SMRJ-FAC-0742'
        : `SMRJ-7${Math.floor(1000 + Math.random() * 9000)}`);

    if (effectiveRole === 'teacher') {
      if (!/^SMRJ-FAC-\d{3,6}$/i.test(cleanId)) {
        setSecurityError(
          'Security Policy: Teacher sandbox accounts must use an official Faculty ID format (SMRJ-FAC-XXXX).'
        );
        return;
      }
      const credOk =
        verifyInstitutionalPassword(facultyPasscode) || verifyFacultyPasscode(facultyPasscode);
      if (!credOk) {
        setSecurityError(
          'Security Policy: Valid Institutional Faculty Password or Faculty Passcode is required.'
        );
        return;
      }
    } else if (/^SMRJ-FAC-/i.test(cleanId)) {
      setSecurityError('Scholar accounts cannot use a SMRJ-FAC-* Faculty Employee ID.');
      return;
    }

    const sealedResult = await requestServerSealedDemo({
      role: effectiveRole,
      fullName: cleanName,
      schoolId: cleanId,
      authCredential: effectiveRole === 'teacher' ? facultyPasscode.trim() : undefined
    });

    if (!sealedResult || !sealedResult.verified) return;

    onActivateDemoAccount(sealedResult, {
      role: effectiveRole,
      fullName: cleanName,
      schoolId: cleanId,
      section,
      house,
      seedSampleChats,
      seedQuizHistory: effectiveRole === 'student' ? seedQuizHistory : false
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-[#040A18]/80 no-print"
      role="dialog"
      aria-modal="true"
      aria-labelledby="demo-account-title"
    >
      <div
        className={`w-full max-w-2xl max-h-[92dvh] overflow-y-auto rounded-t-3xl sm:rounded-2xl border p-4 sm:p-7 pb-safe shadow-2xl relative ${
          isLight
            ? 'bg-[#F7F9FC] border-[#0B2559]/15 text-[#0B2559]'
            : 'bg-[#07142B] border-[#F5B700]/25 text-slate-100'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-700/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-mono uppercase tracking-wider text-amber-500 font-semibold">
                Isolated Demo Sandbox · Separate from Official Accounts
              </div>
              <h2 id="demo-account-title" className="text-lg sm:text-xl font-bold font-display">
                ICSE Class 7 Sandbox Accounts
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Demo Account Modal"
            className={`p-2 rounded-xl border transition-colors ${
              isLight
                ? 'border-slate-200 text-slate-600 hover:border-amber-500 hover:text-slate-900'
                : 'border-slate-700/60 hover:border-amber-400/60 text-slate-400 hover:text-slate-200'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div
          role="tablist"
          className={`grid grid-cols-2 p-1 rounded-xl border my-5 ${
            isLight ? 'bg-slate-100 border-slate-200' : 'bg-slate-950 border-slate-800'
          }`}
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'presets'}
            onClick={() => {
              setActiveTab('presets');
              setSecurityError(null);
            }}
            className={`py-2 px-3 text-xs sm:text-sm font-semibold rounded-lg transition-all ${
              activeTab === 'presets'
                ? isLight
                  ? 'bg-white text-slate-950 shadow-xs'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-400/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Sandbox Presets
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'custom'}
            onClick={() => {
              setActiveTab('custom');
              setSecurityError(null);
            }}
            className={`py-2 px-3 text-xs sm:text-sm font-semibold rounded-lg transition-all ${
              activeTab === 'custom'
                ? isLight
                  ? 'bg-white text-slate-950 shadow-xs'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-400/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Custom Sandbox Builder
          </button>
        </div>

        {securityError && (
          <div
            className={`mb-4 p-3.5 rounded-xl border flex items-start gap-2.5 text-xs font-medium ${
              isLight
                ? 'border-rose-300 bg-rose-50 text-rose-800'
                : 'border-rose-500/50 bg-rose-500/10 text-rose-300'
            }`}
          >
            <ShieldAlert className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
            <span>{securityError}</span>
          </div>
        )}

        {/* Tab 1: Sandbox Presets */}
        {activeTab === 'presets' && (
          <div className="space-y-3.5 max-h-[460px] overflow-y-auto pr-1">
            <p className={`text-xs leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
              {lockedRole === 'student'
                ? 'Student Security Lock Active: Only ICSE Class 7 Scholar sandbox profiles are accessible. Faculty accounts require logging out and authenticating with Faculty credentials.'
                : 'Sandbox accounts run in an isolated DEMO session separated from official institutional logins. Faculty sandboxes require institutional password verification.'}
            </p>

            {visiblePresets.map((preset) => {
              const isFacultyGateOpen =
                preset.role === 'teacher' && pendingFacultyPresetId === preset.id;

              return (
                <div
                  key={preset.id}
                  className={`p-4 rounded-2xl border transition-all ${
                    isLight
                      ? 'border-slate-200 hover:border-amber-500 bg-white shadow-xs'
                      : 'border-slate-800 hover:border-amber-500/50 bg-slate-900/40'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-2.5">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                          preset.role === 'student'
                            ? isLight
                              ? 'bg-sky-50 text-sky-700 border border-sky-200'
                              : 'bg-sky-500/15 text-sky-400 border border-sky-500/30'
                            : isLight
                            ? 'bg-violet-50 text-violet-700 border border-violet-200'
                            : 'bg-violet-500/15 text-violet-400 border border-violet-500/30'
                        }`}
                      >
                        {preset.role === 'student' ? (
                          <GraduationCap className="w-4 h-4" />
                        ) : (
                          <BookOpen className="w-4 h-4" />
                        )}
                      </div>
                      <div>
                        <div className="font-bold text-sm flex flex-wrap items-center gap-2">
                          <span className={isLight ? 'text-slate-900' : 'text-slate-100'}>
                            {preset.name}
                          </span>
                          <span
                            className={`text-[11px] font-mono px-2 py-0.5 rounded-md border ${
                              isLight
                                ? 'bg-amber-50 text-amber-900 border-amber-200 font-semibold'
                                : 'bg-amber-500/10 text-amber-300 border border-amber-500/25'
                            }`}
                          >
                            SANDBOX · {preset.schoolId}
                          </span>
                        </div>
                        <div
                          className={`text-[11px] font-medium ${
                            isLight ? 'text-slate-600' : 'text-slate-400'
                          }`}
                        >
                          {preset.tagline} · House: {preset.house}
                        </div>
                      </div>
                    </div>

                    {preset.role === 'student' ? (
                      <button
                        type="button"
                        disabled={isSealing}
                        onClick={() => handleLaunchPreset(preset)}
                        className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-[#F5B700] text-[#0B2559] hover:bg-[#E0A800] transition-colors cursor-pointer shrink-0 disabled:opacity-60"
                      >
                        <span>Launch Scholar Sandbox</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    ) : !isFacultyGateOpen ? (
                      <button
                        type="button"
                        disabled={isSealing}
                        onClick={() => {
                          setSecurityError(null);
                          setPendingFacultyPresetId(preset.id);
                          setPresetFacultyAuthInput('');
                        }}
                        className={`w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer shrink-0 ${
                          isLight
                            ? 'border-violet-400 bg-violet-50 text-violet-900 hover:bg-violet-100'
                            : 'border-violet-400/50 bg-violet-500/15 text-violet-200 hover:bg-violet-500/25'
                        }`}
                      >
                        <Lock className="w-3.5 h-3.5" />
                        <span>Verify Faculty Sandbox</span>
                      </button>
                    ) : null}
                  </div>

                  {/* Inline Faculty Verification Gate for Teacher Preset */}
                  {isFacultyGateOpen && (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        void handleLaunchPreset(preset, presetFacultyAuthInput);
                      }}
                      className={`mt-3 mb-2 p-3 rounded-xl border space-y-2.5 ${
                        isLight
                          ? 'bg-violet-50/70 border-violet-200'
                          : 'bg-slate-950/80 border-violet-500/35'
                      }`}
                    >
                      <label
                        htmlFor={`faculty-preset-pass-${preset.id}`}
                        className="block text-[11px] font-mono uppercase tracking-wider font-bold text-amber-500"
                      >
                        Faculty Clearance Required (Institutional Password or Faculty Passcode)
                      </label>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <div className="relative flex-1">
                          <KeyRound className="w-3.5 h-3.5 text-amber-500 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            id={`faculty-preset-pass-${preset.id}`}
                            type="password"
                            autoFocus
                            value={presetFacultyAuthInput}
                            onChange={(e) => {
                              setPresetFacultyAuthInput(e.target.value);
                              if (securityError) setSecurityError(null);
                            }}
                            placeholder="Enter institutional password"
                            className={`w-full pl-8 pr-3 py-2 rounded-lg border text-xs outline-none ${
                              isLight
                                ? 'bg-white border-slate-300 text-slate-900 focus:border-amber-500'
                                : 'bg-slate-900 border-slate-700 text-slate-100 focus:border-amber-400'
                            }`}
                          />
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="submit"
                            disabled={isSealing}
                            className="px-3.5 py-2 rounded-lg text-xs font-bold bg-amber-500 text-slate-950 hover:bg-amber-400 transition-colors cursor-pointer whitespace-nowrap disabled:opacity-60"
                          >
                            {isSealing ? 'Sealing...' : 'Unlock Faculty'}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setPendingFacultyPresetId(null);
                              setPresetFacultyAuthInput('');
                              setSecurityError(null);
                            }}
                            className={`px-2.5 py-2 rounded-lg text-xs font-semibold border ${
                              isLight
                                ? 'border-slate-300 text-slate-600 hover:bg-slate-100'
                                : 'border-slate-700 text-slate-400 hover:bg-slate-800'
                            }`}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </form>
                  )}

                  <div
                    className={`grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-2 border-t text-[11px] ${
                      isLight
                        ? 'border-slate-100 text-slate-600'
                        : 'border-slate-800/40 text-slate-400'
                    }`}
                  >
                    {preset.features.map((f, fIdx) => (
                      <div key={fIdx} className="flex items-center gap-1.5">
                        <Check className="w-3 h-3 text-emerald-500 shrink-0" />
                        <span className="truncate">{f}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Tab 2: Custom Sandbox Creator */}
        {activeTab === 'custom' && (
          <form
            onSubmit={(e) => void handleCreateCustomDemo(e)}
            className="space-y-4 max-h-[460px] overflow-y-auto pr-1"
          >
            <div>
              <span
                className={`block text-xs font-semibold uppercase mb-1.5 ${
                  isLight ? 'text-slate-700' : 'text-slate-400'
                }`}
              >
                Sandbox Persona (ICSE Class 7 Locked)
              </span>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setRole('student');
                    if (/^SMRJ-FAC-/i.test(schoolId)) {
                      setSchoolId(`SMRJ-7${Math.floor(1000 + Math.random() * 9000)}`);
                    }
                    setSecurityError(null);
                  }}
                  className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-bold transition-all ${
                    role === 'student' || lockedRole === 'student'
                      ? isLight
                        ? 'border-sky-500 bg-sky-50 text-sky-900 ring-1 ring-sky-500/30'
                        : 'border-sky-400 bg-sky-500/15 text-sky-300'
                      : isLight
                      ? 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                      : 'border-slate-800 bg-slate-900/40 text-slate-400'
                  }`}
                >
                  <GraduationCap className="w-4 h-4 text-sky-500" />
                  <span>ICSE Scholar Sandbox</span>
                </button>
                <button
                  type="button"
                  disabled={lockedRole === 'student'}
                  onClick={() => {
                    if (lockedRole === 'student') return;
                    setRole('teacher');
                    setSchoolId('SMRJ-FAC-0742');
                    setSecurityError(null);
                  }}
                  className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                    role === 'teacher' && lockedRole !== 'student'
                      ? isLight
                        ? 'border-violet-500 bg-violet-50 text-violet-900 ring-1 ring-violet-500/30'
                        : 'border-violet-400 bg-violet-500/15 text-violet-300'
                      : isLight
                      ? 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                      : 'border-slate-800 bg-slate-900/40 text-slate-400'
                  }`}
                >
                  <BookOpen className="w-4 h-4 text-violet-500" />
                  <span>
                    {lockedRole === 'student'
                      ? 'Faculty (Locked for Students)'
                      : 'ICSE Faculty Sandbox'}
                  </span>
                </button>
              </div>
            </div>

            {role === 'teacher' && lockedRole !== 'student' && (
              <div>
                <label
                  htmlFor="custom-faculty-passcode"
                  className={`block text-xs mb-1 font-medium ${
                    isLight ? 'text-slate-600' : 'text-slate-400'
                  }`}
                >
                  Institutional Faculty Password or Security Passcode (Required)
                </label>
                <input
                  id="custom-faculty-passcode"
                  type="password"
                  required
                  value={facultyPasscode}
                  onChange={(e) => setFacultyPasscode(e.target.value)}
                  placeholder="Enter institutional faculty password"
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-mono outline-none transition-colors ${
                    isLight
                      ? 'bg-white border-slate-300 text-slate-900 focus:border-amber-500'
                      : 'bg-slate-900/80 border-slate-700 text-slate-100 focus:border-amber-400'
                  }`}
                />
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="custom-demo-name"
                  className={`block text-xs mb-1 font-medium ${
                    isLight ? 'text-slate-600' : 'text-slate-400'
                  }`}
                >
                  Sandbox Display Name
                </label>
                <input
                  id="custom-demo-name"
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g., Reshu Agarwal"
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-xs outline-none transition-colors ${
                    isLight
                      ? 'bg-white border-slate-300 text-slate-900 focus:border-amber-500'
                      : 'bg-slate-900/80 border-slate-700 text-slate-100 focus:border-amber-400'
                  }`}
                />
              </div>

              <div>
                <label
                  htmlFor="custom-demo-id"
                  className={`block text-xs mb-1 font-medium ${
                    isLight ? 'text-slate-600' : 'text-slate-400'
                  }`}
                >
                  {role === 'student' ? 'Sandbox Scholar ID' : 'Sandbox Faculty ID'}
                </label>
                <div className="flex gap-2">
                  <input
                    id="custom-demo-id"
                    type="text"
                    required
                    value={schoolId}
                    onChange={(e) => setSchoolId(e.target.value)}
                    placeholder={role === 'teacher' ? 'SMRJ-FAC-0742' : 'SMRJ-7421'}
                    className={`flex-1 px-3.5 py-2.5 rounded-xl border text-xs font-mono outline-none transition-colors ${
                      isLight
                        ? 'bg-white border-slate-300 text-slate-900 focus:border-amber-500'
                        : 'bg-slate-900/80 border-slate-700 text-slate-100 focus:border-amber-400'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setSchoolId(
                        role === 'teacher'
                          ? `SMRJ-FAC-${Math.floor(1000 + Math.random() * 9000)}`
                          : `SMRJ-7${Math.floor(1000 + Math.random() * 9000)}`
                      )
                    }
                    title="Generate new ID"
                    className={`p-2.5 rounded-xl border transition-colors ${
                      isLight
                        ? 'border-slate-300 bg-white text-amber-600 hover:border-amber-500'
                        : 'border-slate-700 hover:border-amber-400 text-amber-400'
                    }`}
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="custom-demo-section"
                  className={`block text-xs mb-1 font-medium ${
                    isLight ? 'text-slate-600' : 'text-slate-400'
                  }`}
                >
                  Class Section / Dept
                </label>
                <select
                  id="custom-demo-section"
                  value={section}
                  onChange={(e) => setSection(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl border text-xs outline-none transition-colors ${
                    isLight
                      ? 'bg-white border-slate-300 text-slate-900 focus:border-amber-500'
                      : 'bg-slate-900/80 border-slate-700 text-slate-100 focus:border-amber-400'
                  }`}
                >
                  <option value="VII-A">Class VII-A</option>
                  <option value="VII-B">Class VII-B</option>
                  <option value="VII-C">Class VII-C</option>
                  <option value="VII-D">Class VII-D</option>
                  <option value="Middle School Faculty">Middle School Faculty</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="custom-demo-house"
                  className={`block text-xs mb-1 font-medium ${
                    isLight ? 'text-slate-600' : 'text-slate-400'
                  }`}
                >
                  Jaipuria House
                </label>
                <select
                  id="custom-demo-house"
                  value={house}
                  onChange={(e) => setHouse(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl border text-xs outline-none transition-colors ${
                    isLight
                      ? 'bg-white border-slate-300 text-slate-900 focus:border-amber-500'
                      : 'bg-slate-900/80 border-slate-700 text-slate-100 focus:border-amber-400'
                  }`}
                >
                  <option value="Harmony">Harmony House (Green)</option>
                  <option value="Wisdom">Wisdom House (Yellow)</option>
                  <option value="Courage">Courage House (Red)</option>
                  <option value="Hope">Hope House (Blue)</option>
                </select>
              </div>
            </div>

            <div
              className={`p-3.5 rounded-2xl border space-y-2 text-xs ${
                isLight
                  ? 'border-slate-200 bg-slate-50 text-slate-800'
                  : 'border-slate-800/80 bg-slate-950/40 text-slate-300'
              }`}
            >
              <div className="font-semibold text-amber-500 text-[11px] uppercase tracking-wider font-mono">
                Sandbox Preload Options
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={seedSampleChats}
                  onChange={(e) => setSeedSampleChats(e.target.checked)}
                  className="rounded text-amber-500 focus:ring-0"
                />
                <span>Preload sample Jaipuria Medhavi Socratic chat session</span>
              </label>
              {role === 'student' && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={seedQuizHistory}
                    onChange={(e) => setSeedQuizHistory(e.target.checked)}
                    className="rounded text-amber-500 focus:ring-0"
                  />
                  <span>Preload Class 7 Revision Test performance attempt (+2 / -1 scoring)</span>
                </label>
              )}
            </div>

            <button
              type="submit"
              disabled={isSealing}
              className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl text-xs sm:text-sm font-bold bg-[#F5B700] text-[#0B2559] hover:bg-[#E0A800] transition-colors cursor-pointer disabled:opacity-60"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{isSealing ? 'Sealing Sandbox Identity...' : 'Activate Isolated Sandbox Account'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        <div
          className={`mt-4 pt-3 border-t text-center text-[11px] font-mono ${
            isLight ? 'border-slate-200 text-slate-600' : 'border-slate-800/60 text-slate-500'
          }`}
        >
          तमसो मा ज्योतिर्गमय · Seth M.R. Jaipuria School Lucknow · Sandbox Environment
        </div>
      </div>
    </div>
  );
};
