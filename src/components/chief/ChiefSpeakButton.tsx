import { useState } from "react";
import { isChiefVoiceUiEnabled, synthesizeSpeech } from "@/lib/api/client";

interface ChiefSpeakButtonProps {
  text: string;
}

type SpeakStatus = "idle" | "loading" | "error";

/** Voice v1: on-demand TTS playback of Chief's response — manual button, no autoplay. */
export function ChiefSpeakButton({ text }: ChiefSpeakButtonProps) {
  const [status, setStatus] = useState<SpeakStatus>("idle");
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  if (!isChiefVoiceUiEnabled()) return null;

  const handleClick = async () => {
    setStatus("loading");
    try {
      const { audioBase64, mimeType } = await synthesizeSpeech(text);
      setAudioUrl(`data:${mimeType};base64,${audioBase64}`);
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  };

  return (
    <div className="chief-speak-control">
      <button
        type="button"
        className="chief-speak-btn"
        onClick={() => void handleClick()}
        disabled={status === "loading"}
      >
        {status === "loading" ? "Generating audio…" : "Listen"}
      </button>
      {status === "error" ? (
        <span className="chief-voice-status chief-voice-status--error" role="alert">
          Speech playback failed
        </span>
      ) : null}
      {audioUrl ? <audio controls src={audioUrl} className="chief-speak-audio" /> : null}
    </div>
  );
}
