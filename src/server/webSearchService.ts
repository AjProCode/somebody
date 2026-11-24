import { GoogleGenAI } from '@google/genai';

export interface WebSearchSource {
  title: string;
  url: string;
  domain: string;
  snippet: string;
}

export interface LiveWebSearchResult {
  query: string;
  provider: 'gemini-google-search' | 'live-web-federated' | 'unavailable' | 'not-needed';
  summary: string;
  sources: WebSearchSource[];
  retrievedAt: string;
  note?: string;
}

export interface WebSearchNeedInput {
  query: string;
  subject?: string;
  hasImage?: boolean;
  workflowType?: string;
  isTestStudio?: boolean;
  webSearchEnabled: boolean;
  strongTextbookMatch: boolean;
}

export interface WebSearchNeedDecision {
  needed: boolean;
  reason:
    | 'disabled'
    | 'restricted_workflow'
    | 'greeting_or_conversational'
    | 'pure_calculation_or_homework'
    | 'covered_by_textbook'
    | 'explicit_web_request'
    | 'current_or_time_sensitive'
    | 'beyond_textbook_general_knowledge';
}

const RESTRICTED_WEB_WORKFLOWS = new Set([
  'revision_quiz',
  'revision_test',
  'question_paper_generator',
  'answer_evaluator',
  'lesson_plan_architect',
  'parent_circular_generator'
]);

const EXPLICIT_WEB_REQUEST_PATTERN =
  /\b(search\s+(the\s+)?web|search\s+online|web\s+search|from\s+(the\s+)?(web|internet)|find\s+(me\s+)?(links|websites|sources|articles)|cite\s+websites|google\s+this|look\s+up\s+online|give\s+me\s+(web\s+)?(links|sources))\b/i;

const CURRENT_OR_TIME_SENSITIVE_PATTERN =
  /\b(latest|current|currently|today|yesterday|this\s+(week|month|year)|recent|recently|news|live\s+update|live\s+score|updates?|202[4-9]|203\d|right\s+now|who\s+is\s+the\s+(current\s+)?(president|prime\s+minister|chief\s+minister|governor|ceo|captain|chancellor|speaker)|won\s+the|winner\s+of|world\s+cup|olympics|election\s+results?|weather|aqi|air\s+quality|current\s+population|gdp\s+of|latest\s+mission|chandrayaan|gaganyaan|aditya[\s-]?l1|isro\s+mission|nasa\s+mission|artemis\s+mission|nobel\s+prize|ipl\s+\d{4}|cricket\s+match|breaking)\b/i;

const GREETING_OR_SHORT_META_PATTERN =
  /^(hi|hello|hey|namaste|good\s+(morning|afternoon|evening|night)|thanks|thank\s+you|thx|ok|okay|got\s+it|understood|sure|yes|no|bye|goodbye|cool|great|awesome|nice|help|test|testing)[!.?\s]*$/i;

const CONVERSATIONAL_OR_CREATIVE_PATTERN =
  /^(explain\s+(again|more|simply|this)|simplify\s+(this|that)|give\s+(me\s+)?another\s+example|make\s+it\s+shorter|summarize(\s+this|\s+that)?|translate\s+this|check\s+my\s+(grammar|spelling|work|answer)|correct\s+this\s+sentence|write\s+(a|an)\s+(short\s+)?(essay|letter|story|poem|paragraph|speech|dialogue|diary|notice|email|application|composition)|give\s+me\s+study\s+tips|how\s+to\s+(study|prepare\s+for\s+exams?)|make\s+a\s+(study\s+)?timetable)\b/i;

const PURE_CALCULATION_PATTERN =
  /^[\d\s+\-*/×÷^%().,=<>xXyYzZaAbBcC]+$/;

const HOMEWORK_SOLVE_PATTERN =
  /\b(solve|calculate|compute|evaluate|find\s+the\s+value(\s+of)?|simplify|factori[sz]e|convert\s+\d|what\s+is\s+\d+\s*[+\-*/×÷^%]|divide\s+\d|multiply\s+\d|add\s+\d|subtract\s+\d|lcm\s+of\s+\d|hcf\s+of\s+\d|square\s+root\s+of\s+\d|percentage\s+of\s+\d)\b/i;

