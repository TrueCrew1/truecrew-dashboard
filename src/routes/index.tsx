import { createBrowserRouter } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { TodayPage } from "@/pages/TodayPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { OperationsPage } from "@/pages/OperationsPage";
import { BuildsPage } from "@/pages/BuildsPage";
import { MonitorPage } from "@/pages/MonitorPage";
import { RepairPage } from "@/pages/RepairPage";
import { CustomersPage } from "@/pages/CustomersPage";
import { KnowledgePage } from "@/pages/KnowledgePage";
import { ReviewPage } from "@/pages/ReviewPage";
import { SettingsPage } from "@/pages/SettingsPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppShell />,
    children: [
      { index: true, element: <TodayPage /> },
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
