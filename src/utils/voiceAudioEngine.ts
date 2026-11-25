// 100% Local Browser Web Speech & Web Audio Engine for Jaipuria Medhavi (मेधावी)
// Uses native browser speechSynthesis, SpeechRecognition, and Web Audio API with zero external voice API keys.

export interface LocalVoiceProfile {
  id: string;
  name: string;
  label: string;
  description: string;
  gender: 'female' | 'male';
  badge: string;
  langPreference: string[];
  preferredNames: string[];
  defaultRate: number;
  defaultPitch: number;
}

export const LOCAL_VOICE_PROFILES: LocalVoiceProfile[] = [
  {
    id: 'local-educator-in',
    name: 'Meera',
    label: 'Class 7 Engaging Educator (Indian English)',
    description: 'Clear, calm Indian English scholarly cadence',
    gender: 'female',
    badge: 'Pedagogical & Concept Instruction',
    langPreference: ['en-IN', 'en-GB', 'en-US'],
    preferredNames: ['veena', 'heera', 'neerja', 'rishi', 'google', 'samantha', 'karen'],
    defaultRate: 0.98,
    defaultPitch: 1.02
  },
  {
    id: 'local-storyteller-gb',
    name: 'Aarav',
    label: 'Warm Storyteller (British English)',
    description: 'Resonant narrative tone for History & Literature',
    gender: 'male',
    badge: 'Historical & Narrative Scholar',
    langPreference: ['en-GB', 'en-IN', 'en-US'],
    preferredNames: ['daniel', 'arthur', 'oliver', 'rishi', 'george', 'alex'],
    defaultRate: 0.95,
    defaultPitch: 0.92
  },
  {
    id: 'local-mentor-us',
    name: 'Kavya',
    label: 'Socratic Mentor (Clear Academic)',
    description: 'Steady, encouraging pacing for step-by-step guidance',
    gender: 'female',
    badge: 'Socratic Guidance',
    langPreference: ['en-US', 'en-GB', 'en-IN'],
    preferredNames: ['samantha', 'victoria', 'zira', 'aria', 'google us english', 'moira'],
    defaultRate: 1.0,
    defaultPitch: 1.04
  },
  {
    id: 'local-scholar-fast',
    name: 'Vikram',
    label: 'Revision & Logic Coach',
    description: 'Crisp, brisk delivery ideal for 5-minute revision sheets',
    gender: 'male',
    badge: 'Revision & Logic Proofs',
    langPreference: ['en-IN', 'en-US', 'en-GB'],
    preferredNames: ['rishi', 'david', 'mark', 'daniel', 'google uk english male'],
    defaultRate: 1.08,
    defaultPitch: 0.96
  }
];

export const DEFAULT_VOICE_ID = LOCAL_VOICE_PROFILES[0].id;

let currentSpeechId = 0;
let activeMicStream: MediaStream | null = null;

export function getPreferredVoiceId(): string {
  if (typeof window === 'undefined') return DEFAULT_VOICE_ID;
  const saved = localStorage.getItem('medhavi_local_voice_id');
  if (saved && LOCAL_VOICE_PROFILES.some((v) => v.id === saved)) {
    return saved;
  }
  return DEFAULT_VOICE_ID;
}

export function setPreferredVoiceId(voiceId: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('medhavi_local_voice_id', voiceId);
}

/**
 * Eliminates stuttered, echoed, or consecutively repeated words and phrases
 * caused by browser Web Speech API interim result overlapping.
 */
export function cleanRepeatedSpeechTokens(raw: string): string {
  if (!raw) return '';
  let text = raw.replace(/\s+/g, ' ').trim();
  if (!text) return '';

  text = text.replace(/\b(\w+)(?:\s+\1\b)+/gi, '$1');
  text = text.replace(/\b(\w+\s+\w+)(?:\s+\1\b)+/gi, '$1');
  text = text.replace(/\b(\w+\s+\w+\s+\w+)(?:\s+\1\b)+/gi, '$1');
  text = text.replace(/\b(\w+\s+\w+\s+\w+\s+\w+)(?:\s+\1\b)+/gi, '$1');
  text = text.replace(/\b(\w+)(?:\s+\1\b)+/gi, '$1');
  text = text.replace(/\b(\w+\s+\w+)(?:\s+\1\b)+/gi, '$1');

  return text.trim();
}

