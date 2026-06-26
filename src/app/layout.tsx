import type { Metadata } from "next";
import { Providers } from "./providers";
import "@/styles/global.css";

export const metadata: Metadata = {
  title: "True Crew — Command Center",
  description: "Premium operational command center for running business end-to-end.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@400;500;600;700&family=IBM+Plex+Sans:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children ? <Providers>{children}</Providers> : null}</body>
    </html>
  );
}
