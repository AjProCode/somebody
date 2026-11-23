import { marked } from 'marked';
import katex from 'katex';
import DOMPurify from 'dompurify';

const SAFE_KATEX_STYLE_PROPS = new Set([
  'height',
  'width',
  'min-width',
  'top',
  'bottom',
  'left',
  'right',
  'margin-left',
  'margin-right',
  'margin-top',
  'margin-bottom',
  'padding-left',
  'padding-right',
  'vertical-align',
  'border-bottom-width',
  'border-top-width',
  'border-color',
  'color',
  'font-size',
  'position',
  'display'
]);

function escapeHtmlEntities(raw: string): string {
  return String(raw)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function sanitizeInlineStyleValue(styleText: string): string {
  const declarations = styleText.split(';');
  const safeParts: string[] = [];

  for (const decl of declarations) {
    const colonIdx = decl.indexOf(':');
    if (colonIdx <= 0) continue;
    const prop = decl.slice(0, colonIdx).trim().toLowerCase();
    const val = decl.slice(colonIdx + 1).trim();

    if (!SAFE_KATEX_STYLE_PROPS.has(prop)) continue;
    // Block CSS url(), expression(),fixed/sticky overlays, or scriptable tokens
    if (/url\s*\(|expression\s*\(|javascript:|@import|fixed|sticky/i.test(val)) continue;
    if (val.length > 80) continue;

    safeParts.push(`${prop}: ${val}`);
  }

  return safeParts.join('; ');
}

let hooksRegistered = false;
function ensureDomPurifyHooks(): void {
  if (hooksRegistered || typeof DOMPurify.addHook !== 'function') return;
  hooksRegistered = true;

  DOMPurify.addHook('uponSanitizeAttribute', (node, data) => {
    const attrName = data.attrName.toLowerCase();

    if (attrName === 'style') {
      const cleaned = sanitizeInlineStyleValue(data.attrValue || '');
      if (!cleaned) {
        data.keepAttr = false;
      } else {
        data.attrValue = cleaned;
      }
      return;
    }

    if (attrName === 'href') {
      const trimmed = (data.attrValue || '').trim();
      if (/^(javascript|data|vbscript):/i.test(trimmed)) {
        data.keepAttr = false;
        return;
      }
      if (/^https?:\/\//i.test(trimmed) && node && 'setAttribute' in node) {
        node.setAttribute('target', '_blank');
        node.setAttribute('rel', 'noopener noreferrer');
      }
    }
  });
}

/**
 * Safely renders Markdown with embedded LaTeX expressions (\( ... \), \[ ... \], $$ ... $$)
 * using KaTeX + Marked + hardened DOMPurify sanitization.
 */
export function renderScholarlyMarkdown(markdown: string): string {
  if (!markdown) return '';

  const mathBlocks: string[] = [];

  // Replace display math \[ ... \] and $$ ... $$ with placeholders first
  let processed = markdown.replace(/\\\[([\s\S]*?)\\\]|\$\$([\s\S]*?)\$\$/g, (_match, g1, g2) => {
    const tex = (g1 || g2 || '').trim();
    try {
      const html = katex.renderToString(tex, {
        displayMode: true,
        output: 'html',
        throwOnError: false,
        strict: 'ignore'
      });
      const idx = mathBlocks.length;
      mathBlocks.push(
        `<div class="my-3.5 py-3 px-4 rounded-xl bg-[#F8FAFC] dark:bg-[#111622] border border-[#E5E7EB] dark:border-[#2A3244] text-[#0A0A0A] dark:text-[#F4F4F0] overflow-x-auto flex items-center justify-center"><div class="min-w-0">${html}</div></div>`
      );
      return `@@MATH_BLOCK_${idx}@@`;
    } catch {
      return `<code>${escapeHtmlEntities(tex)}</code>`;
    }
  });

  // Replace inline math \( ... \)
  processed = processed.replace(/\\\(([\s\S]*?)\\\)/g, (_match, g1) => {
    const tex = (g1 || '').trim();
    try {
      const html = katex.renderToString(tex, {
        displayMode: false,
        output: 'html',
        throwOnError: false,
        strict: 'ignore'
      });
      const idx = mathBlocks.length;
      mathBlocks.push(html);
      return `@@MATH_BLOCK_${idx}@@`;
    } catch {
      return `<code>${escapeHtmlEntities(tex)}</code>`;
    }
  });

  // Parse Markdown
  const rawHtml = marked.parse(processed, { async: false }) as string;

  // Restore math blocks
  const withMath = rawHtml.replace(/@@MATH_BLOCK_(\d+)@@/g, (_m, idxStr) => {
    const idx = Number(idxStr);
    return mathBlocks[idx] || '';
  });

  ensureDomPurifyHooks();

  return DOMPurify.sanitize(withMath, {
    ALLOW_DATA_ATTR: false,
    FORBID_TAGS: [
      'script',
      'iframe',
      'object',
      'embed',
      'form',
      'input',
      'button',
      'textarea',
      'select',
      'style',
      'link',
      'meta',
      'base'
    ],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'srcdoc'],
    ADD_TAGS: [
      'math',
      'semantics',
      'mrow',
      'mi',
      'mo',
      'mn',
      'msup',
      'msub',
      'msubsup',
      'mfrac',
      'msqrt',
      'mroot',
      'mtext',
      'mspace',
      'mtable',
      'mtr',
      'mtd',
      'annotation',
      'svg',
      'path',
      'line'
    ],
    ADD_ATTR: [
      'class',
      'style',
      'aria-hidden',
      'encoding',
      'xmlns',
      'viewBox',
      'd',
      'preserveAspectRatio',
      'target',
      'rel'
    ]
  });
}
