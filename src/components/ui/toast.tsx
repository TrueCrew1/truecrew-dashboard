import { useSyncExternalStore } from "react";

export type ToastTone = "success" | "error";

export interface Toast {
  id: number;
  message: string;
  tone: ToastTone;
}

const DEFAULT_DURATION = 3000;

let toasts: Toast[] = [];
let nextId = 1;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function dismiss(id: number) {
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

/** Show a subtle, auto-dismissing toast. */
export function showToast(
  message: string,
  tone: ToastTone = "success",
  duration = DEFAULT_DURATION,
): void {
  const id = nextId++;
  toasts = [...toasts, { id, message, tone }];
  emit();
  if (duration > 0 && typeof window !== "undefined") {
    window.setTimeout(() => dismiss(id), duration);
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return toasts;
}

export function ToastViewport() {
  const items = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  if (items.length === 0) return null;

  return (
    <div className="toast-viewport" aria-live="polite" aria-atomic="false">
      {items.map((toast) => (
        <div
          key={toast.id}
          className={`toast toast-${toast.tone}`}
          role={toast.tone === "error" ? "alert" : "status"}
          onClick={() => dismiss(toast.id)}
        >
          {toast.message}
        </div>
      ))}
    </div>
  );
}
