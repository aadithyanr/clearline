'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface TriageResult {
  severity: 'critical' | 'urgent' | 'non-urgent';
  reasoning: string;
  symptoms: {
    chestPain: boolean;
    shortnessOfBreath: boolean;
    fever: boolean;
    dizziness: boolean;
    freeText?: string;
  } | null;
}

interface VoiceTriageProps {
  onTriageComplete: (triage: TriageResult) => void;
}

export default function VoiceTriage({ onTriageComplete }: VoiceTriageProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [started, setStarted] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const hasSpokenRef = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const startListeningRef = useRef<() => void>(() => {});
  const sendMessageRef = useRef<(text: string, msgs: Message[]) => void>(() => {});

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  const stopSilenceDetection = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
  }, []);

  const startSilenceDetection = useCallback((analyser: AnalyserNode, onSilence: () => void) => {
    const bufferLength = analyser.fftSize;
    const dataArray = new Uint8Array(bufferLength);
    const SILENCE_THRESHOLD = 15;
    const SILENCE_DURATION = 2000;

    const check = () => {
      analyser.getByteTimeDomainData(dataArray);

      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        const v = (dataArray[i] - 128) / 128;
        sum += v * v;
      }
      const rms = Math.sqrt(sum / bufferLength) * 100;

      if (rms > SILENCE_THRESHOLD) {
        hasSpokenRef.current = true;
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = null;
        }
      } else if (hasSpokenRef.current && !silenceTimerRef.current) {
        silenceTimerRef.current = setTimeout(onSilence, SILENCE_DURATION);
      }

      animFrameRef.current = requestAnimationFrame(check);
    };

    animFrameRef.current = requestAnimationFrame(check);
  }, []);

  const transcribeAndSend = useCallback(async (blob: Blob) => {
    if (blob.size === 0) {
      setIsThinking(false);
      return;
    }
    try {
      const formData = new FormData();
      formData.append('audio', blob, 'recording.webm');

      const res = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error(`Transcription failed: ${res.status}`);

      const { text } = await res.json();
      setIsThinking(false);

      if (text && text.trim()) {
        setMessages(prev => {
          sendMessageRef.current(text.trim(), prev);
          return prev;
        });
      } else {
        setError("Didn't catch that. Try typing instead.");
      }
    } catch (err) {
      console.error(err);
      setIsThinking(false);
      setError('Transcription failed. Try typing your response.');
    }
  }, []);

  const finishRecording = useCallback(async () => {
    const mediaRecorder = mediaRecorderRef.current;
    if (!mediaRecorder || mediaRecorder.state === 'inactive') return;

    stopSilenceDetection();
    setIsListening(false);
    setIsThinking(true);
    hasSpokenRef.current = false;

    const audioBlob = await new Promise<Blob>((resolve) => {
      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        audioChunksRef.current = [];
        resolve(blob);
      };
      mediaRecorder.stop();
    });

    mediaRecorderRef.current = null;
    await transcribeAndSend(audioBlob);
  }, [stopSilenceDetection, transcribeAndSend]);

  const speakText = useCallback(async (text: string, onSpeechEnd?: () => void) => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
    }
    stopSilenceDetection();

    try {
      setIsSpeaking(true);
      window.speechSynthesis.cancel();

      const res = await fetch('/api/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      if (!res.ok) throw new Error(`ElevenLabs failed`);

      const arrayBuffer = await res.arrayBuffer();
      const audioCtx = new AudioContext();
      const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
      const source = audioCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioCtx.destination);
      source.onended = () => {
        setIsSpeaking(false);
        onSpeechEnd?.();
      };
      source.start();
    } catch (err) {
      console.warn('TTS failed, using fallback:', err);
      setIsSpeaking(true);
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.onend = () => { setIsSpeaking(false); onSpeechEnd?.(); };
      utterance.onerror = () => { setIsSpeaking(false); onSpeechEnd?.(); };
      window.speechSynthesis.speak(utterance);
    }
  }, [stopSilenceDetection]);

  const sendMessage = useCallback(async (userText: string, currentMessages: Message[]) => {
    const newMessages: Message[] = [...currentMessages, { role: 'user', content: userText }];
    setMessages(newMessages);
    setIsThinking(true);
    setError(null);

    try {
      const res = await fetch('/api/clearpath/converse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
      });

      if (!res.ok) throw new Error('Conversation failed');

      const data = await res.json();
      const assistantMsg: Message = { role: 'assistant', content: data.reply };
      const updatedMessages = [...newMessages, assistantMsg];
      setMessages(updatedMessages);
      setIsThinking(false);

      if (data.reply) {
        if (data.triage) {
          speakText(data.reply, () => setTimeout(() => onTriageComplete(data.triage), 500));
        } else {
          speakText(data.reply, () => startListeningRef.current());
        }
      }
      return updatedMessages;
    } catch (err) {
      setIsThinking(false);
      setError('Connection dropped. Try again.');
      return newMessages;
    }
  }, [speakText, onTriageComplete]);

  const startListening = useCallback(async () => {
    setError(null);
    audioChunksRef.current = [];
    hasSpokenRef.current = false;

    try {
      let stream = streamRef.current;
      if (!stream || stream.getTracks().every(t => t.readyState === 'ended')) {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
      }

      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      const audioCtx = new AudioContext();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);

      mediaRecorder.start();
      setIsListening(true);
      startSilenceDetection(analyser, () => finishRecording());
    } catch {
      setError('Microphone access denied. Type instead.');
      setIsListening(false);
    }
  }, [startSilenceDetection, finishRecording]);

  startListeningRef.current = startListening;
  sendMessageRef.current = sendMessage;

  const stopListening = useCallback(async () => await finishRecording(), [finishRecording]);

  const startConversation = useCallback(async () => {
    setStarted(true);
    setError(null);
    const greeting: Message = { role: 'assistant', content: "Clearline AI here. Tell me what's happening." };
    setMessages([greeting]);
    await speakText(greeting.content, () => startListeningRef.current());
  }, [speakText]);

  const handleSendText = useCallback(() => {
    if (!textInput.trim()) return;
    const text = textInput.trim();
    setTextInput('');
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setMessages(prev => {
      sendMessageRef.current(text, prev);
      return prev;
    });
  }, [textInput]);

  useEffect(() => {
    return () => {
      stopSilenceDetection();
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') mediaRecorderRef.current.stop();
      streamRef.current?.getTracks().forEach(t => t.stop());
      window.speechSynthesis.cancel();
    };
  }, [stopSilenceDetection]);

  // Welcome Screen
  if (!started) {
    return (
      <div className="flex flex-col items-center justify-center text-center h-full pb-6">
        <div className="w-full rounded-2xl border border-white/70 bg-white/55 backdrop-blur-2xl shadow-[0_4px_28px_rgba(99,102,241,0.08),0_1px_4px_rgba(0,0,0,0.04)] px-6 py-7">
          <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-indigo-200/60 blur-xl" />
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20 relative">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m12 8-9.04 9.06a2.82 2.82 0 1 0 3.98 3.98L16 12" />
                <circle cx="17" cy="7" r="5" />
              </svg>
            </div>
          </div>

          <div className="mt-5">
            <h3 className="text-lg font-bold text-slate-800 tracking-tight">AI Voice Assistant</h3>
            <p className="text-sm font-medium text-slate-500 mt-2 leading-relaxed">
              Speak naturally about your symptoms. We’ll match you to the right care in seconds.
            </p>
          </div>

          <button
            onClick={startConversation}
            className="w-full mt-5 py-3.5 rounded-2xl text-sm font-bold text-white bg-slate-900 hover:bg-slate-800 shadow-lg shadow-slate-900/15 transition-all flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
            Speak with Clearline
          </button>

          <div className="mt-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
            Safe & Encrypted
          </div>
        </div>
      </div>
    );
  }

  // Conversation UI
  return (
    <div className="flex flex-col h-full rounded-2xl overflow-hidden">
      <div className="flex-1 relative">
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top,_rgba(99,102,241,0.10),_transparent_55%)]" />
        <div
          ref={chatContainerRef}
          className="relative h-full overflow-y-auto custom-scrollbar px-1 py-1"
        >
          <div className="space-y-3 px-1.5 pb-3">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && (
              <div className="w-7 h-7 mr-2 mt-0.5 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-indigo-600/20">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
              </div>
            )}
            <div
              className={`max-w-[85%] px-4 py-3 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-gradient-to-b from-slate-900 to-slate-800 text-white rounded-2xl rounded-tr-sm shadow-[0_10px_28px_rgba(15,23,42,0.18)]'
                  : 'bg-white/70 backdrop-blur-xl border border-white/75 text-slate-800 rounded-2xl rounded-tl-sm shadow-[0_8px_24px_rgba(2,6,23,0.06)]'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {isThinking && (
          <div className="flex justify-start items-end">
            <div className="w-7 h-7 mr-2 mb-0.5 rounded-full bg-white/70 border border-white/75 backdrop-blur-xl flex items-center justify-center shrink-0">
              <div className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
            </div>
            <div className="bg-white/70 backdrop-blur-xl border border-white/75 rounded-2xl rounded-tl-sm px-5 py-3 shadow-[0_8px_24px_rgba(2,6,23,0.06)]">
              <div className="flex gap-1.5">
                <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} className="h-2" />
          </div>
        </div>
      </div>

      {/* Input dock */}
      <div className="relative pt-2">
        {error && (
          <div className="px-1.5 pb-2">
            <div className="px-3.5 py-2.5 bg-red-50/80 border border-red-100/80 text-red-700 rounded-2xl text-xs font-semibold backdrop-blur-xl shadow-sm">
              {error}
            </div>
          </div>
        )}

        <div className="mx-1.5 mb-1.5 rounded-[18px] bg-white/60 backdrop-blur-2xl border border-white/75 shadow-[0_10px_26px_rgba(2,6,23,0.06)] p-2">
          <button
            onClick={isListening ? stopListening : startListening}
            disabled={isSpeaking || isThinking}
            className={`w-full py-3 rounded-2xl text-[13px] font-bold tracking-wide transition-all flex items-center justify-center gap-2 ${
              isListening
                ? 'bg-red-50 text-red-600 shadow-inner border border-red-100'
                : isSpeaking
                  ? 'bg-slate-50 text-slate-400 border border-slate-100 cursor-not-allowed'
                  : isThinking
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    : 'bg-slate-900 hover:bg-slate-800 text-white shadow-lg shadow-slate-900/15'
            }`}
          >
            {isListening ? (
              <><div className="w-2.5 h-2.5 bg-red-600 rounded-full animate-pulse" /> Stop Recording</>
            ) : isSpeaking ? (
              <><div className="w-3 h-3 border-2 border-slate-300 border-t-slate-500 rounded-full animate-spin" /> AI Speaking</>
            ) : isThinking ? (
              <><div className="w-3 h-3 border-2 border-slate-300 border-t-slate-500 rounded-full animate-spin" /> Processing...</>
            ) : (
              <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"/></svg> Hold to Speak / Tap</>
            )}
          </button>

          <div className="flex gap-2 mt-2">
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSendText(); }}
              placeholder="Type your message..."
              disabled={isThinking || isSpeaking}
              className="flex-1 bg-white/85 border border-white/80 text-slate-800 px-4 py-3 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-500/50 disabled:bg-slate-50 shadow-inner"
            />
            <button
              onClick={handleSendText}
              disabled={!textInput.trim() || isThinking || isSpeaking}
              className="px-4 bg-white/85 hover:bg-white text-slate-700 disabled:bg-slate-100 disabled:text-slate-400 rounded-2xl transition-colors shadow-inner border border-white/80"
              aria-label="Send message"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                <path d="m22 2-7 20-4-9-9-4Z" />
                <path d="M22 2 11 13" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
