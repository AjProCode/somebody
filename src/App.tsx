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
  PanelLeft,
  SquarePen,
  AudioLines,
  ArrowUpRight,
  BookOpen,
  Globe,
  ExternalLink
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
import { Grade7TextbookLibrary } from './components/Grade7TextbookLibrary';
import {
  GRADE_7_TEXTBOOK_CATALOG,
  inferGrade7Subject,
  type Grade7ChapterRef,
  type TextbookSearchMatch
} from './data/grade7Textbooks';
import {
  PageImageViewerModal,
  type ManualReferenceMeta,
  type PageImageViewerTarget
} from './components/PageImageViewerModal';
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
  STUDIO_HISTORY_EVENT,
  STUDIO_SHORT_BADGES,
  clearAllRoleStudioHistory,
  deleteStudioHistoryEntry,
  formatHistoryTimestamp,
  loadAllStudioHistory,
  mergeStudioHistoryLists,
  type StudioHistoryEntry
} from './utils/studioHistory';
import {
  subscribeToAuth,
  signInWithGoogleScholar,
  signOutScholar,
  ensureUserProfileDoc,
  saveCloudSession,
  deleteCloudSession,
  saveCloudStudioEntry,
  deleteCloudStudioEntry,
  subscribeToCloudSessions,
  saveCloudSpec,
  deleteCloudSpec,
  subscribeToCloudSpecs,
  saveCloudQuizAttempt,
  subscribeToCloudQuizAttempts,
  type StoredSessionRecord,
  type QuizAttemptRecord
} from './firebase';


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
    category: 'Student Learning Goals',
    title: 'Zero Answer Leakage (Rote Facts Only in Student Portal)',
    content:
      'Direct answers are allowed ONLY for rote-memorizable facts and definitions. Never give final answers to calculable, transformable, or writable exercises in Math, Physics, Science, English, or Computer Studies—guide with the rule/formula and one Socratic question.',
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

