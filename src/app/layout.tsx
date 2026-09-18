import type { Metadata } from "next";
import { ThemeProvider } from "next-themes";
import { SessionProvider } from "next-auth/react";

import { AppShell } from "@/components/app-shell";
import { buscarOrgConfigView } from "@/server/iam/org-config";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const orgConfig = await buscarOrgConfigView();
  return {
    title: orgConfig.nomeExibido,
    description:
      "Plataforma de gestão do Projeto Terapêutico Singular para Centros Especializados em Reabilitação (CER) do SUS.",
  };
}

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
          <SessionProvider>
            <AppShell>{children}</AppShell>
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}