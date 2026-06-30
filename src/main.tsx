import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { ConfirmProvider } from "@/components/ui/ConfirmModal";
import { DataProvider } from "@/context/DataContext";
import { router } from "@/routes";
import "@/styles/global.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ConfirmProvider>
      <DataProvider>
        <RouterProvider router={router} />
      </DataProvider>
    </ConfirmProvider>
  </StrictMode>,
);
