import { GoogleGenAI } from '@google/genai';

export interface WebSearchSource {
  title: string;
  url: string;
  domain: string;
  snippet: string;
}

export interface LiveWebSearchResult {
  query: string;
  provider: 'gemini-google-search' | 'live-web-federated' | 'unavailable';
  summary: string;
  sources: WebSearchSource[];
  retrievedAt: string;
  note?: string;
}

function getGeminiApiKey(): string {
  const raw = process.env.GEMINI_API_KEY || '';
  const trimmed = raw.trim();
  if (!trimmed || trimmed === 'MY_GEMINI_API_KEY' || trimmed.length < 10) {
    return '';
  }
  return trimmed;
}

function extractDomain(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./i, '');
  } catch {
    return 'web';
  }
}

function stripHtmlTags(input: string): string {
  return input
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanSearchQuery(raw: string, subject?: string): string {
  const stripped = raw
    .replace(/\[.*?\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 260);
  if (!stripped) return subject ? `ICSE Class 7 ${subject}` : 'ICSE Class 7 curriculum';
  return stripped;
}

async function searchViaGeminiGoogleGrounding(
  query: string,
  subject?: string
): Promise<LiveWebSearchResult | null> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) return null;

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
    });

    const groundedPrompt = [
      `Perform a factual live web search for this ICSE Class 7 academic inquiry${
        subject ? ` (Subject: ${subject})` : ''
      }:`,
      query,
      '',
      'Return a concise, verified factual summary (3 to 5 bullet points max) strictly grounded in search results. Do not invent facts or URLs.'
    ].join('\n');

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: groundedPrompt,
      config: {
        tools: [{ googleSearch: {} }]
      }
    });

    const summaryText = (response.text || '').trim();
    const rawChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const seenUrls = new Set<string>();
    const sources: WebSearchSource[] = [];

    for (const chunk of rawChunks) {
      const uri = chunk?.web?.uri;
      const title = chunk?.web?.title;
      if (typeof uri === 'string' && uri.startsWith('http') && !seenUrls.has(uri)) {
        seenUrls.add(uri);
        sources.push({
          title: (typeof title === 'string' && title.trim()) || extractDomain(uri),
          url: uri,
          domain: extractDomain(uri),
          snippet: 'Verified via Google Search grounding'
        });
      }
      if (sources.length >= 6) break;
    }

    if (summaryText || sources.length > 0) {
      return {
        query,
        provider: 'gemini-google-search',
        summary: summaryText.slice(0, 1400),
        sources,
        retrievedAt: new Date().toISOString()
      };
    }
    return null;
  } catch {
    return null;
  }
}

async function fetchWikipediaSources(query: string): Promise<WebSearchSource[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5500);
  try {
    const url = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
      query
    )}&srlimit=4&utf8=1&format=json`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'JaipuriaMedhaviScholar/1.0 (ICSE Class 7 Educational Research)'
      },
      signal: controller.signal
    });
    clearTimeout(timeout);
    if (!res.ok) return [];
    const data = await res.json();
    const items = Array.isArray(data?.query?.search) ? data.query.search : [];

    const sources: WebSearchSource[] = [];
    for (const item of items.slice(0, 4)) {
      const title = String(item?.title || '').trim();
      if (!title) continue;
      const articleUrl = `https://en.wikipedia.org/wiki/${encodeURIComponent(
        title.replace(/\s+/g, '_')
      )}`;
      const snippet = stripHtmlTags(String(item?.snippet || '')).slice(0, 220);
      sources.push({
        title,
        url: articleUrl,
        domain: 'en.wikipedia.org',
        snippet: snippet ? `${snippet}…` : 'Wikipedia encyclopedia reference'
      });
    }
    return sources;
  } catch {
    clearTimeout(timeout);
    return [];
  }
}

async function fetchDuckDuckGoSources(query: string): Promise<WebSearchSource[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5500);
  try {
    const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(
      query
    )}&format=json&no_html=1&skip_disambig=1`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'JaipuriaMedhaviScholar/1.0 (Educational Reference)'
      },
      signal: controller.signal
    });
    clearTimeout(timeout);
    if (!res.ok) return [];
    const data = await res.json();
    const results: WebSearchSource[] = [];

    if (data?.AbstractURL && data?.AbstractText) {
      results.push({
        title: String(data.Heading || query).trim(),
        url: String(data.AbstractURL),
        domain: extractDomain(String(data.AbstractURL)),
        snippet: String(data.AbstractText).slice(0, 240)
      });
    }

    const related = Array.isArray(data?.RelatedTopics) ? data.RelatedTopics : [];
    for (const entry of related) {
      const candidates = Array.isArray(entry?.Topics) ? entry.Topics : [entry];
      for (const item of candidates) {
        if (item?.FirstURL && item?.Text && results.length < 4) {
          const textStr = String(item.Text);
          const dashIdx = textStr.indexOf(' - ');
          const title = dashIdx > 0 ? textStr.slice(0, dashIdx) : textStr.slice(0, 72);
          results.push({
            title: title.trim(),
            url: String(item.FirstURL),
            domain: extractDomain(String(item.FirstURL)),
            snippet: textStr.slice(0, 220)
          });
        }
      }
      if (results.length >= 4) break;
    }

    return results;
  } catch {
    clearTimeout(timeout);
    return [];
  }
}

