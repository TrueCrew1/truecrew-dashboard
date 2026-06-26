import { createContext, useContext } from "react";

interface SelectionContextValue {
  selectedEntityId: string | null;
  setSelectedEntityId: (id: string | null) => void;
}

export const SelectionContext = createContext<SelectionContextValue>({
  selectedEntityId: null,
  setSelectedEntityId: () => {},
});

export function useSelection() {
  return useContext(SelectionContext);
}
