import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  FileText,
  Zap,
  Clock,
  HelpCircle,
  CheckCircle2,
  Copy,
  BookOpen,
  Award,
  Loader2
} from 'lucide-react';
import {
  type CustomSpecItem,
  type IdVerificationResult,
  type IntelligenceMode,
  type QuizData,
  type RevisionPerformanceReport
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

interface StudentRevisionTestDashboardProps {
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
  onSaveQuizAttempt?: (report: RevisionPerformanceReport, quiz: QuizData, subject: string) => void;
  onShowToast: (message: string, type?: 'info' | 'error' | 'success') => void;
}

const SUBJECT_QUICK_DRILLS: Record<string, Array<{ topic: string; badge: string }>> = {
  Mathematics: [
    { topic: 'Rational Numbers, Exponents & Powers', badge: 'Number System' },
    { topic: 'Simple Linear Equations & Inequations', badge: 'Algebra Core' },
    { topic: 'Congruence of Triangles & Pythagoras Theorem', badge: 'Geometry' }
  ],
  Physics: [
    { topic: 'Physical Quantities, Measurement & Density', badge: 'Unit 1' },
    { topic: 'Heat, Temperature Scales & Thermal Expansion', badge: 'Thermodynamics' },
    { topic: 'Sound Waves, Reflection & Electricity Basics', badge: 'Wave & Circuit' }
  ],
  Chemistry: [
    { topic: 'Matter, Elements, Compounds & Mixtures', badge: 'Foundations' },
    { topic: 'Atomic Structure, Valency & Chemical Formulae', badge: 'Symbol Drill' },
    { topic: 'Metals, Non-Metals & Air Constituents', badge: 'Lab Prep' }
  ],
  Biology: [
    { topic: 'Plant & Animal Tissues (Meristematic to Nervous)', badge: 'Cytology' },
    { topic: 'Photosynthesis & Respiration in Plants', badge: 'Plant Life' },
    { topic: 'Human Excretory & Nervous Systems + Allergy', badge: 'Human Biology' }
  ],
  'English Language': [
    { topic: 'Active & Passive Voice + Direct & Indirect Speech', badge: 'Grammar' },
    { topic: 'Prepositions, Conjunctions & Tense Transformation', badge: 'Syntax Drill' },
    { topic: 'Unseen Comprehension & Formal Notice Writing', badge: 'ICSE Paper 1' }
  ],
  'English Literature': [
    { topic: 'Reference to Context (RTC) & Poetic Devices', badge: 'Poetry & Prose' },
    { topic: 'Character Sketch & Theme Analysis Practice', badge: 'ICSE Paper 2' },
    { topic: 'Vocabulary in Context & Figurative Expressions', badge: 'Literary Craft' }
  ],
  'History & Civics': [
    { topic: 'Medieval Europe, Rise of Islam & Delhi Sultanate', badge: 'History' },
    { topic: 'Vijayanagara, Bahmani & Mughal Empire Foundations', badge: 'Dynasties' },
    { topic: 'The Constitution of India & Directive Principles', badge: 'Civics Core' }
  ],
  Geography: [
    { topic: 'Topographical Maps, Scale & Conventional Signs', badge: 'Map Work' },
    { topic: 'Atmosphere, Weather Instruments & Weathering', badge: 'Physical Geo' },
    { topic: 'Europe, Africa & Australia Regional Case Studies', badge: 'Continents' }
  ],
  'Computer Studies': [
    { topic: 'Hardware Components & Number System Conversions', badge: 'Binary/Hex' },
    { topic: 'HTML5 Structure, Lists, Tables & Attributes', badge: 'Web Coding' },
    { topic: 'Ethics, Cyber Safety & Spreadsheet Formulas', badge: 'Digital Literacy' }
  ],
  Hindi: [
    { topic: 'संधि, समास, उपसर्ग-प्रत्यय और मुहावरे अभ्यास', badge: 'व्याकरण' },
    { topic: 'अपठित गद्यांश और औपचारिक पत्र लेखन', badge: 'रचना कौशल' },
    { topic: 'पर्यायवाची, विलोम और वाक्य शुद्धिकरण', badge: 'शब्द भंडार' }
  ],
  Sanskrit: [
    { topic: 'शब्दरूप (बालक/लता) एवं धातुरूप (लट्/लृट्/लङ् लकार)', badge: 'व्याकरणम्' },
    { topic: 'कारक-विभक्ति परिचय एवं सरल संस्कृत अनुवाद', badge: 'अनुवाद अभ्यास' },
    { topic: 'संख्यावाचक शब्द (1–50) एवं सुभाषितानि श्लोक', badge: 'साहित्यम्' }
  ]
};

export const StudentRevisionTestDashboard: React.FC<StudentRevisionTestDashboardProps> = ({
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
  onSaveQuizAttempt,
  onShowToast
}) => {
  const [topic, setTopic] = useState('');
  const [questionCount, setQuestionCount] = useState<number>(10);
  const [format, setFormat] = useState<'Objective MCQs' | 'Short Answers' | 'Mixed Pattern'>(
    'Mixed Pattern'
  );
  const [difficulty, setDifficulty] = useState<'Standard' | 'Challenging' | 'Expert'>('Standard');
  const [includeStepHints, setIncludeStepHints] = useState<boolean>(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [studioResult, setStudioResult] = useState<StudioExecutionResult | null>(null);
  const [studioError, setStudioError] = useState<string | null>(null);
  const [generatedTopic, setGeneratedTopic] = useState('');
  const [generatedSubject, setGeneratedSubject] = useState(activeSubject);
  const [historyEntries, setHistoryEntries] = useState<StudioHistoryEntry[]>(() =>
    loadStudioHistory('revision_arena', 'student')
  );
  const [activeHistoryId, setActiveHistoryId] = useState<string | null>(null);
  const outputRef = useRef<HTMLDivElement | null>(null);

  const refreshHistory = useCallback(() => {
    setHistoryEntries(loadStudioHistory('revision_arena', 'student'));
  }, []);

  useEffect(() => {
    refreshHistory();
    window.addEventListener(STUDIO_HISTORY_EVENT, refreshHistory);
    return () => window.removeEventListener(STUDIO_HISTORY_EVENT, refreshHistory);
  }, [refreshHistory]);

  const restoreFromHistory = useCallback(
    (entry: StudioHistoryEntry, scrollToOutput = true) => {
      const snap = entry.inputsSnapshot || {};
      if (typeof snap.topic === 'string') setTopic(snap.topic);
      if (typeof snap.questionCount === 'number') setQuestionCount(snap.questionCount);
      if (
        snap.format === 'Objective MCQs' ||
        snap.format === 'Short Answers' ||
        snap.format === 'Mixed Pattern'
      ) {
        setFormat(snap.format);
      }
      if (
        snap.difficulty === 'Standard' ||
        snap.difficulty === 'Challenging' ||
        snap.difficulty === 'Expert'
      ) {
        setDifficulty(snap.difficulty);
      }
      if (typeof snap.includeStepHints === 'boolean') {
        setIncludeStepHints(snap.includeStepHints);
      }
      setGeneratedTopic(entry.title);
      setGeneratedSubject(entry.subject || activeSubject);
      setStreamingText('');
      setStudioError(null);
      setStudioResult(entry.result);
      setActiveHistoryId(entry.id);
      if (scrollToOutput) {
        setTimeout(() => outputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
      }
    },
    [activeSubject]
  );

  useEffect(() => {
    if (initialHistoryEntry && initialHistoryEntry.studioId === 'revision_arena') {
      restoreFromHistory(initialHistoryEntry, true);
    }
  }, [initialHistoryEntry, restoreFromHistory]);

  const subjectDrills = SUBJECT_QUICK_DRILLS[activeSubject] || SUBJECT_QUICK_DRILLS.Mathematics;
  const estimatedMinutes =
    format === 'Objective MCQs' ? Math.round(questionCount * 1.5) : questionCount * 3;
  const estimatedMarks =
    format === 'Objective MCQs' ? questionCount * 2 : Math.round(questionCount * 2.5);

  const runRevisionGeneration = async (
    customTopic?: string,
    overrideDifficulty?: QuizData['difficulty']
  ) => {
    if (isGenerating) return;
    const rawTopic = (customTopic || topic).trim();
    const inferredSubject = inferGrade7Subject(rawTopic) || activeSubject;
    const targetTopic = rawTopic || `ICSE Class 7 ${inferredSubject} Full Revision`;
    const activeWorkflow = format === 'Objective MCQs' || overrideDifficulty ? 'revision_quiz' : 'revision_test';

    const prompt = overrideDifficulty
      ? `Generate a 5-question ${overrideDifficulty}-level Revision Arena MCQ challenge for Class 7 ${inferredSubject} on "${targetTopic}". Return inside <medhavi_quiz>...</medhavi_quiz> tags.`
      : `[STUDENT REVISION TEST GENERATOR — ICSE (CISCE) CLASS 7]
Generate a complete, student-friendly ICSE Class 7 Revision Test in ${inferredSubject}:
- Board: ICSE (CISCE) Strictly
- Topic: "${targetTopic}"
- Pattern: ${format}
- Difficulty Level: ${difficulty}
- Total Questions: ${questionCount}
- Estimated Marks: ${estimatedMarks} Marks (${estimatedMinutes} Minutes)

Structure the response as a clean ICSE Class 7 revision paper optimized for self-practice:
- Include clear Section A and Section B divisions when Pattern is Mixed.
- Show marks in brackets [ ] next to every question.
${includeStepHints ? '- Provide concise conceptual hints before the final Self-Correction Answer Key.' : '- Provide a complete Self-Correction Answer Key at the end.'}
- Note: Strictly written ICSE revision format (no oral recitation tasks).

If Pattern is Objective MCQs, wrap the questions in <medhavi_quiz>...</medhavi_quiz> so I can attempt them interactively with +2 / -1 scoring, and also present readable revision notes.`;

    setGeneratedTopic(targetTopic);
    setGeneratedSubject(inferredSubject);
    setIsGenerating(true);
    setStreamingText('');
    setStudioResult(null);
    setStudioError(null);
    onShowToast(
      `Generating ${overrideDifficulty ? '5-question interactive' : `${questionCount}-question ${difficulty}`} ICSE revision test on "${targetTopic}"...`,
      'info'
    );
    setTimeout(() => outputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);

    try {
      const result = await executeStudioWorkflow({
        prompt,
        role: 'student',
        subject: inferredSubject,
        workflowType: activeWorkflow,
        verifiedIdentity,
        selectedModel,
        customSpecs,
        intelligenceMode,
        workflowMeta: {
          topic: targetTopic,
          difficulty: overrideDifficulty || difficulty,
          questionCount: overrideDifficulty ? 5 : questionCount
        },
        onDelta: (partial) => setStreamingText(partial)
      });
      setStudioResult(result);
      const runDifficulty = overrideDifficulty || difficulty;
      const runFormat = overrideDifficulty ? 'Objective MCQs' : format;
      const runCount = overrideDifficulty ? 5 : questionCount;
      const saved = saveStudioHistoryEntry({
        studioId: 'revision_arena',
        role: 'student',
        ownerId: verifiedIdentity?.schoolId || 'scholar',
        title: targetTopic,
        subtitle: `${runFormat} · ${runDifficulty} · ${runCount} Qs`,
        subject: inferredSubject,
        inputsSnapshot: {
          topic: targetTopic,
          questionCount: runCount,
          format: runFormat,
          difficulty: difficulty,
          includeStepHints
        },
        result
      });
      setActiveHistoryId(saved.id);
      refreshHistory();
      onStudioEntrySaved?.(saved);
      onShowToast('Revision test ready & saved to Revision Tests History.', 'success');
    } catch (err: any) {
      const msg = err?.message || 'Could not generate revision test.';
      setStudioError(msg);
      onShowToast(msg, 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleLaunch = (customTopic?: string) => {
    void runRevisionGeneration(customTopic);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header Banner */}
      <div
        className={`editorial-surface rounded-xl p-6 sm:p-7 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border ${
          isLight ? 'border-[#0B2559]/12 text-[#0B2559]' : 'border-[#F5B700]/20 text-slate-100'
        }`}
      >
        <div className="space-y-1.5">
          <div className={`flex items-center gap-2 text-xs font-mono uppercase tracking-wider font-semibold ${isLight ? 'text-[#0B2559]/75' : 'text-[#F5B700]'}`}>
            <BookOpen className="w-3.5 h-3.5 shrink-0 text-[#F5B700]" />
            <span>Scholar Studio · ICSE Class 7</span>
          </div>
          <h1
            className={`text-2xl sm:text-3xl font-bold font-display ${
              isLight ? 'text-[#0B2559]' : 'text-slate-100'
            }`}
          >
            Revision Test Generator
          </h1>
          <p className={`text-sm max-w-2xl ${isLight ? 'text-[#0B2559]/75' : 'text-slate-400'}`}>
            Build custom ICSE Class 7 practice papers, chapter drills, and self-scoring MCQ sprints. Student revision papers allow one-click copying and unlimited downloads for home study.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0 text-xs font-mono font-semibold">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border ${
              isLight
                ? 'border-emerald-600/30 bg-emerald-50 text-emerald-900'
                : 'border-emerald-500/35 bg-emerald-500/10 text-emerald-300'
            }`}
          >
            <Copy className="w-3.5 h-3.5 shrink-0" />
            <span>Copy Enabled</span>
          </span>
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border ${
              isLight
                ? 'border-[#0B2559]/20 bg-[#F7F9FC] text-[#0B2559]'
                : 'border-[#F5B700]/30 bg-[#0B2559]/40 text-[#F5B700]'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <span>Unlimited Exports</span>
          </span>
        </div>
      </div>

      <StudioHistoryPanel
        isLight={isLight}
        studioName="Revision Tests"
        entries={historyEntries}
        activeEntryId={activeHistoryId}
        emptyHint="No revision tests or interactive quizzes generated yet. Every paper and quiz you build here is saved automatically."
        onSelectEntry={(entry) => {
          restoreFromHistory(entry, true);
          onShowToast(`Loaded revision test "${entry.title}" inside studio.`, 'info');
        }}
        onDeleteEntry={(id) => {
          deleteStudioHistoryEntry(id);
          if (activeHistoryId === id) {
            setActiveHistoryId(null);
          }
          refreshHistory();
          onStudioEntryDeleted?.(id);
          onShowToast('Removed revision test from studio history.', 'info');
        }}
        onClearAll={() => {
          const removed = clearStudioHistory('revision_arena', 'student');
          setActiveHistoryId(null);
          refreshHistory();
          onStudioHistoryCleared?.(removed.map((r) => r.id));
          onShowToast('Cleared Revision Tests history.', 'info');
        }}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Revision Builder */}
        <div className="lg:col-span-2 space-y-5">
          <div
            className={`editorial-surface rounded-xl p-6 space-y-5 border ${
              isLight ? 'border-[#0B2559]/12 text-[#0B2559]' : 'border-[#F5B700]/20 text-slate-100'
            }`}
          >
            {/* Topic Input */}
            <div className="space-y-2">
              <label
                htmlFor="rev-topic"
                className={`block text-xs font-mono uppercase font-semibold ${
                  isLight ? 'text-slate-600' : 'text-slate-400'
                }`}
              >
                Chapter or Syllabus Topic
              </label>
              <input
                id="rev-topic"
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleLaunch();
                  }
                }}
                placeholder={`e.g., ${subjectDrills[0]?.topic || 'ICSE Class 7 Core Chapter'}`}
                className={`w-full px-4 py-3 rounded-xl border text-sm outline-none transition-colors ${
                  isLight
                    ? 'bg-white border-slate-300 text-slate-900 focus:border-amber-500'
                    : 'bg-slate-900/80 border-slate-700/80 text-slate-100 focus:border-amber-400'
                }`}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Question Format */}
              <div className="space-y-2">
                <span
                  className={`block text-xs font-mono uppercase font-semibold ${
                    isLight ? 'text-slate-600' : 'text-slate-400'
                  }`}
                >
                  Revision Pattern
                </span>
                <div className="flex flex-col gap-2">
                  {(['Objective MCQs', 'Short Answers', 'Mixed Pattern'] as const).map((pat) => {
                    const isSelected = format === pat;
                    return (
                      <button
                        key={pat}
                        type="button"
                        onClick={() => setFormat(pat)}
                        className={`py-2.5 px-3.5 rounded-xl border text-xs font-medium text-left transition-colors ${
                          isSelected
                            ? isLight
                              ? 'border-amber-500 bg-amber-50 text-amber-950 font-semibold'
                              : 'border-amber-400 bg-amber-500/20 text-amber-300 font-semibold'
                            : isLight
                            ? 'border-slate-200 text-slate-700 hover:border-slate-300 bg-white'
                            : 'border-slate-700/80 text-slate-300 hover:border-slate-600'
                        }`}
                      >
                        {pat}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Difficulty */}
              <div className="space-y-2">
                <span
                  className={`block text-xs font-mono uppercase font-semibold ${
                    isLight ? 'text-slate-600' : 'text-slate-400'
                  }`}
                >
                  Challenge Level
                </span>
                <div className="flex flex-col gap-2">
                  {(['Standard', 'Challenging', 'Expert'] as const).map((tier) => {
                    const isSelected = difficulty === tier;
                    return (
                      <button
                        key={tier}
                        type="button"
                        onClick={() => setDifficulty(tier)}
                        className={`py-2.5 px-3.5 rounded-xl border text-xs font-medium text-left transition-colors ${
                          isSelected
                            ? isLight
                              ? 'border-amber-500 bg-amber-50 text-amber-950 font-semibold'
                              : 'border-amber-400 bg-amber-500/20 text-amber-300 font-semibold'
                            : isLight
                            ? 'border-slate-200 text-slate-700 hover:border-slate-300 bg-white'
                            : 'border-slate-700/80 text-slate-300 hover:border-slate-600'
                        }`}
                      >
                        {tier}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Question Count */}
            <div className="space-y-2">
              <div
                className={`flex items-center justify-between text-xs font-mono uppercase font-semibold tabular-nums ${
                  isLight ? 'text-slate-600' : 'text-slate-400'
                }`}
              >
                <span>Questions &amp; Pacing</span>
                <span className={isLight ? 'text-amber-800' : 'text-amber-400'}>
                  {questionCount} Qs · ~{estimatedMarks} Marks · ~{estimatedMinutes} Min
                </span>
              </div>
              <div className="grid grid-cols-4 gap-2.5">
                {[5, 10, 15, 20].map((cnt) => {
                  const isSelected = questionCount === cnt;
                  return (
                    <button
                      key={cnt}
                      type="button"
                      onClick={() => setQuestionCount(cnt)}
                      className={`py-2.5 rounded-xl border text-xs font-mono font-bold transition-colors tabular-nums ${
                        isSelected
                          ? isLight
                            ? 'border-amber-500 bg-amber-50 text-amber-950'
                            : 'border-amber-400 bg-amber-500/20 text-amber-300'
                          : isLight
                          ? 'border-slate-200 text-slate-700 hover:border-slate-300 bg-white'
                          : 'border-slate-700/80 text-slate-300 hover:border-slate-600'
                      }`}
                    >
                      {cnt} Qs
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step Hints Toggle */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <label
                className={`flex items-center gap-2.5 text-xs cursor-pointer ${
                  isLight ? 'text-slate-700' : 'text-slate-300'
                }`}
              >
                <input
                  type="checkbox"
                  checked={includeStepHints}
                  onChange={(e) => setIncludeStepHints(e.target.checked)}
                  className="rounded text-amber-500 focus:ring-amber-400 w-4 h-4"
                />
                <span>Include step-by-step hints &amp; self-correction answer key</span>
              </label>

              <span
                className={`inline-flex items-center gap-1.5 text-[11px] font-mono tabular-nums ${
                  isLight ? 'text-slate-500' : 'text-slate-400'
                }`}
              >
                <Clock className="w-3.5 h-3.5 text-amber-500" />
                <span>Recommended Time: {estimatedMinutes}m</span>
              </span>
            </div>

            {/* Launch Button */}
            <button
              type="button"
              disabled={isGenerating}
              onClick={() => handleLaunch()}
              className="w-full flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl font-bold text-sm bg-[#F5B700] text-[#0B2559] hover:bg-[#E0A800] disabled:opacity-60 transition-colors cursor-pointer"
            >
              {isGenerating ? (
                <Loader2 className="w-4 h-4 shrink-0 animate-spin" />
              ) : (
                <FileText className="w-4 h-4 shrink-0" />
              )}
              <span>
                {isGenerating
                  ? 'Generating Revision Test Inside Studio…'
                  : `Generate ICSE Revision Test (${questionCount} Questions)`}
              </span>
            </button>
          </div>
        </div>

        {/* Right Col: Subject-Adaptive Quick Sprints */}
        <div className="space-y-5">
          <div
            className={`editorial-surface rounded-xl p-5 border space-y-4 ${
              isLight ? 'border-[#0B2559]/12 text-[#0B2559]' : 'border-[#F5B700]/20 text-slate-100'
            }`}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-mono uppercase tracking-wider text-amber-500 font-bold flex items-center gap-1.5">
                <Zap className="w-4 h-4 shrink-0" />
                <span>Quick Chapter Drills</span>
              </h3>
              <Award className="w-4 h-4 text-amber-500/70" />
            </div>

            <div className="space-y-2.5">
              {subjectDrills.map((chall, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleLaunch(chall.topic)}
                  className={`w-full text-left p-3.5 rounded-xl border transition-colors group cursor-pointer ${
                    isLight
                      ? 'border-slate-200 hover:border-amber-500 bg-white'
                      : 'border-slate-700/70 hover:border-amber-400/60 bg-slate-900/40'
                  }`}
                >
                  <div
                    className={`flex items-center justify-between text-[10px] font-mono mb-1 ${
                      isLight ? 'text-amber-800' : 'text-amber-400'
                    }`}
                  >
                    <span>ICSE Class 7</span>
                    <span
                      className={`px-2 py-0.5 rounded-md border font-semibold ${
                        isLight
                          ? 'bg-amber-50 border-amber-300 text-amber-900'
                          : 'bg-amber-500/10 border-amber-500/30'
                      }`}
                    >
                      {chall.badge}
                    </span>
                  </div>
                  <div
                    className={`text-xs font-medium transition-colors ${
                      isLight
                        ? 'text-slate-800 group-hover:text-amber-800'
                        : 'text-slate-200 group-hover:text-amber-300'
                    }`}
                  >
                    {chall.topic}
                  </div>
                </button>
              ))}
            </div>

            <div
              className={`pt-3 border-t text-[11px] leading-relaxed flex items-start gap-2 ${
                isLight ? 'border-slate-200 text-slate-600' : 'border-slate-800 text-slate-400'
              }`}
            >
              <HelpCircle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
              <span>
                Your revision test (and interactive MCQ quiz) opens right below inside this studio with one-click <strong>Copy Test</strong> and <strong>Print</strong> buttons.
              </span>
            </div>
          </div>
        </div>
      </div>

      <div ref={outputRef}>
        <StudioOutputPanel
          isLight={isLight}
          title={generatedTopic || `ICSE Class 7 ${generatedSubject} Revision Test`}
          subtitle={`${format} · ${difficulty} Tier · ${questionCount} Questions`}
          isGenerating={isGenerating}
          streamingText={streamingText}
          result={studioResult}
          error={studioError}
          copyLabel="Copy Test"
          allowInteractiveQuiz
          onChallengeQuizAgain={(diff) => void runRevisionGeneration(generatedTopic, diff)}
          onSaveQuizAttempt={(rep, qData) => onSaveQuizAttempt?.(rep, qData, generatedSubject)}
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
