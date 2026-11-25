import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Mic,
  Volume2,
  VolumeX,
  X,
  Send,
  Sparkles,
  Square,
  Play,
  Loader2
} from 'lucide-react';
import {
  playScholarlyChime,
  speakScholarlyText,
  stopAllScholarlySpeech,
  startScholarlyDictation,
  cleanRepeatedSpeechTokens,
  LOCAL_VOICE_PROFILES,
  getPreferredVoiceId,
  setPreferredVoiceId,
  type ActiveDictationSession
} from '../utils/voiceAudioEngine';

interface VoiceChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  isLight: boolean;
  subject: string;
  scholarName: string;
  onSendVoiceMessage: (spokenText: string, onResponseReady?: (replyText: string) => void) => void;
}

type VoiceChatState = 'idle' | 'listening' | 'transcribing' | 'reasoning' | 'speaking';

const VOICE_STARTER_PROMPTS = [
  'Tell me about Seth M.R. Jaipuria School philosophy, motto, and houses.',
  'Explain why the sum of angles in a Class 7 triangle is 180 degrees.',
  'Give me a quick 60-second revision of heat transfer by conduction, convection, and radiation.',
  "How many r's are in the word strawberry? Walk through it step by step."
];

export const VoiceChatModal: React.FC<VoiceChatModalProps> = ({
  isOpen,
  onClose,
  isLight,
  subject,
  scholarName,
  onSendVoiceMessage
}) => {
  const [voiceState, setVoiceState] = useState<VoiceChatState>('idle');
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>(getPreferredVoiceId());
  const [spokenDraft, setSpokenDraft] = useState<string>('');
  const [lastAssistantReply, setLastAssistantReply] = useState<string>(
    `Namaste ${scholarName}! I am Jaipuria Medhavi (मेधावी) — guided by Seth M.R. Jaipuria School’s "Tamso Ma Jyotirgamaya" philosophy. Tap "Start Speaking" to ask with your microphone via local browser speech, or choose a prompt below.`
  );
  const [voiceMuted, setVoiceMuted] = useState<boolean>(false);
  const [speechRate] = useState<number>(1.0);
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [waveBars, setWaveBars] = useState<number[]>([
    24, 48, 72, 36, 84, 62, 40, 90, 56, 38, 76, 50, 32, 68, 44, 28
  ]);

  const recordingSessionRef = useRef<ActiveDictationSession | null>(null);
  const recordingTimerRef = useRef<number | null>(null);

  const handleStopSpeaking = useCallback(() => {
    if (recordingSessionRef.current) {
      try {
        recordingSessionRef.current.cancel();
      } catch {
        // ignore
      }
      recordingSessionRef.current = null;
    }
    stopAllScholarlySpeech();
    setVoiceState('idle');
  }, []);

  useEffect(() => {
    if (!isOpen) {
      handleStopSpeaking();
      return;
    }

    const onSpeechStopped = () => {
      setVoiceState((curr) => (curr === 'speaking' ? 'idle' : curr));
    };

    const onVisibility = () => {
      if (document.hidden) {
        handleStopSpeaking();
      }
    };

    window.addEventListener('medhavi:speech-stopped', onSpeechStopped);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      window.removeEventListener('medhavi:speech-stopped', onSpeechStopped);
      document.removeEventListener('visibilitychange', onVisibility);
      handleStopSpeaking();
    };
  }, [isOpen, handleStopSpeaking]);

  useEffect(() => {
    if (voiceState === 'listening') {
      setRecordingSeconds(0);
      recordingTimerRef.current = window.setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } else if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
    };
  }, [voiceState]);

  const submitQuestion = (promptText: string) => {
    const finalPrompt = cleanRepeatedSpeechTokens(promptText.trim());
    if (!finalPrompt) {
      setVoiceState('idle');
      return;
    }

    playScholarlyChime('stop');
    setSpokenDraft(finalPrompt);
    setVoiceState('reasoning');
    setErrorMessage(null);

    onSendVoiceMessage(finalPrompt, (replyText: string) => {
      setLastAssistantReply(replyText);
      if (!voiceMuted) {
        setVoiceState('speaking');
        speakScholarlyText(replyText, {
          voiceId: selectedVoiceId,
          rate: speechRate,
          onStart: () => setVoiceState('speaking'),
          onEnd: () => setVoiceState('idle'),
          onError: (err) => {
            setErrorMessage(`Voice: ${err}`);
            setVoiceState('idle');
          }
        });
      } else {
        setVoiceState('idle');
      }
    });
  };

  const handleStartListening = async () => {
    handleStopSpeaking();
    setVoiceState('listening');
    setSpokenDraft('');
    setErrorMessage(null);

    try {
      const session = await startScholarlyDictation({
        onLiveTranscript: (text) => {
          const cleaned = cleanRepeatedSpeechTokens(text);
          if (cleaned) {
            setSpokenDraft(cleaned);
          }
        },
        onLiveWaveform: (levels) => {
          setWaveBars(levels);
        },
        onError: (err) => {
          setErrorMessage(err);
        }
      });
      recordingSessionRef.current = session;
    } catch (err: any) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'Microphone access is unavailable in this browser. Type your question below or pick a starter prompt.'
      );
      setVoiceState('idle');
    }
  };

  const handleStopAndAsk = async (overridePrompt?: string) => {
    if (overridePrompt) {
      if (recordingSessionRef.current) {
        recordingSessionRef.current.cancel();
        recordingSessionRef.current = null;
      }
      submitQuestion(overridePrompt);
      return;
    }

    if (recordingSessionRef.current) {
      setVoiceState('transcribing');
      try {
        const transcribedText = await recordingSessionRef.current.stop();
        recordingSessionRef.current = null;
        const finalPrompt = cleanRepeatedSpeechTokens(transcribedText.trim() || spokenDraft.trim());
        if (finalPrompt) {
          setSpokenDraft(finalPrompt);
          submitQuestion(finalPrompt);
        } else {
          setErrorMessage('No speech detected from microphone. Please try speaking again.');
          setVoiceState('idle');
        }
      } catch (err: any) {
        recordingSessionRef.current = null;
        setErrorMessage(
          err instanceof Error
            ? `Speech recognition failed: ${err.message}`
            : 'Local browser speech recognition failed.'
        );
        setVoiceState('idle');
      }
    } else if (spokenDraft.trim()) {
      submitQuestion(spokenDraft.trim());
    } else {
      setVoiceState('idle');
    }
  };

  const handleTestLocalVoice = () => {
    handleStopSpeaking();
    setVoiceState('speaking');
    setErrorMessage(null);
    const selectedVoice = LOCAL_VOICE_PROFILES.find((v) => v.id === selectedVoiceId);
    const sampleText = `Namaste! I am ${
      selectedVoice?.name || 'Meera'
    }, speaking using your device’s local Web Speech voice for Seth M.R. Jaipuria School, Lucknow — Tamso Ma Jyotirgamaya.`;
    speakScholarlyText(sampleText, {
      voiceId: selectedVoiceId,
      rate: speechRate,
      onStart: () => setVoiceState('speaking'),
      onEnd: () => setVoiceState('idle'),
      onError: (err) => {
        setErrorMessage(`Local Voice: ${err}`);
        setVoiceState('idle');
      }
    });
  };

  const formatSeconds = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const rem = sec % 60;
    return `${String(mins).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Live Voice Chat with Jaipuria Medhavi"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-[#040A18]/80 no-print"
    >
      <div
        className={`w-full max-w-2xl max-h-[92dvh] overflow-y-auto rounded-t-3xl sm:rounded-2xl p-4 sm:p-8 pb-safe space-y-4 sm:space-y-5 relative border shadow-2xl ${
          isLight
            ? 'bg-[#F7F9FC] border-[#0B2559]/15 text-[#0B2559]'
            : 'bg-[#07142B] border-[#F5B700]/25 text-slate-100'
        }`}
      >
        <div
          className={`flex flex-wrap items-center justify-between gap-3 border-b pb-4 ${
            isLight ? 'border-[#0B2559]/12' : 'border-slate-700/40'
          }`}
        >
          <div>
            <div className="text-xs font-mono uppercase tracking-wider text-[#F5B700] font-semibold">
              {voiceState === 'listening'
                ? 'Microphone Live · Listening'
                : 'Local Browser Voice Studio · ICSE Class 7'}
            </div>
            <h2 className="text-xl sm:text-2xl font-bold font-display">
              Jaipuria Medhavi Voice Studio
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs">
              <label htmlFor="local-voice-select" className="sr-only">
                Select Local Voice Profile
              </label>
              <select
                id="local-voice-select"
                value={selectedVoiceId}
                onChange={(e) => {
                  setSelectedVoiceId(e.target.value);
                  setPreferredVoiceId(e.target.value);
                }}
                className={`rounded-xl border px-2.5 py-1.5 text-xs font-medium outline-none transition-colors ${
                  isLight
                    ? 'bg-white border-slate-300 text-slate-900'
                    : 'bg-slate-900/90 border-slate-700/80 text-slate-100'
                }`}
              >
                {LOCAL_VOICE_PROFILES.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} ({v.label})
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={handleTestLocalVoice}
              title="Test selected local voice"
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold border border-amber-500/40 bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 cursor-pointer"
            >
              <Play className="w-3 h-3 fill-current" />
              <span className="hidden sm:inline">Test Voice</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (!voiceMuted) {
                  handleStopSpeaking();
                }
                setVoiceMuted((prev) => !prev);
              }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium border border-slate-700/70 hover:border-amber-400/60 cursor-pointer"
            >
              {voiceMuted ? (
                <>
                  <VolumeX className="w-3.5 h-3.5 text-rose-400" />
                  <span>Muted</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Voice On</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                handleStopSpeaking();
                onClose();
              }}
              aria-label="Close Voice Chat"
              className="p-1.5 rounded-xl border border-slate-700/70 hover:border-rose-400/60 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {errorMessage && (
          <div className="p-3 rounded-xl border border-rose-500/50 bg-rose-500/10 text-xs text-rose-400 flex items-center justify-between">
            <span>{errorMessage}</span>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className="text-rose-400 hover:text-white cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <div
          className={`rounded-xl p-6 flex flex-col items-center text-center space-y-5 border ${
            isLight
              ? 'bg-white border-[#0B2559]/12'
              : 'bg-[#060E20]/85 border-[#0B2559]'
          }`}
        >
          <div className="relative flex items-center justify-center">
            <div
              className={`w-24 h-24 rounded-full flex items-center justify-center border transition-all duration-300 ${
                voiceState === 'listening'
                  ? 'border-rose-400 bg-rose-500/15 scale-105'
                  : voiceState === 'transcribing'
                  ? 'border-[#F5B700] bg-[#F5B700]/15'
                  : voiceState === 'reasoning'
                  ? 'border-sky-400 bg-sky-500/15'
                  : voiceState === 'speaking'
                  ? 'border-emerald-400 bg-emerald-500/20 scale-105'
                  : 'border-[#F5B700]/50 bg-[#F5B700]/10'
              }`}
            >
              {voiceState === 'listening' ? (
                <Mic className="w-9 h-9 text-rose-500" />
              ) : voiceState === 'transcribing' ? (
                <Loader2 className="w-9 h-9 text-[#F5B700] animate-spin" />
              ) : voiceState === 'speaking' ? (
                <Volume2 className="w-9 h-9 text-emerald-500" />
              ) : (
                <Sparkles className="w-9 h-9 text-[#F5B700]" />
              )}
            </div>
          </div>

          <div className="text-xs font-mono uppercase tracking-widest text-amber-500">
            {voiceState === 'listening'
              ? `LISTENING VIA LOCAL BROWSER SPEECH... (${formatSeconds(recordingSeconds)})`
              : voiceState === 'transcribing'
              ? 'FINALIZING LOCAL TRANSCRIPT...'
              : voiceState === 'reasoning'
              ? 'NVIDIA NEMOTRON 3.5 SUPER VL REASONING...'
              : voiceState === 'speaking'
              ? 'JAIPURIA MEDHAVI SPEAKING (LOCAL WEB SPEECH)...'
              : 'TAP "START SPEAKING" OR PICK A QUESTION BELOW'}
          </div>

          <div className="flex items-end justify-center gap-1.5 h-10 w-full max-w-md">
            {waveBars.map((h, i) => (
              <div
                key={i}
                className={`w-1.5 rounded-full transition-all duration-150 ${
                  voiceState === 'listening'
                    ? 'bg-rose-400'
                    : voiceState === 'transcribing'
                    ? 'bg-amber-400'
                    : voiceState === 'speaking'
                    ? 'bg-emerald-400'
                    : voiceState === 'reasoning'
                    ? 'bg-sky-400'
                    : 'bg-slate-600/50'
                }`}
                style={{
                  height: `${voiceState === 'idle' ? 22 : h}%`
                }}
              />
            ))}
          </div>

          <div
            className={`w-full rounded-xl border p-4 text-left text-xs sm:text-sm max-h-40 overflow-y-auto leading-relaxed ${
              isLight
                ? 'bg-white/80 border-slate-200 text-slate-800'
                : 'bg-slate-950/65 border-slate-800/90 text-slate-200'
            }`}
          >
            <div className="text-[11px] font-mono uppercase text-amber-500 mb-1">
              {voiceState === 'listening' || voiceState === 'transcribing'
                ? 'YOUR SPOKEN QUESTION'
                : 'MEDHAVI VOICE RESPONSE'}
            </div>
            <div>
              {voiceState === 'listening'
                ? spokenDraft || 'Listening locally... Click "Send Spoken Question" when finished.'
                : voiceState === 'transcribing'
                ? 'Cleaning local microphone transcript...'
                : lastAssistantReply.slice(0, 480) +
                  (lastAssistantReply.length > 480 ? '...' : '')}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 w-full">
            {voiceState === 'idle' && (
              <button
                type="button"
                onClick={handleStartListening}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-[#F5B700] text-[#0B2559] hover:bg-[#E0A800] transition-colors cursor-pointer"
              >
                <Mic className="w-4 h-4" />
                <span>Start Speaking</span>
              </button>
            )}

            {voiceState === 'listening' && (
              <button
                type="button"
                onClick={() => handleStopAndAsk()}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-rose-500 text-white hover:bg-rose-400 transition-colors cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>Send Spoken Question ({formatSeconds(recordingSeconds)})</span>
              </button>
            )}

            {voiceState === 'transcribing' && (
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold border border-amber-500/50 bg-amber-500/10 text-amber-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Processing Local Speech...</span>
              </div>
            )}

            {voiceState === 'speaking' && (
              <button
                type="button"
                onClick={handleStopSpeaking}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold border border-rose-500/50 bg-rose-500/15 text-rose-400 hover:bg-rose-500/25 cursor-pointer"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>Stop Speaking</span>
              </button>
            )}

            {voiceState === 'idle' && lastAssistantReply && (
              <button
                type="button"
                onClick={() => {
                  setVoiceState('speaking');
                  speakScholarlyText(lastAssistantReply, {
                    voiceId: selectedVoiceId,
                    rate: speechRate,
                    onStart: () => setVoiceState('speaking'),
                    onEnd: () => setVoiceState('idle'),
                    onError: (err) => {
                      setErrorMessage(`Local Voice: ${err}`);
                      setVoiceState('idle');
                    }
                  });
                }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium border border-slate-700 hover:border-amber-400/60 cursor-pointer"
              >
                <Volume2 className="w-4 h-4 text-amber-400" />
                <span>Replay Voice Response</span>
              </button>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleStopAndAsk(spokenDraft);
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={spokenDraft}
              onChange={(e) => setSpokenDraft(e.target.value)}
              placeholder={`Speak or type a Class 7 ${subject} or school question...`}
              aria-label="Voice chat question input"
              className={`flex-1 px-3.5 py-2.5 rounded-xl text-xs border outline-none ${
                isLight
                  ? 'bg-white border-slate-300 text-slate-900'
                  : 'bg-slate-950/70 border-slate-800 text-slate-100'
              }`}
            />
            <button
              type="submit"
              disabled={!spokenDraft.trim()}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold bg-amber-500 text-slate-950 hover:bg-amber-400 disabled:opacity-40 cursor-pointer"
            >
              <span>Ask Voice</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>

          <div className="space-y-1.5">
            <div className="text-[11px] font-mono uppercase text-slate-400">
              INSTANT CLASS 7 & SCHOOL VOICE PROMPTS
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {VOICE_STARTER_PROMPTS.map((vp, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleStopAndAsk(vp)}
                  className={`text-left px-3 py-2 rounded-xl text-xs border transition-colors truncate cursor-pointer ${
                    isLight
                      ? 'bg-white/75 border-slate-300 hover:border-amber-500 text-slate-700'
                      : 'bg-slate-900/60 border-slate-800 hover:border-amber-400/60 text-slate-300'
                  }`}
                >
                  &ldquo;{vp}&rdquo;
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
