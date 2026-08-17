import type { Metadata } from "next";
import { ThemeProvider } from "next-themes";

import { SiteHeader } from "@/components/ui/site-header";
import "./globals.css";

export const metadata: Metadata = {
  title: "PTS Digital",
  description:
    "Plataforma de gestão do Projeto Terapêutico Singular para Centros Especializados em Reabilitação (CER) do SUS.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className="antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <SiteHeader />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}