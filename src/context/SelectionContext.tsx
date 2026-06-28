/**
 * Thin re-export — selection state now lives in UIContext.
 * All existing `useSelection()` call-sites continue to work unchanged.
 */
export { useUI as useSelection } from "@/context/UIContext";
