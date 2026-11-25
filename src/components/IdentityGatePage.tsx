import React, { useState } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  GraduationCap,
  BookOpen,
  ArrowRight,
  LogIn,
  Eye,
  EyeOff,
  Sun,
  Moon
} from 'lucide-react';
import type { User } from 'firebase/auth';
import {
  buildVerifiedIdentityResult,
  signVerifiedIdentity,
  type IdVerificationResult,
  type PersonaRole
} from '../utils/medhaviEngine';
import { CreateDemoAccountModal, type DemoAccountConfig } from './CreateDemoAccountModal';
import type { BlockLayoutMode } from './JyotiKnowledgeField';

interface IdentityGatePageProps {
  isLight: boolean;
  onToggleTheme: () => void;
  layoutMode: BlockLayoutMode;
  onChangeLayoutMode: (layout: BlockLayoutMode) => void;
  selectedSubject: string;
  onSelectSubject: (subject: string) => void;
  user: User | null;
  onGoogleSignIn: () => Promise<void>;
  onCompleteVerification: (result: IdVerificationResult, demoConfig?: DemoAccountConfig) => void;
}

const STARTING_SUBJECTS: Array<{
  subject: string;
  code: string;
  label: string;
}> = [
  { subject: 'Mathematics', code: '01', label: 'Mathematics' },
  { subject: 'Physics', code: '02', label: 'Physics' },
  { subject: 'Chemistry', code: '03', label: 'Chemistry' },
  { subject: 'Biology', code: '04', label: 'Biology' },
  { subject: 'Hindi — हिन्दी', code: '05', label: 'Hindi · Sanskrit' },
  { subject: 'General Knowledge', code: '06', label: 'ICSE General' }
];

