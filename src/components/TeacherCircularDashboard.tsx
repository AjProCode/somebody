import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  FileText,
  Languages,
  Printer,
  Sparkles,
  Send,
  Calendar,
  Building,
  HelpCircle,
  Mail,
  Loader2
} from 'lucide-react';
import {
  type CustomSpecItem,
  type IdVerificationResult,
  type IntelligenceMode
} from '../utils/medhaviEngine';
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

interface TeacherCircularDashboardProps {
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

export const TeacherCircularDashboard: React.FC<TeacherCircularDashboardProps> = ({
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
  const [circularType, setCircularType] = useState<'ptm' | 'exam_schedule' | 'revision' | 'project' | 'holiday'>('ptm');
  const [targetAudience, setTargetAudience] = useState<'parents' | 'students' | 'faculty'>('parents');
  const [customSubjectTitle, setCustomSubjectTitle] = useState('');
  const [specificDetails, setSpecificDetails] = useState('');
  const [refNumber, setRefNumber] = useState(() => `SMRJ/2026-27/CIR-${Math.floor(100 + Math.random() * 900)}`);
  const [isGenerating, setIsGenerating] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [studioResult, setStudioResult] = useState<StudioExecutionResult | null>(null);
  const [studioError, setStudioError] = useState<string | null>(null);
  const [generatedTitle, setGeneratedTitle] = useState('');
  const [historyEntries, setHistoryEntries] = useState<StudioHistoryEntry[]>(() =>
    loadStudioHistory('circular', 'teacher')
  );
  const [activeHistoryId, setActiveHistoryId] = useState<string | null>(null);
  const outputRef = useRef<HTMLDivElement | null>(null);

  const refreshHistory = useCallback(() => {
    setHistoryEntries(loadStudioHistory('circular', 'teacher'));
  }, []);

  useEffect(() => {
    refreshHistory();
    window.addEventListener(STUDIO_HISTORY_EVENT, refreshHistory);
    return () => window.removeEventListener(STUDIO_HISTORY_EVENT, refreshHistory);
  }, [refreshHistory]);

  const restoreFromHistory = useCallback((entry: StudioHistoryEntry, scrollToOutput = true) => {
    const snap = entry.inputsSnapshot || {};
    if (
      snap.circularType === 'ptm' ||
      snap.circularType === 'exam_schedule' ||
      snap.circularType === 'revision' ||
      snap.circularType === 'project' ||
      snap.circularType === 'holiday'
    ) {
      setCircularType(snap.circularType);
    }
    if (
      snap.targetAudience === 'parents' ||
      snap.targetAudience === 'students' ||
      snap.targetAudience === 'faculty'
    ) {
      setTargetAudience(snap.targetAudience);
    }
    if (typeof snap.customSubjectTitle === 'string') setCustomSubjectTitle(snap.customSubjectTitle);
    if (typeof snap.specificDetails === 'string') setSpecificDetails(snap.specificDetails);
    if (typeof snap.refNumber === 'string') setRefNumber(snap.refNumber);
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
    if (initialHistoryEntry && initialHistoryEntry.studioId === 'circular') {
      restoreFromHistory(initialHistoryEntry, true);
    }
  }, [initialHistoryEntry, restoreFromHistory]);

  const circularPresets = {
    ptm: {
      title: 'Class 7 Parent-Teacher Conference (PTM) & Term Progress Review',
      defaultDetails: 'Date: Saturday, 14th November 2026. Timing: 8:30 AM to 12:30 PM. Focus: ICSE (CISCE) Mid-term performance, Revision results, and student project portfolios.'
    },
    exam_schedule: {
      title: 'Class 7 Periodic Assessment-II & Mid-Term Examination Date-sheet',
      defaultDetails: 'Commencement from 24th November 2026. Includes standard ICSE (CISCE) exam guidelines, reporting time (7:45 AM), stationery rules, and prohibited items.'
    },
    revision: {
      title: 'Registration Open: National Science & Mathematics Revision Qualifier (Class 7)',
      defaultDetails: 'Inviting all Class 7 scholars for Jaipuria Medhavi Revision screening. Mock tests available on the portal. Last date of registration: 18th November 2026.'
    },
    project: {
      title: 'Inter-Disciplinary ICSE (CISCE) Winter Project Guidelines for Class 7',
      defaultDetails: 'Project combining Science (Heat & Temperature) and Mathematics (Data Handling). Submission deadline: 10th December 2026.'
    },
    holiday: {
      title: 'School Closure Notice on account of Academic Seminar / Public Holiday',
      defaultDetails: 'The school will remain closed on Friday. Online self-paced Medhavi study modules will remain active on the student portal.'
    }
  };

  const handleSelectPreset = (key: keyof typeof circularPresets) => {
    setCircularType(key);
    setCustomSubjectTitle(circularPresets[key].title);
    setSpecificDetails(circularPresets[key].defaultDetails);
  };

  const handleGenerate = async () => {
    if (isGenerating) return;
    const title = customSubjectTitle.trim() || circularPresets[circularType].title;
    const details = specificDetails.trim() || circularPresets[circularType].defaultDetails;

    const prompt = `[OFFICIAL SETH M.R. JAIPURIA SCHOOL BILINGUAL CIRCULAR STUDIO]
Draft an official bilingual circular for Seth M.R. Jaipuria School, Lucknow:
- Circular Ref No: ${refNumber}
- Grade Level: Class 7 Exclusive
- Target Audience: ${targetAudience.toUpperCase()}
- Subject: ${title}
- Key Specifics & Dates: "${details}"
- School Motto: "Tamso Ma Jyotirgamaya" (तमसो मा ज्योतिर्गमय)

Format the output strictly as an official school notice with:
1. **Institutional Header**:
   - "SETH M.R. JAIPURIA SCHOOL, LUCKNOW"
   - Motto: तमसो मा ज्योतिर्गमय
   - Circular Reference No: ${refNumber}
   - Date: 29th October 2026
2. **English Version (Full Formal Notice)**:
   - Salutation, Context & Purpose, Point-by-point details (timings, venue, guidelines), and Administrative Sign-off (Principal / Vice-Principal / Academic Coordinator).
3. **Hindi Version (हिन्दी अनुवाद - प्रामाणिक व गरिमामयी भाषा)**:
   - Synchronized formal translation into pure, scholarly Hindi suitable for Lucknow school administrative communications.
4. **Important Instructions for Parents / Scholars**:
   - Uniform, reporting time, ID card mandate, and portal support.`;

    setGeneratedTitle(title);
    setIsGenerating(true);
    setStreamingText('');
    setStudioResult(null);
    setStudioError(null);
    onShowToast(`Drafting bilingual circular: "${title.slice(0, 36)}..."`, 'info');
    setTimeout(() => outputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);

    try {
      const result = await executeStudioWorkflow({
        prompt,
        role: 'teacher',
        subject: activeSubject,
        workflowType: 'parent_circular_generator',
        verifiedIdentity,
        selectedModel,
        customSpecs,
        intelligenceMode,
        onDelta: (partial) => setStreamingText(partial)
      });
      setStudioResult(result);
      const audienceLabel =
        targetAudience === 'parents'
          ? 'Parents'
          : targetAudience === 'students'
          ? 'Scholars'
          : 'Faculty';
      const saved = saveStudioHistoryEntry({
        studioId: 'circular',
        role: 'teacher',
        ownerId: verifiedIdentity?.schoolId || 'faculty',
        title,
        subtitle: `Ref: ${refNumber} · ${audienceLabel}`,
        subject: activeSubject || 'Administration',
        inputsSnapshot: {
          circularType,
          targetAudience,
          customSubjectTitle: title,
          specificDetails: details,
          refNumber
        },
        result
      });
      setActiveHistoryId(saved.id);
      refreshHistory();
      onStudioEntrySaved?.(saved);
      onShowToast('Bilingual circular saved to Circular Studio History.', 'success');
    } catch (err: any) {
      const msg = err?.message || 'Circular drafting failed.';
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
            <Languages className="w-3.5 h-3.5 text-[#F5B700]" />
            <span>Faculty Studio · Bilingual Circular &amp; Administrative Notice Studio</span>
          </div>
          <h1 className={`text-2xl sm:text-3xl font-bold font-display ${isLight ? 'text-[#0B2559]' : 'text-slate-100'}`}>
            Bilingual Circular &amp; Parent Notice Studio
          </h1>
          <p className={`text-sm max-w-2xl ${isLight ? 'text-[#0B2559]/75' : 'text-slate-400'}`}>
            Draft synchronized English &amp; Hindi administrative circulars with official Jaipuria headers, reference numbers, and school seal styling.
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
            <span>Print Circular</span>
          </button>
        </div>
      </div>

      <StudioHistoryPanel
        isLight={isLight}
        studioName="Bilingual Circular"
        entries={historyEntries}
        activeEntryId={activeHistoryId}
        emptyHint="No bilingual circulars drafted yet. Every English + हिन्दी notice you generate is saved here."
        onSelectEntry={(entry) => {
          restoreFromHistory(entry, true);
          onShowToast(`Loaded circular "${entry.title}" inside studio.`, 'info');
        }}
        onDeleteEntry={(id) => {
          deleteStudioHistoryEntry(id);
          if (activeHistoryId === id) {
            setActiveHistoryId(null);
          }
          refreshHistory();
          onStudioEntryDeleted?.(id);
          onShowToast('Removed circular from Circular Studio history.', 'info');
        }}
        onClearAll={() => {
          const removed = clearStudioHistory('circular', 'teacher');
          setActiveHistoryId(null);
          refreshHistory();
          onStudioHistoryCleared?.(removed.map((r) => r.id));
          onShowToast('Cleared Circular Studio history.', 'info');
        }}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Form Controls */}
        <div className="lg:col-span-2 space-y-5">
          <div className={`editorial-surface rounded-xl p-6 space-y-5 border ${
            isLight ? 'border-[#0B2559]/12 text-[#0B2559]' : 'border-[#F5B700]/20 text-slate-100'
          }`}>
            {/* Quick Presets */}
            <div className="space-y-2">
              <label className={`block text-xs font-mono uppercase font-medium ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                Preset Circular Templates
              </label>
              <div className="flex flex-wrap gap-2">
                {(['ptm', 'exam_schedule', 'revision', 'project', 'holiday'] as const).map((key) => {
                  const labels = {
                    ptm: 'Parent-Teacher Meeting (PTM)',
                    exam_schedule: 'Exam Date-sheet & Schedule',
                    revision: 'Revision Registration',
                    project: 'ICSE Project Guidelines',
                    holiday: 'School Closure Notice'
                  };
                  const isSelected = circularType === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handleSelectPreset(key)}
                      className={`px-3 py-1.5 rounded-xl border text-xs font-medium transition-all ${
                        isSelected
                          ? (isLight
                              ? 'border-purple-500 bg-purple-50 text-purple-900 font-bold shadow-xs'
                              : 'border-purple-400 bg-purple-500/20 text-purple-300')
                          : (isLight
                              ? 'border-slate-200 text-slate-700 hover:border-slate-300 bg-white shadow-xs'
                              : 'border-slate-700/80 text-slate-400 hover:border-slate-600')
                      }`}
                    >
                      {labels[key]}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Circular Subject / Title */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="circ-title" className={`block text-xs font-mono uppercase font-medium ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                  Circular Title / Subject
                </label>
                <span className={`text-[10px] font-mono font-bold ${isLight ? 'text-purple-700' : 'text-purple-400'}`}>{refNumber}</span>
              </div>
              <input
                id="circ-title"
                type="text"
                value={customSubjectTitle || circularPresets[circularType].title}
                onChange={(e) => setCustomSubjectTitle(e.target.value)}
                placeholder="Circular Subject Line..."
                className={`w-full px-4 py-3 rounded-xl border text-sm outline-none transition-all ${
                  isLight
                    ? 'bg-white border-slate-300 text-slate-900 focus:border-purple-500 focus:ring-1 focus:ring-purple-500'
                    : 'bg-slate-900/80 border-slate-700/80 text-slate-100 focus:border-purple-400'
                }`}
              />
            </div>

            {/* Target Audience */}
            <div className="space-y-2">
              <label className={`block text-xs font-mono uppercase font-medium ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                Target Audience
              </label>
              <div className="grid grid-cols-3 gap-3">
                {(['parents', 'students', 'faculty'] as const).map((aud) => {
                  const isSelected = targetAudience === aud;
                  return (
                    <button
                      key={aud}
                      type="button"
                      onClick={() => setTargetAudience(aud)}
                      className={`py-2 px-3 rounded-xl border text-xs font-medium capitalize text-center transition-all ${
                        isSelected
                          ? (isLight
                              ? 'border-purple-500 bg-purple-50 text-purple-900 font-bold shadow-xs'
                              : 'border-purple-400 bg-purple-500/20 text-purple-300')
                          : (isLight
                              ? 'border-slate-200 text-slate-700 hover:border-slate-300 bg-white shadow-xs'
                              : 'border-slate-700/80 text-slate-400 hover:border-slate-600')
                      }`}
                    >
                      {aud === 'parents' ? 'Parents / Guardians' : aud === 'students' ? 'Class 7 Scholars' : 'Faculty & Staff'}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Key Particulars & Dates */}
            <div className="space-y-2">
              <label htmlFor="circ-details" className={`block text-xs font-mono uppercase font-medium ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                Key Dates, Timings, &amp; Specific Directives
              </label>
              <textarea
                id="circ-details"
                rows={4}
                value={specificDetails || circularPresets[circularType].defaultDetails}
                onChange={(e) => setSpecificDetails(e.target.value)}
                placeholder="Include event dates, reporting time, classroom allocations, instructions..."
                className={`w-full px-4 py-3 rounded-xl border text-sm outline-none transition-all ${
                  isLight
                    ? 'bg-white border-slate-300 text-slate-900 focus:border-purple-500 focus:ring-1 focus:ring-purple-500'
                    : 'bg-slate-900/80 border-slate-700/80 text-slate-100 focus:border-purple-400'
                }`}
              />
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
                  ? 'Drafting Bilingual Circular Inside Studio…'
                  : 'Generate Official Bilingual Circular (English + हिन्दी)'}
              </span>
            </button>
          </div>
        </div>

        {/* Right Col: Institutional Guidelines */}
        <div className="space-y-5">
          <div className={`editorial-surface rounded-xl p-5 border space-y-4 ${
            isLight ? 'border-[#0B2559]/12 text-[#0B2559]' : 'border-[#F5B700]/20 text-slate-100'
          }`}>
            <h3 className="text-xs font-mono uppercase tracking-wider text-amber-500 font-bold flex items-center gap-1.5">
              <Languages className="w-4 h-4" />
              <span>Bilingual Standardization</span>
            </h3>

            <div className={`space-y-3 text-xs ${isLight ? 'text-slate-800' : 'text-slate-300'}`}>
              <div className={`p-3 rounded-xl border space-y-1 ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/60 border-slate-800'
              }`}>
                <div className={`font-semibold ${isLight ? 'text-purple-900 font-bold' : 'text-purple-300'}`}>Synchronized English &amp; Hindi</div>
                <div className={`text-[11px] ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                  Every notice is generated simultaneously in English and authentic Hindi (राजभाषा मानक हिन्दी) so that parents and guardians receive crystal-clear communication.
                </div>
              </div>

              <div className={`p-3 rounded-xl border space-y-1 ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/60 border-slate-800'
              }`}>
                <div className={`font-semibold ${isLight ? 'text-purple-900 font-bold' : 'text-purple-300'}`}>Reference Tracking</div>
                <div className={`text-[11px] ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                  Includes unique institutional dispatch number, motto endorsement, and principal signature block.
                </div>
              </div>
            </div>

            <div className={`pt-2 border-t text-[11px] flex items-center gap-1.5 ${
              isLight ? 'border-slate-200 text-slate-600' : 'border-slate-800 text-slate-400'
            }`}>
              <HelpCircle className="w-3.5 h-3.5 text-purple-500 shrink-0" />
              <span>Bilingual circulars render right inside this studio and print cleanly onto official school stationery.</span>
            </div>
          </div>
        </div>
      </div>

      <div ref={outputRef}>
        <StudioOutputPanel
          isLight={isLight}
          title={generatedTitle || 'Bilingual Institutional Circular'}
          subtitle={`Ref: ${refNumber} · English + हिन्दी Official Draft`}
          isGenerating={isGenerating}
          streamingText={streamingText}
          result={studioResult}
          error={studioError}
          copyLabel="Copy Circular"
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