async function fetchDuckDuckGoHtmlResults(query: string): Promise<WebSearchSource[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5500);
  try {
    const res = await fetch(
      `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`,
      {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
          Accept: 'text/html'
        },
        signal: controller.signal
      }
    );
    clearTimeout(timeout);
    if (!res.ok) return [];
    const html = await res.text();
    const sources: WebSearchSource[] = [];

    const linkRegex =
      /<a[^>]*class="[^"]*result__a[^"]*"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
    const snippetRegex =
      /<a[^>]*class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/a>|<div[^>]*class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/div>/gi;

    const snippets: string[] = [];
    let sMatch: RegExpExecArray | null;
    while ((sMatch = snippetRegex.exec(html)) !== null && snippets.length < 6) {
      snippets.push(stripHtmlTags(sMatch[1] || sMatch[2] || '').slice(0, 220));
    }

    let match: RegExpExecArray | null;
    let idx = 0;
    while ((match = linkRegex.exec(html)) !== null && sources.length < 5) {
      let href = match[1] || '';
      const rawTitle = stripHtmlTags(match[2] || '');
      // Decode DuckDuckGo redirect URLs (?uddg=...)
      if (href.includes('uddg=')) {
        try {
          const parsed = new URL(href.startsWith('//') ? `https:${href}` : href, 'https://duckduckgo.com');
          const decoded = parsed.searchParams.get('uddg');
          if (decoded) href = decoded;
        } catch {
          // keep original
        }
      }
      if (href.startsWith('http') && rawTitle) {
        sources.push({
          title: rawTitle.slice(0, 120),
          url: href,
          domain: extractDomain(href),
          snippet: snippets[idx] || 'Live web search result'
        });
      }
      idx++;
    }
    return sources;
  } catch {
    clearTimeout(timeout);
    return [];
  }
}

export async function performLiveWebSearch(params: {
  query: string;
  subject?: string;
}): Promise<LiveWebSearchResult> {
  const cleanedQuery = cleanSearchQuery(params.query, params.subject);

  // 1. Primary: Gemini 4 Hydrogen with native Google Search Grounding when GEMINI_API_KEY is available
  const geminiResult = await searchViaGeminiGoogleGrounding(cleanedQuery, params.subject);
  if (geminiResult && (geminiResult.sources.length > 0 || geminiResult.summary.length > 20)) {
    return geminiResult;
  }

  // 2. Universal Live Web Search: Parallel Wikipedia + DuckDuckGo Instant Answer + DuckDuckGo Web
  const [wikiSources, ddgInstant, ddgHtml] = await Promise.all([
    fetchWikipediaSources(cleanedQuery),
    fetchDuckDuckGoSources(cleanedQuery),
    fetchDuckDuckGoHtmlResults(cleanedQuery)
  ]);

  const seenUrls = new Set<string>();
  const merged: WebSearchSource[] = [];
  for (const src of [...ddgHtml, ...ddgInstant, ...wikiSources]) {
    const normalizedUrl = src.url.replace(/\/$/, '');
    if (!seenUrls.has(normalizedUrl) && src.url.startsWith('http')) {
      seenUrls.add(normalizedUrl);
      merged.push(src);
    }
    if (merged.length >= 6) break;
  }

  if (merged.length === 0) {
    return {
      query: cleanedQuery,
      provider: 'unavailable',
      summary: '',
      sources: [],
      retrievedAt: new Date().toISOString(),
      note: 'Live web search did not return external results for this query right now. Relying on verified Grade 7 ICSE/NCSE textbooks and institutional manual.'
    };
  }

  const summaryBullets = merged
    .slice(0, 4)
    .map((s) => `- **${s.title}** (${s.domain}): ${s.snippet}`)
    .join('\n');

  return {
    query: cleanedQuery,
    provider: 'live-web-federated',
    summary: summaryBullets,
    sources: merged,
    retrievedAt: new Date().toISOString()
  };
}

