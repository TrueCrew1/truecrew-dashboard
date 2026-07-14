import { useCallback, useEffect, useRef, useState } from "react";

interface SpeechRecognitionResultLike {
  transcript: string;
}

interface SpeechRecognitionEventLike extends Event {
  results: ArrayLike<ArrayLike<SpeechRecognitionResultLike>>;
}

interface SpeechRecognitionErrorEventLike extends Event {
  error: string;
}

interface SpeechRecognitionLike extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

function getSpeechRecognitionConstructor(): SpeechRecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/** Push-to-talk mic input + spoken response output for Chief, layered on the existing text command path. */
export function useChiefVoice(onTranscript: (transcript: string) => void) {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const onTranscriptRef = useRef(onTranscript);
  useEffect(() => {
    onTranscriptRef.current = onTranscript;
  }, [onTranscript]);

  const SpeechRecognitionCtor = getSpeechRecognitionConstructor();
  const isSpeechInputSupported = SpeechRecognitionCtor !== null;
  const isSpeechOutputSupported =
    typeof window !== "undefined" && "speechSynthesis" in window;

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  const startListening = useCallback(() => {
    if (!SpeechRecognitionCtor || isListening) return;

    setMicError(null);
    const recognition = new SpeechRecognitionCtor();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript;
      if (transcript) onTranscriptRef.current(transcript);
    };

    recognition.onerror = (event) => {
      setMicError(
        event.error === "not-allowed" || event.error === "permission-denied"
          ? "Mic access denied — allow microphone access to use push-to-talk."
          : "Voice input failed — try again or type your command.",
      );
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    setIsListening(true);
    recognition.start();
  }, [SpeechRecognitionCtor, isListening]);

  const stop = useCallback(() => {
    if (isSpeechOutputSupported) window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, [isSpeechOutputSupported]);

  const speak = useCallback(
    (text: string) => {
      if (!isSpeechOutputSupported || !text.trim()) return;

      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
    },
    [isSpeechOutputSupported],
  );

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
      if (isSpeechOutputSupported) window.speechSynthesis.cancel();
    };
  }, [isSpeechOutputSupported]);

  return {
    speak,
    stop,
    startListening,
    stopListening,
    isSpeaking,
    isListening,
    isSpeechInputSupported,
    isSpeechOutputSupported,
    micError,
  };
}
