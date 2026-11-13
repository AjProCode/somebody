import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Sun,
  Moon,
  Paperclip,
  Send,
  Copy,
  Check,
  Bookmark,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  SlidersHorizontal,
  X,
  LogOut,
  Mic,
  Volume2,
  Square,
  ArrowLeft,
  Compass,
  FileText,
  Award,
  Clock,
  Zap,
  Lock,
  ShieldCheck,
  Cloud,
  History,
  LayoutGrid
} from 'lucide-react';
import type { User } from 'firebase/auth';
import {
  LOCKED_GRADE,
  parseMedhaviResponse,
  signVerifiedIdentity,
  verifyIdentityIntegrity,
  isTestGenerationRequest,
  type PersonaRole,
  type IntelligenceMode,
  type CustomSpecItem,
  type QuizData,
  type RevisionPerformanceReport,
  type IdVerificationResult
} from './utils/medhaviEngine';
import { isTestOrAssessmentContent } from './utils/testDownloadLimiter';
import { renderScholarlyMarkdown } from './utils/markdownRenderer';
import {
  JyotiOrb,
  getSubjectBlockTheme,
  type OrbStatus,
  type BlockLayoutMode
} from './components/JyotiKnowledgeField';
import { RevisionQuizView } from './components/RevisionQuizView';
import { IdentityGatePage } from './components/IdentityGatePage';
import { TeacherTestGeneratorDashboard } from './components/TeacherTestGeneratorDashboard';
import { TeacherEvaluationDashboard } from './components/TeacherEvaluationDashboard';
import { TeacherLessonPlanDashboard } from './components/TeacherLessonPlanDashboard';
import { TeacherCircularDashboard } from './components/TeacherCircularDashboard';
import { StudentRevisionTestDashboard } from './components/StudentRevisionTestDashboard';
import { StudentRevisionDashboard } from './components/StudentRevisionDashboard';
import { VoiceChatModal } from './components/VoiceChatModal';
import type { DemoAccountConfig } from './components/CreateDemoAccountModal';
import {
  speakScholarlyText,
  stopAllScholarlySpeech,
  startScholarlyDictation,
  cleanRepeatedSpeechTokens,
  type ActiveDictationSession
} from './utils/voiceAudioEngine';
import {
  MedhaviSpecsModal,
  CloudAccountModal,
  SecurityAndMasteryModal
} from './components/ModalsAndDrawers';
import {
  subscribeToAuth,
  signInWithGoogleScholar,
  signOutScholar,
  ensureUserProfileDoc,
  saveCloudSession,
  deleteCloudSession,
  subscribeToCloudSessions,
  saveCloudSpec,
  deleteCloudSpec,
  subscribeToCloudSpecs,
  saveCloudQuizAttempt,
  subscribeToCloudQuizAttempts,
  type StoredSessionRecord,
  type QuizAttemptRecord
} from './firebase';

const SUBJECT_OPTIONS = [
  'Mathematics',
  'Physics',
  'Chemistry',
  'Biology',
  'Computer Studies',
  'English Literature & Language',
  'Hindi — हिन्दी',
  'Sanskrit — संस्कृतम्',
  'History & Civics',
  'Geography',
  'General Knowledge'
];

const SUBJECT_SHORT_LABELS: Record<string, string> = {
  Mathematics: 'Maths',
  Physics: 'Physics',
  Chemistry: 'Chemistry',
  Biology: 'Biology',
  'Computer Studies': 'Computers',
  'English Literature & Language': 'English',
  'Hindi — हिन्दी': 'Hindi',
  'Sanskrit — संस्कृतम्': 'Sanskrit',
  'History & Civics': 'History',
  Geography: 'Geography',
  'General Knowledge': 'GK'
};

interface RoleToolItem {
  id: string;
  label: string;
  shortLabel: string;
  description: string;
  prompt: string;
  isViewTool?: boolean;
  workflowType?: string;
}

const STUDENT_ONLY_TOOLS: RoleToolItem[] = [
  {
    id: 'revision_arena',
    label: 'Revision Test Generator',
    shortLabel: 'Revision Tests',
    description: 'Custom ICSE practice papers & copyable drills',
    isViewTool: true,
    workflowType: 'revision_test',
    prompt: ''
  },
  {
    id: 'revision',
    label: '5-Min Exam Revision',
    shortLabel: '5-Min Revision',
    description: 'High-yield formulas, traps & 60-sec recall sheets',
    isViewTool: true,
    prompt: ''
  }
];

const TEACHER_ONLY_TOOLS: RoleToolItem[] = [
  {
    id: 'qpaper',
    label: 'Restricted ICSE Test Studio',
    shortLabel: 'Test Vault',
    description: 'Isolated encrypted vault (Max 3 downloads)',
    isViewTool: true,
    prompt: ''
  },
  {
    id: 'evaluator',
    label: 'Answer Evaluator',
    shortLabel: 'Evaluator',
    description: 'CISCE rubric scoring & step-by-step feedback',
    isViewTool: true,
    workflowType: 'answer_evaluator',
    prompt: ''
  },
  {
    id: 'lesson_arch',
    label: 'Lesson Architect',
    shortLabel: 'Lesson Plan',
    description: '40-min minute-by-minute CISCE classroom blueprint',
    isViewTool: true,
    prompt: ''
  },
  {
    id: 'circular',
    label: 'Parent Circular',
    shortLabel: 'Circulars',
    description: 'Bilingual English & हिन्दी official notice draft',
    isViewTool: true,
    prompt: ''
  }
];

const INITIAL_SPECS: CustomSpecItem[] = [
  {
    id: 'spec-core-identity',
    category: 'School Rules',
    title: 'ICSE (CISCE) Core Identity & Motto',
    content:
      'Official AI Scholar "Jaipuria Medhavi" (मेधावी) for Seth M.R. Jaipuria School. Motto: "Tamso Ma Jyotirgamaya". Exclusively calibrated for ICSE (CISCE) Class 7.',
    active: true
  },
  {
    id: 'spec-default-1',
    category: 'Examination Pattern',
    title: 'ICSE (CISCE) Step-by-Step Answer Structure',
    content:
      'CISCE Definition → Step-by-Step Logical Breakdown & Formula → SI Unit Verification → ICSE Class 7 Exam Tip',
    active: true
  },
  {
    id: 'spec-default-2',
    category: 'Examination Pattern',
    title: 'ICSE Revision Testing & 3-Download Test Cap',
    content:
      'All high-security assessments generated in the Restricted Studio are strictly limited to 3 downloads. Student Revision tests have no limit.',
    active: true
  },
  {
    id: 'spec-security-duplication',
    category: 'Teacher Instructions',
    title: 'Anti-Duplication Security Protocol',
    content:
      'Medhavi is strictly prohibited from re-generating or duplicating previously issued assessments. After 3 downloads, tests are permanently purged from the vault.',
    active: true
  }
];

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  durationSeconds?: number;
  reasoningTokens?: number;
  imagePreview?: string;
  model?: string;
  source?: string;
  fallbackReason?: string;
}