const STOP_WORDS = new Set([
  'the',
  'and',
  'for',
  'with',
  'that',
  'this',
  'from',
  'into',
  'about',
  'what',
  'when',
  'where',
  'which',
  'who',
  'whom',
  'whose',
  'why',
  'how',
  'are',
  'was',
  'were',
  'been',
  'being',
  'have',
  'has',
  'had',
  'does',
  'did',
  'can',
  'could',
  'should',
  'would',
  'will',
  'shall',
  'may',
  'might',
  'must',
  'explain',
  'describe',
  'define',
  'tell',
  'give',
  'show',
  'please',
  'help',
  'class',
  'grade',
  'icse',
  'ncse',
  'ncert',
  'chapter',
  'topic',
  'question',
  'answer',
  'latest',
  'current',
  'currently',
  'today',
  'recent',
  'recently',
  'update',
  'updates',
  'news',
  'search',
  'web',
  'online',
  'internet',
  'links',
  'sources',
  'find',
  'about',
  'more',
  'info',
  'information',
  'details'
]);

const BLOCKED_HOSTS = [
  'doubleclick.net',
  'googleadservices.com',
  'googlesyndication.com',
  'adservice.google.com',
  'taboola.com',
  'outbrain.com',
  'bit.ly',
  'tinyurl.com',
  't.co',
  'goo.gl',
  'ow.ly',
  'amazon.',
  'flipkart.',
  'ebay.',
  'aliexpress.',
  'temu.',
  'walmart.',
  'etsy.',
  'pinterest.',
  'shein.',
  'myntra.',
  'meesho.',
  'snapdeal.',
  'olx.',
  'craigslist.',
  'pornhub.',
  'xvideos.',
  'xnxx.',
  'redtube.',
  'youporn.',
  'onlyfans.',
  'chaturbate.',
  'stripchat.',
  'brazzers.',
  'playboy.',
  'bet365.',
  '1xbet.',
  'betway.',
  'dream11.',
  'pokerstars.',
  'rummycircle.',
  'thepiratebay.',
  '1337x.',
  'liveleak.',
  'bestgore.'
];

const INAPPROPRIATE_SCHOOL_CONTENT_PATTERN =
  /\b(porn|porno|pornography|xxx|nsfw|hentai|onlyfans|xvideos|xnxx|pornhub|redtube|youporn|chaturbate|stripchat|erotic|erotica|escort|fetish|bdsm|sexting|nude|nudes|naked|camgirl|camboy|playboy|brazzers|milf|explicit\s+sex|adult\s+video|strip\s+club|casino|gambling|sportsbook|slot\s+machine|roulette|bet365|1xbet|betway|pokerstars|dream11|satta|matka|rummycircle|piratebay|torrent\s+download|cracked\s+apk|keygen|warez|buy\s+weed|cocaine|heroin|methamphetamine|suicide\s+method|self[\s-]?harm|bestgore|liveleak|beheading)\b/i;

const TRUSTED_ACADEMIC_DOMAINS = [
  'wikipedia.org',
  'britannica.com',
  'ncert.nic.in',
  'cisce.org',
  'isro.gov.in',
  'nasa.gov',
  'khanacademy.org',
  'nationalgeographic.com',
  'bbc.com',
  'bbc.co.uk',
  'who.int',
  'un.org',
  'unesco.org',
  'nature.com',
  'sciencedirect.com',
  'smithsonianmag.com',
  'cambridge.org',
  'oxfordlearnersdictionaries.com',
  'merriam-webster.com',
  'pib.gov.in',
  'india.gov.in',
  'esa.int',
  'noaa.gov',
  'nih.gov'
];

export function evaluateWebSearchNeed(input: WebSearchNeedInput): WebSearchNeedDecision {
  if (input.isTestStudio || (input.workflowType && RESTRICTED_WEB_WORKFLOWS.has(input.workflowType))) {
    return { needed: false, reason: 'restricted_workflow' };
  }

  if (!input.webSearchEnabled) {
    return { needed: false, reason: 'disabled' };
  }

  const trimmed = (input.query || '').replace(/\[.*?\]/g, ' ').replace(/\s+/g, ' ').trim();
  if (trimmed.length < 4 || GREETING_OR_SHORT_META_PATTERN.test(trimmed)) {
    return { needed: false, reason: 'greeting_or_conversational' };
  }

  if (EXPLICIT_WEB_REQUEST_PATTERN.test(trimmed)) {
    return { needed: true, reason: 'explicit_web_request' };
  }

  if (CURRENT_OR_TIME_SENSITIVE_PATTERN.test(trimmed)) {
    return { needed: true, reason: 'current_or_time_sensitive' };
  }

  if (CONVERSATIONAL_OR_CREATIVE_PATTERN.test(trimmed)) {
    return { needed: false, reason: 'greeting_or_conversational' };
  }

  if (
    PURE_CALCULATION_PATTERN.test(trimmed) ||
    (HOMEWORK_SOLVE_PATTERN.test(trimmed) && /\d/.test(trimmed))
  ) {
    return { needed: false, reason: 'pure_calculation_or_homework' };
  }

  // Uploaded worksheets / diagrams don't need external web search unless explicitly requested or current-event related
  if (input.hasImage) {
    return { needed: false, reason: 'pure_calculation_or_homework' };
  }

  if (input.strongTextbookMatch) {
    return { needed: false, reason: 'covered_by_textbook' };
  }

  return { needed: true, reason: 'beyond_textbook_general_knowledge' };
}

