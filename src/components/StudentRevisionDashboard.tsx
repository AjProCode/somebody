import React, { useState } from 'react';
import {
  Zap,
  BookOpen,
  Sparkles,
  Printer,
  CheckCircle2,
  Clock,
  Layers,
  HelpCircle,
  Lightbulb
} from 'lucide-react';

interface StudentRevisionDashboardProps {
  isLight: boolean;
  activeSubject: string;
  onGeneratePrompt: (prompt: string, workflowType?: string) => void;
  onShowToast: (message: string, type?: 'info' | 'error' | 'success') => void;
}

export const StudentRevisionDashboard: React.FC<StudentRevisionDashboardProps> = ({
  isLight,
  activeSubject,
  onGeneratePrompt,
  onShowToast
}) => {
  const [topic, setTopic] = useState('');
  const [focusArea, setFocusArea] = useState<'formulas_theorems' | 'common_pitfalls' | 'complete_summary' | 'rapid_mcqs'>(
    'complete_summary'
  );

  const focusDescriptions = {
    complete_summary: {
      name: '5-Minute High-Yield Chapter Summary',
      desc: 'Core definitions, key laws, and memory anchors in bullet points'
    },
    formulas_theorems: {
      name: 'Formula & Theorem Formula Sheet',
      desc: 'All governing formulas with variable definitions and SI units'
    },
    common_pitfalls: {
      name: 'Top 5 Exam Pitfalls & Trap Avoidance',
      desc: 'Common mistakes students make on school exams and how to avoid them'
    },
    rapid_mcqs: {
      name: '60-Second Rapid Recall Checks',
      desc: 'Short conceptual questions to test active recall before walking into exam'
    }
  };

  const handleGenerate = () => {
    const cleanTopic = topic.trim() || `Class 7 ${activeSubject} Core Revision`;
    const focus = focusDescriptions[focusArea];

    const prompt = `[5-MINUTE ICSE EXAM MASTERY REVISION STUDIO]
Create a concise, high-yield 5-Minute ICSE Exam Revision Card for Class 7 in ${activeSubject}:
- Board: ICSE (CISCE) ONLY
- Chapter/Topic: "${cleanTopic}"
- Focus: ${focus.name} (${focus.desc})
- Target Standard: Seth M.R. Jaipuria School ICSE (CISCE) Examination Standards

Structure the revision sheet into 4 sharp, high-retention sections:
1. **Core Concept in 60 Seconds**:
   - The foundational definition or law explained in simple, memorable language.
   - LaTeX mathematical / scientific relationship: \\( ... \\)
2. **Key Formulas, Symbols & SI Units**:
   - Clean Markdown summary table of all variables, symbols, and units.
3. **🚨 Top 3 Class 7 Exam Pitfalls (Don't Lose Marks Here!)**:
   - The 3 exact conceptual mistakes students commonly make in ${activeSubject} exams and the quick memory check to avoid them.
4. **💡 Medhavi 30-Second Practice Problem**:
   - One high-probability exam question worked out step-by-step with the final answer highlighted.`;

    onGeneratePrompt(prompt, 'exam_revision');
    onShowToast(`Generating 5-minute revision card for "${cleanTopic}"...`, 'info');
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header Banner */}
      <div className={`editorial-surface rounded-xl p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border ${
        isLight ? 'border-[#0B2559]/12 text-[#0B2559]' : 'border-[#F5B700]/20 text-slate-100'
      }`}>
        <div className="space-y-1.5">
          <div className={`flex items-center gap-2 text-xs font-mono uppercase tracking-wider font-semibold ${isLight ? 'text-[#0B2559]/75' : 'text-[#F5B700]'}`}>
            <Zap className="w-3.5 h-3.5 text-[#F5B700]" />
            <span>Scholar Studio · 5-Minute Exam Mastery &amp; Flash Revision</span>
          </div>
          <h1 className={`text-2xl sm:text-3xl font-bold font-display ${isLight ? 'text-[#0B2559]' : 'text-slate-100'}`}>
            5-Minute Quick Revision Studio
          </h1>
          <p className={`text-sm max-w-2xl ${isLight ? 'text-[#0B2559]/75' : 'text-slate-400'}`}>
            Distill any Class 7 chapter into high-retention memory cards, formula cheat-sheets, and common exam trap alerts before your school assessments.
          </p>
        </div>

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
          <span>Print Card</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Controls */}
        <div className="lg:col-span-2 space-y-5">
          <div className={`editorial-surface rounded-xl p-6 space-y-5 border ${
            isLight ? 'border-[#0B2559]/12 text-[#0B2559]' : 'border-[#F5B700]/20 text-slate-100'
          }`}>
            {/* Topic Input */}
            <div className="space-y-2">
              <label htmlFor="rev-topic" className={`block text-xs font-mono uppercase font-medium ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                Chapter or Topic to Revise
              </label>
              <input
                id="rev-topic"
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder={`e.g., Heat Transfer & Thermometers, Triangle Theorems, or Python Loops`}
                className={`w-full px-4 py-3 rounded-xl border text-sm outline-none transition-all ${
                  isLight
                    ? 'bg-white border-slate-300 text-slate-900 focus:border-amber-500 focus:ring-1 focus:ring-amber-500'
                    : 'bg-slate-900/80 border-slate-700/80 text-slate-100 focus:border-amber-400'
                }`}
              />
            </div>

            {/* Revision Focus Mode */}
            <div className="space-y-2">
              <label className={`block text-xs font-mono uppercase font-medium ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                Revision Focus Area
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(Object.keys(focusDescriptions) as Array<keyof typeof focusDescriptions>).map((key) => {
                  const item = focusDescriptions[key];
                  const selected = focusArea === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setFocusArea(key)}
                      className={`p-3.5 rounded-xl border text-left transition-all relative ${
                        selected
                          ? (isLight
                              ? 'border-emerald-500 bg-emerald-50 text-slate-900 shadow-sm ring-1 ring-emerald-500/30'
                              : 'border-emerald-400/80 bg-emerald-500/15 shadow-[0_0_15px_rgba(16,185,129,0.15)]')
                          : (isLight
                              ? 'border-slate-200 hover:border-slate-300 bg-white shadow-xs'
                              : 'border-slate-700/70 hover:border-slate-600 bg-slate-900/40')
                      }`}
                    >
                      <div className={`text-xs font-semibold ${
                        selected
                          ? (isLight ? 'text-emerald-900' : 'text-emerald-300')
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

            {/* Generate Action Button */}
            <button
              type="button"
              onClick={handleGenerate}
              className="w-full flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl font-bold text-sm bg-[#F5B700] text-[#0B2559] hover:bg-[#E0A800] transition-colors cursor-pointer"
            >
              <Zap className="w-4 h-4 fill-current" />
              <span>Generate 5-Minute Class 7 Revision Card</span>
            </button>
          </div>
        </div>

        {/* Right Col: Tips Card */}
        <div className="space-y-5">
          <div className={`editorial-surface rounded-xl p-5 border space-y-4 ${
            isLight ? 'border-[#0B2559]/12 text-[#0B2559]' : 'border-[#F5B700]/20 text-slate-100'
          }`}>
            <h3 className="text-xs font-mono uppercase tracking-wider text-amber-500 font-bold flex items-center gap-1.5">
              <Lightbulb className="w-4 h-4" />
              <span>Medhavi Exam Tips</span>
            </h3>

            <div className={`space-y-3 text-xs ${isLight ? 'text-slate-800' : 'text-slate-300'}`}>
              <div className={`p-3 rounded-xl border space-y-1 ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/60 border-slate-800'
              }`}>
                <div className={`font-semibold ${isLight ? 'text-emerald-900 font-bold' : 'text-emerald-300'}`}>Active Recall First</div>
                <div className={`text-[11px] ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                  Read the core rule once, cover the card, and state the definition out loud or write it on scratch paper.
                </div>
              </div>

              <div className={`p-3 rounded-xl border space-y-1 ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/60 border-slate-800'
              }`}>
                <div className={`font-semibold ${isLight ? 'text-amber-900 font-bold' : 'text-amber-300'}`}>Check Your Units</div>
                <div className={`text-[11px] ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                  Always verify if the answer requires standard units (cm², m/s, °C, ₹) before submitting your paper.
                </div>
              </div>
            </div>

            <div className={`pt-2 border-t text-[11px] flex items-center gap-1.5 ${
              isLight ? 'border-slate-200 text-slate-600' : 'border-slate-800 text-slate-400'
            }`}>
              <HelpCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span>Revision cards are saved in your chat session and can be printed as wallet-sized study slips.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