export interface ChatWebSource {
  title: string;
  url: string;
  domain: string;
  snippet: string;
}

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
  textbookReferences?: TextbookSearchMatch[];
  manualReference?: ManualReferenceMeta;
  webSources?: ChatWebSource[];
  webSearchUsed?: boolean;
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
    () => localStorage.getItem('medhavi_subject') || 'All Subjects'
  );
  const studioSubject = subject && subject !== 'All Subjects' ? subject : 'Mathematics';
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
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const [activeDockTool, setActiveDockTool] = useState<string>('chat');
  const [studioHistoryList, setStudioHistoryList] = useState<StudioHistoryEntry[]>(() =>
    loadAllStudioHistory(persona)
  );
  const [selectedStudioHistoryEntry, setSelectedStudioHistoryEntry] =
    useState<StudioHistoryEntry | null>(null);
  const [selectedLibraryChapterId, setSelectedLibraryChapterId] = useState<string | null>(null);
  const [webSearchEnabled, setWebSearchEnabled] = useState<boolean>(
    () => localStorage.getItem('medhavi_web_search_v1') === 'true'
  );
  const [specsModalOpen, setSpecsModalOpen] = useState<boolean>(false);
  const [cloudModalOpen, setCloudModalOpen] = useState<boolean>(false);
  const [voiceChatOpen, setVoiceChatOpen] = useState<boolean>(false);
  const [securityModalOpen, setSecurityModalOpen] = useState<boolean>(false);
  const [pageViewerTarget, setPageViewerTarget] = useState<PageImageViewerTarget | null>(null);
  const [vaultRefreshKey, setVaultRefreshKey] = useState<number>(0);
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
    localStorage.setItem('medhavi_web_search_v1', String(webSearchEnabled));
  }, [webSearchEnabled]);

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
          unsubSessions = subscribeToCloudSessions(
            currentUser,
            (cloudRecords) => {
              if (cloudRecords.length > 0) {
                setSessions((prev) => {
                  const byId = new Map<string, StoredSessionRecord>();
                  for (const item of prev) byId.set(item.id, item);
                  for (const item of cloudRecords) {
                    const existing = byId.get(item.id);
                    if (!existing || (item.timestamp || 0) >= (existing.timestamp || 0)) {
                      byId.set(item.id, item);
                    }
                  }
                  return Array.from(byId.values()).sort(
                    (a, b) => (b.timestamp || 0) - (a.timestamp || 0)
                  );
                });
              }
            },
            (cloudStudioEntries) => {
              if (cloudStudioEntries.length > 0) {
                mergeStudioHistoryLists(cloudStudioEntries);
                setStudioHistoryList(loadAllStudioHistory(persona));
              }
            }
          );
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
    const syncStudioList = () => {
      setStudioHistoryList(loadAllStudioHistory(persona));
    };
    syncStudioList();
    window.addEventListener(STUDIO_HISTORY_EVENT, syncStudioList);
    return () => window.removeEventListener(STUDIO_HISTORY_EVENT, syncStudioList);
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
    setSelectedStudioHistoryEntry(null);
    if (tool.isViewTool) {
      setActiveDockTool(tool.id);
      return;
    }
    setActiveDockTool(tool.id);
    executeMedhaviRequest(tool.prompt, { workflowType: tool.workflowType });
  };

  const handleStudioEntrySaved = (entry: StudioHistoryEntry) => {
    if (user) {
      saveCloudStudioEntry(user, entry).catch(() => {});
    }
  };

  const handleStudioEntryDeleted = (id: string) => {
    if (selectedStudioHistoryEntry?.id === id) {
      setSelectedStudioHistoryEntry(null);
    }
    if (user) {
      deleteCloudStudioEntry(user, id).catch(() => {});
    }
  };

  const handleStudioHistoryCleared = (removedIds: string[]) => {
    if (selectedStudioHistoryEntry && removedIds.includes(selectedStudioHistoryEntry.id)) {
      setSelectedStudioHistoryEntry(null);
    }
    if (user) {
      removedIds.forEach((id) => {
        deleteCloudStudioEntry(user, id).catch(() => {});
      });
    }
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
      subject?: string;
      workflowType?: string;
      workflowMeta?: Record<string, unknown>;
      webSearchEnabled?: boolean;
      onResponseReady?: (replyText: string) => void;
    }
  ) => {
    const trimmedInput = promptText.trim();
    const effectiveSubject =
      options?.subject || inferGrade7Subject(trimmedInput) || 'All Subjects';
    const effectiveWebSearch =
      options?.webSearchEnabled !== undefined ? options.webSearchEnabled : webSearchEnabled;
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
      let finalTextbookRefs: TextbookSearchMatch[] = [];
      let finalManualRef: ManualReferenceMeta | undefined;
      let finalWebSources: ChatWebSource[] = [];

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
              subject: effectiveSubject,
              intelligenceMode,
              model: selectedModel,
              customSpecs,
              workflowType: options?.workflowType,
              webSearchEnabled: effectiveWebSearch
            },
            webSearchEnabled: effectiveWebSearch,
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
                  if (Array.isArray(event.textbookReferences)) {
                    finalTextbookRefs = event.textbookReferences;
                  }
                  if (event.manualReference && Array.isArray(event.manualReference.referencedPages)) {
                    finalManualRef = event.manualReference;
                  }
                  if (Array.isArray(event.webSources)) {
                    finalWebSources = event.webSources;
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
              subject: effectiveSubject,
              intelligenceMode,
              model: selectedModel,
              customSpecs,
              workflowType: options?.workflowType,
              webSearchEnabled: effectiveWebSearch
            },
            webSearchEnabled: effectiveWebSearch,
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
            if (Array.isArray(fallbackData.textbookReferences)) {
              finalTextbookRefs = fallbackData.textbookReferences;
            }
            if (
              fallbackData.manualReference &&
              Array.isArray(fallbackData.manualReference.referencedPages)
            ) {
              finalManualRef = fallbackData.manualReference;
            }
            if (Array.isArray(fallbackData.webSources)) {
              finalWebSources = fallbackData.webSources;
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
        fallbackReason: finalFallbackReason,
        textbookReferences: finalTextbookRefs,
        manualReference: finalManualRef,
        webSources: finalWebSources,
        webSearchUsed: effectiveWebSearch
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

      const resolvedSessionSubject =
        effectiveSubject !== 'All Subjects'
          ? effectiveSubject
          : inferGrade7Subject(cleanTitle) || 'ICSE Class 7';

      const sessionObj: StoredSessionRecord = {
        id: sessionId,
        title: cleanTitle || `Class 7 ${resolvedSessionSubject} Chat`,
        timestamp: Date.now(),
        role: persona,
        classLevel: LOCKED_GRADE,
        subject: resolvedSessionSubject,
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
    const firstUser = messages.find((m) => m.role === 'user')?.content || 'Class 7 Study';
    const resolvedSaveSubject =
      inferGrade7Subject(firstUser) ||
      (subject !== 'All Subjects' ? subject : 'ICSE Class 7');
    const record: StoredSessionRecord = {
      id: sessionId,
      title: firstUser.replace(/^\[.*?\]\s*/, '').slice(0, 60),
      timestamp: Date.now(),
      role: persona,
      classLevel: LOCKED_GRADE,
      subject: resolvedSaveSubject,
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
          'Explain Photosynthesis and Aerobic Respiration in Class 7 ICSE Biology.',
          'Compare Conduction, Convection & Radiation in Class 7 Physics.',
          'Give me a 5-question ICSE Class 7 Mathematics & Science revision quiz.',
          'Create a 5-minute revision sheet for ICSE Class 7 Linear Equations.'
        ]
      : [
          'Design a 40-minute ICSE Class 7 lesson plan on Heat & Temperature.',
          'Evaluate a student descriptive answer out of 10 marks.',
          'Draft a bilingual (English & Hindi) circular for parents.',
          'Build a 4-tier CISCE project rubric for Class 7 Science.'
        ];

  const nameParts = verifiedIdentity.extractedName.trim().split(/\s+/);
  const firstName =
    nameParts[0]?.endsWith('.') && nameParts.length > 1
      ? `${nameParts[0]} ${nameParts[1]}`
      : nameParts[0] || 'Scholar';

  const initials = nameParts
    .filter((p) => !p.endsWith('.'))
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || '')
    .join('') || 'JM';

  const pageBg = isLight ? 'bg-white text-[#0A0A0A]' : 'bg-[#0A0D14] text-[#F4F4F0]';
  const sidebarBg = isLight
    ? 'bg-[#F9FAFB] border-[#EAECEF] text-[#0A0A0A]'
    : 'bg-[#080A0F] border-[#1B2232] text-[#F4F4F0]';
  const surfaceBg = isLight ? 'bg-white border-[#E5E7EB]' : 'bg-[#111622] border-[#2A3244]';
  const mutedInk = isLight ? 'text-[#6B7280]' : 'text-[#94A3B8]';
  const borderHairline = isLight ? 'border-[#E5E7EB]' : 'border-[#2A3244]';
  const hoverRow = isLight ? 'hover:bg-[#EFEFF2]' : 'hover:bg-[#141923]';
  const activeRow = isLight ? 'bg-[#EAECEF] text-[#0A0A0A]' : 'bg-[#1B2232] text-white';

  const renderToolIcon = (toolId: string) => {
    if (toolId === 'qpaper') return <Lock className="w-4 h-4 shrink-0" />;
    if (toolId === 'revision_arena') return <FileText className="w-4 h-4 shrink-0" />;
    if (toolId === 'revision') return <Zap className="w-4 h-4 shrink-0" />;
    if (toolId === 'evaluator') return <Award className="w-4 h-4 shrink-0" />;
    if (toolId === 'lesson_arch') return <Clock className="w-4 h-4 shrink-0" />;
    return <Compass className="w-4 h-4 shrink-0" />;
  };

  /* =========================================================================
   * ULTRA-CLEAN FLAT LEFT SIDEBAR (CHATGPT-STYLE MINIMAL RAIL)
   * ======================================================================= */
  const renderSidebarContent = (isMobileDrawer = false) => (
    <div className="flex flex-col justify-between h-full px-2.5 py-3 select-none">
      <div className="space-y-4 min-h-0 flex flex-col flex-1">
        {/* Top Row: Wordmark + Collapse Toggle */}
        <div className="flex items-center justify-between px-1.5 py-1">
          <button
            type="button"
            onClick={() => {
              handleStartNewSession();
              if (isMobileDrawer) setDrawerOpen(false);
            }}
            className="flex items-center gap-2 min-w-0 cursor-pointer"
          >
            <img
              src="/assets/aistudio/image_5d051b68.png"
              alt="Jaipuria Medhavi Emblem"
              referrerPolicy="no-referrer"
              className="w-6 h-6 rounded-sm object-contain shrink-0"
            />
            <span className="text-sm font-bold font-display tracking-tight uppercase text-[#0B2559] dark:text-[#F4F4F0] truncate">
              Medhavi
            </span>
          </button>

          <button
            type="button"
            onClick={() => (isMobileDrawer ? setDrawerOpen(false) : setSidebarOpen(false))}
            aria-label={isMobileDrawer ? 'Close sidebar' : 'Collapse sidebar'}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${mutedInk} ${hoverRow}`}
          >
            {isMobileDrawer ? <X className="w-4 h-4" /> : <PanelLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Unified Scrollable Area: Primary Nav + Single-Line Chat & Studio History */}
        <div className="flex-1 min-h-0 overflow-y-auto space-y-3 pr-0.5">
          <nav aria-label="Primary Navigation" className="space-y-0.5">
            <button
              type="button"
              onClick={() => {
                handleStartNewSession();
                if (isMobileDrawer) setDrawerOpen(false);
              }}
              className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-semibold transition-colors cursor-pointer ${
                activeDockTool === 'chat' && messages.length === 0 ? activeRow : hoverRow
              }`}
            >
              <SquarePen className="w-4 h-4 shrink-0" />
              <span>New inquiry</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setSelectedLibraryChapterId(null);
                setActiveDockTool('textbooks');
                if (isMobileDrawer) setDrawerOpen(false);
              }}
              className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-semibold transition-colors cursor-pointer ${
                activeDockTool === 'textbooks' ? activeRow : hoverRow
              }`}
            >
              <BookOpen className="w-4 h-4 shrink-0" />
              <span className="truncate">Grade 7 Books</span>
            </button>

            {roleTools.map((tool) => {
              const isActive = activeDockTool === tool.id;
              return (
                <button
                  key={tool.id}
                  type="button"
                  onClick={() => handleSelectTool(tool)}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-semibold transition-colors cursor-pointer ${
                    isActive ? activeRow : hoverRow
                  }`}
                >
                  {renderToolIcon(tool.id)}
                  <span className="truncate">{tool.shortLabel}</span>
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => {
                setVoiceChatOpen(true);
                if (isMobileDrawer) setDrawerOpen(false);
              }}
              className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-semibold transition-colors cursor-pointer ${hoverRow}`}
            >
              <AudioLines className="w-4 h-4 shrink-0" />
              <span>Voice Studio</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setSpecsModalOpen(true);
                if (isMobileDrawer) setDrawerOpen(false);
              }}
              className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-semibold transition-colors cursor-pointer ${hoverRow}`}
            >
              <SlidersHorizontal className="w-4 h-4 shrink-0" />
              <span>ICSE Rules ({customSpecs.filter((s) => s.active).length})</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setCloudModalOpen(true);
                if (isMobileDrawer) setDrawerOpen(false);
              }}
              className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-semibold transition-colors cursor-pointer ${hoverRow}`}
            >
              <Cloud className="w-4 h-4 shrink-0" />
              <span>{user ? 'Cloud Synced' : 'Cloud Sync'}</span>
            </button>
          </nav>

          {/* Previous Chats (Single-line compact items, scroll only on sidebar overflow) */}
          <div className={`pt-2 border-t ${borderHairline}`}>
            <div className="flex items-center justify-between px-2 pb-1">
              <span className={`text-[10px] font-mono font-bold uppercase tracking-[0.16em] ${mutedInk}`}>
                Previous Chats ({roleSessions.length})
              </span>
              {roleSessions.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    const removed = sessions.filter((s) => s.role === persona);
                    setSessions((prev) => prev.filter((s) => s.role !== persona));
                    if (activeSessionId && removed.some((r) => r.id === activeSessionId)) {
                      handleStartNewSession();
                    }
                    if (user) {
                      removed.forEach((s) => {
                        deleteCloudSession(user, s.id).catch(() => {});
                      });
                    }
                    showToast('Cleared previous chat history.', 'info');
                  }}
                  className={`text-[11px] hover:underline cursor-pointer ${mutedInk}`}
                >
                  Clear
                </button>
              )}
            </div>

            <div className="space-y-0.5">
              {roleSessions.length === 0 ? (
                <div className={`px-2 py-1 text-xs ${mutedInk}`}>No previous chats</div>
              ) : (
                roleSessions.map((sess) => {
                  const isSelected = activeSessionId === sess.id && activeDockTool === 'chat';
                  return (
                    <div
                      key={sess.id}
                      className={`group flex items-center justify-between gap-1.5 px-2 py-1 rounded-md transition-colors ${
                        isSelected ? activeRow : hoverRow
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          stopAllScholarlySpeech();
                          setSpeakingMessageId(null);
                          setSelectedStudioHistoryEntry(null);
                          setActiveSessionId(sess.id);
                          setSubject(sess.subject);
                          setMessages(sess.messages);
                          setActiveDockTool('chat');
                          if (isMobileDrawer) setDrawerOpen(false);
                        }}
                        className="min-w-0 flex-1 flex items-center justify-between gap-2 text-left cursor-pointer"
                        title={sess.title}
                      >
                        <span className="truncate text-xs font-medium">{sess.title}</span>
                        <span className={`shrink-0 text-[10px] font-mono whitespace-nowrap ${mutedInk}`}>
                          {formatHistoryTimestamp(sess.timestamp)}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteSession(sess.id)}
                        aria-label={`Delete saved session ${sess.title}`}
                        className={`p-0.5 rounded opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity shrink-0 cursor-pointer ${mutedInk}`}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Respective Studio History (Single-line compact items, scroll only on sidebar overflow) */}
          <div className={`pt-2 border-t ${borderHairline}`}>
            <div className="flex items-center justify-between px-2 pb-1">
              <span className={`text-[10px] font-mono font-bold uppercase tracking-[0.16em] ${mutedInk}`}>
                Studio History ({studioHistoryList.length})
              </span>
              {studioHistoryList.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    const removed = clearAllRoleStudioHistory(persona);
                    handleStudioHistoryCleared(removed.map((r) => r.id));
                    showToast('Cleared studio history.', 'info');
                  }}
                  className={`text-[11px] hover:underline cursor-pointer ${mutedInk}`}
                >
                  Clear
                </button>
              )}
            </div>

            <div className="space-y-0.5">
              {studioHistoryList.length === 0 ? (
                <div className={`px-2 py-1 text-xs ${mutedInk}`}>No studio runs yet</div>
              ) : (
                studioHistoryList.map((entry) => {
                  const isSelected =
                    activeDockTool === entry.studioId &&
                    selectedStudioHistoryEntry?.id === entry.id;
                  return (
                    <div
                      key={entry.id}
                      className={`group flex items-center justify-between gap-1.5 px-2 py-1 rounded-md transition-colors ${
                        isSelected ? activeRow : hoverRow
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          stopAllScholarlySpeech();
                          setSpeakingMessageId(null);
                          setSelectedStudioHistoryEntry(entry);
                          setActiveDockTool(entry.studioId);
                          if (isMobileDrawer) setDrawerOpen(false);
                        }}
                        className="min-w-0 flex-1 flex items-center justify-between gap-2 text-left cursor-pointer"
                        title={`${entry.title} (${STUDIO_SHORT_BADGES[entry.studioId]})`}
                      >
                        <span className="truncate text-xs font-medium">{entry.title}</span>
                        <span className={`shrink-0 text-[10px] font-mono whitespace-nowrap ${mutedInk}`}>
                          {STUDIO_SHORT_BADGES[entry.studioId]}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          deleteStudioHistoryEntry(entry.id);
                          handleStudioEntryDeleted(entry.id);
                          showToast('Removed studio item from history.', 'info');
                        }}
                        aria-label={`Delete studio item ${entry.title}`}
                        className={`p-0.5 rounded opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity shrink-0 cursor-pointer ${mutedInk}`}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Profile + TechPreneur Attribution */}
      <div className={`pt-2.5 mt-2 border-t ${borderHairline} space-y-2`}>
        <div className="flex items-center justify-between gap-2 px-1.5 py-1">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-7 h-7 rounded-full bg-[#0B2559] text-white text-[11px] font-bold flex items-center justify-center shrink-0">
              {initials}
            </span>
            <div className="min-w-0">
              <div className="text-xs font-semibold truncate">{verifiedIdentity.extractedName}</div>
              <div className={`text-[10px] truncate ${mutedInk}`}>
                {persona === 'teacher' ? 'Faculty' : 'Scholar'} · {verifiedIdentity.schoolId}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogOutIdentity}
            aria-label={`Sign Out (${firstName})`}
            title="Sign Out"
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${mutedInk} ${hoverRow}`}
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className={`flex items-center gap-2 px-2 py-1 text-[11px] ${mutedInk}`}>
          <img
            src="/assets/aistudio/TechPreneur_Logo__1__a019c2b1.png"
            alt="TechPreneur Club Badge"
            referrerPolicy="no-referrer"
            className="w-4 h-4 rounded-xs object-cover shrink-0"
          />
          <span className="truncate">Made by TechPreneur Club</span>
        </div>
      </div>
    </div>
  );

  /* =========================================================================
   * MINIMAL SLEEK PROMPT BAR (SHARED BY CENTERED EMPTY STATE & CHAT DOCK)
   * ======================================================================= */
  const renderSleekPromptBar = (centeredEmpty = false) => (
    <div className={`w-full ${centeredEmpty ? 'max-w-2xl mx-auto' : 'max-w-3xl mx-auto'}`}>
      {attachedImage && (
        <div
          className={`mb-2 flex items-center justify-between px-3 py-2 rounded-xl border ${surfaceBg}`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <img
              src={attachedImage}
              alt="Attachment preview"
              referrerPolicy="no-referrer"
              className="w-8 h-8 rounded object-cover border border-[#0B2559] shrink-0"
            />
            <span className="text-xs font-medium truncate">{attachedImageName}</span>
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
          if (composerText.trim() || attachedImage) {
            executeMedhaviRequest(composerText);
          }
        }}
        className={`flex items-center gap-2 rounded-full border-[1.5px] px-3 sm:px-4 py-1.5 transition-colors ${
          isLight
            ? 'bg-white border-[#0A0A0A]/20 shadow-[0_2px_10px_rgba(11,37,89,0.05)] focus-within:border-[#0B2559]'
            : 'bg-[#141821] border-[#2A3244] focus-within:border-white'
        }`}
      >
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
          title="Attach image"
          className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors shrink-0 cursor-pointer ${mutedInk} ${hoverRow}`}
        >
          <Plus className="w-4 h-4" />
        </button>

        <label htmlFor="medhavi-composer-input" className="sr-only">
          Ask Seth M.R. Jaipuria School Medhavi
        </label>
        <input
          id="medhavi-composer-input"
          type="text"
          value={composerText}
          onChange={(e) => setComposerText(e.target.value)}
          placeholder={
            persona === 'student'
              ? 'Ask Jaipuria Medhavi (Class 7)…'
              : 'Ask for a Class 7 lesson, rubric, or guide…'
          }
          className={`flex-1 min-w-0 bg-transparent text-[15px] font-medium py-2 outline-none ${
            isLight
              ? 'text-[#0A0A0A] placeholder:text-[#9CA3AF]'
              : 'text-[#F4F4F0] placeholder:text-[#64748B]'
          }`}
        />

        <button
          type="button"
          onClick={() => {
            setWebSearchEnabled((prev) => {
              const next = !prev;
              showToast(
                next
                  ? 'Live Web Search enabled — answers will include verified web sources.'
                  : 'Live Web Search turned off — using Grade 7 books & institutional manual.',
                'info'
              );
              return next;
            });
          }}
          aria-pressed={webSearchEnabled}
          aria-label={webSearchEnabled ? 'Disable Live Web Search' : 'Enable Live Web Search'}
          title={webSearchEnabled ? 'Live Web Search ON' : 'Enable Live Web Search'}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
            webSearchEnabled
              ? isLight
                ? 'bg-[#0B2559] text-white'
                : 'bg-white text-[#0A0A0A]'
              : `${mutedInk} ${hoverRow}`
          }`}
        >
          <Globe className="w-3.5 h-3.5 shrink-0" />
          <span className="hidden sm:inline">Web</span>
        </button>

        <select
          aria-label="Reasoning Mode"
          value={intelligenceMode}
          onChange={(e) => setIntelligenceMode(e.target.value as IntelligenceMode)}
          className={`hidden sm:block bg-transparent text-xs font-semibold outline-none px-1.5 py-1 rounded-md cursor-pointer ${mutedInk}`}
        >
          <option value="pedagogical">{persona === 'student' ? 'Step-by-Step' : 'Pedagogical'}</option>
          <option value="deep">Deep Logic</option>
          <option value="quick">Quick</option>
        </select>

        <button
          type="button"
          onClick={() => {
            setActiveDockTool('chat');
            handleToggleComposerDictation();
          }}
          aria-label={composerDictating ? 'Stop dictation' : 'Speak question'}
          title={composerDictating ? 'Stop dictation' : 'Dictate question'}
          className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors shrink-0 cursor-pointer ${
            composerDictating ? 'bg-[#0B2559] text-white' : `${mutedInk} ${hoverRow}`
          }`}
        >
          {composerDictating ? <Square className="w-3.5 h-3.5 fill-current" /> : <Mic className="w-4 h-4" />}
        </button>

        {composerText.trim() || attachedImage ? (
          <button
            type="submit"
            aria-label="Ask"
            className="w-8 h-8 rounded-full bg-[#0B2559] text-white hover:bg-[#081C44] hover:scale-105 active:scale-95 shadow-xs flex items-center justify-center shrink-0 transition-all cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setVoiceChatOpen(true)}
            aria-label="Open Voice Studio"
            title="Open Voice Studio"
            className="w-8 h-8 rounded-full bg-[#0B2559] text-white hover:bg-[#081C44] hover:scale-105 active:scale-95 shadow-xs flex items-center justify-center shrink-0 transition-all cursor-pointer"
          >
            <AudioLines className="w-4 h-4" />
          </button>
        )}
      </form>
    </div>
  );

  /* =========================================================================
   * CENTERED MINIMAL STAGE CONTENT OR STUDIO DASHBOARDS
   * ======================================================================= */
  const renderMainStageContent = () => {
    if (activeDockTool === 'textbooks') {
      return (
        <Grade7TextbookLibrary
          isLight={isLight}
          persona={persona}
          activeSubject={subject}
          initialChapterId={selectedLibraryChapterId}
          vaultRefreshKey={vaultRefreshKey}
          onSelectSubject={setSubject}
          onOpenPageViewer={(chapter: Grade7ChapterRef) =>
            setPageViewerTarget({
              mode: 'textbook',
              chapter
            })
          }
          onLaunchPrompt={(prompt, opts) => {
            setActiveDockTool('chat');
            executeMedhaviRequest(prompt, opts);
          }}
        />
      );
    }

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
            activeSubject={studioSubject}
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
            activeSubject={studioSubject}
            verifiedIdentity={verifiedIdentity}
            selectedModel={selectedModel}
            customSpecs={customSpecs}
            intelligenceMode={intelligenceMode}
            initialHistoryEntry={
              selectedStudioHistoryEntry?.studioId === 'evaluator'
                ? selectedStudioHistoryEntry
                : null
            }
            onStudioEntrySaved={handleStudioEntrySaved}
            onStudioEntryDeleted={handleStudioEntryDeleted}
            onStudioHistoryCleared={handleStudioHistoryCleared}
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
            activeSubject={studioSubject}
            verifiedIdentity={verifiedIdentity}
            selectedModel={selectedModel}
            customSpecs={customSpecs}
            intelligenceMode={intelligenceMode}
            initialHistoryEntry={
              selectedStudioHistoryEntry?.studioId === 'lesson_arch'
                ? selectedStudioHistoryEntry
                : null
            }
            onStudioEntrySaved={handleStudioEntrySaved}
            onStudioEntryDeleted={handleStudioEntryDeleted}
            onStudioHistoryCleared={handleStudioHistoryCleared}
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
            activeSubject={studioSubject}
            verifiedIdentity={verifiedIdentity}
            selectedModel={selectedModel}
            customSpecs={customSpecs}
            intelligenceMode={intelligenceMode}
            initialHistoryEntry={
              selectedStudioHistoryEntry?.studioId === 'circular'
                ? selectedStudioHistoryEntry
                : null
            }
            onStudioEntrySaved={handleStudioEntrySaved}
            onStudioEntryDeleted={handleStudioEntryDeleted}
            onStudioHistoryCleared={handleStudioHistoryCleared}
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
            activeSubject={studioSubject}
            verifiedIdentity={verifiedIdentity}
            selectedModel={selectedModel}
            customSpecs={customSpecs}
            intelligenceMode={intelligenceMode}
            initialHistoryEntry={
              selectedStudioHistoryEntry?.studioId === 'revision_arena'
                ? selectedStudioHistoryEntry
                : null
            }
            onStudioEntrySaved={handleStudioEntrySaved}
            onStudioEntryDeleted={handleStudioEntryDeleted}
            onStudioHistoryCleared={handleStudioHistoryCleared}
            onSaveQuizAttempt={(report, qData, attemptSubject) => {
              const attemptId = `qa-${Date.now()}`;
              const resolvedSubj = attemptSubject || studioSubject;
              const newAttempt: QuizAttemptRecord = {
                id: attemptId,
                topic: qData.topic || resolvedSubj,
                subject: resolvedSubj,
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
            activeSubject={studioSubject}
            verifiedIdentity={verifiedIdentity}
            selectedModel={selectedModel}
            customSpecs={customSpecs}
            intelligenceMode={intelligenceMode}
            initialHistoryEntry={
              selectedStudioHistoryEntry?.studioId === 'revision'
                ? selectedStudioHistoryEntry
                : null
            }
            onStudioEntrySaved={handleStudioEntrySaved}
            onStudioEntryDeleted={handleStudioEntryDeleted}
            onStudioHistoryCleared={handleStudioHistoryCleared}
            onShowToast={showToast}
          />
        </div>
      );
    }

    // LIVELY CENTERED EMPTY STATE OVER ARCHITECTURAL GRID
    if (messages.length === 0) {
      const promptTags =
        persona === 'student'
          ? ['Biology', 'Physics', '5-Q Quiz', 'Revision']
          : ['Lesson Plan', 'Evaluation', 'Circular', 'Rubric'];
      const featuredChapters = [
        GRADE_7_TEXTBOOK_CATALOG.find((c) => c.id === 'math-ch1-integers'),
        GRADE_7_TEXTBOOK_CATALOG.find((c) => c.id === 'phys-ch5-heat'),
        GRADE_7_TEXTBOOK_CATALOG.find((c) => c.id === 'bio-ch4-photosynthesis-respiration'),
        GRADE_7_TEXTBOOK_CATALOG.find((c) => c.id === 'eng-ch1-grammar-clauses')
      ].filter((c): c is NonNullable<typeof c> => Boolean(c));

      return (
        <div className="flex-1 flex flex-col items-center justify-center w-full max-w-3xl mx-auto px-4 pb-10">
          <div className="w-full space-y-6">
            <div className="text-center space-y-3">
              <div className="text-[11px] font-mono font-bold uppercase tracking-[0.18em] text-[#0B2559] dark:text-[#94A3B8]">
                ICSE Class 7 · CISCE &amp; NCSE · मेधावी
              </div>
              <h1 className="text-4xl sm:text-5xl font-bold font-display tracking-[-0.035em] leading-[1.04] text-[#0A0A0A] dark:text-[#F4F4F0]">
                Ready when you are,{' '}
                <span className="font-serif-editorial italic font-normal text-[#0B2559] dark:text-white text-[1.12em]">
                  {firstName}.
                </span>
              </h1>
            </div>

            {renderSleekPromptBar(true)}

            {/* Prescribed Grade 7 ICSE / NCSE Textbook Spotlight Strip */}
            {featuredChapters.length > 0 && (
              <div
                className={`max-w-2xl mx-auto rounded-xl border px-4 py-3.5 space-y-2.5 ${
                  isLight
                    ? 'bg-white/95 border-[#E5E7EB]'
                    : 'bg-[#111622]/95 border-[#2A3244]'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <BookOpen className="w-4 h-4 shrink-0 text-[#0B2559] dark:text-white" />
                    <div className="min-w-0">
                      <div className="text-xs font-bold font-display truncate text-[#0A0A0A] dark:text-[#F4F4F0]">
                        Seth M.R. Jaipuria (2026–27) Textbook &amp; Page Grounding
                      </div>
                      <div className={`text-[11px] font-mono truncate ${mutedInk}`}>
                        M.L. Aggarwal · Srijan Physics · Concise Chemistry · Goyal Bio · Usha Pandit
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedLibraryChapterId(featuredChapters[0].id);
                      setActiveDockTool('textbooks');
                    }}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#0B2559] dark:text-white hover:underline whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <span>Browse Library</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className={`pt-2 border-t ${borderHairline} flex flex-wrap items-center gap-x-4 gap-y-1.5`}>
                  {featuredChapters.slice(0, 3).map((ch) => (
                    <button
                      key={ch.id}
                      type="button"
                      onClick={() => {
                        setSelectedLibraryChapterId(ch.id);
                        setActiveDockTool('textbooks');
                      }}
                      className={`text-xs font-medium hover:underline text-left cursor-pointer ${mutedInk} hover:text-[#0B2559] dark:hover:text-white`}
                    >
                      <span className="font-mono font-semibold text-[#0B2559] dark:text-white">
                        {ch.subject.split(' ')[0]} · Ch. {String(ch.chapterNumber).padStart(2, '0')} ({ch.pageRange})
                      </span>{' '}
                      {ch.title}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Lively 2x2 Architectural Grid Cards */}
            <div className="max-w-2xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                  className={`group rounded-xl border p-3.5 text-left flex flex-col justify-between gap-2.5 grid-tile-interactive cursor-pointer ${
                    isLight
                      ? 'bg-white/95 border-[#E5E7EB] hover:border-[#0B2559]'
                      : 'bg-[#111622]/95 border-[#2A3244] hover:border-white'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 text-[10px] font-mono font-bold uppercase tracking-[0.14em]">
                    <span className="text-[#0B2559] dark:text-[#94A3B8]">
                      0{idx + 1} · {promptTags[idx] || 'Explore'}
                    </span>
                    <ArrowUpRight
                      className={`w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 ${mutedInk} group-hover:text-[#0B2559] dark:group-hover:text-white`}
                    />
                  </div>
                  <div className="text-[13px] font-semibold leading-snug text-[#0A0A0A] dark:text-[#F4F4F0]">
                    {sp}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      );
    }

    // OPEN EDITORIAL DIALOGUE STREAM
    return (
      <div className="space-y-6 pb-6 max-w-3xl mx-auto w-full">
        {/* Quiet Session Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs no-print">
          <div className="flex items-center gap-2.5 font-mono">
            <JyotiOrb status={orbStatus} persona={persona} compact={false} isLight={isLight} />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleStartNewSession}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                isLight
                  ? 'border-[#E5E7EB] text-[#0A0A0A] hover:border-[#0B2559]'
                  : 'border-[#2A3244] text-[#F4F4F0] hover:border-white'
              }`}
            >
              + New inquiry
            </button>
            <button
              type="button"
              onClick={handleSaveCurrentSession}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-semibold transition-colors cursor-pointer ${
                isLight
                  ? 'border-[#E5E7EB] text-[#0A0A0A] hover:border-[#0B2559]'
                  : 'border-[#2A3244] text-[#F4F4F0] hover:border-white'
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
              <div key={msg.id} className="flex justify-end">
                <article className="max-w-[85%] rounded-2xl px-4 py-3 space-y-2 bg-[#0B2559] text-white">
                  {msg.imagePreview && (
                    <div>
                      <img
                        src={msg.imagePreview}
                        alt="Uploaded attachment"
                        referrerPolicy="no-referrer"
                        className="max-h-48 rounded-lg border border-white/20 object-contain"
                      />
                    </div>
                  )}
                  <div className="text-sm sm:text-[15px] whitespace-pre-wrap leading-relaxed font-medium">
                    {msg.content}
                  </div>
                </article>
              </div>
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
            <article key={msg.id} className="space-y-4">
              {/* Open Borderless Assistant Header */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="font-display font-bold uppercase tracking-wider text-[#0B2559] dark:text-[#F4F4F0]">
                    Jaipuria Medhavi
                  </span>
                  {msg.durationSeconds !== undefined && (
                    <span className={`font-mono text-[11px] ${mutedInk}`}>
                      · {msg.durationSeconds}s
                    </span>
                  )}
                  <span className={`font-mono text-[11px] ${mutedInk}`}>
                    ·{' '}
                    {msg.source === 'web-textbook-grounded'
                      ? 'Web Search + Grade 7 Books'
                      : isFallbackResponse
                      ? 'Grade 7 Books & Manual Reference'
                      : msg.webSources && msg.webSources.length > 0
                      ? 'Nemotron 3.5 + Web Search'
                      : 'Nemotron 3.5 Super VL'}
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

              <div className="space-y-4">

                {isLogicOpen && (
                  <div
                    className={`p-4 rounded-lg border text-xs space-y-1.5 ${
                      isLight
                        ? 'border-[#E5E7EB] bg-white text-[#0A0A0A]'
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

                    {/* Live Web Search Sources */}
                    {msg.webSources && msg.webSources.length > 0 && (
                      <div className={`pt-4 border-t ${borderHairline} space-y-2 no-print`}>
                        <div
                          className={`flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-[0.14em] ${mutedInk}`}
                        >
                          <Globe className="w-3 h-3 text-[#0B2559] dark:text-white" />
                          <span>Live Web Search Sources</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {msg.webSources.slice(0, 4).map((src, idx) => (
                            <a
                              key={`${src.url}-${idx}`}
                              href={src.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`group rounded-lg border px-3 py-2.5 space-y-1 transition-colors block ${
                                isLight
                                  ? 'border-[#E5E7EB] bg-white hover:border-[#0B2559]'
                                  : 'border-[#2A3244] bg-[#0D121C] hover:border-white'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <span className="text-xs font-semibold leading-snug text-[#0A0A0A] dark:text-[#F4F4F0] group-hover:text-[#0B2559] dark:group-hover:text-white line-clamp-1">
                                  {src.title}
                                </span>
                                <ExternalLink
                                  className={`w-3 h-3 shrink-0 mt-0.5 ${mutedInk} group-hover:text-[#0B2559] dark:group-hover:text-white`}
                                />
                              </div>
                              <div className={`text-[10px] font-mono truncate ${mutedInk}`}>
                                {src.domain}
                              </div>
                              {src.snippet && (
                                <p className={`text-[11px] leading-snug line-clamp-2 ${mutedInk}`}>
                                  {src.snippet}
                                </p>
                              )}
                            </a>
                          ))}
                        </div>
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
                                ? 'border-[#E5E7EB] bg-white text-[#0A0A0A] hover:border-[#0B2559]'
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
                                ? 'opacity-40 cursor-not-allowed border-[#E5E7EB]'
                                : isLight
                                ? 'border-[#E5E7EB] bg-white text-[#0A0A0A] hover:border-[#0B2559] cursor-pointer'
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
                                ? 'border-[#E5E7EB] bg-white text-[#0A0A0A] hover:border-[#0B2559]'
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
   * DOCKED BOTTOM PROMPT BAR (ACTIVE ONLY DURING CONVERSATION)
   * ======================================================================= */
  const renderComposerBlock = () => {
    if (activeDockTool !== 'chat' || messages.length === 0) return null;

    return (
      <div className="shrink-0 px-4 sm:px-6 pt-2 pb-4 pb-safe no-print bg-transparent">
        {renderSleekPromptBar(false)}
      </div>
    );
  };

  return (
    <div className={`h-[100dvh] overflow-hidden flex ${pageBg}`}>
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-14 left-3 right-3 sm:left-auto sm:right-6 sm:max-w-md z-50 flex items-center justify-between gap-3 px-4 py-2.5 rounded-lg bg-[#0B2559] text-white text-xs font-semibold no-print"
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

      {/* DESKTOP FLAT SIDEBAR */}
      {sidebarOpen && (
        <aside
          aria-label="Workspace Sidebar"
          className={`hidden lg:flex w-[252px] shrink-0 border-r flex-col no-print ${sidebarBg}`}
        >
          {renderSidebarContent(false)}
        </aside>
      )}

      {/* RIGHT MAIN STAGE WITH ARCHITECTURAL GRID */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0 bg-architectural-grid">
        {/* BORDERLESS MINIMAL TOP HEADER */}
        <header className="h-14 shrink-0 px-4 sm:px-6 flex items-center justify-between gap-3 no-print">
          {/* Left: Sidebar Toggle (mobile always / desktop when collapsed) + Subject Selector */}
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open History and Studios Drawer"
              className={`lg:hidden p-2 rounded-lg transition-colors cursor-pointer ${mutedInk} ${hoverRow}`}
            >
              <PanelLeft className="w-4 h-4" />
            </button>

            {!sidebarOpen && (
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                aria-label="Open History and Studios Sidebar"
                className={`hidden lg:flex p-2 rounded-lg transition-colors cursor-pointer ${mutedInk} ${hoverRow}`}
              >
                <PanelLeft className="w-4 h-4" />
              </button>
            )}

            <span className="text-[14px] sm:text-[15px] font-bold font-display tracking-tight text-[#0A0A0A] dark:text-[#F4F4F0] whitespace-nowrap">
              <span className="sm:hidden">Class 7</span>
              <span className="hidden sm:inline">ICSE Class 7</span>{' '}
              <span className={`hidden sm:inline font-serif-editorial italic font-normal ${mutedInk}`}>
                · मेधावी
              </span>
            </span>
          </div>

          {/* Center: Bold Chat | Books | Studios Toggle */}
          <div
            role="tablist"
            aria-label="Workspace Mode"
            className={`inline-flex items-center p-1 rounded-full border ${
              isLight ? 'bg-[#F3F4F6] border-[#E5E7EB]' : 'bg-[#141821] border-[#2A3244]'
            }`}
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeDockTool === 'chat'}
              onClick={() => setActiveDockTool('chat')}
              className={`px-3 sm:px-3.5 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                activeDockTool === 'chat'
                  ? 'bg-[#0B2559] text-white'
                  : mutedInk
              }`}
            >
              Chat
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeDockTool === 'textbooks'}
              onClick={() => setActiveDockTool('textbooks')}
              className={`px-3 sm:px-3.5 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                activeDockTool === 'textbooks'
                  ? 'bg-[#0B2559] text-white'
                  : mutedInk
              }`}
            >
              Books
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeDockTool !== 'chat' && activeDockTool !== 'textbooks'}
              onClick={() => {
                if ((activeDockTool === 'chat' || activeDockTool === 'textbooks') && roleTools[0]) {
                  handleSelectTool(roleTools[0]);
                }
              }}
              className={`px-3 sm:px-3.5 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                activeDockTool !== 'chat' && activeDockTool !== 'textbooks'
                  ? 'bg-[#0B2559] text-white'
                  : mutedInk
              }`}
            >
              Studios
            </button>
          </div>

          {/* Right: Quiet Utility Icons */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))}
              aria-label={isLight ? 'Switch to Night Ink' : 'Switch to Daylight'}
              title={isLight ? 'Night Ink' : 'Daylight'}
              className={`p-2 rounded-lg transition-colors cursor-pointer ${mutedInk} ${hoverRow}`}
            >
              {isLight ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={() => setSecurityModalOpen(true)}
              aria-label="Security Hub"
              title="Security Hub"
              className={`p-2 rounded-lg transition-colors cursor-pointer ${mutedInk} ${hoverRow}`}
            >
              <ShieldCheck className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* CENTERED SCROLLABLE STAGE */}
        <main className="flex-1 flex flex-col min-w-0 min-h-0">
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 w-full mx-auto print-container flex flex-col">
            {renderMainStageContent()}
          </div>

          {renderComposerBlock()}
        </main>
      </div>

      {/* MOBILE SLIDE-OUT SIDEBAR DRAWER */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-50 flex justify-start bg-black/40 no-print lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="History and Studios Drawer"
          onClick={() => setDrawerOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`w-72 max-w-[85vw] h-full overflow-y-auto border-r ${sidebarBg}`}
          >
            {renderSidebarContent(true)}
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

      <PageImageViewerModal
        isOpen={Boolean(pageViewerTarget)}
        isLight={isLight}
        target={pageViewerTarget}
        onClose={() => setPageViewerTarget(null)}
        onShowToast={showToast}
        onVaultUpdated={() => setVaultRefreshKey((k) => k + 1)}
      />
    </div>
  );
}
