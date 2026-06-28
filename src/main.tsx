import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { UIProvider } from "@/context/UIContext";
import { DataProvider } from "@/context/DataContext";
import { router } from "@/routes";
import "@/styles/global.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <UIProvider>
      <DataProvider>
        <RouterProvider router={router} />
      </DataProvider>
    </UIProvider>
  </StrictMode>,
);
