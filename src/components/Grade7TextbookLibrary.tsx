import React, { useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  Search,
  Sparkles,
  AlertTriangle,
  ArrowUpRight,
  Compass,
  FileText,
  Clock,
  Award,
  CheckCircle2,
  Image as ImageIcon,
  X
} from 'lucide-react';
import {
  GRADE_7_TEXTBOOK_CATALOG,
  type Grade7ChapterRef
} from '../data/grade7Textbooks';
import { listUploadedBookPages, type UploadedBookPage } from '../utils/bookPageVault';
import type { PersonaRole } from '../utils/medhaviEngine';

interface Grade7TextbookLibraryProps {
  isLight: boolean;
  persona: PersonaRole;
  activeSubject: string;
  initialChapterId?: string | null;
  vaultRefreshKey?: number;
  onSelectSubject: (subject: string) => void;
  onOpenPageViewer?: (chapter: Grade7ChapterRef) => void;
  onLaunchPrompt: (
    prompt: string,
    options?: {
      subject?: string;
      workflowType?: string;
      webSearchEnabled?: boolean;
    }
  ) => void;
  onClose?: () => void;
}

const SUBJECT_SHORT: Record<string, string> = {
  All: 'All Subjects',
  Mathematics: 'Mathematics',
  Physics: 'Physics',
  Chemistry: 'Chemistry',
  Biology: 'Biology',
  'Computer Studies': 'Computers',
  'English Literature & Language': 'English',
  'History & Civics': 'History & Civics',
  Geography: 'Geography',
  'Hindi — हिन्दी': 'Hindi',
  'Sanskrit — संस्कृतम्': 'Sanskrit',
  'Financial Education': 'Financial Ed.',
  'General Knowledge': 'GK'
};

