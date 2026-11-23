import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Award,
  CheckCircle2,
  AlertTriangle,
  Upload,
  FileCheck,
  Sparkles,
  ClipboardList,
  Printer,
  Copy,
  Check,
  HelpCircle,
  Paperclip,
  Loader2
} from 'lucide-react';
import {
  parseMedhaviResponse,
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

interface TeacherEvaluationDashboardProps {
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

export const TeacherEvaluationDashboard: React.FC<TeacherEvaluationDashboardProps> = ({
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
  const [questionPrompt, setQuestionPrompt] = useState('');
  const [maxMarks, setMaxMarks] = useState<number>(5);
  const [modelAnswer, setModelAnswer] = useState('');
  const [studentSubmission, setStudentSubmission] = useState('');
  const [attachedPhoto, setAttachedPhoto] = useState<string | null>(null);
  const [photoName, setPhotoName] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [studioResult, setStudioResult] = useState<StudioExecutionResult | null>(null);
  const [studioError, setStudioError] = useState<string | null>(null);
  const [lastEvalSubject, setLastEvalSubject] = useState(activeSubject);
  const [historyEntries, setHistoryEntries] = useState<StudioHistoryEntry[]>(() =>
    loadStudioHistory('evaluator', 'teacher')
  );
  const [activeHistoryId, setActiveHistoryId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const outputRef = useRef<HTMLDivElement | null>(null);

  const refreshHistory = useCallback(() => {
    setHistoryEntries(loadStudioHistory('evaluator', 'teacher'));
  }, []);

  useEffect(() => {
    refreshHistory();
    window.addEventListener(STUDIO_HISTORY_EVENT, refreshHistory);
    return () => window.removeEventListener(STUDIO_HISTORY_EVENT, refreshHistory);
  }, [refreshHistory]);

  const restoreFromHistory = useCallback(
    (entry: StudioHistoryEntry, scrollToOutput = true) => {
      const snap = entry.inputsSnapshot || {};
      if (typeof snap.questionPrompt === 'string') setQuestionPrompt(snap.questionPrompt);
      if (typeof snap.maxMarks === 'number') setMaxMarks(snap.maxMarks);
      if (typeof snap.modelAnswer === 'string') setModelAnswer(snap.modelAnswer);
      if (typeof snap.studentSubmission === 'string') setStudentSubmission(snap.studentSubmission);
      setAttachedPhoto(null);
      setPhotoName('');
      setLastEvalSubject(entry.subject || activeSubject);
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
    if (initialHistoryEntry && initialHistoryEntry.studioId === 'evaluator') {
      restoreFromHistory(initialHistoryEntry, true);
    }
  }, [initialHistoryEntry, restoreFromHistory]);

  const sampleProblems = [
    {
      title: 'Class 7 Maths • Exterior Angle Theorem',
      question: 'An exterior angle of a triangle measures 120° and one of the interior opposite angles is 45°. Find the other interior opposite angle, stating the governing theorem.',
      marks: 5,
      submission: 'Exterior angle = sum of opposite interior angles\n120 = 45 + x\nx = 120 - 45 = 75 degrees.'
    },
    {
      title: 'Class 7 Science • Heat Transfer',
      question: 'Explain why clinical thermometers have a kink/constriction and why they cannot be sterilized in boiling water.',
      marks: 4,
      submission: 'The kink stops mercury from falling down immediately so we can read body temperature easily. It cannot be put in boiling water because range is only 35 to 42 C, so boiling water at 100 C will break the glass.'
    }
  ];

  const handleApplySample = (sample: typeof sampleProblems[0]) => {
    setQuestionPrompt(sample.question);
    setMaxMarks(sample.marks);
    setStudentSubmission(sample.submission);
    onShowToast(`Loaded sample: ${sample.title}`, 'info');
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      onShowToast('Image exceeds 8 MB size limit.', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setAttachedPhoto(reader.result as string);
      setPhotoName(file.name);
      onShowToast(`Attached answer sheet photo "${file.name}"`, 'success');
    };
    reader.readAsDataURL(file);
  };

  const handleEvaluate = async () => {
    if (isGenerating) return;
    const cleanQ = questionPrompt.trim();
    const cleanSub = studentSubmission.trim();

    if (!cleanQ) {
      onShowToast('Please provide the Question / Problem text first.', 'error');
      return;
    }
    if (!cleanSub && !attachedPhoto) {
      onShowToast('Please provide either the student text response or attach a photo.', 'error');
      return;
    }

    const inferredSubject = inferGrade7Subject(`${cleanQ} ${cleanSub}`) || activeSubject;
    setLastEvalSubject(inferredSubject);

    const prompt = `[TEACHER ICSE ANSWER EVALUATION STUDIO]
Evaluate this ICSE Class 7 student answer submission against Seth M.R. Jaipuria School ICSE (CISCE) step-marking standards:
- Board: ICSE (CISCE) ONLY
- Subject: ${inferredSubject}
- Grade: Class 7 (Strictly Calibrated)
- Question / Problem: "${cleanQ}"
- Maximum Marks: ${maxMarks}
${modelAnswer.trim() ? `- Expected Model Answer / Marking Key: "${modelAnswer.trim()}"` : ''}
${cleanSub ? `- Student Submission Text:\n"""\n${cleanSub}\n"""` : ''}
${attachedPhoto ? `- Note: The student handwritten answer sheet has also been provided as an attached image inspection.` : ''}

Strictly output your evaluation in this format:
1. Wrap the machine-readable evaluation JSON inside <medhavi_evaluation>...</medhavi_evaluation> tags matching the EvaluationResult schema:
   {
     "suggestedScore": number (out of ${maxMarks}),
     "maxMarks": ${maxMarks},
     "confidence": "High" | "Moderate",
     "rubric": [
       {"criterion": "Concept Accuracy", "score": number, "maxScore": number},
       {"criterion": "Step-by-Step Logic", "score": number, "maxScore": number},
       {"criterion": "Notation & SI Units", "score": number, "maxScore": number},
       {"criterion": "Presentation & Working", "score": number, "maxScore": number}
     ],
     "strengths": ["string"],
     "missingConcepts": ["string"],
     "errors": ["string"],
     "improvementSteps": ["string"],
     "teacherComment": "string"
   }
2. Followed by a detailed Socratic report highlighting:
   - What the Class 7 scholar did correctly
   - Step-by-step point deductions with reasoning
   - How to achieve full marks (${maxMarks}/${maxMarks})
   - A ready-to-write constructive comment for the student copy.`;

    setIsGenerating(true);
    setStreamingText('');
    setStudioResult(null);
    setStudioError(null);
    onShowToast(`Evaluating Class 7 ${inferredSubject} response (${maxMarks} marks)...`, 'info');
    setTimeout(() => outputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);

    try {
      const result = await executeStudioWorkflow({
        prompt,
        role: 'teacher',
        subject: inferredSubject,
        workflowType: 'answer_evaluator',
        verifiedIdentity,
        selectedModel,
        customSpecs,
        intelligenceMode,
        imageDataUrl: attachedPhoto,
        onDelta: (partial) => setStreamingText(partial)
      });
      setStudioResult(result);
      const parsedEval = parseMedhaviResponse(result.content || '').evaluationData;
      const scoreBadge = parsedEval
        ? `${parsedEval.suggestedScore}/${parsedEval.maxMarks} Marks · ${parsedEval.confidence}`
        : `${maxMarks} Marks Rubric`;
      const saved = saveStudioHistoryEntry({
        studioId: 'evaluator',
        role: 'teacher',
        ownerId: verifiedIdentity?.schoolId || 'faculty',
        title: cleanQ.slice(0, 72),
        subtitle: scoreBadge,
        subject: inferredSubject,
        inputsSnapshot: {
          questionPrompt: cleanQ,
          maxMarks,
          modelAnswer: modelAnswer.trim(),
          studentSubmission: cleanSub
        },
        result
      });
      setActiveHistoryId(saved.id);
      refreshHistory();
      onStudioEntrySaved?.(saved);
      onShowToast('Rubric evaluation completed & saved to Evaluator History.', 'success');
    } catch (err: any) {
      const msg = err?.message || 'Evaluation failed.';
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
        isLight
          ? 'border-[#0B2559]/12 text-[#0B2559]'
          : 'border-[#F5B700]/20 text-slate-100'
      }`}>
        <div className="space-y-1.5">
          <div className={`flex items-center gap-2 text-xs font-mono uppercase tracking-wider font-semibold ${isLight ? 'text-[#0B2559]/75' : 'text-[#F5B700]'}`}>
            <Award className="w-3.5 h-3.5 text-[#F5B700]" />
            <span>Faculty Studio · AI Answer Evaluator &amp; Rubric Grader</span>
          </div>
          <h1 className={`text-2xl sm:text-3xl font-bold font-display ${isLight ? 'text-[#0B2559]' : 'text-slate-100'}`}>
            AI-Assisted Answer Sheet Evaluator
          </h1>
          <p className={`text-sm max-w-2xl ${isLight ? 'text-[#0B2559]/75' : 'text-slate-400'}`}>
            Grade Class 7 student answers with step-by-step rubric breakdowns, identify missing reasoning steps, and generate constructive report-card comments instantly for Seth M.R. Jaipuria School.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => handleApplySample(sampleProblems[0])}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
              isLight
                ? 'border-[#0B2559]/20 bg-white hover:border-[#0B2559] text-[#0B2559]'
                : 'border-slate-700/80 hover:border-[#F5B700]/60 text-slate-200'
            }`}
          >
            <ClipboardList className="w-3.5 h-3.5 text-[#F5B700]" />
            <span>Load Sample Answer</span>
          </button>
        </div>
      </div>

      <StudioHistoryPanel
        isLight={isLight}
        studioName="Answer Evaluator"
        entries={historyEntries}
        activeEntryId={activeHistoryId}
        emptyHint="No past answer evaluations in this studio yet. Graded submissions and 4-pillar rubrics save here automatically."
        onSelectEntry={(entry) => {
          restoreFromHistory(entry, true);
          onShowToast(`Loaded evaluation "${entry.title}" inside studio.`, 'info');
        }}
        onDeleteEntry={(id) => {
          deleteStudioHistoryEntry(id);
          if (activeHistoryId === id) {
            setActiveHistoryId(null);
          }
          refreshHistory();
          onStudioEntryDeleted?.(id);
          onShowToast('Removed evaluation from Answer Evaluator history.', 'info');
        }}
        onClearAll={() => {
          const removed = clearStudioHistory('evaluator', 'teacher');
          setActiveHistoryId(null);
          refreshHistory();
          onStudioHistoryCleared?.(removed.map((r) => r.id));
          onShowToast('Cleared Answer Evaluator history.', 'info');
        }}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Form Inputs */}
        <div className="lg:col-span-2 space-y-5">
          <div className={`editorial-surface rounded-xl p-6 space-y-5 border ${
            isLight
              ? 'border-[#0B2559]/12 text-[#0B2559]'
              : 'border-[#F5B700]/20 text-slate-100'
          }`}>
            {/* Question Input */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="eval-q" className={`block text-xs font-mono uppercase ${isLight ? 'text-slate-600 font-semibold' : 'text-slate-400'}`}>
                  Question / Assessment Item
                </label>
                <div className="flex items-center gap-2 text-xs">
                  <span className={isLight ? 'text-slate-600' : 'text-slate-400'}>Max Marks:</span>
                  <select
                    value={maxMarks}
                    onChange={(e) => setMaxMarks(Number(e.target.value))}
                    className={`rounded-lg px-2 py-0.5 text-xs font-bold outline-none border ${
                      isLight
                        ? 'bg-slate-50 border-slate-300 text-amber-800'
                        : 'bg-slate-900 border-slate-700 text-amber-400'
                    }`}
                  >
                    {[2, 3, 4, 5, 8, 10, 15, 20].map((m) => (
                      <option key={m} value={m}>
                        {m} Marks
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <textarea
                id="eval-q"
                rows={3}
                value={questionPrompt}
                onChange={(e) => setQuestionPrompt(e.target.value)}
                placeholder="Paste the question or problem assigned to Class 7 students..."
                className={`w-full px-4 py-3 rounded-xl border text-sm outline-none transition-all ${
                  isLight
                    ? 'bg-white border-slate-300 text-slate-900 focus:border-emerald-500 shadow-xs'
                    : 'bg-slate-900/80 border-slate-700/80 text-slate-100 focus:border-amber-400'
                }`}
              />
            </div>

            {/* Optional Model Answer */}
            <div className="space-y-1.5">
              <label htmlFor="eval-model" className={`block text-xs font-mono uppercase ${isLight ? 'text-slate-600 font-semibold' : 'text-slate-400'}`}>
                Optional Expected Solution / Marking Key
              </label>
              <input
                id="eval-model"
                type="text"
                value={modelAnswer}
                onChange={(e) => setModelAnswer(e.target.value)}
                placeholder="e.g., Exterior angle equals sum of interior opposite angles; final answer 75°."
                className={`w-full px-4 py-2.5 rounded-xl border text-xs outline-none transition-all ${
                  isLight
                    ? 'bg-white border-slate-300 text-slate-900 focus:border-emerald-500 shadow-xs'
                    : 'bg-slate-900/80 border-slate-700/80 text-slate-200 focus:border-amber-400'
                }`}
              />
            </div>

            {/* Student Submission Input */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="eval-sub" className={`block text-xs font-mono uppercase ${isLight ? 'text-slate-600 font-semibold' : 'text-slate-400'}`}>
                  Student Submission (Typed or Uploaded Photo)
                </label>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className={`flex items-center gap-1.5 text-xs transition-colors font-medium ${
                    isLight ? 'text-emerald-700 hover:text-emerald-800' : 'text-amber-400 hover:text-amber-300'
                  }`}
                >
                  <Paperclip className="w-3.5 h-3.5" />
                  <span>{attachedPhoto ? 'Replace Photo' : 'Attach Photo of Copy'}</span>
                </button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
              />

              {attachedPhoto && (
                <div className={`p-3 rounded-xl border flex items-center justify-between ${
                  isLight ? 'border-emerald-300 bg-emerald-50/80' : 'border-emerald-500/40 bg-emerald-500/10'
                }`}>
                  <div className={`flex items-center gap-2 text-xs truncate ${isLight ? 'text-emerald-900 font-medium' : 'text-emerald-300'}`}>
                    <FileCheck className="w-4 h-4 shrink-0" />
                    <span className="truncate">{photoName || 'Handwritten Answer Sheet Attached'}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setAttachedPhoto(null);
                      setPhotoName('');
                    }}
                    className={`text-xs font-medium ${isLight ? 'text-rose-600 hover:text-rose-700' : 'text-rose-400 hover:text-rose-300'}`}
                  >
                    Remove
                  </button>
                </div>
              )}

              <textarea
                id="eval-sub"
                rows={5}
                value={studentSubmission}
                onChange={(e) => setStudentSubmission(e.target.value)}
                placeholder="Paste the student's exact written solution, steps, or explanation..."
                className={`w-full px-4 py-3 rounded-xl border text-sm outline-none transition-all font-mono text-xs ${
                  isLight
                    ? 'bg-white border-slate-300 text-slate-900 focus:border-emerald-500 shadow-xs'
                    : 'bg-slate-900/80 border-slate-700/80 text-slate-100 focus:border-amber-400'
                }`}
              />
            </div>

            {/* Evaluate Button */}
            <button
              type="button"
              disabled={isGenerating}
              onClick={handleEvaluate}
              className="w-full flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl font-bold text-sm bg-[#F5B700] text-[#0B2559] hover:bg-[#E0A800] disabled:opacity-60 transition-colors cursor-pointer"
            >
              {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              <span>
                {isGenerating
                  ? 'Evaluating Submission Inside Studio…'
                  : 'Evaluate Submission & Generate Rubric Scores'}
              </span>
            </button>
          </div>
        </div>

        {/* Right Col: Grading Standard Info */}
        <div className="space-y-5">
          <div className={`editorial-surface rounded-xl p-5 border space-y-4 ${
            isLight
              ? 'border-[#0B2559]/12 text-[#0B2559]'
              : 'border-[#F5B700]/20 text-slate-100'
          }`}>
            <h3 className={`text-xs font-mono uppercase tracking-wider flex items-center gap-1.5 ${
              isLight ? 'text-emerald-800 font-bold' : 'text-amber-400'
            }`}>
              <Award className="w-4 h-4" />
              <span>Jaipuria 4-Pillar Rubric</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div className={`p-3 rounded-xl border space-y-1 ${
                isLight ? 'bg-emerald-50/70 border-emerald-200 text-slate-800' : 'bg-slate-900/60 border-slate-800 text-slate-300'
              }`}>
                <div className={`font-semibold ${isLight ? 'text-emerald-900' : 'text-emerald-300'}`}>1. Concept Accuracy</div>
                <div className={`text-[11px] ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                  Verifies if the student accurately invoked the Class 7 theorem, scientific principle, or formula.
                </div>
              </div>

              <div className={`p-3 rounded-xl border space-y-1 ${
                isLight ? 'bg-amber-50/70 border-amber-200 text-slate-800' : 'bg-slate-900/60 border-slate-800 text-slate-300'
              }`}>
                <div className={`font-semibold ${isLight ? 'text-amber-900' : 'text-amber-300'}`}>2. Stepwise Logic</div>
                <div className={`text-[11px] ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                  Rewards deductive flow, algebraic transposition, and penalizes unstated jumps.
                </div>
              </div>

              <div className={`p-3 rounded-xl border space-y-1 ${
                isLight ? 'bg-sky-50/70 border-sky-200 text-slate-800' : 'bg-slate-900/60 border-slate-800 text-slate-300'
              }`}>
                <div className={`font-semibold ${isLight ? 'text-sky-900' : 'text-sky-300'}`}>3. Notation &amp; Units</div>
                <div className={`text-[11px] ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                  Checks SI units (°C, m/s, cm²), geometric symbol notation (△, ∠), and neat boxing.
                </div>
              </div>
            </div>

            <div className={`pt-2 border-t text-[11px] flex items-center gap-1.5 ${
              isLight ? 'border-slate-200 text-slate-500' : 'border-slate-800 text-slate-400'
            }`}>
              <HelpCircle className={`w-3.5 h-3.5 shrink-0 ${isLight ? 'text-emerald-600' : 'text-amber-400'}`} />
              <span>Evaluation results, 4-pillar rubric bars, and copybook comments render right inside this studio.</span>
            </div>
          </div>
        </div>
      </div>

      <div ref={outputRef}>
        <StudioOutputPanel
          isLight={isLight}
          title={`Answer Sheet Evaluation · Class 7 ${lastEvalSubject}`}
          subtitle={`Max Marks: ${maxMarks} · CISCE 4-Pillar Step-Marking Rubric`}
          isGenerating={isGenerating}
          streamingText={streamingText}
          result={studioResult}
          error={studioError}
          copyLabel="Copy Report"
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
