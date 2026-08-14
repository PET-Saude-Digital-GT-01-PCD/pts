import type { Metadata } from "next";
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
    <html lang="pt-BR">
      <body className="antialiased">{children}</body>
    </html>
  );
}