export function formatWebSearchGroundingBlock(searchResult: LiveWebSearchResult | null): string {
  if (!searchResult) return '';

  if (searchResult.sources.length === 0 && !searchResult.summary) {
    return [
      '================================================================================',
      'LIVE WEB SEARCH STATUS (PROTOCOL 55 HONESTY)',
      '================================================================================',
      `Live web search was requested for "${searchResult.query}", but no external web sources were returned.`,
      'State honestly if up-to-the-minute external facts could not be verified live, and do NOT fabricate URLs.',
      '================================================================================'
    ].join('\n');
  }

  const lines: string[] = [
    '================================================================================',
    `LIVE WEB SEARCH GROUNDING (${searchResult.provider.toUpperCase()} · Retrieved ${searchResult.retrievedAt})`,
    '================================================================================',
    `Query: "${searchResult.query}"`,
    'Use these live retrieved web excerpts to ensure factual accuracy and up-to-date context.',
    'Protocol 54 & 55 Rule: Only cite URLs explicitly listed below. Never invent external links or claims.',
    'Student Portal Zero-Leakage Rule STILL APPLIES: Never disclose direct homework/calculation answers to students.',
    ''
  ];

  if (searchResult.summary) {
    lines.push('Retrieved Web Synthesis:', searchResult.summary, '');
  }

  if (searchResult.sources.length > 0) {
    lines.push('Verified Live Web Sources:');
    searchResult.sources.forEach((src, i) => {
      lines.push(`[${i + 1}] ${src.title} — ${src.url}`);
      if (src.snippet) lines.push(`    Excerpt: ${src.snippet}`);
    });
  }

  lines.push('================================================================================');
  return lines.join('\n');
}

export function isGeminiSearchConfigured(): boolean {
  return Boolean(getGeminiApiKey());
}

export interface TextbookPageImageResult {
  title: string;
  imageUrl: string;
  thumbUrl: string;
  pageUrl: string;
  description: string;
  license: string;
  width?: number;
  height?: number;
}

