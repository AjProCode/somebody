import React, { useMemo, useState } from 'react';
import {
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Loader2,
  Printer,
  RotateCcw,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Award,
  X
} from 'lucide-react';
import {
  parseMedhaviResponse,
  type QuizData,
  type RevisionPerformanceReport
} from '../utils/medhaviEngine';
import { renderScholarlyMarkdown } from '../utils/markdownRenderer';
import type { StudioExecutionResult } from '../utils/studioRunner';
import { RevisionQuizView } from './RevisionQuizView';

interface StudioOutputPanelProps {
  isLight: boolean;
  title: string;
  subtitle?: string;
  isGenerating: boolean;
  streamingText: string;
  result: StudioExecutionResult | null;
  error?: string | null;
  copyLabel?: string;
  allowInteractiveQuiz?: boolean;
  onChallengeQuizAgain?: (difficulty?: QuizData['difficulty']) => void;
  onSaveQuizAttempt?: (report: RevisionPerformanceReport, quiz: QuizData) => void;
  onClear?: () => void;
  onShowToast?: (message: string, type?: 'info' | 'error' | 'success') => void;
}

export const StudioOutputPanel: React.FC<StudioOutputPanelProps> = ({
  isLight,
  title,
  subtitle,
  isGenerating,
  streamingText,
  result,
  error,
  copyLabel = 'Copy Output',
  allowInteractiveQuiz = false,
  onChallengeQuizAgain,
  onSaveQuizAttempt,
  onClear,
  onShowToast
}) => {
  const [showLogic, setShowLogic] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedComment, setCopiedComment] = useState(false);

  const rawContent = result?.content || streamingText;
  const parsed = useMemo(() => parseMedhaviResponse(rawContent || ''), [rawContent]);

  if (!isGenerating && !rawContent && !error) {
    return null;
  }

  const borderTone = isLight ? 'border-[#0B2559]/15' : 'border-[#F5B700]/25';
  const mutedInk = isLight ? 'text-slate-600' : 'text-slate-400';

  const handleCopy = async (textToCopy: string, isTeacherComment = false) => {
    try {
      await navigator.clipboard.writeText(textToCopy);
      if (isTeacherComment) {
        setCopiedComment(true);
        setTimeout(() => setCopiedComment(false), 1800);
        onShowToast?.('Copied teacher comment to clipboard.', 'success');
      } else {
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
        onShowToast?.(`${copyLabel} copied to clipboard.`, 'success');
      }
    } catch {
      onShowToast?.('Clipboard copy failed. Select text manually.', 'error');
    }
  };

  return (
    <section
      aria-live="polite"
      className={`editorial-surface rounded-xl border p-5 sm:p-7 space-y-5 transition-colors ${borderTone} ${
        isLight ? 'text-[#0B2559]' : 'text-slate-100'
      }`}
    >
      {/* Header Bar */}
      <div
        className={`flex flex-wrap items-center justify-between gap-3 pb-4 border-b ${
          isLight ? 'border-[#0B2559]/10' : 'border-slate-800'
        }`}
      >
        <div className="space-y-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-xs font-mono uppercase tracking-wider font-semibold">
            {isGenerating ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#F5B700]" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 text-[#F5B700]" />
            )}
            <span className={isLight ? 'text-[#0B2559]/80' : 'text-[#F5B700]'}>
              {isGenerating ? 'Streaming Inside Studio…' : 'Studio Result Ready'}
            </span>
            {result?.durationSeconds !== undefined && !isGenerating && (
              <span className={`font-mono text-[11px] normal-case ${mutedInk}`}>
                · {result.durationSeconds}s
              </span>
            )}
          </div>
          <h2 className="text-lg sm:text-xl font-bold font-display truncate">{title}</h2>
          {subtitle && <p className={`text-xs ${mutedInk}`}>{subtitle}</p>}
        </div>

        <div className="flex flex-wrap items-center gap-2 no-print">
          {parsed.logicSummary.length > 0 && (
            <button
              type="button"
              onClick={() => setShowLogic((prev) => !prev)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-mono font-semibold border transition-colors cursor-pointer ${
                isLight
                  ? 'border-slate-200 bg-white text-[#0B2559] hover:border-[#0B2559]'
                  : 'border-slate-700 bg-slate-900/60 text-slate-200 hover:border-amber-400'
              }`}
            >
              <span>Reasoning Steps</span>
              {showLogic ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          )}

          {!isGenerating && parsed.cleanMarkdown && (
            <>
              <button
                type="button"
                onClick={() => handleCopy(parsed.cleanMarkdown)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                  isLight
                    ? 'border-slate-200 bg-white text-[#0B2559] hover:border-[#0B2559]'
                    : 'border-slate-700 bg-slate-900/60 text-slate-200 hover:border-amber-400'
                }`}
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : copyLabel}</span>
              </button>

              <button
                type="button"
                onClick={() => window.print()}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                  isLight
                    ? 'border-slate-200 bg-white text-[#0B2559] hover:border-[#0B2559]'
                    : 'border-slate-700 bg-slate-900/60 text-slate-200 hover:border-amber-400'
                }`}
              >
                <Printer className="w-3.5 h-3.5 text-[#F5B700]" />
                <span>Print</span>
              </button>
            </>
          )}

          {!isGenerating && onClear && (
            <button
              type="button"
              onClick={onClear}
              aria-label="Clear studio output"
              className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                isLight
                  ? 'border-slate-200 text-slate-500 hover:text-[#0B2559] bg-white'
                  : 'border-slate-700 text-slate-400 hover:text-slate-100 bg-slate-900/60'
              }`}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-4 flex items-start gap-3 text-xs sm:text-sm text-rose-500">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-semibold">Studio Execution Error</div>
            <p className="opacity-90">{error}</p>
          </div>
        </div>
      )}

      {/* Collapsible Reasoning Steps */}
      {showLogic && parsed.logicSummary.length > 0 && (
        <div
          className={`p-4 rounded-xl border text-xs space-y-1.5 ${
            isLight
              ? 'border-slate-200 bg-slate-50 text-slate-800'
              : 'border-slate-800 bg-slate-950/60 text-slate-200'
          }`}
        >
          <div className="font-mono font-bold text-[11px] text-amber-500 uppercase tracking-wider">
            Pedagogical Reasoning Chain
          </div>
          <ol className="list-decimal pl-4 space-y-1">
            {parsed.logicSummary.map((step, idx) => (
              <li key={idx}>{step}</li>
            ))}
          </ol>
        </div>
      )}

      {/* Structured 4-Pillar Evaluation Scorecard (for Answer Evaluator Studio) */}
      {parsed.evaluationData && (
        <div className="space-y-4">
          <div className="rounded-xl bg-[#0B2559] text-white p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 tabular-nums">
              <div className="flex items-center gap-2.5">
                <Award className="w-5 h-5 text-[#F5B700] shrink-0" />
                <div>
                  <div className="text-[11px] font-mono uppercase tracking-wider text-white/75">
                    CISCE Rubric Assessment
                  </div>
                  <h3 className="text-xl font-bold font-display">
                    Suggested Score: {parsed.evaluationData.suggestedScore} /{' '}
                    {parsed.evaluationData.maxMarks}
                  </h3>
                </div>
              </div>
              <span className="px-3 py-1 rounded-lg bg-white/10 text-xs font-mono font-semibold">
                Confidence: {parsed.evaluationData.confidence}
              </span>
            </div>

            {Array.isArray(parsed.evaluationData.rubric) && parsed.evaluationData.rubric.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {parsed.evaluationData.rubric.map((item, idx) => {
                  const pct =
                    item.maxScore > 0
                      ? Math.max(0, Math.min(100, Math.round((item.score / item.maxScore) * 100)))
                      : 0;
                  return (
                    <div key={idx} className="rounded-lg bg-white/8 p-3 space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-medium tabular-nums">
                        <span>{item.criterion}</span>
                        <span className="font-mono font-bold text-[#F5B700]">
                          {item.score} / {item.maxScore}
                        </span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-white/15 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[#F5B700] transition-all duration-300"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            {parsed.evaluationData.strengths?.length > 0 && (
              <div
                className={`rounded-xl border p-4 space-y-2 ${
                  isLight ? 'bg-emerald-50/70 border-emerald-200' : 'bg-emerald-500/10 border-emerald-500/30'
                }`}
              >
                <div className="font-semibold flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Strengths</span>
                </div>
                <ul className="list-disc pl-4 space-y-1">
                  {parsed.evaluationData.strengths.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
            )}

            {(parsed.evaluationData.errors?.length > 0 ||
              parsed.evaluationData.missingConcepts?.length > 0) && (
              <div
                className={`rounded-xl border p-4 space-y-2 ${
                  isLight ? 'bg-amber-50/70 border-amber-200' : 'bg-amber-500/10 border-amber-500/30'
                }`}
              >
                <div className="font-semibold flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Missing Concepts &amp; Deductions</span>
                </div>
                <ul className="list-disc pl-4 space-y-1">
                  {parsed.evaluationData.missingConcepts?.map((m, i) => (
                    <li key={`m-${i}`}>{m}</li>
                  ))}
                  {parsed.evaluationData.errors?.map((e, i) => (
                    <li key={`e-${i}`}>{e}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {parsed.evaluationData.improvementSteps?.length > 0 && (
            <div
              className={`rounded-xl border p-4 text-xs space-y-1.5 ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/60 border-slate-800'
              }`}
            >
              <div className="font-semibold">Next Improvement Steps</div>
              <ol className="list-decimal pl-4 space-y-1">
                {parsed.evaluationData.improvementSteps.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ol>
            </div>
          )}

          {parsed.evaluationData.teacherComment && (
            <div
              className={`rounded-xl border p-4 text-xs flex flex-wrap items-start justify-between gap-3 ${
                isLight ? 'bg-white border-slate-200' : 'bg-slate-950/60 border-slate-800'
              }`}
            >
              <div className="space-y-1 flex-1 min-w-0">
                <div className="font-mono uppercase text-[10px] tracking-wider text-amber-500 font-bold">
                  Ready-to-Write Copybook Remark
                </div>
                <p className="text-sm italic">"{parsed.evaluationData.teacherComment}"</p>
              </div>
              <button
                type="button"
                onClick={() => handleCopy(parsed.evaluationData!.teacherComment, true)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer no-print ${
                  isLight
                    ? 'border-slate-200 hover:border-[#0B2559] text-[#0B2559]'
                    : 'border-slate-700 hover:border-amber-400 text-slate-200'
                }`}
              >
                {copiedComment ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedComment ? 'Copied' : 'Copy Remark'}</span>
              </button>
            </div>
          )}

          <p className={`text-[11px] font-mono ${mutedInk}`}>
            Advisory: Teacher review recommended before marks are finalized.
          </p>
        </div>
      )}

      {/* Interactive MCQ Quiz Arena (for Student Revision Test Studio) */}
      {allowInteractiveQuiz && parsed.quizData && (
        <RevisionQuizView
          quiz={parsed.quizData}
          isLight={isLight}
          onChallengeAgain={(diff) => onChallengeQuizAgain?.(diff)}
          onSaveAttempt={onSaveQuizAttempt}
        />
      )}

      {/* Main Markdown + KaTeX Rendered Body */}
      {parsed.cleanMarkdown ? (
        <div className="medhavi-prose text-sm sm:text-base leading-relaxed">
          <div
            dangerouslySetInnerHTML={{
              __html: renderScholarlyMarkdown(parsed.cleanMarkdown)
            }}
          />
        </div>
      ) : (
        isGenerating && (
          <div className={`flex items-center gap-2.5 text-sm py-6 ${mutedInk}`}>
            <RotateCcw className="w-4 h-4 animate-spin text-[#F5B700]" />
            <span>Preparing ICSE Class 7 output inside this studio…</span>
          </div>
        )
      )}
    </section>
  );
};
