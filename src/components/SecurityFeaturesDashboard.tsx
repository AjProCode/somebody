import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Lock,
  RefreshCw,
  LogOut,
  Search,
  CheckCircle2,
  Clock,
  FileWarning,
  Globe,
  Database,
  Server
} from 'lucide-react';
import { verifyIdentityIntegrity, type IdVerificationResult } from '../utils/medhaviEngine';

export interface SecurityFeaturesDashboardProps {
  isLight: boolean;
  verifiedIdentity: IdVerificationResult;
  facultyIdleTimeoutMinutes: number;
  sessionMaxHours: number;
  lastActivityTimestamp: number;
  onLockAndRelogin: () => void;
  onOpenRestrictedTestStudio: () => void;
  onShowToast: (message: string, type?: 'info' | 'error' | 'success') => void;
}

type SecurityCategory =
  | 'all'
  | 'session_access'
  | 'faculty_vault'
  | 'student_ai'
  | 'infrastructure';

interface SecurityFeatureSpec {
  id: string;
  title: string;
  category: Exclude<SecurityCategory, 'all'>;
  categoryLabel: string;
  scope: string;
  enforcement: string;
  summary: string;
  details: string[];
}

export const SECURITY_FEATURES_CATALOG: SecurityFeatureSpec[] = [
  {
    id: 'faculty-idle-relogin',
    title: 'Session Timeout & Mandatory Faculty Re-Login',
    category: 'session_access',
    categoryLabel: 'Session & Access Control',
    scope: 'Faculty Studio & Vault',
    enforcement: 'Client Idle Monitor + 12h Server Seal',
    summary:
      'If you are logged out or inactive in the Faculty Studio for an extended period (30 minutes of inactivity or 12 hours since login), your session automatically locks and signs out. You must sign back in with your Faculty credentials to access any studio tool, saved circular, or test vault.',
    details: [
      'Automatic logout after 30 minutes of inactivity inside Faculty Studio.',
      'Server-side HMAC identity seals expire strictly after 12 hours.',
      'Signing out immediately clears stored credentials and locks any unlocked test curtains.'
    ]
  },
  {
    id: 'hmac-role-isolation',
    title: 'Server-Sealed HMAC Role Verification & Zero-Trust Boundaries',
    category: 'session_access',
    categoryLabel: 'Session & Access Control',
    scope: 'All Accounts',
    enforcement: 'HMAC-SHA256 + Timing-Safe Check',
    summary:
      'Every Faculty login receives a 256-bit HMAC signature from the backend. Every chat and studio API call validates this cryptographic seal so students or tampered browser storage cannot impersonate teachers or open Faculty Studios.',
    details: [
      'Student requests targeting teacher workflows receive an immediate HTTP 403 block.',
      'Cross-tab localStorage tampering triggers automatic session termination.',
      '6 consecutive failed faculty login attempts trigger a temporary per-IP lockout.'
    ]
  },
  {
    id: 'restricted-test-studio-isolation',
    title: 'Isolated Restricted ICSE Test Studio Enforcement',
    category: 'faculty_vault',
    categoryLabel: 'Faculty Studio Vault',
    scope: 'Educators Only',
    enforcement: 'Server & Client Route Guard',
    summary:
      'Educators cannot generate, duplicate, or view ICSE question papers, unit tests, or worksheets inside regular chat. Assessment creation is locked strictly inside the Restricted ICSE Test Studio.',
    details: [
      'Requests to generate tests in standard chat are intercepted by a security guard.',
      'Paper blueprints require verified institutional password confirmation inside the studio.',
      'Topic-format locks prevent duplicate re-generation of previously issued assessments.'
    ]
  },
  {
    id: 'privacy-curtain-anti-leak',
    title: 'Privacy Curtain Blackout & Anti-Copy Screen Protection',
    category: 'faculty_vault',
    categoryLabel: 'Faculty Studio Vault',
    scope: 'Restricted Test Vault',
    enforcement: 'Focus-Loss & Shortcut Interceptor',
    summary:
      'Switching browser tabs, losing window focus, right-clicking, or pressing PrintScreen, Print, Save, Copy, or Developer Inspector shortcuts immediately blacks out the paper behind a Privacy Curtain requiring password re-entry.',
    details: [
      'Disables copy, cut, context menu, and keyboard text selection on assessment viewports.',
      'Intercepts Cmd/Ctrl+P, Cmd/Ctrl+S, F12, View-Source, and screenshot key combinations.',
      'Clears clipboard contents and logs security alert events inside the studio audit feed.'
    ]
  },
  {
    id: 'three-download-purge',
    title: 'Encrypted Vault Storage & 3-Download Auto-Purge',
    category: 'faculty_vault',
    categoryLabel: 'Faculty Studio Vault',
    scope: 'Issued Assessments',
    enforcement: 'AES-GCM Ciphertext + Server Ledger',
    summary:
      'Generated question papers are stored encrypted in the Faculty Vault and tracked by a server download ledger allowing at most 3 downloads per assessment. On the 3rd download, the paper content is permanently purged.',
    details: [
      'Server ledger enforces the 3/3 download limit regardless of browser refreshes.',
      'Watermark stamps Faculty name, institutional ID, and copy index onto downloaded papers.',
      'Once purged, ciphertext is erased so no further downloads or prints can be extracted.'
    ]
  },
  {
    id: 'student-zero-leakage',
    title: 'Student Portal Zero Answer Leakage Boundary',
    category: 'student_ai',
    categoryLabel: 'Student & AI Guardrails',
    scope: 'Student Portal',
    enforcement: 'Server Post-Generation Filter',
    summary:
      'Students never receive direct final solutions to homework calculations, algebraic equations, numerical physics/chemistry problems, or grammar transforms. Medhavi provides the governing rule and Socratic steps instead.',
    details: [
      'Direct answers are permitted strictly for pure rote-memorizable facts and definitions.',
      'Calculated numeric values and equation solutions are stripped before reaching student UI.',
      'All model responses consult the 75-page Jaipuria Medhavi Intelligence Manual before replying.'
    ]
  },
  {
    id: 'school-safe-web-search',
    title: 'Class 7 School-Safe Web Search & Smart Relevance Gate',
    category: 'student_ai',
    categoryLabel: 'Student & AI Guardrails',
    scope: 'Smart Web Toggle',
    enforcement: 'Strict SafeSearch + Domain & Topic Filter',
    summary:
      'Live web search activates only when external or current-event information is genuinely needed and filters out adult content, gambling, ads, shopping links, and off-topic pages.',
    details: [
      'Enforces DuckDuckGo Strict SafeSearch (kp=1), Wikipedia academic search, and official sethmrjaipuria.school school info references.',
      'Blocks unsafe domains, URL shorteners, ad redirects, and commercial product pages.',
      'Requires keyword overlap with the academic question before any source link appears.'
    ]
  },
  {
    id: 'server-proxied-keys-csp',
    title: 'Server-Proxied API Keys, Local Voice Privacy & Rate Limiting',
    category: 'infrastructure',
    categoryLabel: 'Infrastructure & Cloud',
    scope: 'Backend Proxy & Headers',
    enforcement: 'Express Helmet Headers + Sliding Rate Limit',
    summary:
      'OpenRouter NVIDIA Nemotron Super VL credentials remain strictly inside server environment variables behind /api/* routes, while voice synthesis and dictation run 100% locally in the browser with zero external audio keys.',
    details: [
      'X-Content-Type-Options, Permissions-Policy, and CSP headers restrict script and media origins.',
      'Markdown output is sanitized with DOMPurify prior to rendering to eliminate XSS.',
      'Sliding-window per-IP rate limits guard chat, web search, downloads, and authentication.'
    ]
  },
  {
    id: 'firestore-zero-trust-rules',
    title: 'Verified Cloud Sync & Strict Firestore Ownership Rules',
    category: 'infrastructure',
    categoryLabel: 'Infrastructure & Cloud',
    scope: 'Cloud Sync Database',
    enforcement: 'Firebase Rules & Immutable Schema Bounds',
    summary:
      'Synced chats, studio histories, ICSE rules, and revision attempts are strictly isolated per verified Google account UID with immutable ownership fields and strict payload size limits.',
    details: [
      'Requires verified email auth matching both request UID and document path.',
      'Rejects cross-user reads, role escalation writes, shadow fields, and oversized payloads.',
      'Revision quiz attempt logs are write-once immutable records.'
    ]
  }
];

