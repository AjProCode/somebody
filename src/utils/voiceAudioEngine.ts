// ElevenLabs Neural Audio & Browser Web Speech Engine for Jaipuria Medhavi (मेधावी)

export interface ElevenLabsVoiceOption {
  id: string;
  name: string;
  label: string;
  description: string;
  gender: 'female' | 'male';
  badge: string;
}

export const AVAILABLE_ELEVENLABS_VOICES: ElevenLabsVoiceOption[] = [
  {
    id: 'Xb7hH8MSUJpSbSDYk0k2',
    name: 'Alice',
    label: 'Class 7 Engaging Educator',
    description: 'Clear, encouraging British scholarly educator',
    gender: 'female',
    badge: 'Pedagogical & Concept Instruction'
  },
  {
    id: 'JBFqnCBsd6RMkjVDRZzb',
    name: 'George',
    label: 'Warm Storyteller',
    description: 'Resonant, authoritative British narrator',
    gender: 'male',
    badge: 'Historical & Narrative Scholar'
  },
  {
    id: 'EXAVITQu4vr4xnSDxMaL',
    name: 'Sarah',
    label: 'Academic Mentor',
    description: 'Reassuring, professional American mentor',
    gender: 'female',
    badge: 'Socratic Guidance'
  },
  {
    id: 'CwhRBWXzGAHq8TQ4Fs17',
    name: 'Roger',
    label: 'Analytical Scholar',
    description: 'Calm, resonant, articulate thinker',
    gender: 'male',
    badge: 'Revision & Logic Proofs'
  }
];

export const DEFAULT_VOICE_ID = 'Xb7hH8MSUJpSbSDYk0k2';

let activeAudioElement: HTMLAudioElement | null = null;
let currentSpeechId = 0;
let activeAbortController: AbortController | null = null;
let activeMicRecorder: MediaRecorder | null = null;
let activeMicStream: MediaStream | null = null;

// Quota management: skip cloud TTS for 1 minute if server returns 429
let cloudTtsCooldownUntil = 0;

function isCloudTtsInCooldown(): boolean {
  return Date.now() < cloudTtsCooldownUntil;
}

function setCloudTtsCooldown(): void {
  cloudTtsCooldownUntil = Date.now() + 60000; // 1 minute cooldown
}

export function getPreferredVoiceId(): string {
  if (typeof window === 'undefined') return DEFAULT_VOICE_ID;
  const saved = localStorage.getItem('medhavi_elevenlabs_voice_id');
  if (saved && AVAILABLE_ELEVENLABS_VOICES.some((v) => v.id === saved)) {
    return saved;
  }
  return DEFAULT_VOICE_ID;
}

export function setPreferredVoiceId(voiceId: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('medhavi_elevenlabs_voice_id', voiceId);
}

/**
 * Eliminates stuttered, echoed, or consecutively repeated words and phrases
 * caused by browser Web Speech API interim result overlapping.
 * Example:
 * "explain explain explain congruence congruence congruence congruence explain explain explain congruence of triangles"
 * -> "explain congruence of triangles"
 */
export function cleanRepeatedSpeechTokens(raw: string): string {
  if (!raw) return '';
  let text = raw.replace(/\s+/g, ' ').trim();
  if (!text) return '';

  // Pass 1: Collapse consecutive identical single words (case-insensitive)
  // e.g. "explain explain explain" -> "explain"
  text = text.replace(/\b(\w+)(?:\s+\1\b)+/gi, '$1');

  // Pass 2: Collapse consecutive identical 2-word phrases
  // e.g. "explain congruence explain congruence" -> "explain congruence"
  text = text.replace(/\b(\w+\s+\w+)(?:\s+\1\b)+/gi, '$1');

  // Pass 3: Collapse consecutive identical 3-word phrases
  text = text.replace(/\b(\w+\s+\w+\s+\w+)(?:\s+\1\b)+/gi, '$1');

  // Pass 4: Collapse consecutive identical 4-word phrases
  text = text.replace(/\b(\w+\s+\w+\s+\w+\s+\w+)(?:\s+\1\b)+/gi, '$1');

  // Pass 5: Final pass on single & 2-word repetitions in case multi-word collapse exposed new adjacent duplicates
  text = text.replace(/\b(\w+)(?:\s+\1\b)+/gi, '$1');
  text = text.replace(/\b(\w+\s+\w+)(?:\s+\1\b)+/gi, '$1');

  return text.trim();
}

