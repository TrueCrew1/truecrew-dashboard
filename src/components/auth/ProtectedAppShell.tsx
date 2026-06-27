import { AppShell } from "@/components/layout/AppShell";
import { withPageAuthRequired } from "@/components/auth/withPageAuthRequired";

export const ProtectedAppShell = withPageAuthRequired(AppShell);
