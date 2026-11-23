import {
  LOCKED_GRADE,
  type CustomSpecItem,
  type IdVerificationResult,
  type IntelligenceMode,
  type PersonaRole
} from './medhaviEngine';

export interface StudioWebSource {
  title: string;
  url: string;
  domain: string;
  snippet: string;
}

export interface StudioExecutionResult {
  content: string;
  durationSeconds: number;
  reasoningTokens?: number;
  model?: string;
  source?: string;
  webSources?: StudioWebSource[];
}

export interface ExecuteStudioWorkflowParams {
  prompt: string;
  role: PersonaRole;
  subject: string;
  workflowType: string;
  verifiedIdentity?: IdVerificationResult | null;
  selectedModel?: string;
  customSpecs?: CustomSpecItem[];
  intelligenceMode?: IntelligenceMode;
  imageDataUrl?: string | null;
  workflowMeta?: Record<string, unknown>;
  onDelta?: (accumulatedContent: string) => void;
  signal?: AbortSignal;
}

export async function executeStudioWorkflow(
  params: ExecuteStudioWorkflowParams
): Promise<StudioExecutionResult> {
  const {
    prompt,
    role,
    subject,
    workflowType,
    verifiedIdentity = null,
    selectedModel = 'nvidia/nemotron-3.5-super-vl:free',
    customSpecs = [],
    intelligenceMode = 'pedagogical',
    imageDataUrl = null,
    workflowMeta = {},
    onDelta,
    signal
  } = params;

  const startTime = performance.now();
  let accumulatedText = '';
  let reasoningTokens = 0;
  let source = 'openrouter-live';
  let model = selectedModel;
  let webSources: StudioWebSource[] = [];

  const payload = {
    messages: [{ role: 'user', content: prompt }],
    context: {
      role,
      grade: LOCKED_GRADE,
      subject,
      intelligenceMode,
      model: selectedModel,
      customSpecs,
      workflowType,
      webSearchEnabled: false
    },
    webSearchEnabled: false,
    verifiedIdentity,
    imageDataUrl,
    workflowMeta
  };

  try {
    const response = await fetch('/api/chat/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal
    });

    if (response.status === 403 && role === 'teacher') {
      const errJson = await response.json().catch(() => ({}));
      throw new Error(errJson?.error || 'Unauthorized Faculty Studio access.');
    }

    if (response.ok && response.body) {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const block of lines) {
          const line = block.trim();
          if (!line.startsWith('data:')) continue;
          const jsonStr = line.replace(/^data:\s*/, '');
          try {
            const event = JSON.parse(jsonStr);
            if (event.type === 'delta' && event.content) {
              accumulatedText += event.content;
              onDelta?.(accumulatedText);
            } else if (event.type === 'reasoning_tokens' || event.type === 'usage') {
              const rToks = event.tokens ?? event.reasoningTokens;
              if (typeof rToks === 'number' && rToks > 0) {
                reasoningTokens = rToks;
              }
            } else if (event.type === 'done') {
              if (typeof event.reasoningTokens === 'number' && event.reasoningTokens > 0) {
                reasoningTokens = event.reasoningTokens;
              }
              if (typeof event.source === 'string') {
                source = event.source;
              }
              if (typeof event.model === 'string') {
                model = event.model;
              }
              if (Array.isArray(event.webSources)) {
                webSources = event.webSources;
              }
            }
          } catch {
            // ignore partial SSE JSON lines
          }
        }
      }
    }
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      throw err;
    }
    if (err?.message?.includes('Unauthorized')) {
      throw err;
    }
    // Fall through to unary /api/chat
  }

  if (!accumulatedText.trim()) {
    const fallbackRes = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal
    });

    if (!fallbackRes.ok) {
      const errJson = await fallbackRes.json().catch(() => ({}));
      throw new Error(errJson?.error || `Studio request failed (HTTP ${fallbackRes.status}).`);
    }

    const fallbackData = await fallbackRes.json();
    if (typeof fallbackData.reply === 'string' && fallbackData.reply.trim()) {
      accumulatedText = fallbackData.reply;
      if (typeof fallbackData.reasoningTokens === 'number') {
        reasoningTokens = fallbackData.reasoningTokens;
      }
      if (typeof fallbackData.source === 'string') {
        source = fallbackData.source;
      }
      if (typeof fallbackData.model === 'string') {
        model = fallbackData.model;
      }
      if (Array.isArray(fallbackData.webSources)) {
        webSources = fallbackData.webSources;
      }
      onDelta?.(accumulatedText);
    }
  }

  if (!accumulatedText.trim()) {
    throw new Error('Could not generate studio output. Please try again.');
  }

  const durationSeconds = Number(((performance.now() - startTime) / 1000).toFixed(1));
  return {
    content: accumulatedText,
    durationSeconds,
    reasoningTokens: reasoningTokens > 0 ? reasoningTokens : undefined,
    model,
    source,
    webSources
  };
}