/**
 * Merges Web Speech API result segments without duplicating cumulative prefixes.
 */
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

    // Case 1: New segment is a cumulative superset of the previous merged string
    if (segLower.startsWith(mergedLower)) {
      merged = seg;
      continue;
    }
    // Case 2: Previous merged string already ends with this exact segment
    if (mergedLower.endsWith(segLower)) {
      continue;
    }

    // Case 3: Check suffix-prefix word overlap between `merged` and `seg`
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
        ? [523.25, 659.25, 783.99] // C5 -> E5 -> G5
        : mode === 'stop'
        ? [783.99, 659.25, 523.25] // G5 -> E5 -> C5
        : [440, 554.37, 659.25, 880]; // A4 major triad

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

    // Cleanly close AudioContext after chime finishes to prevent memory and listener leaks
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
    // Convert mathematical LaTeX symbols to spoken words
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
    // Remove math wrappers \( and \[
    .replace(/\\\(|\\\)|\\\[|\\\]/g, ' ')
    // Remove markdown symbols
    .replace(/[#*_`>|~-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Stops all active speech playback, cancels in-flight TTS generation requests,
 * and broadcasts a notification event so UI components reset their state immediately.
 */
export function stopAllScholarlySpeech(): void {
  // 1. Advance generation ID to instantly invalidate any in-flight promises
  currentSpeechId++;

  // 2. Abort active network fetch to TTS
  if (activeAbortController) {
    try {
      activeAbortController.abort();
    } catch {
      // ignore
    }
    activeAbortController = null;
  }

  // 3. Immediately pause and reset the audio element
  if (activeAudioElement) {
    try {
      activeAudioElement.onended = null;
      activeAudioElement.onerror = null;
      activeAudioElement.onplay = null;
      activeAudioElement.pause();
      activeAudioElement.src = '';
      activeAudioElement.currentTime = 0;
    } catch {
      // ignore
    }
    activeAudioElement = null;
  }

  // 4. Cancel any fallback speech synthesis
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      // ignore
    }
  }

  // 5. Broadcast custom event so UI components immediately update state
  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(new CustomEvent('medhavi:speech-stopped'));
    } catch {
      // ignore
    }
  }
}

/**
 * Browser Web Speech Synthesis fallback if server TTS is unreachable
 */
function speakWithBrowserFallback(
  cleanText: string,
  speechId: number,
  options?: {
    rate?: number;
    onStart?: () => void;
    onEnd?: () => void;
    onError?: (err: string) => void;
  }
): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    options?.onError?.('Speech synthesis is not available in this browser.');
    options?.onEnd?.();
    return;
  }

  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(cleanText.slice(0, 1200));
    utterance.rate = options?.rate || 1.0;
    utterance.lang = 'en-IN';
    utterance.onstart = () => {
      if (currentSpeechId === speechId) options?.onStart?.();
    };
    utterance.onend = () => {
      if (currentSpeechId === speechId) options?.onEnd?.();
    };
    utterance.onerror = () => {
      if (currentSpeechId === speechId) options?.onEnd?.();
    };
    window.speechSynthesis.speak(utterance);
  } catch (e: any) {
    options?.onError?.(e?.message || 'Speech playback failed');
    options?.onEnd?.();
  }
}