export async function searchWikimediaPageImages(
  query: string,
  limit = 4
): Promise<TextbookPageImageResult[]> {
  const cleanQ = cleanSearchQuery(query).slice(0, 140);
  if (!cleanQ) return [];

  const results: TextbookPageImageResult[] = [];
  const seenUrls = new Set<string>();

  // 1. Primary: Curated encyclopedic diagrams/illustrations from Wikipedia article pageimages
  const wikiCtrl = new AbortController();
  const wikiTimeout = setTimeout(() => wikiCtrl.abort(), 5000);
  try {
    const wikiUrl = `https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(
      cleanQ
    )}&gsrlimit=${Math.min(8, limit * 2)}&prop=pageimages|extracts|info&inprop=url&exintro=1&explaintext=1&exchars=160&piprop=original|thumbnail&pithumbsize=960&format=json`;
    const res = await fetch(wikiUrl, {
      headers: {
        'User-Agent': 'JaipuriaMedhaviScholar/1.0 (ICSE Class 7 Educational Reference)'
      },
      signal: wikiCtrl.signal
    });
    clearTimeout(wikiTimeout);
    if (res.ok) {
      const data = await res.json();
      const pagesObj = data?.query?.pages;
      if (pagesObj && typeof pagesObj === 'object') {
        const sortedPages = (Object.values(pagesObj) as Array<any>).sort(
          (a, b) => (a.index ?? 99) - (b.index ?? 99)
        );
        for (const page of sortedPages) {
          const thumbUrl = String(page?.thumbnail?.source || '');
          const imageUrl = String(page?.original?.source || thumbUrl || '');
          const width = Number(page?.thumbnail?.width || page?.original?.width || 0);
          const height = Number(page?.thumbnail?.height || page?.original?.height || 0);
          if (
            !thumbUrl.startsWith('https://') ||
            !imageUrl.startsWith('https://') ||
            /flag|icon|logo|commons-logo|ambox|padlock/i.test(thumbUrl) ||
            (width > 0 && width < 140) ||
            seenUrls.has(imageUrl)
          ) {
            continue;
          }
          seenUrls.add(imageUrl);
          results.push({
            title: String(page?.title || 'Encyclopedic Diagram').slice(0, 100),
            imageUrl,
            thumbUrl,
            pageUrl: String(page?.fullurl || imageUrl),
            description:
              String(page?.extract || '').replace(/\s+/g, ' ').trim().slice(0, 180) ||
              'Wikipedia encyclopedic diagram and visual reference.',
            license: 'Wikimedia / Wikipedia Commons',
            width: width || undefined,
            height: height || undefined
          });
          if (results.length >= limit) return results;
        }
      }
    }
  } catch {
    clearTimeout(wikiTimeout);
  }

  // 2. Fallback: Wikimedia Commons explicit diagram search if fewer than `limit` found
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const commonsQuery = `${cleanQ} diagram`;
    const apiUrl = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrnamespace=6&gsrsearch=${encodeURIComponent(
      commonsQuery
    )}&gsrlimit=${Math.min(10, Math.max(4, limit * 2))}&prop=imageinfo&iiprop=url|mime|size|extmetadata&iiurlwidth=960&format=json`;

    const res = await fetch(apiUrl, {
      headers: {
        'User-Agent': 'JaipuriaMedhaviScholar/1.0 (ICSE Class 7 Educational Reference)'
      },
      signal: controller.signal
    });
    clearTimeout(timeout);
    if (!res.ok) return results;

    const data = await res.json();
    const pagesObj = data?.query?.pages;
    if (!pagesObj || typeof pagesObj !== 'object') return results;

    const allowedMimes = new Set(['image/jpeg', 'image/png', 'image/svg+xml', 'image/webp']);

    for (const page of Object.values(pagesObj) as Array<any>) {
      const info = Array.isArray(page?.imageinfo) ? page.imageinfo[0] : null;
      if (!info) continue;
      const mime = String(info.mime || '').toLowerCase();
      if (!allowedMimes.has(mime)) continue;

      const imageUrl = String(info.url || '');
      const thumbUrl = String(info.thumburl || info.url || '');
      if (!imageUrl.startsWith('https://') || !thumbUrl.startsWith('https://')) continue;
      if (seenUrls.has(imageUrl)) continue;
      seenUrls.add(imageUrl);

      const meta = info.extmetadata || {};
      const rawTitle = String(page.title || '')
        .replace(/^File:/i, '')
        .replace(/\.[a-z0-9]+$/i, '')
        .replace(/[_-]+/g, ' ')
        .trim();
      const description = stripHtmlTags(String(meta.ImageDescription?.value || '')).slice(0, 180);
      const license = stripHtmlTags(String(meta.LicenseShortName?.value || 'Wikimedia Commons')).slice(0, 60);

      results.push({
        title: rawTitle.slice(0, 100) || 'Educational Diagram',
        imageUrl,
        thumbUrl,
        pageUrl: String(info.descriptionurl || imageUrl),
        description: description || 'Open-access Wikimedia Commons educational illustration.',
        license: license || 'Wikimedia Commons',
        width: typeof info.width === 'number' ? info.width : undefined,
        height: typeof info.height === 'number' ? info.height : undefined
      });

      if (results.length >= limit) break;
    }

    return results;
  } catch {
    clearTimeout(timeout);
    return results;
  }
}

