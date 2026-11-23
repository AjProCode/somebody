import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Clock,
  BookOpen,
  Sparkles,
  Printer,
  Compass,
  CheckCircle2,
  Lightbulb,
  Target,
  Sliders,
  HelpCircle,
  Loader2
} from 'lucide-react';
import {
  type CustomSpecItem,
  type IdVerificationResult,
  type IntelligenceMode
} from '../utils/medhaviEngine';
import { inferGrade7Subject } from '../data/grade7Textbooks';
import { executeStudioWorkflow, type StudioExecutionResult } from '../utils/studioRunner';
import { StudioOutputPanel } from './StudioOutputPanel';
import { StudioHistoryPanel } from './StudioHistoryPanel';
import {
  clearStudioHistory,
  deleteStudioHistoryEntry,
  loadStudioHistory,
  saveStudioHistoryEntry,
  STUDIO_HISTORY_EVENT,
  type StudioHistoryEntry
} from '../utils/studioHistory';

interface TeacherLessonPlanDashboardProps {
  isLight: boolean;
  activeSubject: string;
  verifiedIdentity: IdVerificationResult | null;
  selectedModel: string;
  customSpecs: CustomSpecItem[];
  intelligenceMode: IntelligenceMode;
  initialHistoryEntry?: StudioHistoryEntry | null;
  onStudioEntrySaved?: (entry: StudioHistoryEntry) => void;
  onStudioEntryDeleted?: (id: string) => void;
  onStudioHistoryCleared?: (removedIds: string[]) => void;
  onShowToast: (message: string, type?: 'info' | 'error' | 'success') => void;
}

