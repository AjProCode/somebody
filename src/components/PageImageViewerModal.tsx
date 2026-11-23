import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import {
  X,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Download,
  Upload,
  Trash2,
  BookOpen,
  FileText,
  ExternalLink,
  Image as ImageIcon,
  Loader2,
  AlertTriangle
} from 'lucide-react';
import type { Grade7ChapterRef, TextbookSearchMatch } from '../data/grade7Textbooks';
import {
  deleteUploadedBookPage,
  listUploadedBookPages,
  readFileAsDataUrl,
  saveUploadedBookPage,
  type UploadedBookPage
} from '../utils/bookPageVault';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export interface ManualReferenceMeta {
  file: string;
  totalPages: number;
  protocolsLoaded: number;
  referencedPages: number[];
  referencedProtocols: string[];
}

export interface PageImageViewerTarget {
  mode: 'manual' | 'textbook';
  manualPage?: number;
  manualReference?: ManualReferenceMeta | null;
  chapter?: Grade7ChapterRef | TextbookSearchMatch | null;
  topicQuery?: string;
}

interface WikimediaPageImage {
  title: string;
  imageUrl: string;
  thumbUrl: string;
  pageUrl: string;
  description: string;
  license: string;
}

const MANUAL_PDF_URL = '/api/manual/pdf';

const pdfDocCache = new Map<string, Promise<pdfjsLib.PDFDocumentProxy>>();
const renderedPageImageCache = new Map<string, string>();

function dataUrlToUint8Array(dataUrl: string): Uint8Array {
  const commaIdx = dataUrl.indexOf(',');
  const base64 = commaIdx >= 0 ? dataUrl.slice(commaIdx + 1) : dataUrl;
  const binStr = atob(base64);
  const bytes = new Uint8Array(binStr.length);
  for (let i = 0; i < binStr.length; i++) {
    bytes[i] = binStr.charCodeAt(i);
  }
  return bytes;
}

function getCachedPdfDoc(sourceKey: string, dataUrl?: string): Promise<pdfjsLib.PDFDocumentProxy> {
  const existing = pdfDocCache.get(sourceKey);
  if (existing) return existing;

  const task = dataUrl
    ? pdfjsLib.getDocument({ data: dataUrlToUint8Array(dataUrl), verbosity: 0 })
    : pdfjsLib.getDocument({ url: sourceKey, verbosity: 0 });

  const promise = task.promise.catch((err) => {
    pdfDocCache.delete(sourceKey);
    throw err;
  });
  pdfDocCache.set(sourceKey, promise);
  return promise;
}

async function renderPdfPageToPng(params: {
  sourceKey: string;
  pageNumber: number;
  scale: number;
  dataUrl?: string;
}): Promise<{ imgSrc: string; totalPages: number }> {
  const { sourceKey, pageNumber, scale, dataUrl } = params;
  const cacheKey = `${sourceKey}::p${pageNumber}::s${scale.toFixed(2)}`;
  const doc = await getCachedPdfDoc(sourceKey, dataUrl);
  const clampedPage = Math.max(1, Math.min(doc.numPages, pageNumber));

  const cached = renderedPageImageCache.get(cacheKey);
  if (cached) {
    return { imgSrc: cached, totalPages: doc.numPages };
  }

  const page = await doc.getPage(clampedPage);
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.floor(viewport.width));
  canvas.height = Math.max(1, Math.floor(viewport.height));

  await page.render({ canvas, viewport }).promise;
  const imgSrc = canvas.toDataURL('image/png');

  if (renderedPageImageCache.size > 60) {
    const oldest = renderedPageImageCache.keys().next().value;
    if (oldest) renderedPageImageCache.delete(oldest);
  }
  renderedPageImageCache.set(cacheKey, imgSrc);

  return { imgSrc, totalPages: doc.numPages };
}