function mergeSpeechRecognitionSegments(segments: string[]): string {
  let merged = '';
  for (const rawSeg of segments) {
    const seg = cleanRepeatedSpeechTokens(rawSeg);
    if (!seg) continue;
    if (!merged) {
      merged = seg;
      continue;
    }
    const mergedLower = merged.toLowerCase();
    const segLower = seg.toLowerCase();

    if (segLower.startsWith(mergedLower)) {
      merged = seg;
      continue;
    }
    if (mergedLower.endsWith(segLower)) {
      continue;
    }

    const mergedWords = merged.split(/\s+/);
    const segWords = seg.split(/\s+/);
    let overlapCount = 0;
    const maxOverlap = Math.min(mergedWords.length, segWords.length);
    for (let k = maxOverlap; k >= 1; k--) {
      const suffix = mergedWords.slice(-k).join(' ').toLowerCase();
      const prefix = segWords.slice(0, k).join(' ').toLowerCase();
      if (suffix === prefix) {
        overlapCount = k;
        break;
      }
    }

    if (overlapCount > 0) {
      const remaining = segWords.slice(overlapCount).join(' ');
      if (remaining) {
        merged = `${merged} ${remaining}`;
      }
    } else {
      merged = `${merged} ${seg}`;
    }
  }
  return cleanRepeatedSpeechTokens(merged);
}

export function playScholarlyChime(mode: 'start' | 'stop' | 'playback' = 'start'): void {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    const frequencies =
      mode === 'start'
        ? [523.25, 659.25, 783.99]
        : mode === 'stop'
        ? [783.99, 659.25, 523.25]
        : [440, 554.37, 659.25, 880];

    frequencies.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);
      gain.gain.setValueAtTime(0.001, now + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.08, now + idx * 0.08 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.08 + 0.24);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.26);
    });

    setTimeout(() => {
      try {
        if (ctx.state !== 'closed') {
          ctx.close();
        }
      } catch {
        // ignore
      }
    }, 600);
  } catch {
    // Ignore audio context autoplay restrictions
  }
}

/**
 * Cleans XML tags, markdown formatting, and LaTeX notation into fluid spoken academic English.
 */
export function stripMarkdownForSpeech(markdownText: string): string {
  return markdownText
    .replace(/<medhavi_logic>[\s\S]*?<\/medhavi_logic>/gi, '')
    .replace(/<medhavi_quiz>[\s\S]*?<\/medhavi_quiz>/gi, '')
    .replace(/<medhavi_evaluation>[\s\S]*?<\/medhavi_evaluation>/gi, '')
    .replace(/```[\s\S]*?```/g, 'Code block provided in the scholarly workspace.')
    .replace(/\\Delta\s*([A-Z]+)/gi, 'Triangle $1')
    .replace(/\\Delta/gi, 'Triangle')
    .replace(/\\angle/gi, 'angle ')
    .replace(/\\cong/gi, ' is congruent to ')
    .replace(/\\sim/gi, ' is similar to ')
    .replace(/\\parallel/gi, ' is parallel to ')
    .replace(/\\perp/gi, ' is perpendicular to ')
    .replace(/\\therefore/gi, ' therefore ')
    .replace(/\\because/gi, ' because ')
    .replace(/\^\\circ/gi, ' degrees')
    .replace(/\^\{\\circ\}/gi, ' degrees')
    .replace(/°/g, ' degrees ')
    .replace(/\\times/gi, ' times ')
    .replace(/\\cdot/gi, ' times ')
    .replace(/\\div/gi, ' divided by ')
    .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/gi, '$1 over $2')
    .replace(/\\sqrt\{([^}]+)\}/gi, 'square root of $1')
    .replace(/\\approx/gi, ' is approximately ')
    .replace(/\\ne(q)?/gi, ' is not equal to ')
    .replace(/\\le(q)?/gi, ' less than or equal to ')
    .replace(/\\ge(q)?/gi, ' greater than or equal to ')
    .replace(/\\pm/gi, ' plus or minus ')
    .replace(/\\pi/gi, ' pi ')
    .replace(/\\theta/gi, ' theta ')
    .replace(/\\blacksquare/gi, '')
    .replace(/\\\(|\\\)|\\\[|\\\]/g, ' ')
    .replace(/[#*_`>|~-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function selectBestSystemVoice(profile: LocalVoiceProfile): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices || voices.length === 0) return null;

  for (const nameHint of profile.preferredNames) {
    const match = voices.find((v) => v.name.toLowerCase().includes(nameHint));
    if (match) return match;
  }

  for (const lang of profile.langPreference) {
    const match = voices.find((v) => v.lang.toLowerCase().startsWith(lang.toLowerCase()));
    if (match) return match;
  }

  return voices.find((v) => v.lang.toLowerCase().startsWith('en')) || voices[0] || null;
}

/**
 * Stops all active local speech playback immediately and notifies UI components.
 */
export function stopAllScholarlySpeech(): void {
  currentSpeechId++;

  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      // ignore
    }
  }

  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(new CustomEvent('medhavi:speech-stopped'));
    } catch {
      // ignore
    }
  }
}

