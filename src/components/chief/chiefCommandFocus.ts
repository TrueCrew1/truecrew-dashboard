type ChiefCommandFocusListener = (query: string) => void;

const listeners = new Set<ChiefCommandFocusListener>();

export function requestChiefCommandFocus(query: string): void {
  const trimmed = query.trim();
  if (!trimmed) return;
  for (const listener of listeners) {
    listener(trimmed);
  }
}

export function subscribeChiefCommandFocus(listener: ChiefCommandFocusListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