export function isAppropriateTextForSchool(text: string): boolean {
  if (!text) return true;
  return !INAPPROPRIATE_SCHOOL_CONTENT_PATTERN.test(text);
}

function isLocalOrPrivateHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  if (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '0.0.0.0' ||
    host === '::1' ||
    host.endsWith('.local') ||
    host.endsWith('.internal')
  ) {
    return true;
  }
  if (/^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host)) {
    return true;
  }
  return false;
}

function extractMeaningfulTokens(query: string): string[] {
  return query
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((tok) => tok.length >= 3 && !STOP_WORDS.has(tok));
}

export function isAppropriateWebSource(
  source: WebSearchSource,
  query: string,
  options?: { allowGroundingRedirect?: boolean }
): boolean {
  if (!source || typeof source.url !== 'string' || typeof source.title !== 'string') {
    return false;
  }

  const rawUrl = source.url.trim();
  const title = source.title.trim();
  const snippet = String(source.snippet || '').trim();
  if (!rawUrl || !title) return false;

  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return false;
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return false;
  }

  const hostname = parsed.hostname.toLowerCase().replace(/^www\./, '');
  if (!hostname || !hostname.includes('.') || isLocalOrPrivateHost(hostname)) {
    return false;
  }

  // Block ad redirectors and tracking URLs
  const lowerUrl = rawUrl.toLowerCase();
  if (
    lowerUrl.includes('duckduckgo.com/y.js') ||
    lowerUrl.includes('ad_domain=') ||
    lowerUrl.includes('ad_provider=') ||
    lowerUrl.includes('ad_type=') ||
    lowerUrl.includes('bing.com/aclick')
  ) {
    return false;
  }

  // Block commercial spam, URL shorteners, gambling, piracy, and adult domains
  const checkHostAndTitle = `${hostname} ${title.toLowerCase()}`;
  for (const blocked of BLOCKED_HOSTS) {
    if (hostname.includes(blocked) || checkHostAndTitle.includes(blocked)) {
      return false;
    }
  }

  // Strict K-12 Class 7 (ages 11-14) school safety check across URL, title, and snippet
  const combinedText = `${rawUrl} ${title} ${snippet}`;
  if (!isAppropriateTextForSchool(combinedText)) {
    return false;
  }

  // Grounding redirect links from Gemini Google Search already passed Google Search retrieval;
  // skip strict URL/snippet token overlap only for vertexaisearch grounding links when title is clean.
  const isVertexGroundingLink =
    Boolean(options?.allowGroundingRedirect) &&
    hostname.endsWith('vertexaisearch.cloud.google.com');

  if (!isVertexGroundingLink) {
    const queryTokens = extractMeaningfulTokens(query);
    if (queryTokens.length > 0) {
      const searchable = `${title} ${snippet} ${hostname} ${parsed.pathname}`.toLowerCase();
      const hasOverlap = queryTokens.some((tok) => searchable.includes(tok));
      if (!hasOverlap) {
        return false;
      }
    }
  }

  return true;
}

function scoreWebSourceQuality(source: WebSearchSource, query: string): number {
  const domain = source.domain.toLowerCase();
  let score = 0;

  if (source.url.startsWith('https://')) score += 1;

  if (
    domain.endsWith('.edu') ||
    domain.endsWith('.edu.in') ||
    domain.endsWith('.ac.in') ||
    domain.endsWith('.gov') ||
    domain.endsWith('.gov.in') ||
    domain.endsWith('.nic.in')
  ) {
    score += 6;
  }

  if (TRUSTED_ACADEMIC_DOMAINS.some((trusted) => domain === trusted || domain.endsWith(`.${trusted}`))) {
    score += 5;
  }

  const queryTokens = extractMeaningfulTokens(query);
  const searchable = `${source.title} ${source.snippet}`.toLowerCase();
  for (const tok of queryTokens) {
    if (source.title.toLowerCase().includes(tok)) {
      score += 2.5;
    } else if (searchable.includes(tok)) {
      score += 1;
    }
  }

  return score;
}

