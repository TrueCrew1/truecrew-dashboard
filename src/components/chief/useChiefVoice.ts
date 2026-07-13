import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Minimal ambient typing for the Web Speech recognition API. TypeScript's DOM
 * lib ships types for SpeechSynthesis but not the SpeechRecognition
 * interface, its events, or its constructor — declared here just enough to
 * cover what this hook uses.
 */
interface ChiefSpeechRecognitionResult {
  readonly [index: number]: { readonly transcript: string };
}

interface ChiefSpeechRecognitionResultList {
  readonly length: number;
  readonly [index: number]: ChiefSpeechRecognitionResult;
}

interface ChiefSpeechRecognitionEvent extends Event {
  readonly results: ChiefSpeechRecognitionResultList;
}

interface ChiefSpeechRecognition extends EventTarget {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: ChiefSpeechRecognitionEvent) => void) | null;
  onerror: ((event: Event) => void) | null;
  onend: (() => void) | null;
}

type ChiefSpeechRecognitionCtor = new () => ChiefSpeechRecognition;

declare global {
  interface Window {
    SpeechRecognition?: ChiefSpeechRecognitionCtor;
    webkitSpeechRecognition?: ChiefSpeechRecognitionCtor;
  }
}

function getSpeechRecognitionCtor(): ChiefSpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null;
}

export type ChiefVoiceInputStatus = "idle" | "listening" | "unsupported";

interface UseChiefVoiceOptions {
  /** Called with the recognized transcript once recognition finishes. */
  onTranscript: (transcript: string) => void;
}

interface UseChiefVoiceResult {
  speakSupported: boolean;
  speaking: boolean;
  /** Speaks the given text aloud, cancelling anything already speaking. */
  speak: (text: string) => void;
  stopSpeaking: () => void;
  inputStatus: ChiefVoiceInputStatus;
  /** Starts a push-to-talk capture; no-ops if already listening or unsupported. */
  startListening: () => void;
  stopListening: () => void;
}

/**
 * Browser-native voice layer for Chief: speech synthesis for reading
 * responses aloud, and push-to-talk speech recognition that hands its
 * transcript back to the caller — which feeds it into the same text command
 * path used for typed input. No separate voice-only command pipeline.
 */
export function useChiefVoice({ onTranscript }: UseChiefVoiceOptions): UseChiefVoiceResult {
  const speakSupported = typeof window !== "undefined" && "speechSynthesis" in window;
  const [speaking, setSpeaking] = useState(false);

  const speak = useCallback(
    (text: string) => {
      if (!speakSupported || !text.trim()) return;
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.onstart = () => setSpeaking(true);
      utterance.onend = () => setSpeaking(false);
      utterance.onerror = () => setSpeaking(false);
      window.speechSynthesis.speak(utterance);
    },
    [speakSupported],
  );

  const stopSpeaking = useCallback(() => {
    if (!speakSupported) return;
    window.speechSynthesis.cancel();
    setSpeaking(false);
  }, [speakSupported]);

  useEffect(() => {
    if (!speakSupported) return undefined;
    return () => {
      window.speechSynthesis.cancel();
    };
  }, [speakSupported]);

  const recognitionSupported = getSpeechRecognitionCtor() !== null;
  const [inputStatus, setInputStatus] = useState<ChiefVoiceInputStatus>(
    recognitionSupported ? "idle" : "unsupported",
  );
  const recognitionRef = useRef<ChiefSpeechRecognition | null>(null);
  const onTranscriptRef = useRef(onTranscript);
  useEffect(() => {
    onTranscriptRef.current = onTranscript;
  }, [onTranscript]);

  const startListening = useCallback(() => {
    if (inputStatus === "listening") return;

    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      setInputStatus("unsupported");
      return;
    }

    const recognition = new Ctor();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => {
      const transcript = event.results[event.results.length - 1]?.[0]?.transcript?.trim();
      if (transcript) onTranscriptRef.current(transcript);
    };
    recognition.onerror = () => setInputStatus("idle");
    recognition.onend = () => setInputStatus("idle");

    recognitionRef.current = recognition;
    recognition.start();
    setInputStatus("listening");
  }, [inputStatus]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
    };
  }, []);

  return {
    speakSupported,
    speaking,
    speak,
    stopSpeaking,
    inputStatus,
    startListening,
    stopListening,
  };
}