export default function App() {
  const grade = LOCKED_GRADE;

  const [verifiedIdentity, setVerifiedIdentity] = useState<IdVerificationResult | null>(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === '1') {
      return signVerifiedIdentity({
        verified: true,
        confidence: 99,
        extractedName: 'Atharva Jindal',
        extractedRole: 'student',
        schoolId: '13457',
        schoolName: 'Seth M.R. Jaipuria School, Lucknow',
        grade: LOCKED_GRADE,
        badgeId: 'JM-AUTO-701',
        summary: 'Verified Seth M.R. Jaipuria School Lucknow ICSE Class 7 Scholar Account.',
        checks: {
          institutionMatch: true,
          roleMatch: true,
          gradeSevenAuthorized: true,
          isDemo: true
        }
      });
    }
    try {
      const saved = localStorage.getItem('medhavi_verified_id');
      if (saved) {
        const parsed = JSON.parse(saved) as IdVerificationResult;
        if (
          verifyIdentityIntegrity(parsed) &&
          (parsed.extractedRole !== 'teacher' || Boolean(parsed.serverSeal))
        ) {
          return parsed;
        }
        localStorage.removeItem('medhavi_verified_id');
      }
    } catch {
      localStorage.removeItem('medhavi_verified_id');
    }
    return null;
  });

  // Session-scoped Privacy Curtain First-Trigger state (Resets strictly on Log Out / Log In)
  const [curtainUnlockedInSession, setCurtainUnlockedInSession] = useState<boolean>(false);

  const persona: PersonaRole =
    verifiedIdentity && verifyIdentityIntegrity(verifiedIdentity)
      ? verifiedIdentity.extractedRole
      : 'student';

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('medhavi_theme_v2');
    return saved === 'dark' ? 'dark' : 'light';
  });
  const isLight = theme === 'light';

  const [layoutMode, setLayoutMode] = useState<BlockLayoutMode>('centered');

  const [subject, setSubject] = useState<string>(
    () => localStorage.getItem('medhavi_subject') || 'Mathematics'
  );
  const [intelligenceMode, setIntelligenceMode] = useState<IntelligenceMode>('pedagogical');

  const selectedModel = 'nvidia/nemotron-3.5-super-vl:free';
  const [cloudOnline, setCloudOnline] = useState<boolean>(true);
  const [orbStatus, setOrbStatus] = useState<OrbStatus>('idle');

  const [customSpecs, setCustomSpecs] = useState<CustomSpecItem[]>(() => {
    try {
      const raw = localStorage.getItem('medhavi_specs');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return INITIAL_SPECS;
  });

  const [quizAttempts, setQuizAttempts] = useState<QuizAttemptRecord[]>(() => {
    try {
      const raw = localStorage.getItem('medhavi_quiz_history');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore
    }
    return [];
  });

  const [sessions, setSessions] = useState<StoredSessionRecord[]>(() => {
    try {
      const raw = localStorage.getItem('medhavi_sessions');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore
    }
    return [];
  });
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [expandedLogicIds, setExpandedLogicIds] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [composerText, setComposerText] = useState('');
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [attachedImageName, setAttachedImageName] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);
  const [activeDockTool, setActiveDockTool] = useState<string>('chat');
  const [specsModalOpen, setSpecsModalOpen] = useState<boolean>(false);
  const [cloudModalOpen, setCloudModalOpen] = useState<boolean>(false);
  const [voiceChatOpen, setVoiceChatOpen] = useState<boolean>(false);
  const [securityModalOpen, setSecurityModalOpen] = useState<boolean>(false);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [composerDictating, setComposerDictating] = useState<boolean>(false);
  const activeRecordingRef = useRef<ActiveDictationSession | null>(null);
  const preDictationTextRef = useRef<string>('');

  const [toast, setToast] = useState<{
    message: string;
    type: 'info' | 'error' | 'success';
  } | null>(null);

  const [user, setUser] = useState<User | null>(null);
  const roleTools = persona === 'student' ? STUDENT_ONLY_TOOLS : TEACHER_ONLY_TOOLS;
  const activeSubjectTheme = getSubjectBlockTheme(subject);

  const showToast = (message: string, type: 'info' | 'error' | 'success' = 'info') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev));
    }, 3800);
  };

  const handleToggleComposerDictation = async () => {
    if (composerDictating) {
      setComposerDictating(false);
      if (activeRecordingRef.current) {
        try {
          showToast('Processing voice input...', 'info');
          const finalTranscript = await activeRecordingRef.current.stop();
          activeRecordingRef.current = null;
          const cleaned = cleanRepeatedSpeechTokens(finalTranscript || '');
          if (cleaned) {
            const base = preDictationTextRef.current;
            setComposerText(base ? `${base} ${cleaned}` : cleaned);
            showToast('Voice transcribed.', 'success');
          }
        } catch (err: any) {
          activeRecordingRef.current = null;
          showToast(err?.message || 'Dictation stopped.', 'info');
        }
      }
    } else {
      stopAllScholarlySpeech();
      preDictationTextRef.current = composerText.trim();
      try {
        setComposerDictating(true);
        showToast('Listening... Speak now and tap Stop when finished.', 'info');
        const session = await startScholarlyDictation({
          onLiveTranscript: (text) => {
            const cleaned = cleanRepeatedSpeechTokens(text);
            if (cleaned) {
              const base = preDictationTextRef.current;
              setComposerText(base ? `${base} ${cleaned}` : cleaned);
            }
          },
          onError: (errMsg) => {
            showToast(`Voice input notice: ${errMsg}`, 'error');
            setComposerDictating(false);
          }
        });
        activeRecordingRef.current = session;
      } catch {
        setComposerDictating(false);
        showToast('Microphone unavailable in browser. Try Live Voice Studio instead.', 'info');
        setVoiceChatOpen(true);
      }
    }
  };

  useEffect(() => {
    const handleSpeechStopped = () => setSpeakingMessageId(null);
    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopAllScholarlySpeech();
        setSpeakingMessageId(null);
        if (activeRecordingRef.current) {
          activeRecordingRef.current.cancel();
          activeRecordingRef.current = null;
          setComposerDictating(false);
        }
      }
    };
    window.addEventListener('medhavi:speech-stopped', handleSpeechStopped);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.removeEventListener('medhavi:speech-stopped', handleSpeechStopped);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('medhavi_theme_v2', theme);
    if (isLight) {
      document.documentElement.classList.remove('dark');
      document.body.classList.add('light-mode');
    } else {
      document.documentElement.classList.add('dark');
      document.body.classList.remove('light-mode');
    }
  }, [theme, isLight]);

  useEffect(() => {
    localStorage.setItem('medhavi_block_layout_v2', layoutMode);
  }, [layoutMode]);

  useEffect(() => {
    localStorage.setItem('medhavi_subject', subject);
  }, [subject]);

  useEffect(() => {
    localStorage.setItem('medhavi_specs', JSON.stringify(customSpecs));
  }, [customSpecs]);

  useEffect(() => {
    localStorage.setItem('medhavi_sessions', JSON.stringify(sessions));
  }, [sessions]);

  useEffect(() => {
    localStorage.setItem('medhavi_quiz_history', JSON.stringify(quizAttempts));
  }, [quizAttempts]);

  const checkServerHealth = async () => {
    try {
      let res = await fetch('/api/health');
      if (!res.ok && res.status === 404) {
        res = await fetch('/health');
      }
      setCloudOnline(res.ok);
    } catch {
      setCloudOnline(true);
    }
  };

  useEffect(() => {
    checkServerHealth();
  }, []);

  useEffect(() => {
    let unsubSessions: (() => void) | null = null;
    let unsubSpecs: (() => void) | null = null;
    let unsubQuizzes: (() => void) | null = null;

    const unsubAuth = subscribeToAuth(async (currentUser) => {
      setUser(currentUser);
      if (unsubSessions) {
        unsubSessions();
        unsubSessions = null;
      }
      if (unsubSpecs) {
        unsubSpecs();
        unsubSpecs = null;
      }
      if (unsubQuizzes) {
        unsubQuizzes();
        unsubQuizzes = null;
      }
      if (currentUser) {
        try {
          await ensureUserProfileDoc(currentUser, {
            persona,
            grade,
            subject,
            theme
          });
          unsubSessions = subscribeToCloudSessions(currentUser, (cloudRecords) => {
            if (cloudRecords.length > 0) setSessions(cloudRecords);
          });
          unsubSpecs = subscribeToCloudSpecs(currentUser, (cloudSpecs) => {
            if (cloudSpecs.length > 0) {
              setCustomSpecs((prev) => {
                const byId = new Map<string, CustomSpecItem>();
                for (const item of prev) byId.set(item.id, item);
                for (const item of cloudSpecs) byId.set(item.id, item);
                return Array.from(byId.values());
              });
            }
          });
          unsubQuizzes = subscribeToCloudQuizAttempts(currentUser, (cloudAttempts) => {
            if (cloudAttempts.length > 0) setQuizAttempts(cloudAttempts);
          });
        } catch {
          // Handled by structured Firestore error logger
        }
      }
    });
    return () => {
      unsubAuth();
      if (unsubSessions) unsubSessions();
      if (unsubSpecs) unsubSpecs();
      if (unsubQuizzes) unsubQuizzes();
    };
  }, [persona]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSpecsModalOpen(false);
        setCloudModalOpen(false);
        setSecurityModalOpen(false);
        setDrawerOpen(false);
      } else if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        handleStartNewSession();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const handleStorageTamperCheck = (e: StorageEvent) => {
      if (e.key === 'medhavi_verified_id') {
        if (!e.newValue) {
          setVerifiedIdentity(null);
          setCurtainUnlockedInSession(false);
          return;
        }
        try {
          const parsed = JSON.parse(e.newValue) as IdVerificationResult;
          if (
            !verifyIdentityIntegrity(parsed) ||
            (parsed.extractedRole === 'teacher' && !parsed.serverSeal)
          ) {
            localStorage.removeItem('medhavi_verified_id');
            setVerifiedIdentity(null);
            setCurtainUnlockedInSession(false);
            showToast('Security Alert: Account tamper detected. Logged out immediately.', 'error');
          }
        } catch {
          localStorage.removeItem('medhavi_verified_id');
          setVerifiedIdentity(null);
          setCurtainUnlockedInSession(false);
        }
      }
    };
    window.addEventListener('storage', handleStorageTamperCheck);
    return () => window.removeEventListener('storage', handleStorageTamperCheck);
  }, []);

  const handleCompleteIdentityGate = (result: IdVerificationResult) => {
    const signed = verifyIdentityIntegrity(result) ? result : signVerifiedIdentity(result);
    if (!verifyIdentityIntegrity(signed)) {
      showToast('Security Alert: Identity verification failed integrity check.', 'error');
      return;
    }
    setCurtainUnlockedInSession(false);
    setVerifiedIdentity(signed);
    setActiveDockTool('chat');
    setMessages([]);
    localStorage.setItem('medhavi_verified_id', JSON.stringify(signed));
    showToast(
      `Welcome, ${signed.extractedName}. Entered ICSE ${
        signed.extractedRole === 'teacher' ? 'Faculty' : 'Scholar'
      } Studio.`,
      'success'
    );
  };

  const handleActivateDemoAccount = (result: IdVerificationResult, config: DemoAccountConfig) => {
    if (
      verifiedIdentity &&
      verifiedIdentity.extractedRole === 'student' &&
      result.extractedRole === 'teacher'
    ) {
      showToast(
        'Security Policy: Student accounts cannot switch into or escalate to Teacher accounts.',
        'error'
      );
      return;
    }
    const signed = verifyIdentityIntegrity(result) ? result : signVerifiedIdentity(result);
    if (!verifyIdentityIntegrity(signed)) {
      showToast('Security Policy: Invalid Teacher credentials blocked.', 'error');
      return;
    }
    setCurtainUnlockedInSession(false);
    setVerifiedIdentity(signed);
    setActiveDockTool('chat');
    localStorage.setItem('medhavi_verified_id', JSON.stringify(signed));

    if (config.seedQuizHistory && signed.extractedRole === 'student') {
      const sampleAttempts: QuizAttemptRecord[] = [
        {
          id: 'demo-qa-1',
          topic: 'Triangles & Angle Sum Property',
          subject: 'Mathematics',
          classLevel: LOCKED_GRADE,
          difficulty: 'Competitive',
          score: 8,
          maxScore: 10,
          accuracy: 80,
          timestamp: Date.now() - 3600000
        },
        {
          id: 'demo-qa-2',
          topic: 'Heat & Thermal Expansion',
          subject: 'Physics',
          classLevel: LOCKED_GRADE,
          difficulty: 'Foundation',
          score: 10,
          maxScore: 10,
          accuracy: 100,
          timestamp: Date.now() - 7200000
        }
      ];
      setQuizAttempts((prev) => (prev.length > 0 ? prev : sampleAttempts));
    }

    if (config.seedSampleChats) {
      const isStudent = signed.extractedRole === 'student';
      const sampleSessionId = `demo-sess-${Date.now()}`;
      const sampleRecord: StoredSessionRecord = {
        id: sampleSessionId,
        title: isStudent
          ? 'ICSE Class 7 Geometry: Triangle Angle Sum Proof'
          : 'ICSE Class 7 Lesson: Fractions & Rational Numbers',
        timestamp: Date.now(),
        role: signed.extractedRole,
        classLevel: LOCKED_GRADE,
        subject: 'Mathematics',
        messages: isStudent
          ? [
              {
                id: 'demo-msg-1',
                role: 'user',
                content:
                  'Why is the sum of interior angles of a triangle always 180 degrees in ICSE Class 7 geometry?',
                timestamp: Date.now() - 300000
              },
              {
                id: 'demo-msg-2',
                role: 'assistant',
                content: `<medhavi_logic>
- Board: ICSE (CISCE) Class 7 Geometry.
- Approach: Construct a parallel line through vertex A to base BC.
- Alternate Interior Angles: Utilize Euclidean parallel postulate.
- Straight Line Angle Sum: Show that linear angles sum to 180°.
</medhavi_logic>

## The ICSE Socratic Proof: Triangle Angle Sum Theorem

Hello **${signed.extractedName}**! Let us prove why the sum of interior angles in **\\(\\Delta ABC\\)** is always \\(180^\\circ\\) using standard ICSE (CISCE) Class 7 geometric logic.

### 1. Construction
Given \\(\\Delta ABC\\) with interior angles \\(\\angle 1, \\angle 2, \\angle 3\\):
1. Through vertex \\(A\\), draw a straight line \\(XY\\) strictly parallel to the opposite base \\(BC\\) (i.e., \\(XY \\parallel BC\\)).

### 2. Alternate Interior Angles
Because line \\(XY\\) is parallel to line \\(BC\\), and sides \\(AB\\) and \\(AC\\) act as transversals:
- \\(\\angle XAB = \\angle ABC = \\angle 2\\) (Alternate Interior Angles)
- \\(\\angle YAC = \\angle ACB = \\angle 3\\) (Alternate Interior Angles)

### 3. Linear Straight Angle
Notice that \\(XAY\\) forms a continuous straight line. The sum of all consecutive angles on a straight line equals \\(180^\\circ\\):
\\[
\\angle XAB + \\angle BAC + \\angle YAC = 180^\\circ
\\]
Substituting our alternate interior identities:
\\[
\\angle 2 + \\angle 1 + \\angle 3 = 180^\\circ
\\]
\\[
\\therefore \\angle A + \\angle B + \\angle C = 180^\\circ \\quad \\blacksquare
\\]

### Medhavi ICSE Concept Check
If an isosceles triangle has one vertex angle of \\(80^\\circ\\), what must each of the remaining two base angles measure?`,
                timestamp: Date.now() - 240000,
                durationSeconds: 0.9,
                reasoningTokens: 184,
                model: selectedModel
              }
            ]
          : [
              {
                id: 'demo-msg-t1',
                role: 'user',
                content:
                  'Design a 40-minute ICSE (CISCE) Class 7 classroom lesson plan on Fractions & Decimals.',
                timestamp: Date.now() - 300000
              },
              {
                id: 'demo-msg-t2',
                role: 'assistant',
                content: `<medhavi_logic>
- Class Level: ICSE (CISCE) Class 7.
- Pedagogical Split: 5m Hook, 7m Prior Knowledge, 13m Core Concept, 7m Paired Activity, 5m Real World, 3m Exit Ticket.
- Verification: Aligned to CISCE Analytical & Step-Marking Standards.
</medhavi_logic>

# 40-Minute ICSE Classroom Lesson Architect: Fractions & Decimals
**Board:** ICSE (CISCE) | **Grade:** Class 7 | **Subject:** Mathematics | **Duration:** 40 Minutes | **Educator:** ${signed.extractedName}

## ICSE Learning Objectives
1. **Conceptual:** Represent multiplication of a fraction by a fraction visually using grid models.
2. **Procedural:** Accurately compute \\(\\frac{a}{b} \\times \\frac{c}{d} = \\frac{a \\times c}{b \\times d}\\) with full CISCE working steps.
3. **Affective:** Value error analysis when identifying improper fraction conversions.

## Pedagogical Timeline
- **00–05 min | The Hook:** Visual paradox with overlapping coloured translucent square sheets.
- **05–12 min | Prior Knowledge Recall:** Diagnostic check on equivalent fractions and common denominators.
- **12–25 min | Core Conceptual Instruction:** Area-model derivation of fraction multiplication.
- **25–32 min | Paired Collaborative Problem-Solving:** Math lab puzzle cards (Peer verification).
- **32–37 min | Real-World Application:** Scaling cooking recipes & engineering blueprint ratios.
- **37–40 min | Exit Ticket:** 2-question quick formative slip.`,
                timestamp: Date.now() - 240000,
                durationSeconds: 1.1,
                reasoningTokens: 212,
                model: selectedModel
              }
            ]
      };

      setSessions((prev) => [sampleRecord, ...prev.filter((s) => s.id !== sampleSessionId)]);
      setActiveSessionId(sampleSessionId);
      setMessages(sampleRecord.messages);
      if (user) {
        saveCloudSession(user, sampleRecord).catch(() => {});
      }
    }

    showToast(
      `Sandbox Demo activated: ${signed.extractedName} (${
        signed.extractedRole === 'teacher' ? 'ICSE Class 7 Faculty' : 'ICSE Class 7 Scholar'
      }).`,
      'success'
    );
  };

  const handleLogOutIdentity = async () => {
    stopAllScholarlySpeech();
    setSpeakingMessageId(null);
    if (activeRecordingRef.current) {
      activeRecordingRef.current.cancel();
      activeRecordingRef.current = null;
      setComposerDictating(false);
    }
    localStorage.removeItem('medhavi_verified_id');
    setCurtainUnlockedInSession(false);
    setVerifiedIdentity(null);
    setActiveDockTool('chat');
    setDrawerOpen(false);
    if (user) {
      await signOutScholar().catch(() => {});
    }
  };

  const handleStartNewSession = () => {
    stopAllScholarlySpeech();
    setSpeakingMessageId(null);
    if (activeRecordingRef.current) {
      activeRecordingRef.current.cancel();
      activeRecordingRef.current = null;
      setComposerDictating(false);
    }
    setActiveSessionId(null);
    setMessages([]);
    setOrbStatus('idle');
    setActiveDockTool('chat');
    setDrawerOpen(false);
  };

  const handleSelectTool = (tool: RoleToolItem) => {
    stopAllScholarlySpeech();
    setSpeakingMessageId(null);
    setDrawerOpen(false);
    if (tool.isViewTool) {
      setActiveDockTool(tool.id);
      return;
    }
    setActiveDockTool(tool.id);
    executeMedhaviRequest(tool.prompt, { workflowType: tool.workflowType });
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      showToast('Image size is too large. Please upload an image under 8 MB.', 'error');
      return;
    }
    setActiveDockTool('chat');
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setAttachedImage(reader.result);
        setAttachedImageName(file.name);
        showToast(`Attached "${file.name}" for analysis.`, 'success');
      }
    };
    reader.readAsDataURL(file);
  };

  const executeMedhaviRequest = async (
    promptText: string,
    options?: {
      workflowType?: string;
      workflowMeta?: Record<string, unknown>;
      onResponseReady?: (replyText: string) => void;
    }
  ) => {
    stopAllScholarlySpeech();
    setSpeakingMessageId(null);
    if (activeRecordingRef.current) {
      activeRecordingRef.current.cancel();
      activeRecordingRef.current = null;
      setComposerDictating(false);
    }
    const trimmed = cleanRepeatedSpeechTokens(promptText.trim());
    if (!trimmed) return;

    // Strict Studio Isolation Guard
    if (
      persona === 'teacher' &&
      (options?.workflowType === 'question_paper_generator' ||
        options?.workflowType === 'revision_quiz' ||
        isTestGenerationRequest(trimmed))
    ) {
      if (activeDockTool !== 'chat') setActiveDockTool('chat');
      setComposerText('');
      showToast(
        'Restricted Assessment Policy: Educators cannot generate or view tests outside the Restricted ICSE Test Studio.',
        'error'
      );
      const blockedUserMsg: ChatMessage = {
        id: `msg-u-${Date.now()}`,
        role: 'user',
        content: trimmed,
        timestamp: Date.now()
      };
      const blockedNoticeMsg: ChatMessage = {
        id: `msg-a-${Date.now() + 1}`,
        role: 'assistant',
        content: `**Restricted Assessment Policy — Studio Isolation Enforced**\n\nUnder Seth M.R. Jaipuria School security rules, educators are strictly prohibited from generating, duplicating, or viewing any ICSE test, question paper, unit test, worksheet, or quiz outside the **Restricted ICSE Test Generation Studio**.\n\nUse the button below or select **Restricted ICSE Test Studio** to generate assessments inside the isolated encrypted vault.`,
        timestamp: Date.now(),
        model: 'security-guard'
      };
      setMessages((prev) => [...prev, blockedUserMsg, blockedNoticeMsg]);
      options?.onResponseReady?.(
        'Restricted Assessment Policy: Educators cannot generate or view tests outside the Restricted ICSE Test Generation Studio.'
      );
      return;
    }

    if (activeDockTool !== 'chat') setActiveDockTool('chat');

    const startTime = performance.now();
    const userMsgId = `msg-u-${Date.now()}`;
    const assistantMsgId = `msg-a-${Date.now() + 1}`;
    const currentImage = attachedImage;

    const userMsg: ChatMessage = {
      id: userMsgId,
      role: 'user',
      content: trimmed,
      timestamp: Date.now(),
      imagePreview: currentImage || undefined
    };

    const assistantPlaceholder: ChatMessage = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      model: selectedModel
    };

    const updatedHistory = [...messages, userMsg];
    setMessages([...updatedHistory, assistantPlaceholder]);
    setComposerText('');
    setAttachedImage(null);
    setAttachedImageName('');

    setOrbStatus('preparing');
    const t1 = setTimeout(() => setOrbStatus('analysing'), 600);
    const t2 = setTimeout(() => setOrbStatus('verifying'), 1400);

    try {
      let accumulatedText = '';
      let finalReasoningTokens = 0;
      let finalSource = 'openrouter-live';
      let finalFallbackReason: string | undefined;

      try {
        const response = await fetch('/api/chat/stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: updatedHistory.slice(-6).map((m) => ({
              role: m.role,
              content: m.content
            })),
            context: {
              role: persona,
              grade: LOCKED_GRADE,
              subject,
              intelligenceMode,
              model: selectedModel,
              customSpecs,
              workflowType: options?.workflowType
            },
            verifiedIdentity,
            imageDataUrl: currentImage,
            workflowMeta: options?.workflowMeta || {}
          })
        });

        if (response.status === 403 && persona === 'teacher') {
          const errJson = await response.json().catch(() => ({}));
          if (errJson?.error?.includes('identity')) {
            handleLogOutIdentity();
            showToast(errJson.error, 'error');
            return;
          }
        }

        if (response.ok && response.body) {
          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';

          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });

            const lines = buffer.split('\n\n');
            buffer = lines.pop() || '';

            for (const block of lines) {
              const line = block.trim();
              if (!line.startsWith('data:')) continue;
              const jsonStr = line.replace(/^data:\s*/, '');
              try {
                const event = JSON.parse(jsonStr);
                if (event.type === 'delta' && event.content) {
                  accumulatedText += event.content;
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantMsgId ? { ...m, content: accumulatedText } : m
                    )
                  );
                } else if (event.type === 'reasoning_tokens' || event.type === 'usage') {
                  const rToks = event.tokens ?? event.reasoningTokens;
                  if (typeof rToks === 'number' && rToks > 0) {
                    finalReasoningTokens = rToks;
                    setMessages((prev) =>
                      prev.map((m) =>
                        m.id === assistantMsgId ? { ...m, reasoningTokens: rToks } : m
                      )
                    );
                  }
                } else if (event.type === 'done') {
                  if (typeof event.reasoningTokens === 'number' && event.reasoningTokens > 0) {
                    finalReasoningTokens = event.reasoningTokens;
                  }
                  if (typeof event.source === 'string') {
                    finalSource = event.source;
                  }
                  if (typeof event.fallbackReason === 'string' && event.fallbackReason) {
                    finalFallbackReason = event.fallbackReason;
                  }
                }
              } catch {
                // ignore partial SSE line
              }
            }
          }
        }
      } catch {
        // Fallback below
      }

      if (!accumulatedText.trim()) {
        const fallbackRes = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: updatedHistory.slice(-6).map((m) => ({
              role: m.role,
              content: m.content
            })),
            context: {
              role: persona,
              grade: LOCKED_GRADE,
              subject,
              intelligenceMode,
              model: selectedModel,
              customSpecs,
              workflowType: options?.workflowType
            },
            verifiedIdentity
          })
        });
        if (fallbackRes.ok) {
          const fallbackData = await fallbackRes.json();
          if (fallbackData.reply && fallbackData.reply.trim()) {
            accumulatedText = fallbackData.reply;
            if (typeof fallbackData.reasoningTokens === 'number') {
              finalReasoningTokens = fallbackData.reasoningTokens;
            }
            if (typeof fallbackData.source === 'string') {
              finalSource = fallbackData.source;
            }
            if (typeof fallbackData.fallbackReason === 'string') {
              finalFallbackReason = fallbackData.fallbackReason;
            }
          }
        }
      }

      clearTimeout(t1);
      clearTimeout(t2);
      const durationSec = Number(((performance.now() - startTime) / 1000).toFixed(1));

      if (!accumulatedText.trim()) {
        throw new Error('Empty response received from AI engine.');
      }

      const completedAssistantMsg: ChatMessage = {
        id: assistantMsgId,
        role: 'assistant',
        content: accumulatedText,
        timestamp: Date.now(),
        durationSeconds: durationSec,
        reasoningTokens: finalReasoningTokens > 0 ? finalReasoningTokens : undefined,
        model: selectedModel,
        source: finalSource,
        fallbackReason: finalFallbackReason
      };

      const finalMessages = [...updatedHistory, completedAssistantMsg];
      setMessages(finalMessages);
      setOrbStatus('completed');
      options?.onResponseReady?.(completedAssistantMsg.content);

      const sessionId = activeSessionId || `sess-${Date.now()}`;
      setActiveSessionId(sessionId);
      const cleanTitle = trimmed
        .replace(/^\[.*?\]\s*/, '')
        .slice(0, 60)
        .trim();

      const sessionObj: StoredSessionRecord = {
        id: sessionId,
        title: cleanTitle || `Class 7 ${subject} Chat`,
        timestamp: Date.now(),
        role: persona,
        classLevel: LOCKED_GRADE,
        subject,
        messages: finalMessages
      };

      setSessions((prev) => {
        const others = prev.filter((s) => s.id !== sessionId);
        return [sessionObj, ...others];
      });

      if (user) {
        saveCloudSession(user, sessionObj).catch(() => {});
      }
    } catch {
      clearTimeout(t1);
      clearTimeout(t2);
      setOrbStatus('idle');
      setMessages(updatedHistory);
      showToast('Unable to reach Medhavi Cloud right now. Please try again.', 'error');
    }
  };

  const handleSaveCurrentSession = () => {
    if (messages.length === 0) {
      showToast('Start an inquiry block first to save it.', 'info');
      return;
    }
    const sessionId = activeSessionId || `sess-${Date.now()}`;
    const firstUser = messages.find((m) => m.role === 'user')?.content || `${subject} Study`;
    const record: StoredSessionRecord = {
      id: sessionId,
      title: firstUser.replace(/^\[.*?\]\s*/, '').slice(0, 60),
      timestamp: Date.now(),
      role: persona,
      classLevel: LOCKED_GRADE,
      subject,
      messages
    };
    setSessions((prev) => [record, ...prev.filter((s) => s.id !== sessionId)]);
    if (user) {
      saveCloudSession(user, record).catch(() => {});
    }
    showToast('Saved to Block History.', 'success');
  };

  const handleDeleteSession = (id: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== id));
    if (activeSessionId === id) {
      handleStartNewSession();
    }
    if (user) {
      deleteCloudSession(user, id).catch(() => {});
    }
    showToast('Session removed.', 'info');
  };

  const handleAddSpec = (newSpec: Omit<CustomSpecItem, 'id'>) => {
    const item: CustomSpecItem = { ...newSpec, id: `spec-${Date.now()}` };
    setCustomSpecs((prev) => [item, ...prev]);
    if (user) saveCloudSpec(user, item).catch(() => {});
    showToast(`Added "${item.title}" to Medhavi Rules.`, 'success');
  };

  const handleToggleSpec = (id: string) => {
    setCustomSpecs((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        const updated = { ...s, active: !s.active };
        if (user) saveCloudSpec(user, updated).catch(() => {});
        return updated;
      })
    );
  };

  const handleDeleteSpec = (id: string) => {
    setCustomSpecs((prev) => prev.filter((s) => s.id !== id));
    if (user) deleteCloudSpec(user, id).catch(() => {});
  };

  const handleCopyText = (id: string, text: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedId(id);
    showToast('Copied to clipboard.', 'success');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const cycleLayoutMode = () => {
    setLayoutMode((prev) => (prev === 'mosaic' ? 'split' : prev === 'split' ? 'focus' : 'mosaic'));
  };

  const layoutLabel =
    layoutMode === 'mosaic' ? 'Mosaic' : layoutMode === 'split' ? 'Split' : 'Focus';

  // UNAUTHENTICATED IDENTITY GATE
  if (!verifiedIdentity) {
    return (
      <IdentityGatePage
        isLight={isLight}
        onToggleTheme={() => setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))}
        layoutMode={layoutMode}
        onChangeLayoutMode={setLayoutMode}
        selectedSubject={subject}
        onSelectSubject={setSubject}
        user={user}
        onGoogleSignIn={async () => {
          try {
            const signedInUser = await signInWithGoogleScholar();
            if (signedInUser) {
              showToast(
                `Signed in with Google as ${signedInUser.displayName || signedInUser.email}`,
                'success'
              );
            }
          } catch {
            showToast(
              'Google Sign-In popup closed. Verify directly with your institutional credentials below.',
              'info'
            );
          }
        }}
        onCompleteVerification={(res, demoCfg) => {
          if (demoCfg) {
            handleActivateDemoAccount(res, demoCfg);
          } else {
            handleCompleteIdentityGate(res);
          }
        }}
      />
    );
  }

  const roleSessions = sessions.filter((s) => s.role === persona);
  const samplePrompts =
    persona === 'student'
      ? [
          `Explain a key Class 7 ${subject} concept step-by-step.`,
          "How many r's are in the word 'strawberry'?",
          `Give me a 5-question ${subject} revision quiz.`,
          `Create a 5-minute revision sheet for Class 7 ${subject}.`
        ]
      : [
          `Design a 40-minute ICSE Class 7 lesson plan on ${subject}.`,
          'Evaluate a student descriptive answer out of 10 marks.',
          'Draft a bilingual (English & Hindi) circular for parents.',
          `Build a 4-tier CISCE project rubric for Class 7 ${subject}.`
        ];

  const nameParts = verifiedIdentity.extractedName.trim().split(/\s+/);
  const firstName =
    nameParts[0]?.endsWith('.') && nameParts.length > 1
      ? `${nameParts[0]} ${nameParts[1]}`
      : nameParts[0] || 'Scholar';

  const pageBg = isLight ? 'bg-[#F8F8F6] text-[#0A0A0A]' : 'bg-[#0A0D14] text-[#F4F4F0]';
  const surfaceBg = isLight ? 'bg-white border-[#DCDFE6]' : 'bg-[#111622] border-[#2A3244]';
  const mutedInk = isLight ? 'text-[#4A5568]' : 'text-[#94A3B8]';
  const borderHairline = isLight ? 'border-[#DCDFE6]' : 'border-[#2A3244]';

  const renderToolIcon = (toolId: string) => {
    if (toolId === 'qpaper') return <Lock className="w-4 h-4 shrink-0" />;
    if (toolId === 'revision_arena') return <FileText className="w-4 h-4 shrink-0" />;
    if (toolId === 'revision') return <Zap className="w-4 h-4 shrink-0" />;
    if (toolId === 'evaluator') return <Award className="w-4 h-4 shrink-0" />;
    if (toolId === 'lesson_arch') return <Clock className="w-4 h-4 shrink-0" />;
    return <Compass className="w-4 h-4 shrink-0" />;
  };

  /* =========================================================================
   * SLIDE-OUT HISTORY & STUDIOS DRAWER CONTENT
   * ======================================================================= */
  const renderDrawerPanel = () => (
    <div className="flex flex-col justify-between h-full gap-5">
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-md bg-white border border-[#0B2559] p-0.5 shrink-0 flex items-center justify-center">
              <img
                src="/assets/aistudio/image_5d051b68.png"
                alt="Jaipuria Medhavi"
                referrerPolicy="no-referrer"
                className="w-full h-full object-contain"
              />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold font-display truncate">
                {verifiedIdentity.extractedName}
              </div>
              <div className={`text-[11px] font-mono truncate ${mutedInk}`}>
                {persona === 'teacher' ? 'Faculty' : 'Scholar'} · {verifiedIdentity.schoolId}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setDrawerOpen(false)}
            aria-label="Close workspace drawer"
            className={`p-1.5 rounded-lg border cursor-pointer ${borderHairline} hover:border-[#0B2559]`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <button
          type="button"
          onClick={handleStartNewSession}
          className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-bold bg-[#0B2559] text-white hover:bg-[#081C44] transition-colors cursor-pointer"
        >
          <span>New Inquiry</span>
          <Plus className="w-4 h-4" />
        </button>

        {/* Studios List */}
        <div className="space-y-2">
          <div className={`text-xs font-mono font-semibold ${mutedInk}`}>
            {persona === 'teacher' ? 'Faculty Studios' : 'Scholar Studios'}
          </div>
          <div className="space-y-1.5">
            <button
              type="button"
              onClick={() => {
                setActiveDockTool('chat');
                setDrawerOpen(false);
              }}
              className={`w-full text-left px-3 py-2.5 rounded-lg border text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                activeDockTool === 'chat'
                  ? 'bg-[#0B2559] border-[#0B2559] text-white'
                  : isLight
                  ? 'bg-[#F8F8F6] border-[#DCDFE6] hover:border-[#0B2559] text-[#0A0A0A]'
                  : 'bg-[#0A0D14] border-[#2A3244] hover:border-white text-[#F4F4F0]'
              }`}
            >
              <span className="flex items-center gap-2 truncate">
                <Sparkles className="w-3.5 h-3.5 shrink-0" />
                <span>Assistant</span>
              </span>
              <span className="font-mono text-[10px] opacity-75">00</span>
            </button>

            {roleTools.map((tool, idx) => {
              const isActive = activeDockTool === tool.id;
              return (
                <button
                  key={tool.id}
                  type="button"
                  onClick={() => handleSelectTool(tool)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg border text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-[#0B2559] border-[#0B2559] text-white'
                      : isLight
                      ? 'bg-[#F8F8F6] border-[#DCDFE6] hover:border-[#0B2559] text-[#0A0A0A]'
                      : 'bg-[#0A0D14] border-[#2A3244] hover:border-white text-[#F4F4F0]'
                  }`}
                >
                  <span className="flex items-center gap-2 truncate">
                    {renderToolIcon(tool.id)}
                    <span className="truncate">{tool.label}</span>
                  </span>
                  <span className="font-mono text-[10px] opacity-75">0{idx + 1}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Saved Conversations */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className={`font-semibold ${mutedInk}`}>
              Saved History ({roleSessions.length})
            </span>
            {roleSessions.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setSessions((prev) => prev.filter((s) => s.role !== persona));
                  showToast('Cleared recent history.', 'info');
                }}
                className="text-[#0B2559] dark:text-[#F4F4F0] hover:underline cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>

          <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
            {roleSessions.length === 0 ? (
              <div className={`text-xs py-2 ${mutedInk}`}>No saved inquiries yet.</div>
            ) : (
              roleSessions.map((sess) => {
                const isSelected = activeSessionId === sess.id && activeDockTool === 'chat';
                return (
                  <div
                    key={sess.id}
                    className={`flex items-center justify-between gap-1.5 p-2 rounded-lg border transition-colors ${
                      isSelected
                        ? 'bg-[#0B2559] border-[#0B2559] text-white'
                        : isLight
                        ? 'bg-[#F8F8F6] border-[#DCDFE6] text-[#0A0A0A]'
                        : 'bg-[#0A0D14] border-[#2A3244] text-[#F4F4F0]'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        stopAllScholarlySpeech();
                        setSpeakingMessageId(null);
                        setActiveSessionId(sess.id);
                        setSubject(sess.subject);
                        setMessages(sess.messages);
                        setActiveDockTool('chat');
                        setDrawerOpen(false);
                      }}
                      className="min-w-0 flex-1 text-left cursor-pointer px-1"
                    >
                      <div className="truncate text-xs font-semibold">{sess.title}</div>
                      <div className="text-[10px] font-mono truncate opacity-75">
                        {sess.subject}
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteSession(sess.id)}
                      aria-label={`Delete saved session ${sess.title}`}
                      className="p-1.5 rounded opacity-70 hover:opacity-100 shrink-0 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Bottom Controls & TechPreneur Attribution */}
      <div className={`pt-4 border-t space-y-2.5 ${borderHairline}`}>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => {
              setCloudModalOpen(true);
              setDrawerOpen(false);
            }}
            className={`flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg border text-xs font-semibold transition-colors cursor-pointer ${
              isLight
                ? 'bg-[#F8F8F6] border-[#DCDFE6] hover:border-[#0B2559] text-[#0A0A0A]'
                : 'bg-[#0A0D14] border-[#2A3244] hover:border-white text-[#F4F4F0]'
            }`}
          >
            <Cloud className="w-3.5 h-3.5 shrink-0" />
            <span>{user ? 'Synced' : 'Cloud'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setSpecsModalOpen(true);
              setDrawerOpen(false);
            }}
            className={`flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg border text-xs font-semibold transition-colors cursor-pointer ${
              isLight
                ? 'bg-[#F8F8F6] border-[#DCDFE6] hover:border-[#0B2559] text-[#0A0A0A]'
                : 'bg-[#0A0D14] border-[#2A3244] hover:border-white text-[#F4F4F0]'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5 shrink-0" />
            <span>Rules</span>
          </button>
        </div>

        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#0B2559] text-white">
          <img
            src="/assets/aistudio/TechPreneur_Logo__1__a019c2b1.png"
            alt="TechPreneur Club Badge"
            referrerPolicy="no-referrer"
            className="w-5 h-5 rounded-xs object-cover shrink-0"
          />
          <span className="text-[11px] font-semibold truncate">Made with TechPreneur Club</span>
        </div>
      </div>
    </div>
  );

  /* =========================================================================
   * MINIMAL MONOCHROME SUBJECT SPECTRUM BAR
   * ======================================================================= */
  const renderSubjectBar = () => (
    <section
      aria-label="ICSE Class 7 Subjects"
      className={`shrink-0 px-4 sm:px-6 py-2.5 border-b no-print ${
        isLight ? 'bg-white border-[#DCDFE6]' : 'bg-[#111622] border-[#2A3244]'
      }`}
    >
      <div className="max-w-5xl mx-auto flex items-center lg:justify-between gap-1.5 overflow-x-auto no-scrollbar">
        {SUBJECT_OPTIONS.map((subj) => {
          const isSelected = subject === subj;
          const labelShort = SUBJECT_SHORT_LABELS[subj] || subj.split(' — ')[0];
          return (
            <button
              key={subj}
              type="button"
              title={subj}
              aria-label={subj}
              onClick={() => {
                stopAllScholarlySpeech();
                setSpeakingMessageId(null);
                setSubject(subj);
              }}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                isSelected
                  ? 'bg-[#0B2559] text-white'
                  : isLight
                  ? 'text-[#4A5568] hover:text-[#0B2559] hover:bg-[#F8F8F6]'
                  : 'text-[#94A3B8] hover:text-white hover:bg-[#0A0D14]'
              }`}
            >
              {labelShort}
            </button>
          );
        })}
      </div>
    </section>
  );

  /* =========================================================================
   * CENTERED MINIMAL STAGE CONTENT OR STUDIO DASHBOARDS
   * ======================================================================= */
  const renderMainStageContent = () => {
    if (activeDockTool === 'qpaper' && persona === 'teacher') {
      return (
        <div className="max-w-5xl mx-auto w-full space-y-5">
          <div className={`flex flex-wrap items-center justify-between gap-2 pb-3 border-b ${borderHairline} no-print`}>
            <button
              type="button"
              onClick={() => setActiveDockTool('chat')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0B2559] text-white text-xs font-semibold cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Assistant</span>
            </button>
            <span className="text-xs font-mono font-semibold flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5" />
              <span>Restricted ICSE Test Studio</span>
            </span>
          </div>
          <TeacherTestGeneratorDashboard
            isLight={isLight}
            activeSubject={subject}
            verifiedIdentity={verifiedIdentity}
            selectedModel={selectedModel}
            customSpecs={customSpecs}
            curtainUnlockedInSession={curtainUnlockedInSession}
            onUnlockCurtainInSession={() => setCurtainUnlockedInSession(true)}
            onShowToast={showToast}
          />
        </div>
      );
    }

    if (activeDockTool === 'evaluator' && persona === 'teacher') {
      return (
        <div className="max-w-5xl mx-auto w-full space-y-5">
          <div className={`flex flex-wrap items-center justify-between gap-2 pb-3 border-b ${borderHairline} no-print`}>
            <button
              type="button"
              onClick={() => setActiveDockTool('chat')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0B2559] text-white text-xs font-semibold cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Assistant</span>
            </button>
            <span className="text-xs font-mono font-semibold flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5" />
              <span>Answer Evaluator &amp; Rubric Grader</span>
            </span>
          </div>
          <TeacherEvaluationDashboard
            isLight={isLight}
            activeSubject={subject}
            onGeneratePrompt={(prompt, wfType) => {
              setActiveDockTool('chat');
              executeMedhaviRequest(prompt, { workflowType: wfType });
            }}
            onShowToast={showToast}
          />
        </div>
      );
    }

    if (activeDockTool === 'lesson_arch' && persona === 'teacher') {
      return (
        <div className="max-w-5xl mx-auto w-full space-y-5">
          <div className={`flex flex-wrap items-center justify-between gap-2 pb-3 border-b ${borderHairline} no-print`}>
            <button
              type="button"
              onClick={() => setActiveDockTool('chat')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0B2559] text-white text-xs font-semibold cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Assistant</span>
            </button>
            <span className="text-xs font-mono font-semibold flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span>40-Minute Lesson Architect</span>
            </span>
          </div>
          <TeacherLessonPlanDashboard
            isLight={isLight}
            activeSubject={subject}
            onGeneratePrompt={(prompt, wfType) => {
              setActiveDockTool('chat');
              executeMedhaviRequest(prompt, { workflowType: wfType });
            }}
            onShowToast={showToast}
          />
        </div>
      );
    }

    if (activeDockTool === 'circular' && persona === 'teacher') {
      return (
        <div className="max-w-5xl mx-auto w-full space-y-5">
          <div className={`flex flex-wrap items-center justify-between gap-2 pb-3 border-b ${borderHairline} no-print`}>
            <button
              type="button"
              onClick={() => setActiveDockTool('chat')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0B2559] text-white text-xs font-semibold cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Assistant</span>
            </button>
            <span className="text-xs font-mono font-semibold flex items-center gap-1.5">
              <Send className="w-3.5 h-3.5" />
              <span>Bilingual Circular Studio</span>
            </span>
          </div>
          <TeacherCircularDashboard
            isLight={isLight}
            activeSubject={subject}
            onGeneratePrompt={(prompt, wfType) => {
              setActiveDockTool('chat');
              executeMedhaviRequest(prompt, { workflowType: wfType });
            }}
            onShowToast={showToast}
          />
        </div>
      );
    }

    if (activeDockTool === 'revision_arena' && persona === 'student') {
      return (
        <div className="max-w-5xl mx-auto w-full space-y-5">
          <div className={`flex flex-wrap items-center justify-between gap-2 pb-3 border-b ${borderHairline} no-print`}>
            <button
              type="button"
              onClick={() => setActiveDockTool('chat')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0B2559] text-white text-xs font-semibold cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Assistant</span>
            </button>
            <span className="text-xs font-mono font-semibold flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" />
              <span>Student Revision Test Generator</span>
            </span>
          </div>
          <StudentRevisionTestDashboard
            isLight={isLight}
            activeSubject={subject}
            onGeneratePrompt={(prompt, wfType) => {
              setActiveDockTool('chat');
              executeMedhaviRequest(prompt, { workflowType: wfType });
            }}
            onShowToast={showToast}
          />
        </div>
      );
    }

    if (activeDockTool === 'revision' && persona === 'student') {
      return (
        <div className="max-w-5xl mx-auto w-full space-y-5">
          <div className={`flex flex-wrap items-center justify-between gap-2 pb-3 border-b ${borderHairline} no-print`}>
            <button
              type="button"
              onClick={() => setActiveDockTool('chat')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0B2559] text-white text-xs font-semibold cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Assistant</span>
            </button>
            <span className="text-xs font-mono font-semibold flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5" />
              <span>5-Minute Exam Revision Studio</span>
            </span>
          </div>
          <StudentRevisionDashboard
            isLight={isLight}
            activeSubject={subject}
            onGeneratePrompt={(prompt, wfType) => {
              setActiveDockTool('chat');
              executeMedhaviRequest(prompt, { workflowType: wfType });
            }}
            onShowToast={showToast}
          />
        </div>
      );
    }

    // CENTERED MINIMAL EMPTY WORKSPACE
    if (messages.length === 0) {
      return (
        <div className="w-full max-w-3xl mx-auto my-auto py-6 sm:py-10 space-y-8">
          {/* Minimal Editorial Header */}
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-white border border-[#0B2559] p-1 flex items-center justify-center shrink-0">
                  <img
                    src="/assets/aistudio/image_5d051b68.png"
                    alt="Jaipuria Medhavi Emblem"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className={`text-xs font-mono ${mutedInk}`}>
                  ICSE Class 7 · {subject} · {persona === 'teacher' ? 'Faculty' : 'Scholar'}
                </div>
              </div>

              <div className="inline-flex items-center gap-2 text-xs font-semibold text-[#0B2559] dark:text-[#F4F4F0]">
                <img
                  src="/assets/aistudio/TechPreneur_Logo__1__a019c2b1.png"
                  alt="TechPreneur Club Badge"
                  referrerPolicy="no-referrer"
                  className="w-5 h-5 rounded-xs object-cover border border-[#0B2559] shrink-0"
                />
                <span>Made with TechPreneur Club</span>
              </div>
            </div>

            <h1 className="text-4xl sm:text-5xl font-bold font-display tracking-tight leading-[1.06] text-[#0B2559] dark:text-[#F4F4F0] text-balance">
              Namaste, {firstName}.
            </h1>

            <p className={`text-sm sm:text-base leading-relaxed max-w-2xl ${mutedInk}`}>
              {persona === 'student'
                ? `Ask any Class 7 ${subject} question below, generate an ICSE revision test, or practice aloud in Voice Studio.`
                : `Design 40-minute Class 7 ${subject} lessons, grade responses with CISCE rubrics, or enter the Restricted Test Vault.`}
            </p>
          </div>

          {/* Minimal 2x2 Quick Inquiries */}
          <div className="space-y-3">
            <div className={`text-xs font-mono font-semibold ${mutedInk}`}>
              Quick Inquiries · {subject}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {samplePrompts.map((sp, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() =>
                    executeMedhaviRequest(sp, {
                      workflowType: sp.toLowerCase().includes('quiz')
                        ? 'revision_quiz'
                        : sp.toLowerCase().includes('evaluate')
                        ? 'answer_evaluator'
                        : undefined
                    })
                  }
                  className={`rounded-xl border p-4 text-left flex flex-col justify-between gap-3 transition-colors cursor-pointer ${
                    isLight
                      ? 'bg-white border-[#DCDFE6] text-[#0A0A0A] hover:border-[#0B2559]'
                      : 'bg-[#111622] border-[#2A3244] text-[#F4F4F0] hover:border-white'
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] font-mono text-[#0B2559] dark:text-[#94A3B8]">
                    <span>0{idx + 1}</span>
                    <span>Ask</span>
                  </div>
                  <div className="text-sm font-semibold leading-snug">{sp}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Quiet Role Studios & Utility Row */}
          <div
            className={`pt-5 border-t flex flex-wrap items-center justify-between gap-2 ${borderHairline}`}
          >
            <div className="flex flex-wrap items-center gap-2">
              {roleTools.map((tool) => (
                <button
                  key={tool.id}
                  type="button"
                  onClick={() => handleSelectTool(tool)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg border text-xs font-semibold transition-colors cursor-pointer ${
                    isLight
                      ? 'bg-white border-[#DCDFE6] text-[#0B2559] hover:border-[#0B2559]'
                      : 'bg-[#111622] border-[#2A3244] text-[#F4F4F0] hover:border-white'
                  }`}
                >
                  {renderToolIcon(tool.id)}
                  <span>{tool.label}</span>
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setVoiceChatOpen(true)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg border text-xs font-semibold transition-colors cursor-pointer ${
                  isLight
                    ? 'bg-white border-[#DCDFE6] text-[#0B2559] hover:border-[#0B2559]'
                    : 'bg-[#111622] border-[#2A3244] text-[#F4F4F0] hover:border-white'
                }`}
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>Voice Studio</span>
              </button>

              <button
                type="button"
                onClick={() => setSpecsModalOpen(true)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg border text-xs font-semibold transition-colors cursor-pointer ${
                  isLight
                    ? 'bg-white border-[#DCDFE6] text-[#0B2559] hover:border-[#0B2559]'
                    : 'bg-[#111622] border-[#2A3244] text-[#F4F4F0] hover:border-white'
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>ICSE Rules ({customSpecs.filter((s) => s.active).length})</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    // CENTERED DIALOGUE STREAM
    return (
      <div className="space-y-5 pb-6 max-w-3xl mx-auto w-full">
        {/* Session Toolbar */}
        <div
          className={`flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-xl border no-print ${surfaceBg}`}
        >
          <div className="flex items-center gap-3 text-xs font-mono font-semibold">
            <span className="text-[#0B2559] dark:text-white">{subject}</span>
            <span aria-hidden="true" className={mutedInk}>
              ·
            </span>
            <JyotiOrb status={orbStatus} persona={persona} compact={false} isLight={isLight} />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleStartNewSession}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#0B2559] text-white hover:bg-[#081C44] transition-colors cursor-pointer"
            >
              + New Inquiry
            </button>
            <button
              type="button"
              onClick={handleSaveCurrentSession}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors cursor-pointer ${
                isLight
                  ? 'bg-white border-[#DCDFE6] text-[#0B2559] hover:border-[#0B2559]'
                  : 'bg-[#0A0D14] border-[#2A3244] text-[#F4F4F0] hover:border-white'
              }`}
            >
              <Bookmark className="w-3.5 h-3.5" />
              <span>Save</span>
            </button>
          </div>
        </div>

        {messages.map((msg) => {
          if (msg.role === 'user') {
            return (
              <article
                key={msg.id}
                className="rounded-xl bg-[#0B2559] text-white p-5 space-y-3"
              >
                <div className="flex items-center justify-between text-[11px] font-mono text-white/75">
                  <span>{firstName}</span>
                  <span>{subject}</span>
                </div>
                {msg.imagePreview && (
                  <div>
                    <img
                      src={msg.imagePreview}
                      alt="Uploaded attachment"
                      referrerPolicy="no-referrer"
                      className="max-h-48 rounded-lg border border-white/25 object-contain bg-black/15"
                    />
                  </div>
                )}
                <div className="text-sm sm:text-base whitespace-pre-wrap leading-relaxed font-medium">
                  {msg.content}
                </div>
              </article>
            );
          }

          const parsed = parseMedhaviResponse(msg.content);
          const isLogicOpen = Boolean(expandedLogicIds[msg.id]);

          const isRevisionAssessment =
            msg.content.includes('[STUDENT REVISION TEST GENERATOR') ||
            msg.content.includes('ICSE Class 7 Revision Test');
          const isRestrictedAssessment =
            (isTestOrAssessmentContent(msg.content) || Boolean(parsed.quizData)) &&
            !isRevisionAssessment;

          const isTestDocInChat = isRestrictedAssessment;
          const isCopyBlocked =
            isRestrictedAssessment || (isRevisionAssessment && persona === 'teacher');
          const isBlockedTeacherTestView =
            persona === 'teacher' && (isTestDocInChat || msg.model === 'security-guard');
          const isFallbackResponse = msg.source === 'icse-scholar-fallback';

          return (
            <article
              key={msg.id}
              className={`rounded-xl border overflow-hidden ${surfaceBg}`}
            >
              {/* Minimal Monochrome Header */}
              <div
                className={`px-5 py-3 border-b flex flex-wrap items-center justify-between gap-2 ${borderHairline}`}
              >
                <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
                  <span className="font-display text-[#0B2559] dark:text-[#F4F4F0]">
                    Jaipuria Medhavi
                  </span>
                  {msg.durationSeconds !== undefined && (
                    <span className={`font-mono text-[11px] ${mutedInk}`}>
                      · {msg.durationSeconds}s
                    </span>
                  )}
                  <span className={`font-mono text-[11px] ${mutedInk}`}>
                    ·{' '}
                    {isFallbackResponse
                      ? 'Offline ICSE Fallback'
                      : 'OpenRouter · Nemotron 3.5 Super VL'}
                  </span>
                </div>

                {parsed.logicSummary.length > 0 && (
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedLogicIds((prev) => ({
                        ...prev,
                        [msg.id]: !prev[msg.id]
                      }))
                    }
                    className="flex items-center gap-1 text-xs font-mono font-semibold text-[#0B2559] dark:text-[#F4F4F0] hover:underline no-print cursor-pointer"
                  >
                    <span>Reasoning Steps</span>
                    {isLogicOpen ? (
                      <ChevronUp className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5" />
                    )}
                  </button>
                )}
              </div>

              <div className="p-5 sm:p-7 space-y-5">
                {isFallbackResponse && (
                  <div
                    className={`px-3.5 py-2.5 rounded-lg border text-xs leading-relaxed ${
                      isLight
                        ? 'bg-[#F8F8F6] border-[#0B2559]/35 text-[#0A0A0A]'
                        : 'bg-[#0A0D14] border-[#2A3244] text-[#F4F4F0]'
                    }`}
                  >
                    <strong>OpenRouter Live Inference Unavailable:</strong>{' '}
                    {msg.fallbackReason?.includes('401')
                      ? 'OpenRouter returned HTTP 401 ("User not found") for the server OPENROUTER_API_KEY. Showing structured ICSE Class 7 fallback response.'
                      : msg.fallbackReason ||
                        'OpenRouter could not be reached. Showing structured ICSE Class 7 fallback response.'}
                  </div>
                )}

                {isLogicOpen && (
                  <div
                    className={`p-4 rounded-lg border text-xs space-y-1.5 ${
                      isLight
                        ? 'border-[#DCDFE6] bg-[#F8F8F6] text-[#0A0A0A]'
                        : 'border-[#2A3244] bg-[#0A0D14] text-[#F4F4F0]'
                    }`}
                  >
                    <div className="font-mono font-bold text-[11px] text-[#0B2559] dark:text-[#F4F4F0]">
                      Logical Chain
                    </div>
                    <ol className="list-decimal pl-4 space-y-1">
                      {parsed.logicSummary.map((step, sIdx) => (
                        <li key={sIdx}>{step}</li>
                      ))}
                    </ol>
                  </div>
                )}

                {persona === 'teacher' && isTestDocInChat ? (
                  <div className="rounded-xl bg-[#0B2559] text-white p-5 space-y-3 no-select">
                    <div className="flex items-center gap-2 text-xs font-bold">
                      <Lock className="w-4 h-4 shrink-0" />
                      <span>Assessment Viewing Blocked Outside Restricted Studio</span>
                    </div>
                    <p className="text-xs sm:text-sm leading-relaxed text-white/90">
                      Educators are not permitted to generate or view tests, question papers,
                      worksheets, or quizzes in general dialogue. Open the dedicated{' '}
                      <strong>Restricted ICSE Test Studio</strong> to work inside the 3-download
                      encrypted vault.
                    </p>
                    <button
                      type="button"
                      onClick={() => setActiveDockTool('qpaper')}
                      className="px-4 py-2 rounded-lg text-xs font-bold bg-white text-[#0B2559] cursor-pointer"
                    >
                      Open Restricted ICSE Test Studio
                    </button>
                  </div>
                ) : (
                  <>
                    {parsed.quizData && persona === 'student' && (
                      <RevisionQuizView
                        quiz={parsed.quizData}
                        isLight={isLight}
                        onChallengeAgain={(newDiff) =>
                          executeMedhaviRequest(
                            `Generate a 5-question ${
                              newDiff || parsed.quizData?.difficulty || 'Competitive'
                            }-level Revision Arena MCQ challenge for Class 7 ${subject} on "${
                              parsed.quizData?.topic || subject
                            }". Return inside <medhavi_quiz>...</medhavi_quiz> tags.`,
                            {
                              workflowType: 'revision_quiz',
                              workflowMeta: {
                                topic: parsed.quizData?.topic || subject,
                                difficulty: newDiff || 'Competitive',
                                questionCount: 5
                              }
                            }
                          )
                        }
                        onSaveAttempt={(report: RevisionPerformanceReport, qData: QuizData) => {
                          const attemptId = `qa-${Date.now()}`;
                          const newAttempt: QuizAttemptRecord = {
                            id: attemptId,
                            topic: qData.topic || subject,
                            subject,
                            classLevel: LOCKED_GRADE,
                            difficulty: qData.difficulty || 'Competitive',
                            score: report.score,
                            maxScore: report.maxScore,
                            accuracy: report.accuracy,
                            timestamp: Date.now()
                          };
                          setQuizAttempts((prev) => [newAttempt, ...prev].slice(0, 50));
                          if (user) {
                            saveCloudQuizAttempt(user, {
                              id: attemptId,
                              topic: newAttempt.topic,
                              subject: newAttempt.subject,
                              classLevel: LOCKED_GRADE,
                              difficulty: newAttempt.difficulty,
                              score: newAttempt.score,
                              maxScore: newAttempt.maxScore,
                              accuracy: newAttempt.accuracy
                            }).catch(() => {});
                          }
                        }}
                      />
                    )}

                    {parsed.evaluationData && (
                      <div className="rounded-lg bg-[#0B2559] text-white p-4 space-y-1">
                        <div className="flex items-center justify-between tabular-nums">
                          <h4 className="text-base font-bold font-display">
                            Suggested Score: {parsed.evaluationData.suggestedScore} /{' '}
                            {parsed.evaluationData.maxMarks}
                          </h4>
                          <span className="text-xs font-mono text-white/80">
                            Confidence: {parsed.evaluationData.confidence}
                          </span>
                        </div>
                      </div>
                    )}

                    {parsed.cleanMarkdown && (
                      <div
                        className={`medhavi-prose text-sm sm:text-base leading-relaxed relative ${
                          isCopyBlocked ? 'medhavi-security-shield no-select' : ''
                        }`}
                      >
                        <div
                          dangerouslySetInnerHTML={{
                            __html: renderScholarlyMarkdown(parsed.cleanMarkdown)
                          }}
                        />
                      </div>
                    )}

                    {msg.model === 'security-guard' && persona === 'teacher' && (
                      <div className="pt-1">
                        <button
                          type="button"
                          onClick={() => setActiveDockTool('qpaper')}
                          className="px-4 py-2 rounded-lg text-xs font-bold bg-[#0B2559] text-white cursor-pointer"
                        >
                          Open Restricted ICSE Test Studio
                        </button>
                      </div>
                    )}

                    {!isBlockedTeacherTestView && (
                      <div
                        className={`pt-4 border-t ${borderHairline} flex flex-wrap items-center justify-between gap-2 no-print`}
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              if (speakingMessageId === msg.id) {
                                stopAllScholarlySpeech();
                                setSpeakingMessageId(null);
                              } else {
                                stopAllScholarlySpeech();
                                setSpeakingMessageId(msg.id);
                                speakScholarlyText(parsed.cleanMarkdown, {
                                  onStart: () => setSpeakingMessageId(msg.id),
                                  onEnd: () => setSpeakingMessageId(null),
                                  onError: (err) => {
                                    showToast(`Voice Playback: ${err}`, 'error');
                                    setSpeakingMessageId(null);
                                  }
                                });
                              }
                            }}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                              speakingMessageId === msg.id
                                ? 'bg-[#0B2559] border-[#0B2559] text-white'
                                : isLight
                                ? 'border-[#DCDFE6] bg-[#F8F8F6] text-[#0A0A0A] hover:border-[#0B2559]'
                                : 'border-[#2A3244] bg-[#0A0D14] text-[#F4F4F0] hover:border-white'
                            }`}
                          >
                            {speakingMessageId === msg.id ? (
                              <>
                                <Square className="w-3.5 h-3.5 fill-current" />
                                <span>Stop</span>
                              </>
                            ) : (
                              <>
                                <Volume2 className="w-3.5 h-3.5" />
                                <span>Listen</span>
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleCopyText(msg.id, parsed.cleanMarkdown)}
                            disabled={isCopyBlocked}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                              isCopyBlocked
                                ? 'opacity-40 cursor-not-allowed border-[#DCDFE6]'
                                : isLight
                                ? 'border-[#DCDFE6] bg-[#F8F8F6] text-[#0A0A0A] hover:border-[#0B2559] cursor-pointer'
                                : 'border-[#2A3244] bg-[#0A0D14] text-[#F4F4F0] hover:border-white cursor-pointer'
                            }`}
                          >
                            {copiedId === msg.id ? (
                              <>
                                <Check className="w-3.5 h-3.5" />
                                <span>Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                <span>{isRevisionAssessment ? 'Copy Test' : 'Copy'}</span>
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              executeMedhaviRequest(
                                'Simplify the previous explanation step-by-step for ICSE Class 7.'
                              )
                            }
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                              isLight
                                ? 'border-[#DCDFE6] bg-[#F8F8F6] text-[#0A0A0A] hover:border-[#0B2559]'
                                : 'border-[#2A3244] bg-[#0A0D14] text-[#F4F4F0] hover:border-white'
                            }`}
                          >
                            Simplify
                          </button>
                        </div>

                        {persona === 'student' ? (
                          <button
                            type="button"
                            onClick={() =>
                              executeMedhaviRequest(
                                `Generate a 5-question ICSE Class 7 quiz on ${subject} inside <medhavi_quiz>...</medhavi_quiz> tags.`,
                                { workflowType: 'revision_quiz' }
                              )
                            }
                            className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-[#0B2559] text-white hover:bg-[#081C44] transition-colors cursor-pointer"
                          >
                            Quiz Me
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setActiveDockTool('qpaper')}
                            className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-[#0B2559] text-white flex items-center gap-1.5 cursor-pointer"
                          >
                            <Lock className="w-3 h-3" />
                            <span>Restricted Test Studio</span>
                          </button>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            </article>
          );
        })}
        <div ref={messagesEndRef} />
      </div>
    );
  };

  /* =========================================================================
   * DOCKED CENTERED COMPOSER
   * ======================================================================= */
  const renderComposerBlock = () => {
    if (activeDockTool !== 'chat') return null;

    return (
      <div
        className={`shrink-0 px-4 sm:px-6 py-3 pb-safe border-t no-print ${
          isLight ? 'bg-white border-[#DCDFE6]' : 'bg-[#111622] border-[#2A3244]'
        }`}
      >
        <div className="max-w-3xl mx-auto">
          <div
            className={`rounded-xl border p-2.5 sm:p-3 space-y-2 transition-colors ${
              isLight
                ? 'bg-[#F8F8F6] border-[#DCDFE6] focus-within:border-[#0B2559] focus-within:bg-white'
                : 'bg-[#0A0D14] border-[#2A3244] focus-within:border-white'
            }`}
          >
            {attachedImage && (
              <div
                className={`flex items-center justify-between p-2 rounded-lg border ${surfaceBg}`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <img
                    src={attachedImage}
                    alt="Attachment preview"
                    referrerPolicy="no-referrer"
                    className="w-9 h-9 rounded object-cover border border-[#0B2559] shrink-0"
                  />
                  <span className="text-xs font-semibold truncate">{attachedImageName}</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setAttachedImage(null);
                    setAttachedImageName('');
                  }}
                  aria-label="Remove attachment"
                  className="p-1 text-[#0A0A0A] dark:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                executeMedhaviRequest(composerText);
              }}
              className="flex flex-col sm:flex-row sm:items-end gap-2.5"
            >
              <div className="flex-1 min-w-0">
                <label htmlFor="medhavi-composer-input" className="sr-only">
                  Ask Seth M.R. Jaipuria School Medhavi
                </label>
                <textarea
                  id="medhavi-composer-input"
                  rows={2}
                  value={composerText}
                  onChange={(e) => setComposerText(e.target.value)}
                  onKeyDown={(e) => {
                    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                      e.preventDefault();
                      executeMedhaviRequest(composerText);
                    }
                  }}
                  placeholder={
                    persona === 'student'
                      ? `Type a Class 7 ${subject} question or paste a problem…`
                      : `Ask for a Class 7 ${subject} lesson plan, rubric, or evaluation…`
                  }
                  className={`w-full px-2 py-1 bg-transparent text-sm sm:text-base outline-none resize-none leading-relaxed ${
                    isLight
                      ? 'text-[#0A0A0A] placeholder:text-[#64748B]'
                      : 'text-[#F4F4F0] placeholder:text-[#64748B]'
                  }`}
                />
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-1.5 shrink-0">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  onChange={handleImageFileChange}
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={() => {
                    setActiveDockTool('chat');
                    fileInputRef.current?.click();
                  }}
                  aria-label="Attach image"
                  className={`flex items-center gap-1 px-2.5 min-h-[38px] rounded-lg border text-xs font-semibold cursor-pointer ${
                    isLight
                      ? 'bg-white border-[#DCDFE6] text-[#0A0A0A] hover:border-[#0B2559]'
                      : 'bg-[#111622] border-[#2A3244] text-[#F4F4F0] hover:border-white'
                  }`}
                >
                  <Paperclip className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Image</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveDockTool('chat');
                    handleToggleComposerDictation();
                  }}
                  aria-label={composerDictating ? 'Stop dictation' : 'Speak question'}
                  className={`flex items-center gap-1 px-2.5 min-h-[38px] rounded-lg border text-xs font-semibold cursor-pointer ${
                    composerDictating
                      ? 'bg-[#0B2559] border-[#0B2559] text-white'
                      : isLight
                      ? 'bg-white border-[#DCDFE6] text-[#0A0A0A] hover:border-[#0B2559]'
                      : 'bg-[#111622] border-[#2A3244] text-[#F4F4F0] hover:border-white'
                  }`}
                >
                  <Mic className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">
                    {composerDictating ? 'Stop' : 'Speak'}
                  </span>
                </button>

                <select
                  aria-label="Reasoning Mode"
                  value={intelligenceMode}
                  onChange={(e) => setIntelligenceMode(e.target.value as IntelligenceMode)}
                  className={`rounded-lg border px-2.5 min-h-[38px] text-xs font-semibold outline-none ${
                    isLight
                      ? 'bg-white border-[#DCDFE6] text-[#0A0A0A]'
                      : 'bg-[#111622] border-[#2A3244] text-[#F4F4F0]'
                  }`}
                >
                  <option value="pedagogical">
                    {persona === 'student' ? 'Step-by-Step' : 'Pedagogical'}
                  </option>
                  <option value="deep">Deep Logic</option>
                  <option value="quick">Quick</option>
                </select>

                <button
                  type="submit"
                  disabled={!composerText.trim() && !attachedImage}
                  className="flex items-center gap-1.5 px-4 min-h-[38px] rounded-lg text-xs font-bold bg-[#0B2559] text-white hover:bg-[#081C44] disabled:opacity-40 transition-colors cursor-pointer whitespace-nowrap"
                >
                  <span>Ask</span>
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={`h-[100dvh] overflow-hidden flex flex-col ${pageBg}`}>
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-16 left-3 right-3 sm:left-auto sm:right-6 sm:max-w-md z-50 flex items-center justify-between gap-3 px-4 py-2.5 rounded-lg bg-[#0B2559] text-white text-xs font-semibold no-print"
        >
          <span>{toast.message}</span>
          <button
            type="button"
            onClick={() => setToast(null)}
            aria-label="Dismiss notification"
            className="p-1 shrink-0 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* TOP BAR CONTRACT — 3 Minimal Zones */}
      <header
        className={`shrink-0 px-4 sm:px-6 py-2.5 border-b no-print ${
          isLight ? 'bg-white border-[#DCDFE6]' : 'bg-[#111622] border-[#2A3244]'
        }`}
      >
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4 sm:gap-8">
          {/* Zone 1: History Drawer Toggle + Wordmark */}
          <div className="flex items-center gap-2.5 min-w-0 shrink-0">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open History and Studios Drawer"
              className={`p-2 rounded-lg border cursor-pointer shrink-0 transition-colors ${
                isLight
                  ? 'bg-[#F8F8F6] border-[#DCDFE6] text-[#0B2559] hover:border-[#0B2559]'
                  : 'bg-[#0A0D14] border-[#2A3244] text-[#F4F4F0] hover:border-white'
              }`}
            >
              <History className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={handleStartNewSession}
              className="flex items-center gap-2 min-w-0 cursor-pointer"
            >
              <span className="w-8 h-8 rounded-md bg-white border border-[#0B2559] p-0.5 shrink-0 flex items-center justify-center">
                <img
                  src="/assets/aistudio/image_5d051b68.png"
                  alt="Jaipuria Medhavi Emblem"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-contain"
                />
              </span>
              <span className="text-sm sm:text-base font-bold font-display tracking-tight text-[#0B2559] dark:text-[#F4F4F0] whitespace-nowrap">
                JAIPURIA MEDHAVI
              </span>
            </button>
          </div>

          {/* Zone 2: Clean Single-Line Text Navigation */}
          <nav
            aria-label="Studios Navigation"
            className="hidden lg:flex items-center gap-6 text-xs font-semibold shrink-0"
          >
            <button
              type="button"
              onClick={() => setActiveDockTool('chat')}
              className={`py-1.5 border-b-2 whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                activeDockTool === 'chat'
                  ? 'border-[#0B2559] dark:border-white text-[#0B2559] dark:text-white'
                  : `border-transparent ${mutedInk} hover:text-[#0B2559] dark:hover:text-white`
              }`}
            >
              Assistant
            </button>

            {roleTools.map((tool) => (
              <button
                key={tool.id}
                type="button"
                onClick={() => handleSelectTool(tool)}
                className={`py-1.5 border-b-2 whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                  activeDockTool === tool.id
                    ? 'border-[#0B2559] dark:border-white text-[#0B2559] dark:text-white'
                    : `border-transparent ${mutedInk} hover:text-[#0B2559] dark:hover:text-white`
                }`}
              >
                {tool.shortLabel}
              </button>
            ))}

            <button
              type="button"
              onClick={() => setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))}
              className={`flex items-center gap-1 py-1.5 border-b-2 border-transparent whitespace-nowrap shrink-0 cursor-pointer ${mutedInk} hover:text-[#0B2559] dark:hover:text-white`}
            >
              {isLight ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
              <span>{isLight ? 'Night' : 'Day'}</span>
            </button>
          </nav>

          {/* Zone 3: Account & Security Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))}
              aria-label={isLight ? 'Switch to Night Ink' : 'Switch to Daylight'}
              className={`lg:hidden p-2 rounded-lg border cursor-pointer shrink-0 ${
                isLight
                  ? 'bg-[#F8F8F6] border-[#DCDFE6] text-[#0B2559]'
                  : 'bg-[#0A0D14] border-[#2A3244] text-[#F4F4F0]'
              }`}
            >
              {isLight ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={() => setSecurityModalOpen(true)}
              aria-label="Security Hub"
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-1.5 ${
                isLight
                  ? 'bg-white border-[#DCDFE6] text-[#0B2559] hover:border-[#0B2559]'
                  : 'bg-[#111622] border-[#2A3244] text-[#F4F4F0] hover:border-white'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">Security</span>
            </button>

            <button
              type="button"
              onClick={handleLogOutIdentity}
              aria-label={`Sign Out (${firstName})`}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#0B2559] text-white hover:bg-[#081C44] transition-colors whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* SUBJECT STRIP */}
      {renderSubjectBar()}

      {/* CENTERED MINIMAL WORKSPACE STAGE */}
      <main className="flex-1 flex flex-col min-w-0 min-h-0 justify-between">
        {/* Mobile Studio Switch Strip */}
        <div
          className={`lg:hidden shrink-0 px-4 py-2 border-b flex flex-wrap items-center gap-2 no-print ${
            isLight ? 'bg-[#F8F8F6] border-[#DCDFE6]' : 'bg-[#0A0D14] border-[#2A3244]'
          }`}
        >
          <button
            type="button"
            onClick={() => setActiveDockTool('chat')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border whitespace-nowrap shrink-0 cursor-pointer ${
              activeDockTool === 'chat'
                ? 'bg-[#0B2559] border-[#0B2559] text-white'
                : isLight
                ? 'bg-white text-[#0A0A0A] border-[#DCDFE6]'
                : 'bg-[#111622] text-[#F4F4F0] border-[#2A3244]'
            }`}
          >
            Assistant
          </button>
          {roleTools.map((tool) => (
            <button
              key={tool.id}
              type="button"
              onClick={() => handleSelectTool(tool)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border whitespace-nowrap shrink-0 cursor-pointer ${
                activeDockTool === tool.id
                  ? 'bg-[#0B2559] border-[#0B2559] text-white'
                  : isLight
                  ? 'bg-white text-[#0A0A0A] border-[#DCDFE6]'
                  : 'bg-[#111622] text-[#F4F4F0] border-[#2A3244]'
              }`}
            >
              {tool.shortLabel}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-6 w-full mx-auto print-container flex flex-col">
          {renderMainStageContent()}
        </div>

        {renderComposerBlock()}
      </main>

      {/* SLIDE-OUT HISTORY & STUDIOS DRAWER */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-50 flex justify-start bg-black/50 no-print"
          role="dialog"
          aria-modal="true"
          aria-label="History and Studios Drawer"
          onClick={() => setDrawerOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`w-80 max-w-[85vw] h-full overflow-y-auto p-5 border-r ${surfaceBg}`}
          >
            {renderDrawerPanel()}
          </div>
        </div>
      )}

      {/* MODALS */}
      <MedhaviSpecsModal
        isOpen={specsModalOpen}
        onClose={() => setSpecsModalOpen(false)}
        specs={customSpecs}
        onAddSpec={handleAddSpec}
        onToggleSpec={handleToggleSpec}
        onDeleteSpec={handleDeleteSpec}
        isLight={isLight}
      />

      <CloudAccountModal
        isOpen={cloudModalOpen}
        onClose={() => setCloudModalOpen(false)}
        cloudOnline={cloudOnline}
        onTestConnection={async () => {
          await checkServerHealth();
          showToast('Verified server status for OpenRouter Nemotron 3.5 Super VL.', 'info');
        }}
        user={user}
        onSignIn={async () => {
          try {
            const signedInUser = await signInWithGoogleScholar();
            if (signedInUser) {
              showToast(`Signed in as ${signedInUser.displayName || signedInUser.email}`, 'success');
            }
          } catch {
            showToast('Google Sign-In popup was closed.', 'error');
          }
        }}
        onSignOut={async () => {
          await signOutScholar();
          showToast('Signed out of Cloud Sync.', 'info');
        }}
        isLight={isLight}
      />

      <SecurityAndMasteryModal
        isOpen={securityModalOpen}
        onClose={() => setSecurityModalOpen(false)}
        isLight={isLight}
        verifiedIdentity={verifiedIdentity}
        quizAttempts={quizAttempts}
        activeSubject={subject}
        onPracticeTopic={(topicName, subjName) => {
          setSubject(subjName);
          setActiveDockTool('chat');
          executeMedhaviRequest(
            `Generate a 5-question Competitive ICSE Class 7 ${subjName} Revision quiz on "${topicName}" inside <medhavi_quiz>...</medhavi_quiz> tags.`,
            { workflowType: 'revision_quiz' }
          );
        }}
        onOpenRestrictedTestStudio={() => setActiveDockTool('qpaper')}
        onOpenCloudAccount={() => setCloudModalOpen(true)}
      />

      <VoiceChatModal
        isOpen={voiceChatOpen}
        onClose={() => setVoiceChatOpen(false)}
        isLight={isLight}
        subject={subject}
        scholarName={firstName}
        onSendVoiceMessage={(spokenText, onResponseReady) => {
          executeMedhaviRequest(spokenText, { onResponseReady });
        }}
      />
    </div>
  );
}