const CATEGORY_OPTIONS: Array<{ id: SecurityCategory; label: string }> = [
  { id: 'all', label: 'All Features' },
  { id: 'session_access', label: 'Session & Re-Login' },
  { id: 'faculty_vault', label: 'Faculty Vault' },
  { id: 'student_ai', label: 'Student & AI Safety' },
  { id: 'infrastructure', label: 'Cloud & Backend' }
];

export const SecurityFeaturesDashboard: React.FC<SecurityFeaturesDashboardProps> = ({
  isLight,
  verifiedIdentity,
  facultyIdleTimeoutMinutes,
  sessionMaxHours,
  lastActivityTimestamp,
  onLockAndRelogin,
  onOpenRestrictedTestStudio,
  onShowToast
}) => {
  const persona = verifiedIdentity.extractedRole;
  const [selectedCategory, setSelectedCategory] = useState<SecurityCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [checkingLive, setCheckingLive] = useState(false);
  const [liveServerStatus, setLiveServerStatus] = useState<{
    checkedAt: string;
    hmacSealing: boolean;
    cspEnforced: boolean;
    rateLimitingActive: boolean;
    maxDownloads: number;
  } | null>(null);
  const [nowTick, setNowTick] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNowTick(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const handleCheckLiveSecurity = async () => {
    setCheckingLive(true);
    try {
      const resp = await fetch('/api/security/status');
      if (!resp.ok) throw new Error('Unable to reach security status endpoint');
      const data = await resp.json();
      setLiveServerStatus({
        checkedAt: new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        }),
        hmacSealing: Boolean(data.hmacSealing),
        cspEnforced: Boolean(data.cspEnforced),
        rateLimitingActive: Boolean(data.rateLimitingActive),
        maxDownloads: Number(data.maxAssessmentDownloads || 3)
      });
      onShowToast('Verified live server security controls.', 'success');
    } catch {
      onShowToast('Could not verify server security endpoint right now.', 'error');
    } finally {
      setCheckingLive(false);
    }
  };

  const normalizedSearch = searchQuery.trim().toLowerCase();
  const visibleFeatures = SECURITY_FEATURES_CATALOG.filter((feat) => {
    const matchesCat = selectedCategory === 'all' || feat.category === selectedCategory;
    if (!matchesCat) return false;
    if (!normalizedSearch) return true;
    const haystack = [
      feat.title,
      feat.categoryLabel,
      feat.scope,
      feat.enforcement,
      feat.summary,
      ...feat.details
    ]
      .join(' ')
      .toLowerCase();
    return haystack.includes(normalizedSearch);
  });

  const signatureValid = verifyIdentityIntegrity(verifiedIdentity);
  const hasServerSeal = Boolean(verifiedIdentity.serverSeal);
  const idleElapsedMs = Math.max(0, nowTick - lastActivityTimestamp);
  const idleRemainingMins = Math.max(
    0,
    Math.ceil((facultyIdleTimeoutMinutes * 60_000 - idleElapsedMs) / 60_000)
  );
  const issuedAt = typeof verifiedIdentity.issuedAt === 'number' ? verifiedIdentity.issuedAt : nowTick;
  const sessionExpiresAtText = new Date(
    issuedAt + sessionMaxHours * 60 * 60 * 1000
  ).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const renderCategoryIcon = (category: SecurityFeatureSpec['category']) => {
    if (category === 'session_access') return <Clock className="w-4 h-4 text-[#D99B00] shrink-0" />;
    if (category === 'faculty_vault') return <FileWarning className="w-4 h-4 text-[#D99B00] shrink-0" />;
    if (category === 'student_ai') return <Globe className="w-4 h-4 text-[#D99B00] shrink-0" />;
    return <Database className="w-4 h-4 text-[#D99B00] shrink-0" />;
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header Banner */}
      <div
        className={`editorial-surface rounded-xl p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-5 border ${
          isLight ? 'border-[#0B2559]/12 text-[#0B2559]' : 'border-[#F5B700]/20 text-slate-100'
        }`}
      >
        <div className="space-y-2 max-w-2xl">
          <div
            className={`text-xs font-mono uppercase tracking-wider font-semibold flex items-center gap-2 ${
              isLight ? 'text-[#0B2559]/75' : 'text-[#F5B700]'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-[#F5B700] shrink-0" />
            <span>Seth M.R. Jaipuria School · Institutional Security Charter</span>
          </div>
          <h1
            className={`text-2xl sm:text-3xl font-bold font-display text-balance ${
              isLight ? 'text-[#0B2559]' : 'text-slate-100'
            }`}
          >
            Security Features &amp; Zero-Trust Controls
          </h1>
          <p className={`text-sm leading-relaxed ${isLight ? 'text-[#0B2559]/75' : 'text-slate-300'}`}>
            Complete directory of session expiry rules, mandatory Faculty re-authentication, encrypted test vault protections, student answer safeguards, and server security guarantees.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            disabled={checkingLive}
            onClick={handleCheckLiveSecurity}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-[#F5B700] text-[#0B2559] hover:bg-[#E0A800] disabled:opacity-60 transition-colors cursor-pointer whitespace-nowrap"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${checkingLive ? 'animate-spin' : ''}`} />
            <span>{checkingLive ? 'Verifying…' : 'Verify Live Security'}</span>
          </button>

          <button
            type="button"
            onClick={onLockAndRelogin}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold border transition-colors cursor-pointer whitespace-nowrap ${
              isLight
                ? 'border-[#0B2559]/20 bg-white text-[#0B2559] hover:border-[#0B2559]'
                : 'border-slate-700 bg-slate-900/60 text-slate-200 hover:border-[#F5B700]'
            }`}
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Lock &amp; Re-Login</span>
          </button>
        </div>
      </div>

      {/* Live Session Telemetry Strip */}
      <div
        className={`rounded-xl border p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 tabular-nums ${
          isLight
            ? 'bg-white border-[#0B2559]/12 text-[#0B2559]'
            : 'bg-[#0F172A] border-slate-800 text-slate-100'
        }`}
      >
        <div className="space-y-1">
          <div className={`text-[11px] font-mono uppercase ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
            Active Session Identity
          </div>
          <div className="text-sm font-bold truncate">
            {verifiedIdentity.extractedName} · {verifiedIdentity.schoolId}
          </div>
          <div className={`text-xs ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
            {persona === 'teacher' ? 'Faculty Studio Clearance' : 'Student Portal'} ·{' '}
            {signatureValid ? 'Signature Valid' : 'Invalid'}
          </div>
        </div>

        <div className="space-y-1">
          <div className={`text-[11px] font-mono uppercase ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
            Inactivity Re-Login Guard
          </div>
          <div className="text-sm font-bold">
            {persona === 'teacher'
              ? `${idleRemainingMins}m remaining (${facultyIdleTimeoutMinutes}m limit)`
              : `${sessionMaxHours}h Session Window`}
          </div>
          <div className={`text-xs ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
            {persona === 'teacher'
              ? 'Requires fresh login after idle timeout'
              : 'Auto-expires at 12-hour boundary'}
          </div>
        </div>

        <div className="space-y-1">
          <div className={`text-[11px] font-mono uppercase ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
            Server Seal &amp; Expiry
          </div>
          <div className="text-sm font-bold">
            {hasServerSeal ? 'HMAC-SHA256 Sealed' : 'Signed Client Token'}
          </div>
          <div className={`text-xs ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
            Max valid until {sessionExpiresAtText}
          </div>
        </div>

        <div className="space-y-1">
          <div className={`text-[11px] font-mono uppercase ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
            Live Server Audit
          </div>
          {liveServerStatus ? (
            <>
              <div className="text-sm font-bold flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Verified at {liveServerStatus.checkedAt}</span>
              </div>
              <div className={`text-xs ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                CSP {liveServerStatus.cspEnforced ? 'On' : 'Off'} · Rate Limit{' '}
                {liveServerStatus.rateLimitingActive ? 'On' : 'Off'} · Max {liveServerStatus.maxDownloads} DL
              </div>
            </>
          ) : (
            <>
              <div className="text-sm font-bold flex items-center gap-1.5">
                <Server className="w-4 h-4 text-[#D99B00] shrink-0" />
                <span>Ready to Audit</span>
              </div>
              <div className={`text-xs ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                Click &ldquo;Verify Live Security&rdquo; above
              </div>
            </>
          )}
        </div>
      </div>

      {/* Category Filter Bar + Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div
          role="tablist"
          aria-label="Filter security features"
          className={`flex flex-wrap items-center gap-1 p-1 rounded-xl border ${
            isLight ? 'bg-slate-100 border-slate-200' : 'bg-slate-900 border-slate-800'
          }`}
        >
          {CATEGORY_OPTIONS.map((opt) => {
            const active = selectedCategory === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setSelectedCategory(opt.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  active
                    ? isLight
                      ? 'bg-white text-[#0B2559] shadow-xs'
                      : 'bg-[#0B2559] text-white'
                    : isLight
                    ? 'text-slate-600 hover:text-[#0B2559]'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        <div className="relative w-full md:w-64">
          <Search
            className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 ${
              isLight ? 'text-slate-400' : 'text-slate-500'
            }`}
          />
          <label htmlFor="security-search-input" className="sr-only">
            Search security features
          </label>
          <input
            id="security-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter policies (e.g. re-login, vault)..."
            className={`w-full pl-9 pr-3 py-2 rounded-xl border text-xs outline-none transition-colors ${
              isLight
                ? 'bg-white border-slate-200 text-slate-900 focus:border-[#0B2559]'
                : 'bg-slate-900 border-slate-800 text-slate-100 focus:border-[#F5B700]'
            }`}
          />
        </div>
      </div>

      {/* Security Feature Cards Grid */}
      {visibleFeatures.length === 0 ? (
        <div
          className={`rounded-xl border p-8 text-center text-sm ${
            isLight
              ? 'bg-white border-slate-200 text-slate-600'
              : 'bg-slate-900 border-slate-800 text-slate-400'
          }`}
        >
          No security rules match &ldquo;{searchQuery}&rdquo;. Try clearing your filter.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {visibleFeatures.map((feature, index) => (
            <section
              key={feature.id}
              className={`rounded-xl border p-5 sm:p-6 flex flex-col justify-between gap-4 ${
                isLight
                  ? 'bg-white border-[#0B2559]/12 text-[#0B2559]'
                  : 'bg-[#0F172A] border-slate-800 text-slate-100'
              }`}
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <div
                    className={`flex items-center gap-1.5 font-mono ${
                      isLight ? 'text-slate-500' : 'text-slate-400'
                    }`}
                  >
                    <span>{String(index + 1).padStart(2, '0')}</span>
                    <span aria-hidden="true">·</span>
                    <span>{feature.categoryLabel}</span>
                    <span aria-hidden="true">·</span>
                    <span>{feature.scope}</span>
                  </div>
                  {renderCategoryIcon(feature.category)}
                </div>

                <h2 className="text-base sm:text-lg font-bold font-display leading-snug">
                  {feature.title}
                </h2>

                <p className={`text-sm leading-relaxed ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                  {feature.summary}
                </p>

                <ul
                  className={`pt-2 border-t space-y-1.5 text-xs ${
                    isLight
                      ? 'border-slate-100 text-slate-600'
                      : 'border-slate-800/80 text-slate-400'
                  }`}
                >
                  {feature.details.map((line) => (
                    <li key={line} className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div
                className={`pt-3 border-t flex items-center justify-between gap-2 text-[11px] font-mono ${
                  isLight ? 'border-slate-100 text-slate-500' : 'border-slate-800 text-slate-400'
                }`}
              >
                <span>Enforcement: {feature.enforcement}</span>
                {feature.id === 'restricted-test-studio-isolation' && persona === 'teacher' && (
                  <button
                    type="button"
                    onClick={onOpenRestrictedTestStudio}
                    className="inline-flex items-center gap-1 text-xs font-sans font-semibold text-[#0B2559] dark:text-[#F5B700] hover:underline cursor-pointer whitespace-nowrap"
                  >
                    <Lock className="w-3 h-3" />
                    <span>Open Test Vault</span>
                  </button>
                )}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
};
