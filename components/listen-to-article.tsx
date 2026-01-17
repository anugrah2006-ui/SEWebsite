'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause, Square, Volume2 } from 'lucide-react';

type Props = { text: string; title?: string };

function pickFemaleVoiceIndex(vs: SpeechSynthesisVoice[]) {
  if (!vs?.length) return null;
  const lowerIncludes = (name: string | null | undefined, tokens: string[]) =>
    !!name && tokens.some((t) => name.toLowerCase().includes(t));
  const femaleHints = [
    'female',
    'zira', // Windows female
    'samantha', // macOS
    'karen',
    'victoria',
    'amy',
    'joanna',
    'salli',
    'aria',
    'jenny',
    'emma',
  ];
  const english = vs
    .map((v, idx) => ({ v, idx }))
    .filter(({ v }) => v.lang?.toLowerCase().startsWith('en'));
  const hinted = english.find(({ v }) => lowerIncludes(v.name, femaleHints));
  if (hinted) return hinted.idx;
  const googleFemale = vs.findIndex((v) =>
    v.name?.toLowerCase().includes('google uk english female')
  );
  if (googleFemale >= 0) return googleFemale;
  if (english.length) return english[0].idx;
  return 0;
}

function stripHtml(src: string) {
  if (!src) return '';
  // Server-safe: remove HTML tags using a regex instead of accessing DOM
  try {
    return src
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  } catch {
    return src;
  }
}

export default function ListenToArticle({ text, title }: Props) {
  const plain = stripHtml(text || '');
  const supported =
    typeof window !== 'undefined' && 'speechSynthesis' in window;
  const [playing, setPlaying] = useState(false);
  const [paused, setPaused] = useState(false);
  const [rate, setRate] = useState<number>(() => {
    try {
      if (typeof window !== 'undefined') {
        const stored = window.localStorage.getItem('listen_rate');
        return stored ? Number(stored) : 1;
      }
    } catch {}
    return 1;
  });
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voiceIndex, setVoiceIndex] = useState<number | null>(null);
  const [progress, setProgress] = useState(0); // 0..1
  const [elapsedChars, setElapsedChars] = useState(0);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const chunksRef = useRef<string[]>([]);
  const currentCharRef = useRef(0);

  useEffect(() => {
    const loadVoices = () => {
      const vs = window.speechSynthesis.getVoices() || [];
      setVoices(vs);
      if (vs.length) {
        // Prefer a female English voice for a more natural readback
        const prefer = pickFemaleVoiceIndex(vs);
        if (prefer !== null && prefer >= 0) setVoiceIndex(prefer);
        else if (voiceIndex === null) setVoiceIndex(0);
      }
    };
    loadVoices();
    window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
    return () =>
      window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
  }, []);

  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  function makeChunks(s: string) {
    // Split into sentence-like chunks for reliable progress and restart
    const parts = s.match(/[^.!?]+[.!?]+[\])'"’”]*|.+$/g) || [s];
    chunksRef.current = parts.map((p) => p.trim()).filter(Boolean);
    return chunksRef.current;
  }

  function totalChars() {
    return plain.length || chunksRef.current.join('')?.length || 0;
  }

  function speakFrom(charIndex = 0) {
    if (!plain) return;
    window.speechSynthesis.cancel();
    const remaining = plain.slice(charIndex);
    makeChunks(remaining);
    currentCharRef.current = charIndex;
    setElapsedChars(charIndex);
    setProgress(charIndex / Math.max(1, totalChars()));
    playChunksSequentially(0);
  }

  function playChunksSequentially(startIndex: number) {
    const chunks = chunksRef.current;
    if (!chunks || startIndex >= chunks.length) {
      // finished
      setPlaying(false);
      setPaused(false);
      return;
    }
    const textToSpeak = chunks[startIndex];
    const u = new SpeechSynthesisUtterance(textToSpeak);
    u.rate = rate;
    if (voiceIndex !== null && voices[voiceIndex]) u.voice = voices[voiceIndex];
    u.onend = () => {
      // advance char index by this chunk length
      currentCharRef.current += textToSpeak.length;
      setElapsedChars(currentCharRef.current);
      setProgress(currentCharRef.current / Math.max(1, plain.length));
      // speak next
      playChunksSequentially(startIndex + 1);
    };
    u.onerror = () => {
      setPlaying(false);
      setPaused(false);
    };
    utteranceRef.current = u;
    window.speechSynthesis.speak(u);
    setPlaying(true);
    setPaused(false);
  }

  function start() {
    if (!('speechSynthesis' in window)) return;
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
      setPlaying(true);
      setPaused(false);
      return;
    }
    speakFrom(currentCharRef.current);
  }

  function pause() {
    if (!('speechSynthesis' in window)) return;
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.pause();
      setPaused(true);
      setPlaying(false);
    }
  }

  function stop() {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    utteranceRef.current = null;
    chunksRef.current = [];
    currentCharRef.current = 0;
    setElapsedChars(0);
    setProgress(0);
    setPlaying(false);
    setPaused(false);
  }

  function changeRate(v: number) {
    setRate(v);
    try {
      if (typeof window !== 'undefined')
        window.localStorage.setItem('listen_rate', String(v));
    } catch {}
    // restart from current position to apply rate immediately
    if (playing || paused) {
      const pos = currentCharRef.current;
      stop();
      setTimeout(() => speakFrom(pos), 50);
    }
  }

  // removed elapsed/estimated UI — keep progress/tracking internal

  // announce status for screen readers
  const [srStatus, setSrStatus] = useState('');

  return (
    <div className="mb-4 p-3 rounded-md bg-white/5 dark:bg-gray-900/20">
      <div className="flex items-center gap-3">
        <button
          aria-pressed={playing}
          aria-label={playing ? 'Pause' : 'Play'}
          onClick={() => {
            if (!supported || !plain) return;
            // If already playing, pause. If paused or stopped, start/resume.
            if (playing) pause();
            else start();
          }}
          className={`flex items-center justify-center h-10 w-10 rounded-full ${playing ? 'bg-black text-white' : 'bg-black/80 text-white'} shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400`}
        >
          {playing ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4" />
          )}
        </button>

        <div className="flex items-center gap-3 text-sm">
          <Volume2 className="h-4 w-4 text-gray-500 dark:text-gray-300" />
          <div className="font-medium text-gray-800 dark:text-gray-100">
            Listen to article
          </div>
        </div>

        <div className="flex-1" />
      </div>

      <div className="sr-only" aria-live="polite">
        {srStatus}
      </div>
    </div>
  );
}