/**
 * Speaks text using ElevenLabs Neural TTS (/api/tts) with browser Web Speech fallback.
 * Guarantees immediate stoppage on user interrupt, new query, or tab switch.
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

  // Stop any previous speech before starting new speech
  stopAllScholarlySpeech();
  playScholarlyChime('playback');

  const speechId = ++currentSpeechId;
  const targetVoiceId = options?.voiceId || getPreferredVoiceId();

  activeAbortController = new AbortController();
  const currentController = activeAbortController;

  if (isCloudTtsInCooldown()) {
    speakWithBrowserFallback(clean, speechId, options);
    return () => {};
  }

  fetch('/api/tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: clean.slice(0, 1600),
      voiceId: targetVoiceId
    }),
    signal: currentController.signal
  })
    .then(async (res) => {
      if (currentSpeechId !== speechId) return;

      if (!res.ok) {
        if (res.status === 429) {
          setCloudTtsCooldown();
        }
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `TTS HTTP ${res.status}`);
      }
      const data = await res.json();
      if (currentSpeechId !== speechId) return;

      // Play ElevenLabs audio Data URL when available
      if (data.audioDataUrl) {
        const audio = new Audio(data.audioDataUrl);
        audio.playbackRate = options?.rate || 1.0;
        activeAudioElement = audio;

        audio.onended = () => {
          if (activeAudioElement === audio) {
            activeAudioElement = null;
          }
          if (currentSpeechId === speechId) {
            options?.onEnd?.();
          }
        };

        audio.onerror = () => {
          if (activeAudioElement === audio) {
            activeAudioElement = null;
          }
          if (currentSpeechId === speechId) {
            speakWithBrowserFallback(clean, speechId, options);
          }
        };

        audio.onplay = () => {
          if (currentSpeechId === speechId) {
            options?.onStart?.();
          }
        };

        await audio.play().catch(() => {
          if (currentSpeechId === speechId) {
            speakWithBrowserFallback(clean, speechId, options);
          }
        });
      } else {
        speakWithBrowserFallback(clean, speechId, options);
      }
    })
    .catch((err) => {
      if (err.name === 'AbortError' || currentSpeechId !== speechId) return;
      console.warn('Cloud TTS fallback to browser speechSynthesis:', err);
      speakWithBrowserFallback(clean, speechId, options);
    });

  return () => {
    if (currentSpeechId === speechId) {
      stopAllScholarlySpeech();
    }
  };
}

/* ============================================================================
 * REAL MICROPHONE RECORDING & ELEVENLABS SCRIBE STT
 * ========================================================================== */

export interface ActiveRecordingSession {
  stopAndTranscribe: () => Promise<string>;
  cancel: () => void;
}

/**
 * Starts recording real audio from the user's microphone using HTML5 MediaRecorder,
 * and provides a method to stop and transcribe the audio via /api/stt (ElevenLabs Scribe).
 */
export async function startRealMicrophoneRecording(options?: {
  onLiveWaveform?: (levels: number[]) => void;
  onError?: (err: string) => void;
}): Promise<ActiveRecordingSession> {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    throw new Error('Microphone audio is not supported in this browser environment.');
  }

  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true
    }
  });

  activeMicStream = stream;

  let audioContext: AudioContext | null = null;
  let analyser: AnalyserNode | null = null;
  let animFrameId: number | null = null;

  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioCtx) {
      audioContext = new AudioCtx();
      analyser = audioContext.createAnalyser();
      analyser.fftSize = 64;
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const updateWaveform = () => {
        if (!analyser) return;
        analyser.getByteFrequencyData(dataArray);
        const bars: number[] = [];
        const step = Math.max(1, Math.floor(dataArray.length / 16));
        for (let i = 0; i < 16; i++) {
          const val = dataArray[i * step] || 0;
          bars.push(Math.min(98, Math.max(18, Math.round((val / 255) * 100))));
        }
        options?.onLiveWaveform?.(bars);
        animFrameId = requestAnimationFrame(updateWaveform);
      };
      updateWaveform();
    }
  } catch {
    // Non-fatal if audio context analyser fails
  }

  const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
    ? 'audio/webm;codecs=opus'
    : MediaRecorder.isTypeSupported('audio/webm')
    ? 'audio/webm'
    : MediaRecorder.isTypeSupported('audio/mp4')
    ? 'audio/mp4'
    : '';

  const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
  activeMicRecorder = recorder;
  const audioChunks: Blob[] = [];

  recorder.ondataavailable = (event) => {
    if (event.data && event.data.size > 0) {
      audioChunks.push(event.data);
    }
  };

  recorder.start(150);

  const cleanup = () => {
    if (animFrameId) cancelAnimationFrame(animFrameId);
    if (audioContext && audioContext.state !== 'closed') {
      try {
        audioContext.close();
      } catch {
        // ignore
      }
    }
    stream.getTracks().forEach((track) => track.stop());
    activeMicStream = null;
    activeMicRecorder = null;
  };

  return {
    cancel: () => {
      try {
        if (recorder.state !== 'inactive') {
          recorder.stop();
        }
      } catch {
        // ignore
      }
      cleanup();
    },
    stopAndTranscribe: async (): Promise<string> => {
      return new Promise((resolve, reject) => {
        recorder.onstop = async () => {
          try {
            cleanup();
            if (audioChunks.length === 0) {
              resolve('');
              return;
            }

            const recordedBlob = new Blob(audioChunks, {
              type: recorder.mimeType || 'audio/webm'
            });

            if (recordedBlob.size < 400) {
              resolve('');
              return;
            }

            const reader = new FileReader();
            reader.onloadend = async () => {
              try {
                const base64DataUrl = reader.result as string;
                if (!base64DataUrl) {
                  resolve('');
                  return;
                }

                const response = await fetch('/api/stt', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ audioDataUrl: base64DataUrl })
                });

                if (!response.ok) {
                  const errJson = await response.json().catch(() => ({}));
                  throw new Error(errJson.error || `STT HTTP ${response.status}`);
                }

                const data = await response.json();
                resolve(cleanRepeatedSpeechTokens((data.text || '').trim()));
              } catch (sttErr) {
                reject(sttErr);
              }
            };
            reader.onerror = () => reject(new Error('Failed to read recorded audio data.'));
            reader.readAsDataURL(recordedBlob);
          } catch (err) {
            cleanup();
            reject(err);
          }
        };

        try {
          if (recorder.state !== 'inactive') {
            recorder.stop();
          } else {
            cleanup();
            resolve('');
          }
        } catch (e) {
          cleanup();
          reject(e);
        }
      });
    }
  };
}