export const IdentityGatePage: React.FC<IdentityGatePageProps> = ({
  isLight,
  onToggleTheme,
  selectedSubject,
  onSelectSubject,
  user,
  onGoogleSignIn,
  onCompleteVerification
}) => {
  const [role, setRole] = useState<PersonaRole>('student');
  const [fullName, setFullName] = useState('Atharva Jindal');
  const [schoolId, setSchoolId] = useState('13457');
  const [password, setPassword] = useState('');
  const [facultyPasscode, setFacultyPasscode] = useState('SMRJ-FAC-2026');
  const [showPassword, setShowPassword] = useState(false);
  const [showPasscode, setShowPasscode] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [demoModalOpen, setDemoModalOpen] = useState(false);

  const handleRoleSwitch = (newRole: PersonaRole) => {
    setRole(newRole);
    const defaultName = newRole === 'teacher' ? 'Dr. Ananya Sharma' : 'Atharva Jindal';
    const defaultId = newRole === 'teacher' ? 'SMRJ-FAC-0742' : '13457';
    setFullName(defaultName);
    setSchoolId(defaultId);
    setErrorMsg(null);
  };

  const performVerification = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!fullName.trim() || !schoolId.trim()) {
      setErrorMsg('Please enter your Registered Full Name and Official Scholar / Employee Number.');
      return;
    }

    if (!password.trim()) {
      setErrorMsg('Please enter your Institutional Password to authenticate.');
      return;
    }

    setIsVerifying(true);
    setErrorMsg(null);

    let result: IdVerificationResult | null = null;

    try {
      const response = await fetch('/api/verify-id', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role,
          fullName: fullName.trim(),
          schoolId: schoolId.trim(),
          password: password.trim(),
          facultyPasscode: role === 'teacher' ? facultyPasscode.trim() : undefined,
          isDemo: false
        })
      });

      if (response.status === 429) {
        const rateErr = await response.json().catch(() => ({}));
        setErrorMsg(
          rateErr?.summary ||
            rateErr?.error ||
            'Too many failed login attempts. Temporary brute-force cooldown active (60s).'
        );
        setIsVerifying(false);
        return;
      }

      if (response.ok) {
        result = await response.json();
      } else {
        const errPayload = await response.json().catch(() => null);
        if (errPayload && typeof errPayload.summary === 'string') {
          result = errPayload as IdVerificationResult;
        } else {
          result = signVerifiedIdentity(
            buildVerifiedIdentityResult({
              role,
              fullName: fullName.trim(),
              schoolId: schoolId.trim(),
              password: password.trim(),
              facultyPasscode: role === 'teacher' ? facultyPasscode.trim() : undefined,
              isDemo: false
            })
          );
        }
      }
    } catch {
      result = signVerifiedIdentity(
        buildVerifiedIdentityResult({
          role,
          fullName: fullName.trim(),
          schoolId: schoolId.trim(),
          password: password.trim(),
          facultyPasscode: role === 'teacher' ? facultyPasscode.trim() : undefined,
          isDemo: false
        })
      );
    } finally {
      setIsVerifying(false);
    }

    if (result) {
      if (!result.verified) {
        setErrorMsg(
          result.summary ||
            'Verification Failed: Credentials do not match an official Seth M.R. Jaipuria School record.'
        );
      } else {
        setErrorMsg(null);
        onCompleteVerification(result);
      }
    }
  };

  const pageBg = isLight ? 'bg-white text-[#0A0A0A]' : 'bg-[#0A0D14] text-[#F4F4F0]';
  const surfaceBg = isLight ? 'bg-white border-[#E5E7EB]' : 'bg-[#111622] border-[#2A3244]';
  const mutedInk = isLight ? 'text-[#525E70]' : 'text-[#94A3B8]';
  const inputSurface = isLight
    ? 'bg-white border-[#E5E7EB] text-[#0A0A0A] focus:border-[#0B2559]'
    : 'bg-[#0A0D14] border-[#2A3244] text-[#F4F4F0] focus:border-white';

  return (
    <div className={`min-h-[100dvh] flex flex-col justify-between bg-architectural-grid ${pageBg}`}>
      {/* TOP BAR CONTRACT — Single Row, 3 Minimal Zones */}
      <header
        className={`w-full px-4 sm:px-8 py-3.5 border-b ${
          isLight ? 'bg-white border-[#E5E7EB]' : 'bg-[#111622] border-[#2A3244]'
        }`}
      >
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4 sm:gap-8">
          {/* Zone 1: Brand Wordmark */}
          <div className="flex items-center gap-2.5 min-w-0 shrink-0">
            <div className="w-8 h-8 rounded-md bg-white border border-[#0B2559] p-0.5 flex items-center justify-center shrink-0">
              <img
                src="/assets/aistudio/image_5d051b68.png"
                alt="Jaipuria Medhavi Emblem"
                referrerPolicy="no-referrer"
                className="w-full h-full object-contain"
              />
            </div>
            <span className="text-sm sm:text-base font-bold font-display tracking-tight text-[#0B2559] dark:text-[#F4F4F0] whitespace-nowrap">
              JAIPURIA MEDHAVI
            </span>
          </div>

          {/* Zone 2: Minimal Typography Controls */}
          <nav
            aria-label="Workspace Preferences"
            className="hidden md:flex items-center gap-6 text-xs font-semibold shrink-0"
          >
            <button
              type="button"
              onClick={onToggleTheme}
              className="flex items-center gap-1.5 hover:underline underline-offset-4 whitespace-nowrap shrink-0 cursor-pointer"
            >
              {isLight ? (
                <>
                  <Moon className="w-3.5 h-3.5 text-[#0B2559]" />
                  <span>Night Ink</span>
                </>
              ) : (
                <>
                  <Sun className="w-3.5 h-3.5 text-[#F4F4F0]" />
                  <span>Daylight</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => void onGoogleSignIn()}
              className="flex items-center gap-1.5 hover:underline underline-offset-4 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5 text-[#0B2559] dark:text-[#F4F4F0]" />
              <span>{user ? user.displayName || 'Cloud Linked' : 'Google Cloud Sync'}</span>
            </button>
          </nav>

          {/* Zone 3: Primary Action */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onToggleTheme}
              aria-label={isLight ? 'Switch to Night Ink' : 'Switch to Daylight'}
              className={`md:hidden p-2 rounded-lg border cursor-pointer ${
                isLight ? 'border-[#E5E7EB] text-[#0B2559]' : 'border-[#2A3244] text-[#F4F4F0]'
              }`}
            >
              {isLight ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={() => setDemoModalOpen(true)}
              className="px-4 py-2 rounded-lg text-xs font-bold bg-[#0B2559] text-white hover:bg-[#081C44] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Sandbox Portal
            </button>
          </div>
        </div>
      </header>

      {/* MINIMAL MONOCHROME-NAVY TWO-COLUMN ARCHITECTURAL STAGE */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-8 py-8 sm:py-12 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
        {/* LEFT EDITORIAL COLUMN */}
        <section className="lg:col-span-6 space-y-8">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono font-bold uppercase tracking-[0.16em] text-[#0B2559] dark:text-[#94A3B8]">
              <span>Seth M.R. Jaipuria School</span>
              <span aria-hidden="true">·</span>
              <span>School of Conscious Transformation</span>
              <span aria-hidden="true">·</span>
              <span>मेधावी</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-[3.35rem] font-bold font-display tracking-[-0.035em] leading-[1.03] text-[#0A0A0A] dark:text-[#F4F4F0] text-balance">
              Your Personal AI Scholar{' '}
              <span className="font-serif-editorial italic font-normal text-[#0B2559] dark:text-white text-[1.08em]">
                for ICSE Class 7.
              </span>
            </h1>

            <p className={`text-sm sm:text-base leading-relaxed max-w-lg font-medium ${mutedInk}`}>
              Guided by <span className="italic">Tamso Ma Jyotirgamaya</span> — blending Indian ethos with 21st-century STEAM inquiry, CISCE concept clarity, school knowledge, and Faculty studios for{' '}
              <a
                href="https://www.sethmrjaipuria.school/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2 font-semibold text-[#0B2559] dark:text-[#F4F4F0] hover:opacity-80"
              >
                Seth M.R. Jaipuria School, Lucknow
              </a>
              .
            </p>
          </div>

          {/* Starting Subject Monochrome Selector */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="font-semibold text-[#0B2559] dark:text-[#F4F4F0]">
                Starting Subject
              </span>
              <span className={mutedInk}>{selectedSubject}</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {STARTING_SUBJECTS.map((item) => {
                const isActive = selectedSubject === item.subject;
                return (
                  <button
                    key={item.subject}
                    type="button"
                    onClick={() => onSelectSubject(item.subject)}
                    className={`px-3.5 py-2.5 rounded-lg border text-left grid-tile-interactive cursor-pointer flex items-center justify-between gap-2 ${
                      isActive
                        ? 'bg-[#0B2559] border-[#0B2559] text-white shadow-sm'
                        : isLight
                        ? 'bg-white border-[#E5E7EB] text-[#0A0A0A] hover:border-[#0B2559]'
                        : 'bg-[#111622] border-[#2A3244] text-[#F4F4F0] hover:border-white'
                    }`}
                  >
                    <span className="text-xs font-semibold truncate">{item.label}</span>
                    <span className="text-[10px] font-mono opacity-75 shrink-0">{item.code}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quiet Attribution Row */}
          <div
            className={`pt-6 border-t flex flex-wrap items-center justify-between gap-4 ${
              isLight ? 'border-[#E5E7EB]' : 'border-[#2A3244]'
            }`}
          >
            <div className="inline-flex items-center gap-2.5">
              <img
                src="/assets/aistudio/TechPreneur_Logo__1__a019c2b1.png"
                alt="TechPreneur Club Badge"
                referrerPolicy="no-referrer"
                className="w-7 h-7 rounded-md object-cover border border-[#0B2559] shrink-0"
              />
              <span className="text-xs font-semibold text-[#0B2559] dark:text-[#F4F4F0]">
                Made by TechPreneur Club
              </span>
            </div>
            <span className={`text-xs font-mono ${mutedInk}`}>
              ICSE Class 7 · Scholars &amp; Faculty
            </span>
          </div>
        </section>

        {/* RIGHT INSTITUTIONAL SIGN-IN CARD */}
        <section className="lg:col-span-6">
          <div className={`rounded-xl border overflow-hidden ${surfaceBg}`}>
            <div
              className={`px-6 py-5 border-b flex items-center justify-between gap-3 ${
                isLight ? 'bg-white border-[#E5E7EB]' : 'bg-[#111622] border-[#2A3244]'
              }`}
            >
              <div>
                <div className={`text-[11px] font-mono ${mutedInk}`}>
                  Verified School Access
                </div>
                <h2 className="text-2xl font-bold font-display mt-0.5 text-[#0B2559] dark:text-[#F4F4F0]">
                  Scholar &amp; Faculty Sign-In
                </h2>
              </div>
              <span className={`text-[11px] font-mono shrink-0 ${mutedInk}`}>SMRJ · VII</span>
            </div>

            <div className="p-6 space-y-5">
              {/* Role Tab Switch */}
              <div
                role="tablist"
                aria-label="Institutional Role"
                className={`grid grid-cols-2 gap-1.5 p-1 rounded-lg border ${
                  isLight ? 'bg-white border-[#E5E7EB]' : 'bg-[#0A0D14] border-[#2A3244]'
                }`}
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={role === 'student'}
                  onClick={() => handleRoleSwitch('student')}
                  className={`flex items-center justify-center gap-2 py-2.5 rounded-md text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                    role === 'student'
                      ? 'bg-[#0B2559] text-white'
                      : `${mutedInk} hover:text-[#0B2559] dark:hover:text-white`
                  }`}
                >
                  <GraduationCap className="w-4 h-4 shrink-0" />
                  <span>Class 7 Scholar</span>
                </button>

                <button
                  type="button"
                  role="tab"
                  aria-selected={role === 'teacher'}
                  onClick={() => handleRoleSwitch('teacher')}
                  className={`flex items-center justify-center gap-2 py-2.5 rounded-md text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                    role === 'teacher'
                      ? 'bg-[#0B2559] text-white'
                      : `${mutedInk} hover:text-[#0B2559] dark:hover:text-white`
                  }`}
                >
                  <BookOpen className="w-4 h-4 shrink-0" />
                  <span>Class 7 Faculty</span>
                </button>
              </div>

              <form onSubmit={(e) => void performVerification(e)} className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="login-fullname" className="block text-xs font-semibold">
                    Registered Full Name
                  </label>
                  <input
                    id="login-fullname"
                    type="text"
                    autoComplete="name"
                    value={fullName}
                    onChange={(e) => {
                      setFullName(e.target.value);
                      if (errorMsg) setErrorMsg(null);
                    }}
                    className={`w-full px-3.5 py-2.5 rounded-lg border outline-none text-sm transition-colors ${inputSurface}`}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1.5">
                    <label htmlFor="login-school-id" className="block text-xs font-semibold">
                      {role === 'student' ? 'Scholar Number' : 'Employee Number'}
                    </label>
                    <input
                      id="login-school-id"
                      type="text"
                      value={schoolId}
                      onChange={(e) => {
                        setSchoolId(e.target.value);
                        if (errorMsg) setErrorMsg(null);
                      }}
                      placeholder={role === 'student' ? '13457' : 'SMRJ-FAC-0742'}
                      className={`w-full px-3.5 py-2.5 rounded-lg border outline-none text-sm font-mono transition-colors ${inputSurface}`}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="login-password" className="block text-xs font-semibold">
                      Institutional Password
                    </label>
                    <div className="relative">
                      <input
                        id="login-password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="current-password"
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          if (errorMsg) setErrorMsg(null);
                        }}
                        placeholder="Enter password"
                        className={`w-full pl-3.5 pr-9 py-2.5 rounded-lg border outline-none text-sm transition-colors ${inputSurface}`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        className={`absolute right-2.5 top-1/2 -translate-y-1/2 ${mutedInk} hover:text-[#0B2559] cursor-pointer`}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                {role === 'teacher' && (
                  <div className="space-y-1.5">
                    <label htmlFor="login-faculty-passcode" className="block text-xs font-semibold">
                      Faculty Security Passcode
                    </label>
                    <div className="relative">
                      <input
                        id="login-faculty-passcode"
                        type={showPasscode ? 'text' : 'password'}
                        value={facultyPasscode}
                        onChange={(e) => {
                          setFacultyPasscode(e.target.value);
                          if (errorMsg) setErrorMsg(null);
                        }}
                        className={`w-full pl-3.5 pr-9 py-2.5 rounded-lg border outline-none text-sm font-mono transition-colors ${inputSurface}`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasscode((prev) => !prev)}
                        aria-label={showPasscode ? 'Hide passcode' : 'Show passcode'}
                        className={`absolute right-2.5 top-1/2 -translate-y-1/2 ${mutedInk} hover:text-[#0B2559] cursor-pointer`}
                      >
                        {showPasscode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                )}

                {errorMsg && (
                  <div
                    role="alert"
                    className="p-3 rounded-lg border border-[#0A0A0A] bg-[#0A0A0A] text-white flex items-start gap-2.5 text-xs leading-relaxed font-medium"
                  >
                    <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>{errorMsg}</div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isVerifying}
                  className="w-full flex items-center justify-center gap-2 py-3.5 px-5 rounded-lg text-sm font-bold bg-[#0B2559] text-white hover:bg-[#081C44] transition-colors disabled:opacity-70 cursor-pointer"
                >
                  {isVerifying ? (
                    <span>Verifying &amp; Sealing Identity…</span>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>Enter Official Workspace</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              <div
                className={`pt-4 border-t flex flex-wrap items-center justify-between gap-3 text-xs ${
                  isLight ? 'border-[#E5E7EB]' : 'border-[#2A3244]'
                }`}
              >
                <span className={mutedInk}>Explore a preview without school credentials</span>
                <button
                  type="button"
                  onClick={() => setDemoModalOpen(true)}
                  className={`px-3.5 py-1.5 rounded-lg font-bold border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    isLight
                      ? 'border-[#0B2559] text-[#0B2559] hover:bg-[#0B2559] hover:text-white'
                      : 'border-[#F4F4F0] text-[#F4F4F0] hover:bg-white hover:text-[#0A0A0A]'
                  }`}
                >
                  Open Sandbox Portal
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer
        className={`px-4 sm:px-8 py-3.5 pb-safe border-t text-xs font-mono flex flex-wrap items-center justify-between gap-2 ${
          isLight
            ? 'bg-white border-[#E5E7EB] text-[#525E70]'
            : 'bg-[#111622] border-[#2A3244] text-[#94A3B8]'
        }`}
      >
        <span>Seth M.R. Jaipuria School · Lucknow · Tamso Ma Jyotirgamaya</span>
        <a
          href="https://www.sethmrjaipuria.school/"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:underline"
        >
          sethmrjaipuria.school · School of Conscious Transformation
        </a>
      </footer>

      <CreateDemoAccountModal
        isOpen={demoModalOpen}
        onClose={() => setDemoModalOpen(false)}
        isLight={isLight}
        onActivateDemoAccount={(result, config) => {
          onCompleteVerification(result, config);
        }}
      />
    </div>
  );
};