export const PdfPageImageRenderer: React.FC<{
  sourceKey: string;
  dataUrl?: string;
  pageNumber: number;
  scale?: number;
  alt: string;
  className?: string;
  onNumPages?: (total: number) => void;
  onImageReady?: (pngDataUrl: string) => void;
}> = ({
  sourceKey,
  dataUrl,
  pageNumber,
  scale = 1.6,
  alt,
  className = '',
  onNumPages,
  onImageReady
}) => {
  const [imgSrc, setImgSrc] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string>('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErrorMsg('');

    renderPdfPageToPng({ sourceKey, pageNumber, scale, dataUrl })
      .then((res) => {
        if (cancelled) return;
        setImgSrc(res.imgSrc);
        setLoading(false);
        onNumPages?.(res.totalPages);
        onImageReady?.(res.imgSrc);
      })
      .catch((err) => {
        if (cancelled) return;
        setLoading(false);
        setErrorMsg(err instanceof Error ? err.message : 'Unable to render PDF page image.');
      });

    return () => {
      cancelled = true;
    };
  }, [sourceKey, dataUrl, pageNumber, scale]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-12 text-xs font-mono text-[#6B7280] dark:text-[#94A3B8]">
        <Loader2 className="w-5 h-5 animate-spin text-[#0B2559] dark:text-white" />
        <span>Rendering Page {pageNumber} image…</span>
      </div>
    );
  }

  if (errorMsg || !imgSrc) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 p-6 text-center text-xs text-[#6B7280] dark:text-[#94A3B8]">
        <AlertTriangle className="w-5 h-5 text-[#B45309] dark:text-[#FBBF24]" />
        <p>{errorMsg || 'Page image preview unavailable.'}</p>
      </div>
    );
  }

  return (
    <img
      src={imgSrc}
      alt={alt}
      referrerPolicy="no-referrer"
      className={className || 'w-full h-auto rounded-md border border-[#E5E7EB] dark:border-[#2A3244] bg-white'}
    />
  );
};

