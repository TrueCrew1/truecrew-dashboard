import { createBrowserRouter } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { TodayPage } from "@/views/TodayPage";
import { CommandCenterPage } from "@/views/CommandCenterPage";
import { WorkspacePage } from "@/views/WorkspacePage";
import { RecordsPage } from "@/views/RecordsPage";
import { AdminPage } from "@/views/AdminPage";
import { AuditPage } from "@/views/AuditPage";
import { DashboardPage } from "@/views/DashboardPage";
import { OperationsPage } from "@/views/OperationsPage";
import { BuildsPage } from "@/views/BuildsPage";
import { MonitorPage } from "@/views/MonitorPage";
import { RepairPage } from "@/views/RepairPage";
import { CustomersPage } from "@/views/CustomersPage";
import { KnowledgePage } from "@/views/KnowledgePage";
import { ReviewPage } from "@/views/ReviewPage";
import { SettingsPage } from "@/views/SettingsPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppShell />,
    children: [
      { index: true, element: <TodayPage /> },
      { path: "command-center", element: <CommandCenterPage /> },
      { path: "workspace", element: <WorkspacePage /> },
      { path: "records", element: <RecordsPage /> },
      { path: "admin", element: <AdminPage /> },
      { path: "audit", element: <AuditPage /> },
      { path: "dashboard", element: <DashboardPage /> },
      { path: "operations", element: <OperationsPage /> },
      { path: "builds", element: <BuildsPage /> },
      { path: "monitor", element: <MonitorPage /> },
      { path: "repair", element: <RepairPage /> },
      { path: "customers", element: <CustomersPage /> },
      { path: "knowledge", element: <KnowledgePage /> },
      { path: "review", element: <ReviewPage /> },
      { path: "settings", element: <SettingsPage /> },
    ],
  },
]);

export const routes = [
  { path: "/", label: "Today" },
  { path: "/command-center", label: "Command Center" },
  { path: "/workspace", label: "Workspace" },
  { path: "/records", label: "Records" },
  { path: "/admin", label: "Admin" },
  { path: "/audit", label: "Audit" },
  { path: "/dashboard", label: "Dashboard" },
  { path: "/operations", label: "Operations" },
  { path: "/builds", label: "Builds" },
  { path: "/monitor", label: "Monitor" },
  { path: "/repair", label: "Repair" },
  { path: "/customers", label: "Customers" },
  { path: "/knowledge", label: "AI & Knowledge" },
  { path: "/review", label: "Review" },
  { path: "/settings", label: "Settings" },
] as const;