/**
 * Speaks scholarly text using local browser Web Speech Synthesis (zero external APIs).
 * Splits long replies into natural sentences so Chrome/Safari speechSynthesis never stalls.
 */
export function speakScholarlyText(
  text: string,
  options?: {
    voiceId?: string;
    rate?: number;
    onStart?: () => void;
    onEnd?: () => void;
    onError?: (err: string) => void;
  }
): () => void {
  const clean = stripMarkdownForSpeech(text);
  if (!clean) {
    options?.onEnd?.();
    return () => {};
  }

  stopAllScholarlySpeech();
  playScholarlyChime('playback');

  const speechId = ++currentSpeechId;

  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    options?.onError?.('Local browser speech synthesis is not supported in this browser.');
    options?.onEnd?.();
    return () => {};
  }

  const targetVoiceId = options?.voiceId || getPreferredVoiceId();
  const profile =
    LOCAL_VOICE_PROFILES.find((v) => v.id === targetVoiceId) || LOCAL_VOICE_PROFILES[0];

  const speakChunks = () => {
    if (currentSpeechId !== speechId) return;
    try {
      window.speechSynthesis.cancel();
      const systemVoice = selectBestSystemVoice(profile);
      const clipped = clean.slice(0, 1800);
      const chunks = clipped.match(/[^.!?]+[.!?]*/g)?.map((c) => c.trim()).filter(Boolean) || [
        clipped
      ];

      let started = false;
      chunks.forEach((chunk, idx) => {
        const utterance = new SpeechSynthesisUtterance(chunk);
        if (systemVoice) {
          utterance.voice = systemVoice;
          utterance.lang = systemVoice.lang;
        } else {
          utterance.lang = profile.langPreference[0] || 'en-IN';
        }
        utterance.rate = options?.rate ?? profile.defaultRate;
        utterance.pitch = profile.defaultPitch;

        if (idx === 0) {
          utterance.onstart = () => {
            if (currentSpeechId === speechId && !started) {
              started = true;
              options?.onStart?.();
            }
          };
        }
        if (idx === chunks.length - 1) {
          utterance.onend = () => {
            if (currentSpeechId === speechId) options?.onEnd?.();
          };
        }
        utterance.onerror = () => {
          if (currentSpeechId === speechId) options?.onEnd?.();
        };
        window.speechSynthesis.speak(utterance);
      });
    } catch (e: any) {
      if (currentSpeechId === speechId) {
        options?.onError?.(e?.message || 'Local speech playback failed');
        options?.onEnd?.();
      }
    }
  };

  speakChunks();

  return () => {
    if (currentSpeechId === speechId) {
      stopAllScholarlySpeech();
    }
  };
}

/* ============================================================================
 * 100% LOCAL BROWSER SPEECH RECOGNITION & LIVE WAVEFORM DICTATION
 * ========================================================================== */

export interface ActiveDictationSession {
  stop: () => Promise<string>;
  cancel: () => void;
  isIntegrated: boolean;
}

/**
 * Starts 100% local browser speech-to-text dictation using Web Speech Recognition
 * paired with a local Web Audio API live acoustic waveform visualizer.
 */
