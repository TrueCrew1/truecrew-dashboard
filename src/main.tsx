import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { initPostHog } from "@/lib/analytics/posthog";
import { initClientSentry } from "@/lib/sentry/client";
import { DataProvider } from "@/context/DataContext";
import { router } from "@/routes";
import "@/styles/global.css";

initClientSentry();
initPostHog();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <DataProvider>
      <RouterProvider router={router} />
    </DataProvider>
  </StrictMode>,
);
