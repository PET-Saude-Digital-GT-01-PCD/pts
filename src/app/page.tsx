import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 p-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>PTS Digital</CardTitle>
          <CardDescription>
            Plataforma de gestão do Projeto Terapêutico Singular para CER do
            SUS.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Base de desenvolvimento pronta: Next.js 15 · TypeScript · Tailwind
            CSS · PostgreSQL · Docker.
          </p>
          <div className="mt-4 flex gap-3">
            <Button asChild>
              <a href="/login">Entrar</a>
            </Button>
            <Button asChild variant="outline">
              <a href="/api/health">Healthcheck</a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