export async function startScholarlyDictation(options?: {
  onLiveTranscript?: (text: string, isFinal: boolean) => void;
  onLiveWaveform?: (levels: number[]) => void;
  onError?: (err: string) => void;
  lang?: string;
}): Promise<ActiveDictationSession> {
  stopAllScholarlySpeech();
  playScholarlyChime('start');

  let accumulatedTranscript = '';
  let speechRecInstance: any = null;
  let audioContext: AudioContext | null = null;
  let animFrameId: number | null = null;
  let localStream: MediaStream | null = null;
  let isStopped = false;

  const cleanupAudio = () => {
    if (animFrameId) {
      cancelAnimationFrame(animFrameId);
      animFrameId = null;
    }
    if (audioContext && audioContext.state !== 'closed') {
      try {
        audioContext.close();
      } catch {
        // ignore
      }
      audioContext = null;
    }
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
      localStream = null;
      activeMicStream = null;
    }
  };

  // Optional local acoustic waveform visualizer via Web Audio API
  if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia && options?.onLiveWaveform) {
    try {
      localStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      activeMicStream = localStream;

      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        audioContext = new AudioCtx();
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 64;
        const source = audioContext.createMediaStreamSource(localStream);
        source.connect(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const updateWaveform = () => {
          if (isStopped) return;
          analyser.getByteFrequencyData(dataArray);
          const bars: number[] = [];
          const step = Math.max(1, Math.floor(dataArray.length / 16));
          for (let i = 0; i < 16; i++) {
            const val = dataArray[i * step] || 0;
            bars.push(Math.min(98, Math.max(18, Math.round((val / 255) * 100))));
          }
          options.onLiveWaveform?.(bars);
          animFrameId = requestAnimationFrame(updateWaveform);
        };
        updateWaveform();
      }
    } catch {
      // Waveform visualization is optional; SpeechRecognition still works independently
    }
  }

  const SpeechRec =
    typeof window !== 'undefined'
      ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      : null;

  if (!SpeechRec) {
    cleanupAudio();
    throw new Error(
      'Local browser Speech Recognition is unavailable in this browser. Please type your question or use Chrome / Edge.'
    );
  }

  try {
    const rec = new SpeechRec();
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    rec.lang = options?.lang || 'en-IN';

    rec.onresult = (event: any) => {
      if (isStopped) return;
      const segments: string[] = [];
      for (let i = 0; i < event.results.length; i++) {
        const res = event.results[i];
        const chunk = res?.[0]?.transcript;
        if (chunk && chunk.trim()) {
          segments.push(chunk.trim());
        }
      }
      const deduplicated = mergeSpeechRecognitionSegments(segments);
      if (deduplicated) {
        accumulatedTranscript = deduplicated;
        options?.onLiveTranscript?.(accumulatedTranscript, false);
      }
    };

    rec.onerror = (err: any) => {
      if (err.error !== 'aborted' && err.error !== 'no-speech') {
        options?.onError?.(`Microphone recognition notice: ${err.error}`);
      }
    };

    rec.start();
    speechRecInstance = rec;
  } catch (e: any) {
    cleanupAudio();
    throw new Error(e?.message || 'Unable to start local browser speech recognition.');
  }

  return {
    isIntegrated: true,
    cancel: () => {
      isStopped = true;
      if (speechRecInstance) {
        try {
          speechRecInstance.onresult = null;
          speechRecInstance.abort();
        } catch {
          // ignore
        }
        speechRecInstance = null;
      }
      cleanupAudio();
    },
    stop: async (): Promise<string> => {
      if (isStopped) return cleanRepeatedSpeechTokens(accumulatedTranscript);
      isStopped = true;
      playScholarlyChime('stop');

      if (speechRecInstance) {
        try {
          speechRecInstance.onresult = null;
          speechRecInstance.stop();
        } catch {
          // ignore
        }
        speechRecInstance = null;
      }
      cleanupAudio();

      const finalClean = cleanRepeatedSpeechTokens(accumulatedTranscript);
      if (finalClean) {
        options?.onLiveTranscript?.(finalClean, true);
      }
      return finalClean;
    }
  };
}

// Automatically stop local audio on tab switch or page hide
if (typeof window !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      stopAllScholarlySpeech();
      if (activeMicStream) {
        activeMicStream.getTracks().forEach((t) => t.stop());
        activeMicStream = null;
      }
    }
  });

  window.addEventListener('pagehide', () => {
    stopAllScholarlySpeech();
  });

  window.addEventListener('beforeunload', () => {
    stopAllScholarlySpeech();
  });
}
