import Image from "next/image";

import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { WaveDivider } from "@/components/ui/wave-divider";
import { buscarOrgConfigView } from "@/server/iam/org-config";

const colaboradores = [
  { src: "/assets/logos/sus-digital.png", alt: "Logo SUS Digital" },
  { src: "/assets/logos/brasao-da-paraiba.png", alt: "Logo Brasão da Paraíba" },
  { src: "/assets/logos/UFPB.png", alt: "Logo da UFPB" },
  { src: "/assets/logos/funad.jpeg", alt: "Logo da FUNAD" },
  {
    src: "/assets/logos/ministerioLogo.png",
    alt: "Logo do Ministério da Saúde",
  },
];

export default async function Home() {
  const orgConfig = await buscarOrgConfigView();

  return (
    <main className="flex min-h-screen flex-col">
      <section className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-16 text-center sm:py-24">
        <Logo size="lg" hideWordmark />
        <h1 className="max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">
          Projeto Terapêutico Singular para o cuidado no CER
        </h1>
        <p className="max-w-xl text-muted-foreground">
          Plataforma de gestão do plano de cuidado para Centros Especializados
          em Reabilitação (CER) do SUS.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg">
            <a href="/login">Entrar</a>
          </Button>
          <Button asChild variant="outline" size="lg">
            <a href="/api/health">Healthcheck</a>
          </Button>
        </div>
      </section>

      <WaveDivider />

      <footer className="border-t bg-secondary/50">
        <div className="mx-auto w-full max-w-6xl px-6 py-10">
          <p className="text-center text-xs font-medium text-muted-foreground">
            Realização &amp; Colaboradores
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-4">
            {colaboradores.map((logo) => (
              <Image
                key={logo.src}
                src={logo.src}
                alt={logo.alt}
                width={0}
                height={0}
                sizes="100vw"
                className="h-8 w-auto object-contain opacity-70 grayscale transition hover:opacity-100 hover:grayscale-0 sm:h-10"
              />
            ))}
          </div>
          <p className="mt-6 text-center text-xs text-muted-foreground">
            © {new Date().getFullYear()} PTS Digital · PET-Saúde Digital GT-01
            PCD
          </p>
        </div>
        {orgConfig.parceiros.length > 0 ? (
          <div
            className="mx-auto w-full max-w-6xl border-t px-6 py-6"
            data-testid="parceiros-org"
          >
            <p className="text-center text-xs font-medium text-muted-foreground">
              Parceiros locais
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-4">
              {orgConfig.parceiros.map((parceiro) => (
                // eslint-disable-next-line @next/next/no-img-element -- URL externa configurada pelo admin (#68)
                <img
                  key={parceiro.nome}
                  src={parceiro.logoUrl}
                  alt={parceiro.nome}
                  className="h-8 w-auto object-contain opacity-70 grayscale transition hover:opacity-100 hover:grayscale-0 sm:h-10"
                />
              ))}
            </div>
          </div>
        ) : null}
      </footer>
    </main>
  );
}