function filterAndRankWebSources(
  candidates: WebSearchSource[],
  query: string,
  options?: { allowGroundingRedirect?: boolean; limit?: number }
): WebSearchSource[] {
  const limit = options?.limit ?? 4;
  const seenUrls = new Set<string>();
  const valid: Array<{ source: WebSearchSource; score: number }> = [];

  for (const src of candidates) {
    const normalizedUrl = (src.url || '').trim().replace(/\/$/, '');
    if (!normalizedUrl || seenUrls.has(normalizedUrl)) continue;
    if (!isAppropriateWebSource(src, query, options)) continue;

    seenUrls.add(normalizedUrl);
    valid.push({
      source: {
        ...src,
        domain: extractDomain(src.url)
      },
      score: scoreWebSourceQuality(src, query)
    });
  }

  return valid
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((entry) => entry.source);
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
    .replace(/&#(\d+);/g, (_m, dec) => {
      const code = Number(dec);
      return Number.isFinite(code) && code >= 32 && code <= 126 ? String.fromCharCode(code) : ' ';
    })
    .replace(/&#x([0-9a-fA-F]+);/g, (_m, hex) => {
      const code = parseInt(hex, 16);
      return Number.isFinite(code) && code >= 32 && code <= 126 ? String.fromCharCode(code) : ' ';
    })
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
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
      `Perform a strictly school-safe, age-appropriate (ICSE Class 7, ages 11–14) factual live web search for this academic inquiry${
        subject ? ` (Subject: ${subject})` : ''
      }:`,
      query,
      '',
      'Safety & Relevance Rules:',
      '- Only use reputable educational, institutional, scientific, encyclopedic, or verified news sources.',
      '- Exclude adult, violent, gambling, shopping, spam, or off-topic sites.',
      '- Return a concise, verified factual summary (3 to 5 bullet points max) strictly grounded in search results. Do not invent facts or URLs.'
    ].join('\n');

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: groundedPrompt,
      config: {
        tools: [{ googleSearch: {} }]
      }
    });

    const rawSummaryText = (response.text || '').trim();
    const summaryText = isAppropriateTextForSchool(rawSummaryText) ? rawSummaryText : '';
    const rawChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const rawSources: WebSearchSource[] = [];

    for (const chunk of rawChunks) {
      const uri = chunk?.web?.uri;
      const title = chunk?.web?.title;
      if (typeof uri === 'string' && uri.startsWith('http')) {
        rawSources.push({
          title: (typeof title === 'string' && title.trim()) || extractDomain(uri),
          url: uri,
          domain: extractDomain(uri),
          snippet: 'Verified via Google Search grounding'
        });
      }
    }

    const sources = filterAndRankWebSources(rawSources, query, {
      allowGroundingRedirect: true,
      limit: 4
    });

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
    )}&srlimit=5&utf8=1&format=json`;
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
    for (const item of items.slice(0, 5)) {
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
    // kp=1 enforces Strict SafeSearch on DuckDuckGo
    const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(
      query
    )}&format=json&no_html=1&skip_disambig=1&kp=1`;
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
        if (item?.FirstURL && item?.Text && results.length < 5) {
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
      if (results.length >= 5) break;
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
    // kp=1 enforces Strict SafeSearch on DuckDuckGo HTML search
    const res = await fetch(
      `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}&kp=1`,
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
    while ((sMatch = snippetRegex.exec(html)) !== null && snippets.length < 10) {
      snippets.push(stripHtmlTags(sMatch[1] || sMatch[2] || '').slice(0, 220));
    }

    let match: RegExpExecArray | null;
    let idx = 0;
    while ((match = linkRegex.exec(html)) !== null && sources.length < 8) {
      let href = match[1] || '';
      const rawTitle = stripHtmlTags(match[2] || '');

      // Skip DuckDuckGo sponsored/ad redirect links
      if (href.includes('duckduckgo.com/y.js') || href.includes('ad_domain=')) {
        idx++;
        continue;
      }

      // Decode DuckDuckGo redirect URLs (?uddg=...)
      if (href.includes('uddg=')) {
        try {
          const parsed = new URL(
            href.startsWith('//') ? `https:${href}` : href,
            'https://duckduckgo.com'
          );
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

  // Reject unsafe queries outright before making any external request
  if (!isAppropriateTextForSchool(cleanedQuery)) {
    return {
      query: cleanedQuery,
      provider: 'unavailable',
      summary: '',
      sources: [],
      retrievedAt: new Date().toISOString(),
      note: 'Web search was filtered to keep results strictly school-safe for Class 7 students.'
    };
  }

  // 1. Primary: Gemini 4 Hydrogen with native Google Search Grounding when GEMINI_API_KEY is available
  const geminiResult = await searchViaGeminiGoogleGrounding(cleanedQuery, params.subject);
  if (geminiResult && (geminiResult.sources.length > 0 || geminiResult.summary.length > 20)) {
    return geminiResult;
  }

  // 2. Universal Live Web Search: Parallel Wikipedia + DuckDuckGo Instant Answer + DuckDuckGo SafeSearch Web
  const [wikiSources, ddgInstant, ddgHtml] = await Promise.all([
    fetchWikipediaSources(cleanedQuery),
    fetchDuckDuckGoSources(cleanedQuery),
    fetchDuckDuckGoHtmlResults(cleanedQuery)
  ]);

  const filtered = filterAndRankWebSources([...wikiSources, ...ddgInstant, ...ddgHtml], cleanedQuery, {
    allowGroundingRedirect: false,
    limit: 4
  });

  if (filtered.length === 0) {
    return {
      query: cleanedQuery,
      provider: 'unavailable',
      summary: '',
      sources: [],
      retrievedAt: new Date().toISOString(),
      note: 'No school-appropriate, topic-relevant external web sources were found for this query right now.'
    };
  }

  const summaryBullets = filtered
    .slice(0, 4)
    .map((s) => `- **${s.title}** (${s.domain}): ${s.snippet}`)
    .join('\n');

  return {
    query: cleanedQuery,
    provider: 'live-web-federated',
    summary: summaryBullets,
    sources: filtered,
    retrievedAt: new Date().toISOString()
  };
}

export function formatWebSearchGroundingBlock(searchResult: LiveWebSearchResult | null): string {
  if (!searchResult || searchResult.provider === 'not-needed') return '';

  if (searchResult.sources.length === 0 && !searchResult.summary) {
    return [
      '================================================================================',
      'LIVE WEB SEARCH STATUS (PROTOCOL 55 HONESTY)',
      '================================================================================',
      `Live web search was requested for "${searchResult.query}", but no appropriate external web sources were returned.`,
      'State honestly if up-to-the-minute external facts could not be verified live, and do NOT fabricate URLs.',
      '================================================================================'
    ].join('\n');
  }

  const lines: string[] = [
    '================================================================================',
    `LIVE WEB SEARCH GROUNDING (${searchResult.provider.toUpperCase()} · Retrieved ${searchResult.retrievedAt})`,
    '================================================================================',
    `Query: "${searchResult.query}"`,
    'Use these school-safe, live retrieved web excerpts to ensure factual accuracy and up-to-date context.',
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
  if (!cleanQ || !isAppropriateTextForSchool(cleanQ)) return [];

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
          const title = String(page?.title || 'Encyclopedic Diagram').slice(0, 100);
          const description =
            String(page?.extract || '').replace(/\s+/g, ' ').trim().slice(0, 180) ||
            'Wikipedia encyclopedic diagram and visual reference.';
          if (
            !thumbUrl.startsWith('https://') ||
            !imageUrl.startsWith('https://') ||
            /flag|icon|logo|commons-logo|ambox|padlock/i.test(thumbUrl) ||
            !isAppropriateTextForSchool(`${title} ${description} ${imageUrl}`) ||
            (width > 0 && width < 140) ||
            seenUrls.has(imageUrl)
          ) {
            continue;
          }
          seenUrls.add(imageUrl);
          results.push({
            title,
            imageUrl,
            thumbUrl,
            pageUrl: String(page?.fullurl || imageUrl),
            description,
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

      const meta = info.extmetadata || {};
      const rawTitle = String(page.title || '')
        .replace(/^File:/i, '')
        .replace(/\.[a-z0-9]+$/i, '')
        .replace(/[_-]+/g, ' ')
        .trim();
      const description = stripHtmlTags(String(meta.ImageDescription?.value || '')).slice(0, 180);
      const license = stripHtmlTags(String(meta.LicenseShortName?.value || 'Wikimedia Commons')).slice(0, 60);

      if (!isAppropriateTextForSchool(`${rawTitle} ${description} ${imageUrl}`)) {
        continue;
      }

      seenUrls.add(imageUrl);
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
