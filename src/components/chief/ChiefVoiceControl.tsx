import { useState, type ChangeEvent } from "react";
import { isChiefVoiceUiEnabled, transcribeAudio } from "@/lib/api/client";

interface ChiefVoiceControlProps {
  disabled?: boolean;
  onTranscribed: (text: string) => void;
}

type VoiceStatus = "idle" | "transcribing" | "error";

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("Failed to read audio file"));
        return;
      }
      const commaIndex = result.indexOf(",");
      resolve(commaIndex >= 0 ? result.slice(commaIndex + 1) : result);
    };
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read audio file"));
    reader.readAsDataURL(file);
  });
}

/**
 * Voice v1: file-upload only (no microphone streaming, per scope). Fills the
 * command input with the transcript so the operator can review/edit before
 * submitting — deliberately not auto-submitted, since a misheard transcript
 * shouldn't silently become a query.
 */
export function ChiefVoiceControl({ disabled, onTranscribed }: ChiefVoiceControlProps) {
  const [status, setStatus] = useState<VoiceStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isChiefVoiceUiEnabled()) return null;

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setStatus("transcribing");
    setErrorMessage(null);

    try {
      const base64 = await fileToBase64(file);
      const text = await transcribeAudio(base64, file.type || "audio/webm");
      onTranscribed(text);
      setStatus("idle");
    } catch (error) {
      setStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "Transcription failed");
    }
  };

  return (
    <div className="chief-voice-control">
      <label className="chief-voice-label" htmlFor="chief-voice-upload">
        Upload voice note
      </label>
      <input
        id="chief-voice-upload"
        type="file"
        accept="audio/*"
        onChange={(event) => void handleFileChange(event)}
        disabled={disabled || status === "transcribing"}
        aria-describedby={status === "error" ? "chief-voice-error" : undefined}
      />
      {status === "transcribing" ? (
        <span className="chief-voice-status" aria-live="polite">
          Transcribing…
        </span>
      ) : null}
      {status === "error" ? (
        <span className="chief-voice-status chief-voice-status--error" id="chief-voice-error" role="alert">
          {errorMessage}
        </span>
      ) : null}
    </div>
  );
}
