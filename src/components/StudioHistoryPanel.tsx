import React, { useState } from 'react';
import { Clock, History, Sparkles, Trash2, Check, X, ChevronRight } from 'lucide-react';
import { formatHistoryTimestamp, type StudioHistoryEntry } from '../utils/studioHistory';

interface StudioHistoryPanelProps {
  isLight: boolean;
  studioName: string;
  entries: StudioHistoryEntry[];
  activeEntryId: string | null;
  emptyHint: string;
  onSelectEntry: (entry: StudioHistoryEntry) => void;
  onDeleteEntry: (id: string) => void;
  onClearAll: () => void;
}

export const StudioHistoryPanel: React.FC<StudioHistoryPanelProps> = ({
  isLight,
  studioName,
  entries,
  activeEntryId,
  emptyHint,
  onSelectEntry,
  onDeleteEntry,
  onClearAll
}) => {
  const [confirmClearAll, setConfirmClearAll] = useState(false);

  const mutedInk = isLight ? 'text-slate-600' : 'text-slate-400';
  const borderTone = isLight ? 'border-[#0B2559]/12' : 'border-[#F5B700]/20';

  return (
    <section
      aria-label={`${studioName} History`}
      className={`editorial-surface rounded-xl border p-3.5 sm:p-4 space-y-2.5 no-print ${borderTone} ${
        isLight ? 'text-[#0B2559]' : 'text-slate-100'
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <History className="w-4 h-4 text-[#F5B700] shrink-0" />
          <h2 className="text-xs sm:text-sm font-bold font-display truncate">
            {studioName} History ({entries.length})
          </h2>
          {entries.length > 0 && (
            <span className={`hidden md:inline text-[11px] truncate ${mutedInk}`}>
              · Click any run to view inside studio
            </span>
          )}
        </div>

        {entries.length > 0 && (
          <div className="flex items-center gap-1.5 shrink-0">
            {confirmClearAll ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    onClearAll();
                    setConfirmClearAll(false);
                  }}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-rose-600 text-white hover:bg-rose-700 transition-colors cursor-pointer"
                >
                  <Check className="w-3 h-3" />
                  <span>Confirm Clear</span>
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmClearAll(false)}
                  aria-label="Cancel clear history"
                  className={`p-1 rounded-lg border text-xs transition-colors cursor-pointer ${
                    isLight
                      ? 'border-slate-300 text-slate-600 hover:bg-slate-100'
                      : 'border-slate-700 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmClearAll(true)}
                className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition-colors cursor-pointer ${
                  isLight
                    ? 'border-slate-200 bg-white text-slate-600 hover:border-rose-400 hover:text-rose-700'
                    : 'border-slate-700 bg-slate-900/60 text-slate-300 hover:border-rose-500/60 hover:text-rose-300'
                }`}
              >
                Clear History
              </button>
            )}
          </div>
        )}
      </div>

      {entries.length === 0 ? (
        <div
          className={`rounded-lg border border-dashed px-3 py-2 text-xs flex items-center gap-2 ${
            isLight
              ? 'border-slate-200 bg-slate-50/70 text-slate-600'
              : 'border-slate-800 bg-slate-900/40 text-slate-400'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-[#F5B700] shrink-0" />
          <span className="truncate">{emptyHint}</span>
        </div>
      ) : (
        <div
          className={`space-y-1 ${
            entries.length > 8 ? 'max-h-64 overflow-y-auto pr-0.5' : ''
          }`}
        >
          {entries.map((entry) => {
            const isSelected = activeEntryId === entry.id;
            return (
              <div
                key={entry.id}
                className={`group rounded-lg border px-2.5 py-1.5 flex items-center justify-between gap-2 transition-colors ${
                  isSelected
                    ? isLight
                      ? 'border-[#0B2559] bg-amber-50/90 text-[#0B2559]'
                      : 'border-[#F5B700] bg-[#F5B700]/12 text-slate-100'
                    : isLight
                    ? 'border-slate-200 bg-white hover:border-[#0B2559]/50 text-[#0B2559]'
                    : 'border-slate-800 bg-slate-900/50 hover:border-amber-400/50 text-slate-100'
                }`}
              >
                <button
                  type="button"
                  onClick={() => onSelectEntry(entry)}
                  className="min-w-0 flex-1 flex items-center gap-2 text-left cursor-pointer"
                  title={`${entry.title}${entry.subtitle ? ` · ${entry.subtitle}` : ''}`}
                >
                  <span className="text-xs font-semibold truncate">{entry.title}</span>
                  {entry.subtitle && (
                    <span className={`hidden sm:inline text-[11px] truncate shrink-0 max-w-[220px] ${mutedInk}`}>
                      · {entry.subtitle}
                    </span>
                  )}
                  {isSelected && (
                    <span
                      className={`text-[10px] font-mono uppercase tracking-wider font-bold shrink-0 ${
                        isLight ? 'text-amber-700' : 'text-[#F5B700]'
                      }`}
                    >
                      Viewing
                    </span>
                  )}
                </button>

                <div className="flex items-center gap-1.5 shrink-0">
                  <span className={`inline-flex items-center gap-1 text-[10px] font-mono whitespace-nowrap ${mutedInk}`}>
                    <Clock className="w-3 h-3 text-[#F5B700]" />
                    <span>{formatHistoryTimestamp(entry.timestamp)}</span>
                    {entry.result?.durationSeconds !== undefined && (
                      <span className="hidden sm:inline">· {entry.result.durationSeconds}s</span>
                    )}
                  </span>
                  <button
                    type="button"
                    onClick={() => onSelectEntry(entry)}
                    aria-label={`Open ${entry.title}`}
                    className={`p-1 rounded-md transition-colors cursor-pointer ${
                      isLight
                        ? 'text-slate-500 hover:bg-slate-100 hover:text-[#0B2559]'
                        : 'text-slate-400 hover:bg-slate-800 hover:text-[#F5B700]'
                    }`}
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteEntry(entry.id)}
                    aria-label={`Delete ${entry.title} from ${studioName} history`}
                    className={`p-1 rounded-md transition-colors cursor-pointer ${
                      isLight
                        ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                        : 'text-slate-500 hover:text-rose-400 hover:bg-rose-500/10'
                    }`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