export const Grade7TextbookLibrary: React.FC<Grade7TextbookLibraryProps> = ({
  isLight,
  persona,
  activeSubject,
  initialChapterId = null,
  vaultRefreshKey = 0,
  onSelectSubject,
  onOpenPageViewer,
  onLaunchPrompt
}) => {
  const [uploadedByChapter, setUploadedByChapter] = useState<Record<string, UploadedBookPage[]>>({});

  useEffect(() => {
    listUploadedBookPages()
      .then((all) => {
        const map: Record<string, UploadedBookPage[]> = {};
        for (const item of all) {
          if (!map[item.chapterId]) map[item.chapterId] = [];
          map[item.chapterId].push(item);
        }
        setUploadedByChapter(map);
      })
      .catch(() => setUploadedByChapter({}));
  }, [vaultRefreshKey]);

  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>(() => {
    if (initialChapterId) {
      const match = GRADE_7_TEXTBOOK_CATALOG.find((c) => c.id === initialChapterId);
      if (match) return match.subject;
    }
    if (!activeSubject || activeSubject === 'All Subjects') {
      return 'All';
    }
    return activeSubject;
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChapterId, setSelectedChapterId] = useState<string>(() => {
    if (initialChapterId && GRADE_7_TEXTBOOK_CATALOG.some((c) => c.id === initialChapterId)) {
      return initialChapterId;
    }
    const subjMatch =
      activeSubject && activeSubject !== 'All Subjects'
        ? GRADE_7_TEXTBOOK_CATALOG.find((c) => c.subject === activeSubject)
        : undefined;
    return subjMatch ? subjMatch.id : GRADE_7_TEXTBOOK_CATALOG[0].id;
  });

  const subjects = useMemo(() => {
    const unique = Array.from(new Set(GRADE_7_TEXTBOOK_CATALOG.map((c) => c.subject)));
    return ['All', ...unique];
  }, []);

  const filteredChapters = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return GRADE_7_TEXTBOOK_CATALOG.filter((ch) => {
      if (selectedSubjectFilter !== 'All' && ch.subject !== selectedSubjectFilter) {
        return false;
      }
      if (!q) return true;
      const haystack = [
        ch.title,
        ch.textbook,
        ch.publisher,
        ch.pageRange,
        ch.ncseBridge,
        ch.subject,
        ch.summary,
        ...ch.keyConcepts,
        ...ch.formulasOrFacts,
        ...ch.keywords
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [selectedSubjectFilter, searchQuery]);

  const activeChapter: Grade7ChapterRef | null = useMemo(() => {
    const exact = filteredChapters.find((c) => c.id === selectedChapterId);
    return exact || filteredChapters[0] || null;
  }, [filteredChapters, selectedChapterId]);

  const borderHairline = isLight ? 'border-[#E5E7EB]' : 'border-[#2A3244]';
  const surfaceBg = isLight ? 'bg-white' : 'bg-[#111622]';
  const subtleBg = isLight ? 'bg-[#F8FAFC]' : 'bg-[#0D121C]';
  const mutedInk = isLight ? 'text-[#6B7280]' : 'text-[#94A3B8]';
  const primaryInk = isLight ? 'text-[#0A0A0A]' : 'text-[#F4F4F0]';
  const navyInk = isLight ? 'text-[#0B2559]' : 'text-white';

  return (
    <div className="max-w-6xl mx-auto w-full space-y-5 pb-6">
      {/* Header Strip */}
      <div className={`pb-4 border-b ${borderHairline} flex flex-col md:flex-row md:items-end justify-between gap-4`}>
        <div className="space-y-1">
          <div className={`text-[11px] font-mono font-bold uppercase tracking-[0.16em] ${navyInk}`}>
            Seth M.R. Jaipuria School, Lucknow · 2026–27 Book List &amp; NCSE Reference
          </div>
          <h2 className={`text-2xl sm:text-3xl font-bold font-display tracking-tight ${primaryInk}`}>
            Grade 7 Textbook Reference Library
          </h2>
          <p className={`text-xs sm:text-sm max-w-2xl leading-relaxed ${mutedInk}`}>
            Every answer in Jaipuria Medhavi automatically cites relevant book chapters and page references from the Seth M.R. Jaipuria 2026–27 Class 7 curriculum alongside the institutional manual.
          </p>
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-72 shrink-0">
          <Search
            className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none ${mutedInk}`}
          />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search chapter, formula, law..."
            aria-label="Search Grade 7 textbooks"
            className={`w-full pl-9 pr-8 py-2 rounded-lg border text-xs sm:text-sm outline-none transition-colors ${
              isLight
                ? 'bg-white border-[#D1D5DB] text-[#0A0A0A] placeholder:text-[#9CA3AF] focus:border-[#0B2559]'
                : 'bg-[#0D121C] border-[#2A3244] text-[#F4F4F0] placeholder:text-[#64748B] focus:border-white'
            }`}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              aria-label="Clear book search"
              className={`absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 cursor-pointer ${mutedInk}`}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Horizontal Subject Hairline Tabs */}
      <div
        role="tablist"
        aria-label="Filter textbooks by subject"
        className={`flex items-center gap-1 overflow-x-auto no-scrollbar border-b ${borderHairline} -mt-1`}
      >
        {subjects.map((subj) => {
          const isSelected = selectedSubjectFilter === subj;
          return (
            <button
              key={subj}
              type="button"
              role="tab"
              aria-selected={isSelected}
              onClick={() => {
                setSelectedSubjectFilter(subj);
                if (subj !== 'All') {
                  onSelectSubject(subj);
                  const firstInSubj = GRADE_7_TEXTBOOK_CATALOG.find((c) => c.subject === subj);
                  if (firstInSubj) setSelectedChapterId(firstInSubj.id);
                }
              }}
              className={`px-3 py-2.5 text-xs font-semibold whitespace-nowrap shrink-0 border-b-2 transition-colors cursor-pointer ${
                isSelected
                  ? isLight
                    ? 'border-[#0B2559] text-[#0B2559]'
                    : 'border-white text-white'
                  : `border-transparent ${mutedInk} hover:text-[#0A0A0A] dark:hover:text-white`
              }`}
            >
              {SUBJECT_SHORT[subj] || subj}
            </button>
          );
        })}
      </div>

      {/* Two-Zone Architectural Reference Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Zone: Chapter Index List */}
        <div className="lg:col-span-5 space-y-2.5">
          <div className={`flex items-center justify-between text-[11px] font-mono uppercase tracking-[0.14em] ${mutedInk}`}>
            <span>Chapters Indexed</span>
            <span className="tabular-nums">{filteredChapters.length} Results</span>
          </div>

          {filteredChapters.length === 0 ? (
            <div className={`rounded-xl border ${borderHairline} ${surfaceBg} p-6 text-center space-y-2`}>
              <p className={`text-sm font-semibold ${primaryInk}`}>No matching chapters found</p>
              <p className={`text-xs ${mutedInk}`}>
                Try searching for a broader concept like &ldquo;congruence&rdquo;, &ldquo;heat&rdquo;, &ldquo;photosynthesis&rdquo;, or &ldquo;binary&rdquo;.
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[62vh] overflow-y-auto pr-1">
              {filteredChapters.map((ch) => {
                const isSelected = activeChapter?.id === ch.id;
                return (
                  <button
                    key={ch.id}
                    type="button"
                    onClick={() => setSelectedChapterId(ch.id)}
                    className={`w-full text-left rounded-xl border p-3.5 transition-all cursor-pointer ${
                      isSelected
                        ? isLight
                          ? 'bg-[#0B2559] border-[#0B2559] text-white'
                          : 'bg-[#1B2436] border-white text-white'
                        : `${surfaceBg} ${borderHairline} hover:border-[#0B2559] dark:hover:border-white/70`
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 text-[10px] font-mono font-bold uppercase tracking-[0.12em]">
                      <span className={isSelected ? 'text-white/80' : navyInk}>
                        {SUBJECT_SHORT[ch.subject] || ch.subject} · Ch. {String(ch.chapterNumber).padStart(2, '0')}
                      </span>
                      <span className={isSelected ? 'text-white/75' : mutedInk}>
                        {ch.pageRange}
                        {(uploadedByChapter[ch.id]?.length || 0) > 0
                          ? ` · ${uploadedByChapter[ch.id].length} scan`
                          : ''}
                      </span>
                    </div>
                    <div
                      className={`mt-1 text-sm font-bold font-display leading-snug ${
                        isSelected ? 'text-white' : primaryInk
                      }`}
                    >
                      {ch.title}
                    </div>
                    <div
                      className={`mt-1 text-[11px] truncate ${
                        isSelected ? 'text-white/80' : mutedInk
                      }`}
                    >
                      {ch.textbook}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Zone: Active Chapter Scholarly Inspector */}
        <div className="lg:col-span-7">
          {activeChapter ? (
            <section
              aria-label="Chapter Reference Details"
              className={`rounded-xl border ${borderHairline} ${surfaceBg} p-5 sm:p-6 space-y-5`}
            >
              {/* Book Provenance Header */}
              <div className={`pb-4 border-b ${borderHairline} space-y-2.5`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className={`flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-mono font-semibold ${mutedInk}`}>
                    <BookOpen className={`w-3.5 h-3.5 ${navyInk}`} />
                    <span className={navyInk}>{activeChapter.textbook}</span>
                    <span aria-hidden="true">·</span>
                    <span>Ch. {activeChapter.chapterNumber} ({activeChapter.pageRange})</span>
                    <span aria-hidden="true">·</span>
                    <span>{activeChapter.publisher}</span>
                  </div>

                  {onOpenPageViewer && (
                    <button
                      type="button"
                      onClick={() => onOpenPageViewer(activeChapter)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                        isLight
                          ? 'border-[#0B2559] text-[#0B2559] hover:bg-[#0B2559] hover:text-white'
                          : 'border-white/50 text-white hover:bg-white hover:text-[#0A0A0A]'
                      }`}
                    >
                      <ImageIcon className="w-3.5 h-3.5" />
                      <span>
                        Page Images &amp; Scans
                        {(uploadedByChapter[activeChapter.id]?.length || 0) > 0
                          ? ` (${uploadedByChapter[activeChapter.id].length})`
                          : ''}
                      </span>
                    </button>
                  )}
                </div>

                <h3 className={`text-xl sm:text-2xl font-bold font-display tracking-tight ${primaryInk}`}>
                  {activeChapter.title}
                </h3>

                <p className={`text-xs font-mono ${mutedInk}`}>
                  NCSE / NCERT Alignment: {activeChapter.ncseBridge}
                </p>

                <p className={`text-sm leading-relaxed pt-1 ${primaryInk}`}>
                  {activeChapter.summary}
                </p>
              </div>

              {/* Key Formulas & Facts */}
              <div className="space-y-2.5">
                <div className={`text-[11px] font-mono font-bold uppercase tracking-[0.14em] ${navyInk}`}>
                  Essential Formulas, Laws &amp; Verified Facts
                </div>
                <div className="space-y-2">
                  {activeChapter.formulasOrFacts.map((formula, idx) => (
                    <div
                      key={idx}
                      className={`px-3.5 py-2.5 rounded-lg border ${borderHairline} ${subtleBg} font-mono text-xs sm:text-[13px] leading-relaxed ${primaryInk}`}
                    >
                      {formula}
                    </div>
                  ))}
                </div>
              </div>

              {/* Core Syllabus Concepts */}
              <div className="space-y-2.5">
                <div className={`text-[11px] font-mono font-bold uppercase tracking-[0.14em] ${navyInk}`}>
                  Core Chapter Concepts
                </div>
                <ul className="space-y-2">
                  {activeChapter.keyConcepts.map((concept, idx) => (
                    <li key={idx} className={`flex items-start gap-2.5 text-xs sm:text-sm leading-relaxed ${primaryInk}`}>
                      <CheckCircle2 className={`w-4 h-4 mt-0.5 shrink-0 ${navyInk}`} />
                      <span>{concept}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Common Class 7 Misconceptions */}
              <div className={`rounded-lg border ${borderHairline} ${subtleBg} p-4 space-y-2`}>
                <div className="flex items-center gap-2 text-[11px] font-mono font-bold uppercase tracking-[0.14em] text-[#B45309] dark:text-[#FBBF24]">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>Common Class 7 Pitfalls to Avoid</span>
                </div>
                <ul className="space-y-1.5">
                  {activeChapter.commonMisconceptions.map((trap, idx) => (
                    <li key={idx} className={`text-xs sm:text-[13px] leading-relaxed ${primaryInk}`}>
                      • {trap}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Direct Grounded Launch Actions */}
              <div className={`pt-4 border-t ${borderHairline} flex flex-wrap items-center gap-2.5`}>
                {persona === 'student' ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        onSelectSubject(activeChapter.subject);
                        onLaunchPrompt(activeChapter.studentPrompt, {
                          subject: activeChapter.subject
                        });
                      }}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#0B2559] hover:bg-[#081C44] text-white text-xs font-bold transition-colors whitespace-nowrap cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Study Socratic Guide</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        onSelectSubject(activeChapter.subject);
                        onLaunchPrompt(
                          `Generate a 5-question ICSE Class 7 ${activeChapter.subject} revision quiz on Chapter ${activeChapter.chapterNumber}: "${activeChapter.title}" (${activeChapter.textbook}) inside <medhavi_quiz>...</medhavi_quiz> tags.`,
                          {
                            subject: activeChapter.subject,
                            workflowType: 'revision_quiz'
                          }
                        );
                      }}
                      className={`inline-flex items-center gap-2 px-3.5 py-2.5 rounded-lg border text-xs font-bold transition-colors whitespace-nowrap cursor-pointer ${
                        isLight
                          ? 'border-[#0B2559] text-[#0B2559] hover:bg-[#F8FAFC]'
                          : 'border-white/40 text-white hover:bg-[#1B2232]'
                      }`}
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>5-Q Chapter Quiz</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        onSelectSubject(activeChapter.subject);
                        onLaunchPrompt(
                          `Find real-world applications and recent scientific or historical context for Class 7 ${activeChapter.subject} Chapter ${activeChapter.chapterNumber}: ${activeChapter.title}.`,
                          {
                            subject: activeChapter.subject,
                            webSearchEnabled: true
                          }
                        );
                      }}
                      className={`inline-flex items-center gap-2 px-3.5 py-2.5 rounded-lg border text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                        isLight
                          ? 'border-[#E5E7EB] text-[#0A0A0A] hover:border-[#0B2559]'
                          : 'border-[#2A3244] text-[#F4F4F0] hover:border-white'
                      }`}
                    >
                      <Compass className="w-3.5 h-3.5" />
                      <span>Explore + Web Search</span>
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        onSelectSubject(activeChapter.subject);
                        onLaunchPrompt(activeChapter.teacherPrompt, {
                          subject: activeChapter.subject,
                          workflowType: 'lesson_plan_architect'
                        });
                      }}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#0B2559] hover:bg-[#081C44] text-white text-xs font-bold transition-colors whitespace-nowrap cursor-pointer"
                    >
                      <Clock className="w-3.5 h-3.5" />
                      <span>40-Min Lesson Plan</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        onSelectSubject(activeChapter.subject);
                        onLaunchPrompt(
                          `Build a 4-tier CISCE assessment rubric and misconception remediation guide for Class 7 ${activeChapter.subject} Chapter ${activeChapter.chapterNumber}: "${activeChapter.title}" (${activeChapter.textbook}).`,
                          {
                            subject: activeChapter.subject
                          }
                        );
                      }}
                      className={`inline-flex items-center gap-2 px-3.5 py-2.5 rounded-lg border text-xs font-bold transition-colors whitespace-nowrap cursor-pointer ${
                        isLight
                          ? 'border-[#0B2559] text-[#0B2559] hover:bg-[#F8FAFC]'
                          : 'border-white/40 text-white hover:bg-[#1B2232]'
                      }`}
                    >
                      <Award className="w-3.5 h-3.5" />
                      <span>Build Chapter Rubric</span>
                    </button>
                  </>
                )}
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
};
