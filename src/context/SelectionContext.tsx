import { createContext, useContext } from "react";

interface SelectionContextValue {
  selectedEntityId: string | null;
  setSelectedEntityId: (id: string | null) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export const SelectionContext = createContext<SelectionContextValue>({
  selectedEntityId: null,
  setSelectedEntityId: () => {},
  searchQuery: "",
  setSearchQuery: () => {},
});

export function useSelection() {
  return useContext(SelectionContext);
}