export const TeacherLessonPlanDashboard: React.FC<TeacherLessonPlanDashboardProps> = ({
  isLight,
  activeSubject,
  verifiedIdentity,
  selectedModel,
  customSpecs,
  intelligenceMode,
  initialHistoryEntry = null,
  onStudioEntrySaved,
  onStudioEntryDeleted,
  onStudioHistoryCleared,
  onShowToast
}) => {
  const [topic, setTopic] = useState('');
  const [pedagogicalStyle, setPedagogicalStyle] = useState<
    'inquiry_experiential' | 'socratic_dialogue' | 'peer_problem_solving' | 'lab_coding'
  >('inquiry_experiential');
  const [classSection, setClassSection] = useState('VII-A');
  const [includeMisconceptions, setIncludeMisconceptions] = useState(true);
  const [includeHomeworkTier, setIncludeHomeworkTier] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [studioResult, setStudioResult] = useState<StudioExecutionResult | null>(null);
  const [studioError, setStudioError] = useState<string | null>(null);
  const [generatedTitle, setGeneratedTitle] = useState('');
  const [historyEntries, setHistoryEntries] = useState<StudioHistoryEntry[]>(() =>
    loadStudioHistory('lesson_arch', 'teacher')
  );
  const [activeHistoryId, setActiveHistoryId] = useState<string | null>(null);
  const outputRef = useRef<HTMLDivElement | null>(null);

  const refreshHistory = useCallback(() => {
    setHistoryEntries(loadStudioHistory('lesson_arch', 'teacher'));
  }, []);

  useEffect(() => {
    refreshHistory();
    window.addEventListener(STUDIO_HISTORY_EVENT, refreshHistory);
    return () => window.removeEventListener(STUDIO_HISTORY_EVENT, refreshHistory);
  }, [refreshHistory]);

  const restoreFromHistory = useCallback((entry: StudioHistoryEntry, scrollToOutput = true) => {
    const snap = entry.inputsSnapshot || {};
    if (typeof snap.topic === 'string') setTopic(snap.topic);
    if (
      snap.pedagogicalStyle === 'inquiry_experiential' ||
      snap.pedagogicalStyle === 'socratic_dialogue' ||
      snap.pedagogicalStyle === 'peer_problem_solving' ||
      snap.pedagogicalStyle === 'lab_coding'
    ) {
      setPedagogicalStyle(snap.pedagogicalStyle);
    }
    if (typeof snap.classSection === 'string') setClassSection(snap.classSection);
    if (typeof snap.includeMisconceptions === 'boolean') {
      setIncludeMisconceptions(snap.includeMisconceptions);
    }
    if (typeof snap.includeHomeworkTier === 'boolean') {
      setIncludeHomeworkTier(snap.includeHomeworkTier);
    }
    setGeneratedTitle(entry.title);
    setStreamingText('');
    setStudioError(null);
    setStudioResult(entry.result);
    setActiveHistoryId(entry.id);
    if (scrollToOutput) {
      setTimeout(() => outputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
    }
  }, []);

  useEffect(() => {
    if (initialHistoryEntry && initialHistoryEntry.studioId === 'lesson_arch') {
      restoreFromHistory(initialHistoryEntry, true);
    }
  }, [initialHistoryEntry, restoreFromHistory]);

  const styleLabels = {
    inquiry_experiential: {
      name: 'Inquiry-Based & Experiential',
      desc: 'Real-world hook, tactile observation, CISCE / ICSE hands-on derivation'
    },
    socratic_dialogue: {
      name: 'Socratic Dialogue & Guided Questioning',
      desc: 'Guided teacher prompts that lead students to discover the rule themselves'
    },
    peer_problem_solving: {
      name: 'Peer Think-Pair-Share & Revision Arena',
      desc: 'Collaborative problem solving with timed challenges and distractor traps'
    },
    lab_coding: {
      name: 'Hands-on Lab / Python & Symbolic Modeling',
      desc: 'Interactive experiments, code visualization, and symbolic proof verification'
    }
  };

  const handleGenerate = async () => {
    if (isGenerating) return;
    const inferredSubject = inferGrade7Subject(topic) || activeSubject;
    const cleanTopic = topic.trim() || `Class 7 ${inferredSubject} Core Chapter`;
    const style = styleLabels[pedagogicalStyle];

    const prompt = `[TEACHER 40-MINUTE ICSE LESSON ARCHITECT]
Construct a high-fidelity, minute-by-minute 40-Minute ICSE (CISCE) Lesson Plan for Seth M.R. Jaipuria School:
- Board: ICSE (CISCE) ONLY
- Grade: Class 7 (${classSection})
- Subject: ${inferredSubject}
- Topic: "${cleanTopic}"
- Pedagogical Model: ${style.name} (${style.desc})
- Guiding School Motto: "Tamso Ma Jyotirgamaya" (Lead from darkness to light)

Strictly format the plan into the standard Seth M.R. Jaipuria School ICSE 40-minute period breakdown:
1. **0 to 5 Minutes · The Jaipuria Hook (प्रवेश)**:
   - Real-world observation, puzzle, or experiential question that activates prior ICSE Class 6/7 knowledge.
   - Socratic question to post on the smartboard.
2. **5 to 20 Minutes · Conceptual Exposition & Active Modeling (अवबोधन)**:
   - Core ICSE concept explained through a step-by-step physical or visual analogy.
   - Mathematical / Scientific formulation with LaTeX notation.
3. **20 to 30 Minutes · Guided Step-by-Step Practice & Think-Pair-Share (अभ्यास)**:
   - Two graded ICSE Class 7 problems worked out together.
   ${includeMisconceptions ? '- 💡 Common ICSE Class 7 Misconception Alert (the exact trap students fall into and how to dispel it).' : ''}
4. **30 to 35 Minutes · Socratic Formative Check (मूल्यांकन)**:
   - Quick 60-second concept check question to gauge classroom mastery before wrap-up.
5. **35 to 40 Minutes · Exit Ticket & Differentiated Homework (गृहकार्य)**:
   - 1-minute exit question to submit on paper slips.
   ${includeHomeworkTier ? '- Differentiated Homework: Level 1 (Core ICSE / CISCE Mastery) + Level 2 (Jaipuria ICSE Revision Star Challenge).' : ''}

Include Teacher Blackboard / Smartboard layout notes and required apparatus/materials.`;

    setGeneratedTitle(`${cleanTopic} (${classSection})`);
    setIsGenerating(true);
    setStreamingText('');
    setStudioResult(null);
    setStudioError(null);
    onShowToast(`Generating 40-minute ICSE lesson plan on "${cleanTopic}"...`, 'info');
    setTimeout(() => outputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);

    try {
      const result = await executeStudioWorkflow({
        prompt,
        role: 'teacher',
        subject: inferredSubject,
        workflowType: 'lesson_plan_architect',
        verifiedIdentity,
        selectedModel,
        customSpecs,
        intelligenceMode,
        onDelta: (partial) => setStreamingText(partial)
      });
      setStudioResult(result);
      const saved = saveStudioHistoryEntry({
        studioId: 'lesson_arch',
        role: 'teacher',
        ownerId: verifiedIdentity?.schoolId || 'faculty',
        title: `${cleanTopic} (${classSection})`,
        subtitle: style.name,
        subject: inferredSubject,
        inputsSnapshot: {
          topic: cleanTopic,
          pedagogicalStyle,
          classSection,
          includeMisconceptions,
          includeHomeworkTier
        },
        result
      });
      setActiveHistoryId(saved.id);
      refreshHistory();
      onStudioEntrySaved?.(saved);
      onShowToast('40-minute lesson plan saved to Lesson Architect History.', 'success');
    } catch (err: any) {
      const msg = err?.message || 'Lesson plan generation failed.';
      setStudioError(msg);
      onShowToast(msg, 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header Banner */}
      <div className={`editorial-surface rounded-xl p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border ${
        isLight ? 'border-[#0B2559]/12 text-[#0B2559]' : 'border-[#F5B700]/20 text-slate-100'
      }`}>
        <div className="space-y-1.5">
          <div className={`flex items-center gap-2 text-xs font-mono uppercase tracking-wider font-semibold ${isLight ? 'text-[#0B2559]/75' : 'text-[#F5B700]'}`}>
            <Compass className="w-3.5 h-3.5 text-[#F5B700]" />
            <span>Faculty Studio · 40-Minute ICSE (CISCE) Lesson Architect</span>
          </div>
          <h1 className={`text-2xl sm:text-3xl font-bold font-display ${isLight ? 'text-[#0B2559]' : 'text-slate-100'}`}>
            40-Minute ICSE Classroom Lesson Architect
          </h1>
          <p className={`text-sm max-w-2xl ${isLight ? 'text-[#0B2559]/75' : 'text-slate-400'}`}>
            Design high-engagement 40-minute periods with Jaipuria inquiry hooks, guided think-pair-share practice, common misconception alerts, and differentiated exit tickets.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
              isLight
                ? 'border-[#0B2559]/20 bg-white text-[#0B2559] hover:border-[#0B2559]'
                : 'border-slate-700/80 hover:border-[#F5B700]/60 text-slate-200'
            }`}
          >
            <Printer className="w-3.5 h-3.5 text-[#F5B700]" />
            <span>Print Plan</span>
          </button>
        </div>
      </div>

      <StudioHistoryPanel
        isLight={isLight}
        studioName="Lesson Architect"
        entries={historyEntries}
        activeEntryId={activeHistoryId}
        emptyHint="No past 40-minute lesson plans saved yet. Generated period blueprints are stored here automatically."
        onSelectEntry={(entry) => {
          restoreFromHistory(entry, true);
          onShowToast(`Loaded lesson plan "${entry.title}" inside studio.`, 'info');
        }}
        onDeleteEntry={(id) => {
          deleteStudioHistoryEntry(id);
          if (activeHistoryId === id) {
            setActiveHistoryId(null);
          }
          refreshHistory();
          onStudioEntryDeleted?.(id);
          onShowToast('Removed lesson plan from Lesson Architect history.', 'info');
        }}
        onClearAll={() => {
          const removed = clearStudioHistory('lesson_arch', 'teacher');
          setActiveHistoryId(null);
          refreshHistory();
          onStudioHistoryCleared?.(removed.map((r) => r.id));
          onShowToast('Cleared Lesson Architect history.', 'info');
        }}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Form Controls */}
        <div className="lg:col-span-2 space-y-5">
          <div className={`editorial-surface rounded-xl p-6 space-y-5 border ${
            isLight ? 'border-[#0B2559]/12 text-[#0B2559]' : 'border-[#F5B700]/20 text-slate-100'
          }`}>
            <h2 className={`text-base font-semibold flex items-center gap-2 ${isLight ? 'text-slate-900' : 'text-slate-200'}`}>
              <Compass className="w-4 h-4 text-sky-500" />
              <span>Lesson Parameters</span>
            </h2>

            {/* Topic Input */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="lesson-topic" className={`block text-xs font-mono uppercase font-medium ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                  Topic / Sub-Concept for Today's 40-Min Period
                </label>
                <div className="flex items-center gap-2 text-xs">
                  <span className={isLight ? 'text-slate-600' : 'text-slate-400'}>Section:</span>
                  <select
                    value={classSection}
                    onChange={(e) => setClassSection(e.target.value)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-bold border transition-colors ${
                      isLight
                        ? 'bg-white border-slate-300 text-sky-700 shadow-xs'
                        : 'bg-slate-900 border-slate-700 text-sky-400'
                    }`}
                  >
                    {['VII-A', 'VII-B', 'VII-C', 'VII-D', 'VII-E'].map((sec) => (
                      <option key={sec} value={sec}>
                        Class {sec}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <input
                id="lesson-topic"
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder={`e.g., Triangle Exterior Angle Theorem, Convection in Fluids, or Python For Loops`}
                className={`w-full px-4 py-3 rounded-xl border text-sm outline-none transition-all ${
                  isLight
                    ? 'bg-white border-slate-300 text-slate-900 focus:border-sky-500 focus:ring-1 focus:ring-sky-500'
                    : 'bg-slate-900/80 border-slate-700/80 text-slate-100 focus:border-sky-400'
                }`}
              />
            </div>

            {/* Pedagogical Strategy Selector */}
            <div className="space-y-2">
              <label className={`block text-xs font-mono uppercase font-medium ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                Pedagogical Framework (ICSE / CISCE)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(Object.keys(styleLabels) as Array<keyof typeof styleLabels>).map((key) => {
                  const item = styleLabels[key];
                  const selected = pedagogicalStyle === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setPedagogicalStyle(key)}
                      className={`p-3.5 rounded-xl border text-left transition-all relative ${
                        selected
                          ? (isLight
                              ? 'border-sky-500 bg-sky-50 text-slate-900 shadow-sm ring-1 ring-sky-500/30'
                              : 'border-sky-400/80 bg-sky-500/15 shadow-[0_0_15px_rgba(56,189,248,0.15)]')
                          : (isLight
                              ? 'border-slate-200 hover:border-slate-300 bg-white shadow-xs'
                              : 'border-slate-700/70 hover:border-slate-600 bg-slate-900/40')
                      }`}
                    >
                      <div className={`text-xs font-semibold ${
                        selected
                          ? (isLight ? 'text-sky-900' : 'text-sky-300')
                          : (isLight ? 'text-slate-800' : 'text-slate-200')
                      }`}>
                        {item.name}
                      </div>
                      <div className={`text-[11px] mt-1 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                        {item.desc}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Checkboxes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                isLight
                  ? 'border-slate-200 bg-white hover:bg-slate-50 shadow-xs'
                  : 'border-slate-700/60 bg-slate-900/40 hover:bg-slate-900/60'
              }`}>
                <input
                  type="checkbox"
                  checked={includeMisconceptions}
                  onChange={(e) => setIncludeMisconceptions(e.target.checked)}
                  className="rounded text-sky-500 focus:ring-sky-400 w-4 h-4 bg-slate-950 border-slate-700"
                />
                <span className={`text-xs font-medium ${isLight ? 'text-slate-800' : 'text-slate-300'}`}>
                  Common Student Misconception Alert
                </span>
              </label>

              <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                isLight
                  ? 'border-slate-200 bg-white hover:bg-slate-50 shadow-xs'
                  : 'border-slate-700/60 bg-slate-900/40 hover:bg-slate-900/60'
              }`}>
                <input
                  type="checkbox"
                  checked={includeHomeworkTier}
                  onChange={(e) => setIncludeHomeworkTier(e.target.checked)}
                  className="rounded text-sky-500 focus:ring-sky-400 w-4 h-4 bg-slate-950 border-slate-700"
                />
                <span className={`text-xs font-medium ${isLight ? 'text-slate-800' : 'text-slate-300'}`}>
                  Differentiated Level 1 &amp; Level 2 Homework
                </span>
              </label>
            </div>

            {/* Generate Action Button */}
            <button
              type="button"
              disabled={isGenerating}
              onClick={handleGenerate}
              className="w-full flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl font-bold text-sm bg-[#F5B700] text-[#0B2559] hover:bg-[#E0A800] disabled:opacity-60 transition-colors cursor-pointer"
            >
              {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              <span>
                {isGenerating
                  ? 'Architecting Lesson Plan Inside Studio…'
                  : 'Architect 40-Minute Class 7 Lesson Plan'}
              </span>
            </button>
          </div>
        </div>

        {/* Right Col: Timeline Breakdown Card */}
        <div className="space-y-5">
          <div className={`editorial-surface rounded-xl p-5 border space-y-4 ${
            isLight ? 'border-[#0B2559]/12 text-[#0B2559]' : 'border-[#F5B700]/20 text-slate-100'
          }`}>
            <h3 className="text-xs font-mono uppercase tracking-wider text-amber-500 font-bold flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              <span>40-Minute Period Blueprint</span>
            </h3>

            <div className={`space-y-2.5 text-xs ${isLight ? 'text-slate-800' : 'text-slate-300'}`}>
              <div className={`p-2.5 rounded-xl border flex items-center justify-between ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/60 border-slate-800'
              }`}>
                <div>
                  <span className={`font-mono font-bold ${isLight ? 'text-sky-700' : 'text-sky-400'}`}>0-5 min</span>
                  <div className={`text-[11px] ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>Jaipuria Inquiry Hook</div>
                </div>
                <span className={`text-[10px] font-mono font-semibold ${isLight ? 'text-amber-700' : 'text-amber-400'}`}>Prior Knowledge</span>
              </div>

              <div className={`p-2.5 rounded-xl border flex items-center justify-between ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/60 border-slate-800'
              }`}>
                <div>
                  <span className={`font-mono font-bold ${isLight ? 'text-sky-700' : 'text-sky-400'}`}>5-20 min</span>
                  <div className={`text-[11px] ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>Conceptual Exposition</div>
                </div>
                <span className={`text-[10px] font-mono font-semibold ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`}>Active Modeling</span>
              </div>

              <div className={`p-2.5 rounded-xl border flex items-center justify-between ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/60 border-slate-800'
              }`}>
                <div>
                  <span className={`font-mono font-bold ${isLight ? 'text-sky-700' : 'text-sky-400'}`}>20-30 min</span>
                  <div className={`text-[11px] ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>Think-Pair-Share Practice</div>
                </div>
                <span className={`text-[10px] font-mono font-semibold ${isLight ? 'text-sky-700' : 'text-sky-400'}`}>Guided Practice</span>
              </div>

              <div className={`p-2.5 rounded-xl border flex items-center justify-between ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/60 border-slate-800'
              }`}>
                <div>
                  <span className={`font-mono font-bold ${isLight ? 'text-sky-700' : 'text-sky-400'}`}>30-35 min</span>
                  <div className={`text-[11px] ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>Socratic Formative Check</div>
                </div>
                <span className={`text-[10px] font-mono font-semibold ${isLight ? 'text-purple-700' : 'text-purple-400'}`}>Concept Gauge</span>
              </div>

              <div className={`p-2.5 rounded-xl border flex items-center justify-between ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/60 border-slate-800'
              }`}>
                <div>
                  <span className={`font-mono font-bold ${isLight ? 'text-sky-700' : 'text-sky-400'}`}>35-40 min</span>
                  <div className={`text-[11px] ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>Exit Ticket &amp; Homework</div>
                </div>
                <span className={`text-[10px] font-mono font-semibold ${isLight ? 'text-rose-700' : 'text-rose-400'}`}>Consolidation</span>
              </div>
            </div>

            <div className={`pt-2 border-t text-[11px] flex items-center gap-1.5 ${
              isLight ? 'border-slate-200 text-slate-600' : 'border-slate-800 text-slate-400'
            }`}>
              <HelpCircle className="w-3.5 h-3.5 text-sky-500 shrink-0" />
              <span>Full lesson plans stream and render right here inside this studio for instant copying or printing.</span>
            </div>
          </div>
        </div>
      </div>

      <div ref={outputRef}>
        <StudioOutputPanel
          isLight={isLight}
          title={generatedTitle || `40-Minute Class 7 Lesson Plan`}
          subtitle="Seth M.R. Jaipuria School · CISCE Period Blueprint"
          isGenerating={isGenerating}
          streamingText={streamingText}
          result={studioResult}
          error={studioError}
          copyLabel="Copy Lesson Plan"
          onClear={() => {
            setStreamingText('');
            setStudioResult(null);
            setStudioError(null);
            setActiveHistoryId(null);
          }}
          onShowToast={onShowToast}
        />
      </div>
    </div>
  );
};