/* ============================================================================
 * INTEGRATED AUDIO-TO-TEXT & ELEVENLABS SCRIBE DICTATION
 * ========================================================================== */

export interface ActiveDictationSession {
  stop: () => Promise<string>;
  cancel: () => void;
  isIntegrated: boolean;
}

/**
 * Starts integrated audio-to-text dictation.
 * Uses deduplicated live preview during speech and verifies/transcribes via
 * ElevenLabs Scribe (/api/stt) when stopped so there is zero word stuttering.
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
  let micSession: ActiveRecordingSession | null = null;
  let isStopped = false;

  // 1. Start real microphone recording via MediaRecorder for live acoustic waveform & ElevenLabs Scribe STT
  try {
    micSession = await startRealMicrophoneRecording({
      onLiveWaveform: options?.onLiveWaveform,
      onError: options?.onError
    });
  } catch (err) {
    // Will try SpeechRecognition below if getUserMedia had an issue
    console.warn('MediaRecorder init notice:', err);
  }

  // 2. Also start browser SpeechRecognition for live interim visual feedback (with strict anti-stutter deduplication)
  const SpeechRec =
    typeof window !== 'undefined'
      ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      : null;

  if (SpeechRec) {
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
          console.warn('SpeechRecognition notice:', err.error);
        }
      };

      rec.start();
      speechRecInstance = rec;
    } catch (e) {
      console.warn('SpeechRecognition could not start, relying on server STT', e);
      speechRecInstance = null;
    }
  }

  if (!micSession && !speechRecInstance) {
    throw new Error('Microphone access is unavailable in this browser.');
  }

  return {
    isIntegrated: Boolean(speechRecInstance || micSession),
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
      if (micSession) {
        micSession.cancel();
        micSession = null;
      }
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

      // Prefer authoritative server-side ElevenLabs Scribe STT (/api/stt)
      // so the final transcript is free of any browser Web Speech API stuttering!
      if (micSession) {
        try {
          const cloudTranscript = await micSession.stopAndTranscribe();
          micSession = null;
          if (cloudTranscript && cloudTranscript.trim()) {
            const cleanCloud = cleanRepeatedSpeechTokens(cloudTranscript.trim());
            options?.onLiveTranscript?.(cleanCloud, true);
            return cleanCloud;
          }
        } catch (err: any) {
          micSession = null;
          console.warn('Server STT fallback to deduplicated browser transcript:', err?.message);
        }
      }

      const finalClean = cleanRepeatedSpeechTokens(accumulatedTranscript);
      if (finalClean) {
        options?.onLiveTranscript?.(finalClean, true);
      }
      return finalClean;
    }
  };
}

/**
 * Transcribes any audio data URL via ElevenLabs Scribe (/api/stt).
 */
export async function transcribeAudioDataUrl(audioDataUrl: string): Promise<string> {
  const response = await fetch('/api/stt', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ audioDataUrl })
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || `Audio transcription failed (HTTP ${response.status})`);
  }

  const data = await response.json();
  return cleanRepeatedSpeechTokens((data.text || '').trim());
}

// Global browser event listener: Automatically stop speech on tab switch or page hide
if (typeof window !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      stopAllScholarlySpeech();
      if (activeMicRecorder && activeMicRecorder.state !== 'inactive') {
        try {
          activeMicRecorder.stop();
        } catch {
          // ignore
        }
      }
      if (activeMicStream) {
        activeMicStream.getTracks().forEach((t) => t.stop());
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