export const PdfPageThumbnail: React.FC<{
  pageNumber: number;
  protocolHint?: string;
  isLight: boolean;
  onClick: () => void;
}> = ({ pageNumber, protocolHint, isLight, onClick }) => {
  const [thumbSrc, setThumbSrc] = useState<string>('');
  const [failed, setFailed] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;
    renderPdfPageToPng({
      sourceKey: MANUAL_PDF_URL,
      pageNumber,
      scale: 0.45
    })
      .then((res) => {
        if (!cancelled) setThumbSrc(res.imgSrc);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [pageNumber]);

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group text-left rounded-lg border p-2 transition-colors cursor-pointer flex flex-col gap-1.5 w-[112px] shrink-0 ${
        isLight
          ? 'border-[#E5E7EB] bg-white hover:border-[#0B2559]'
          : 'border-[#2A3244] bg-[#0D121C] hover:border-white'
      }`}
    >
      <div
        className={`w-full aspect-[3/4] rounded overflow-hidden border flex items-center justify-center ${
          isLight ? 'border-[#E5E7EB] bg-[#F8FAFC]' : 'border-[#2A3244] bg-[#141A28]'
        }`}
      >
        {thumbSrc ? (
          <img
            src={thumbSrc}
            alt={`Jaipuria Medhavi Manual Page ${pageNumber}`}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover object-top transition-transform duration-200 group-hover:scale-[1.03]"
          />
        ) : failed ? (
          <FileText className="w-5 h-5 text-[#6B7280]" />
        ) : (
          <Loader2 className="w-4 h-4 animate-spin text-[#0B2559] dark:text-white" />
        )}
      </div>
      <div className="min-w-0">
        <div className="text-[11px] font-mono font-bold tabular-nums text-[#0B2559] dark:text-white">
          Page {pageNumber}
        </div>
        {protocolHint && (
          <div className="text-[10px] truncate text-[#6B7280] dark:text-[#94A3B8]">
            {protocolHint}
          </div>
        )}
      </div>
    </button>
  );
};

interface PageImageViewerModalProps {
  isOpen: boolean;
  isLight: boolean;
  target: PageImageViewerTarget | null;
  onClose: () => void;
  onShowToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
  onVaultUpdated?: () => void;
}

export const PageImageViewerModal: React.FC<PageImageViewerModalProps> = ({
  isOpen,
  isLight,
  target,
  onClose,
  onShowToast,
  onVaultUpdated
}) => {
  const [activeTab, setActiveTab] = useState<'textbook' | 'manual'>('manual');
  const [manualPage, setManualPage] = useState<number>(1);
  const [manualTotalPages, setManualTotalPages] = useState<number>(75);
  const [zoom, setZoom] = useState<number>(1.35);
  const [latestManualPng, setLatestManualPng] = useState<string>('');
  const [jumpInput, setJumpInput] = useState<string>('1');

  // Uploaded real textbook scans for current chapter
  const [uploadedPages, setUploadedPages] = useState<UploadedBookPage[]>([]);
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadPageLabel, setUploadPageLabel] = useState<string>('');
  const [uploadedPdfPage, setUploadedPdfPage] = useState<Record<string, number>>({});
  const [uploadedPdfTotals, setUploadedPdfTotals] = useState<Record<string, number>>({});
  const fileUploadRef = useRef<HTMLInputElement | null>(null);

  // Live Wikimedia Commons Educational Diagrams
  const [wikimediaImages, setWikimediaImages] = useState<WikimediaPageImage[]>([]);
  const [loadingImages, setLoadingImages] = useState<boolean>(false);
  const [brokenUrls, setBrokenUrls] = useState<Record<string, boolean>>({});

  // Typeset Reference Sheet toggle when viewing Textbook tab
  const [showTypesetSheet, setShowTypesetSheet] = useState<boolean>(false);

  const chapter = target?.chapter || null;
  const manualRef = target?.manualReference || null;

  useEffect(() => {
    if (!isOpen || !target) return;
    setActiveTab(target.mode);
    const startPage =
      target.manualPage ||
      (target.manualReference?.referencedPages?.[0] ? target.manualReference.referencedPages[0] : 1);
    setManualPage(startPage);
    setJumpInput(String(startPage));
    if (target.manualReference?.totalPages) {
      setManualTotalPages(target.manualReference.totalPages);
    }
    setUploadPageLabel(target.chapter?.pageRange || '');
  }, [isOpen, target]);

  useEffect(() => {
    if (!isOpen || !chapter?.id) {
      setUploadedPages([]);
      return;
    }
    listUploadedBookPages(chapter.id)
      .then((rows) => setUploadedPages(rows))
      .catch(() => setUploadedPages([]));
  }, [isOpen, chapter?.id]);

  useEffect(() => {
    if (!isOpen || !chapter?.id) {
      setWikimediaImages([]);
      return;
    }
    let cancelled = false;
    setLoadingImages(true);
    setBrokenUrls({});
    const diagramQuery =
      (target?.topicQuery || '').trim() || `${chapter.title} ${chapter.subject}`;
    fetch(
      `/api/textbooks/page-images?chapterId=${encodeURIComponent(chapter.id)}&q=${encodeURIComponent(
        diagramQuery
      )}`
    )
      .then((r) => (r.ok ? r.json() : { images: [] }))
      .then((data) => {
        if (!cancelled) {
          setWikimediaImages(Array.isArray(data?.images) ? data.images : []);
          setLoadingImages(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setWikimediaImages([]);
          setLoadingImages(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, chapter?.id]);

  const citedManualPages = useMemo(() => {
    return manualRef?.referencedPages && manualRef.referencedPages.length > 0
      ? manualRef.referencedPages
      : [1, 44, 69, 70];
  }, [manualRef]);

  if (!isOpen || !target) return null;

  const borderHairline = isLight ? 'border-[#E5E7EB]' : 'border-[#2A3244]';
  const surfaceBg = isLight ? 'bg-white' : 'bg-[#111622]';
  const subtleBg = isLight ? 'bg-[#F8FAFC]' : 'bg-[#0B1019]';
  const primaryInk = isLight ? 'text-[#0A0A0A]' : 'text-[#F4F4F0]';
  const mutedInk = isLight ? 'text-[#6B7280]' : 'text-[#94A3B8]';

  const handleBookFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !chapter?.id) return;

    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      onShowToast?.('Please attach a JPG, PNG, WebP photo or PDF scan of the book page.', 'error');
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      onShowToast?.('File exceeds 12 MB limit. Please upload a smaller scan.', 'error');
      return;
    }

    setUploading(true);
    try {
      const dataUrl = await readFileAsDataUrl(file);
      const record: UploadedBookPage = {
        id: `pg-${chapter.id}-${Date.now()}`,
        chapterId: chapter.id,
        pageNumberLabel: uploadPageLabel.trim() || chapter.pageRange || 'Uploaded Page',
        fileName: file.name,
        mimeType: file.type,
        dataUrl,
        uploadedAt: Date.now()
      };
      await saveUploadedBookPage(record);
      const nextList = await listUploadedBookPages(chapter.id);
      setUploadedPages(nextList);
      onVaultUpdated?.();
      onShowToast?.(`Saved "${file.name}" (${record.pageNumberLabel}) for ${chapter.textbook}.`, 'success');
    } catch (err) {
      onShowToast?.(
        err instanceof Error ? err.message : 'Unable to save textbook page scan.',
        'error'
      );
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteUploaded = async (id: string) => {
    await deleteUploadedBookPage(id);
    if (chapter?.id) {
      const nextList = await listUploadedBookPages(chapter.id);
      setUploadedPages(nextList);
    }
    onVaultUpdated?.();
    onShowToast?.('Removed attached page scan.', 'info');
  };

  const handleDownloadManualPng = () => {
    if (!latestManualPng) return;
    const link = document.createElement('a');
    link.href = latestManualPng;
    link.download = `Jaipuria_Medhavi_Manual_Page_${manualPage}.png`;
    link.click();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Reference Page Image Viewer"
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6"
    >
      <div
        className={`w-full max-w-5xl max-h-[92vh] rounded-xl border ${borderHairline} ${surfaceBg} flex flex-col overflow-hidden shadow-2xl`}
      >
        {/* Top Modal Header */}
        <div
          className={`px-4 sm:px-6 py-3.5 border-b ${borderHairline} flex flex-wrap items-center justify-between gap-3`}
        >
          <div className="min-w-0">
            <div className={`text-[11px] font-mono font-bold uppercase tracking-[0.14em] ${mutedInk}`}>
              Seth M.R. Jaipuria School · Actual Page Image Inspector
            </div>
            <h3 className={`text-base sm:text-lg font-bold font-display truncate ${primaryInk}`}>
              {activeTab === 'manual'
                ? `Intelligence Manual · Page ${manualPage} of ${manualTotalPages}`
                : chapter
                ? `${chapter.textbook} · Ch. ${chapter.chapterNumber} (${chapter.pageRange})`
                : 'Class 7 Textbook Page Viewer'}
            </h3>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Switch between Textbook Scans/Diagrams and Manual Actual PDF Pages */}
            <div
              className={`flex items-center p-0.5 rounded-lg border ${borderHairline} ${subtleBg}`}
              role="tablist"
            >
              {chapter && (
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'textbook'}
                  onClick={() => setActiveTab('textbook')}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                    activeTab === 'textbook'
                      ? 'bg-[#0B2559] text-white'
                      : `${mutedInk} hover:text-[#0A0A0A] dark:hover:text-white`
                  }`}
                >
                  Book Pages &amp; Diagrams
                </button>
              )}
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'manual'}
                onClick={() => setActiveTab('manual')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                  activeTab === 'manual'
                    ? 'bg-[#0B2559] text-white'
                    : `${mutedInk} hover:text-[#0A0A0A] dark:hover:text-white`
                }`}
              >
                Manual PDF Pages ({manualTotalPages})
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close Page Image Viewer"
              className={`p-2 rounded-lg border ${borderHairline} ${mutedInk} hover:text-[#0A0A0A] dark:hover:text-white cursor-pointer`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Content Stage */}
        <div className={`flex-1 overflow-y-auto p-4 sm:p-6 ${subtleBg}`}>
          {activeTab === 'manual' ? (
            <div className="space-y-4">
              {/* Manual Page Toolbar */}
              <div
                className={`rounded-lg border ${borderHairline} ${surfaceBg} px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-3`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={manualPage <= 1}
                    onClick={() => {
                      const next = Math.max(1, manualPage - 1);
                      setManualPage(next);
                      setJumpInput(String(next));
                    }}
                    className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border ${borderHairline} text-xs font-semibold disabled:opacity-40 cursor-pointer ${primaryInk}`}
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>Prev</span>
                  </button>

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const num = Number.parseInt(jumpInput, 10);
                      if (!Number.isNaN(num)) {
                        const clamped = Math.max(1, Math.min(manualTotalPages, num));
                        setManualPage(clamped);
                        setJumpInput(String(clamped));
                      }
                    }}
                    className="flex items-center gap-1.5 text-xs font-mono"
                  >
                    <label htmlFor="manual-page-jump" className={mutedInk}>
                      Page
                    </label>
                    <input
                      id="manual-page-jump"
                      type="number"
                      min={1}
                      max={manualTotalPages}
                      value={jumpInput}
                      onChange={(e) => setJumpInput(e.target.value)}
                      className={`w-14 px-2 py-1 rounded border ${borderHairline} ${subtleBg} text-center tabular-nums font-bold ${primaryInk}`}
                    />
                    <span className={`tabular-nums ${mutedInk}`}>/ {manualTotalPages}</span>
                  </form>

                  <button
                    type="button"
                    disabled={manualPage >= manualTotalPages}
                    onClick={() => {
                      const next = Math.min(manualTotalPages, manualPage + 1);
                      setManualPage(next);
                      setJumpInput(String(next));
                    }}
                    className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border ${borderHairline} text-xs font-semibold disabled:opacity-40 cursor-pointer ${primaryInk}`}
                  >
                    <span>Next</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Cited Quick-Jump Strip */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className={`text-[11px] font-mono ${mutedInk}`}>Cited:</span>
                  {citedManualPages.map((pg) => (
                    <button
                      key={pg}
                      type="button"
                      onClick={() => {
                        setManualPage(pg);
                        setJumpInput(String(pg));
                      }}
                      className={`px-2 py-1 rounded text-[11px] font-mono font-bold tabular-nums transition-colors cursor-pointer ${
                        manualPage === pg
                          ? 'bg-[#0B2559] text-white'
                          : `border ${borderHairline} ${primaryInk} hover:border-[#0B2559]`
                      }`}
                    >
                      p.{pg}
                    </button>
                  ))}
                </div>

                {/* Zoom & Save PNG */}
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setZoom((z) => Math.max(0.85, Number((z - 0.25).toFixed(2))))}
                    aria-label="Zoom out page image"
                    className={`p-1.5 rounded border ${borderHairline} ${primaryInk} cursor-pointer`}
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <span className={`text-xs font-mono tabular-nums w-11 text-center ${mutedInk}`}>
                    {Math.round(zoom * 100)}%
                  </span>
                  <button
                    type="button"
                    onClick={() => setZoom((z) => Math.min(2.35, Number((z + 0.25).toFixed(2))))}
                    aria-label="Zoom in page image"
                    className={`p-1.5 rounded border ${borderHairline} ${primaryInk} cursor-pointer`}
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                  {latestManualPng && (
                    <button
                      type="button"
                      onClick={handleDownloadManualPng}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-[#0B2559] text-white text-xs font-semibold cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Save PNG</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Rendered Actual PDF Page Image */}
              <div className="flex justify-center">
                <div className="w-full max-w-3xl">
                  <PdfPageImageRenderer
                    sourceKey={MANUAL_PDF_URL}
                    pageNumber={manualPage}
                    scale={zoom}
                    alt={`Jaipuria Medhavi Manual Page ${manualPage}`}
                    onNumPages={(n) => setManualTotalPages(n)}
                    onImageReady={(png) => setLatestManualPng(png)}
                    className="w-full h-auto rounded-lg border border-[#D1D5DB] dark:border-[#2A3244] shadow-md bg-white"
                  />
                </div>
              </div>
            </div>
          ) : chapter ? (
            <div className="space-y-6">
              {/* 1. Attach Real Book Page Photo / PDF Scan Section */}
              <div className={`rounded-xl border ${borderHairline} ${surfaceBg} p-4 sm:p-5 space-y-4`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className={`text-[11px] font-mono font-bold uppercase tracking-[0.14em] ${mutedInk}`}>
                      Physical Textbook Scans · {chapter.textbook}
                    </div>
                    <h4 className={`text-base font-bold font-display ${primaryInk}`}>
                      Attached Actual Book Page Photos &amp; PDFs ({uploadedPages.length})
                    </h4>
                    <p className={`text-xs leading-relaxed ${mutedInk}`}>
                      Publisher textbooks ({chapter.publisher}) are copyrighted physical books not pre-bundled on disk. Snap or upload real photos/PDF scans of pages{' '}
                      <strong className={primaryInk}>{chapter.pageRange}</strong> to inspect them alongside every answer.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <input
                      type="text"
                      value={uploadPageLabel}
                      onChange={(e) => setUploadPageLabel(e.target.value)}
                      placeholder="e.g. p. 28"
                      aria-label="Page number label"
                      className={`w-28 px-2.5 py-2 rounded-lg border text-xs font-mono ${borderHairline} ${subtleBg} ${primaryInk}`}
                    />
                    <input
                      ref={fileUploadRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,application/pdf"
                      onChange={handleBookFileUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      disabled={uploading}
                      onClick={() => fileUploadRef.current?.click()}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0B2559] hover:bg-[#081C44] text-white text-xs font-bold whitespace-nowrap cursor-pointer disabled:opacity-50"
                    >
                      {uploading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Upload className="w-3.5 h-3.5" />
                      )}
                      <span>Attach Actual Book Page Photo / PDF</span>
                    </button>
                  </div>
                </div>

                {uploadedPages.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    {uploadedPages.map((pg) => {
                      const isPdf = pg.mimeType === 'application/pdf';
                      const curPdfPage = uploadedPdfPage[pg.id] || 1;
                      const totPdfPages = uploadedPdfTotals[pg.id] || 1;
                      return (
                        <div
                          key={pg.id}
                          className={`rounded-lg border ${borderHairline} ${subtleBg} p-3 space-y-2.5`}
                        >
                          <div className="flex items-center justify-between gap-2 text-xs">
                            <div className="min-w-0">
                              <div className={`font-mono font-bold truncate ${primaryInk}`}>
                                {pg.pageNumberLabel} · {pg.fileName}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleDeleteUploaded(pg.id)}
                              aria-label={`Remove ${pg.fileName}`}
                              className={`p-1 rounded ${mutedInk} hover:text-[#DC2626] cursor-pointer shrink-0`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {isPdf ? (
                            <div className="space-y-2">
                              <PdfPageImageRenderer
                                sourceKey={`upload::${pg.id}`}
                                dataUrl={pg.dataUrl}
                                pageNumber={curPdfPage}
                                scale={1.3}
                                alt={`${chapter.textbook} ${pg.pageNumberLabel}`}
                                onNumPages={(tot) =>
                                  setUploadedPdfTotals((prev) => ({ ...prev, [pg.id]: tot }))
                                }
                              />
                              {totPdfPages > 1 && (
                                <div className="flex items-center justify-between text-xs font-mono">
                                  <button
                                    type="button"
                                    disabled={curPdfPage <= 1}
                                    onClick={() =>
                                      setUploadedPdfPage((prev) => ({
                                        ...prev,
                                        [pg.id]: Math.max(1, curPdfPage - 1)
                                      }))
                                    }
                                    className={`px-2 py-1 rounded border ${borderHairline} disabled:opacity-40 cursor-pointer ${primaryInk}`}
                                  >
                                    Prev Page
                                  </button>
                                  <span className={`tabular-nums ${mutedInk}`}>
                                    Page {curPdfPage} / {totPdfPages}
                                  </span>
                                  <button
                                    type="button"
                                    disabled={curPdfPage >= totPdfPages}
                                    onClick={() =>
                                      setUploadedPdfPage((prev) => ({
                                        ...prev,
                                        [pg.id]: Math.min(totPdfPages, curPdfPage + 1)
                                      }))
                                    }
                                    className={`px-2 py-1 rounded border ${borderHairline} disabled:opacity-40 cursor-pointer ${primaryInk}`}
                                  >
                                    Next Page
                                  </button>
                                </div>
                              )}
                            </div>
                          ) : (
                            <img
                              src={pg.dataUrl}
                              alt={`${chapter.textbook} ${pg.pageNumberLabel}`}
                              referrerPolicy="no-referrer"
                              className="w-full h-auto max-h-[420px] object-contain rounded border border-[#E5E7EB] dark:border-[#2A3244] bg-white"
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 2. Open-Access Educational Diagrams & Illustrated Reference Plates */}
              <div className={`rounded-xl border ${borderHairline} ${surfaceBg} p-4 sm:p-5 space-y-3.5`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className={`text-[11px] font-mono font-bold uppercase tracking-[0.14em] ${mutedInk}`}>
                      Open Educational Diagrams &amp; Plates · Wikimedia Commons
                    </div>
                    <h4 className={`text-base font-bold font-display ${primaryInk}`}>
                      Visual Diagrams for Ch. {chapter.chapterNumber}: {chapter.title}
                    </h4>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowTypesetSheet((s) => !s)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer ${borderHairline} ${primaryInk}`}
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>{showTypesetSheet ? 'Hide Typeset Page View' : 'Show Typeset Book Page View'}</span>
                  </button>
                </div>

                {loadingImages ? (
                  <div className={`flex items-center gap-2 py-8 justify-center text-xs font-mono ${mutedInk}`}>
                    <Loader2 className="w-4 h-4 animate-spin text-[#0B2559] dark:text-white" />
                    <span>Searching verified open textbook diagrams…</span>
                  </div>
                ) : wikimediaImages.filter((img) => !brokenUrls[img.thumbUrl]).length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {wikimediaImages
                      .filter((img) => !brokenUrls[img.thumbUrl])
                      .map((img) => (
                        <a
                          key={img.imageUrl}
                          href={img.pageUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`group rounded-lg border ${borderHairline} ${subtleBg} overflow-hidden flex flex-col transition-colors hover:border-[#0B2559] dark:hover:border-white`}
                        >
                          <div className="aspect-[4/3] w-full bg-white flex items-center justify-center p-2 border-b border-[#E5E7EB] dark:border-[#2A3244]">
                            <img
                              src={img.thumbUrl}
                              alt={img.title}
                              referrerPolicy="no-referrer"
                              onError={() =>
                                setBrokenUrls((prev) => ({ ...prev, [img.thumbUrl]: true }))
                              }
                              className="max-w-full max-h-full object-contain"
                            />
                          </div>
                          <div className="p-3 space-y-1">
                            <div className="flex items-start justify-between gap-2">
                              <span className={`text-xs font-bold leading-snug line-clamp-1 ${primaryInk}`}>
                                {img.title}
                              </span>
                              <ExternalLink className={`w-3.5 h-3.5 shrink-0 ${mutedInk}`} />
                            </div>
                            <p className={`text-[11px] leading-snug line-clamp-2 ${mutedInk}`}>
                              {img.description}
                            </p>
                            <div className={`text-[10px] font-mono ${mutedInk}`}>
                              License: {img.license}
                            </div>
                          </div>
                        </a>
                      ))}
                  </div>
                ) : (
                  <div className={`rounded-lg border ${borderHairline} ${subtleBg} p-4 text-xs ${mutedInk} flex items-center gap-2.5`}>
                    <ImageIcon className="w-4 h-4 shrink-0" />
                    <span>
                      No open Wikimedia diagrams matched right now — attach a real book photo above or open the Typeset Reference Page below.
                    </span>
                  </div>
                )}

                {/* 3. Print-Style Typeset Textbook Folio View */}
                {showTypesetSheet && (
                  <div className="mt-4 rounded-xl border border-[#D1D5DB] dark:border-[#334155] bg-[#FFFEFA] text-[#111827] p-6 sm:p-8 shadow-sm space-y-4 font-serif-editorial">
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#D1D5DB] text-[11px] font-mono uppercase tracking-[0.12em] text-[#4B5563]">
                      <span>{chapter.textbook}</span>
                      <span>
                        Ch. {chapter.chapterNumber} · {chapter.pageRange}
                      </span>
                    </div>
                    <h4 className="text-2xl font-bold font-display text-[#0B2559]">
                      Chapter {chapter.chapterNumber}: {chapter.title}
                    </h4>
                    <p className="text-sm leading-relaxed text-[#1F2937]">{chapter.summary}</p>
                    <div className="rounded-lg border border-[#CBD5E1] bg-[#F8FAFC] p-4 space-y-1.5 font-mono text-xs text-[#0B2559]">
                      <div className="font-bold uppercase tracking-wider text-[10px]">
                        Key Laws &amp; Formulas ({chapter.pageRange})
                      </div>
                      {chapter.formulasOrFacts.map((f, i) => (
                        <div key={i}>• {f}</div>
                      ))}
                    </div>
                    <div className="space-y-1.5 text-sm text-[#1F2937]">
                      <div className="font-sans text-xs font-bold uppercase tracking-wider text-[#374151]">
                        Syllabus Concepts
                      </div>
                      <ul className="list-disc pl-5 space-y-1">
                        {chapter.keyConcepts.map((c, i) => (
                          <li key={i}>{c}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="pt-2 border-t border-[#E5E7EB] flex items-center justify-between text-[11px] font-mono text-[#6B7280]">
                      <span>Typeset Syllabus Reference Sheet (Not a Publisher Scan)</span>
                      <span>{chapter.publisher}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
