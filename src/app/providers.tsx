"use client";

import { AppShell } from "@/components/layout/AppShell";
import { DataProvider } from "@/context/DataContext";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <DataProvider>
      <AppShell>{children}</AppShell>
    </DataProvider>
  );
}
