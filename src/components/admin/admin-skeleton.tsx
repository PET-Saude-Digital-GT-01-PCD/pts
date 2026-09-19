import { Skeleton } from "@/components/ui/skeleton";

/**
 * Esqueleto das telas de admin (usado nos `loading.tsx`): imita a moldura do
 * AdminShell — cabeçalho, cartões de resumo e um painel de lista.
 */
export function AdminSkeleton() {
  return (
    <main
      aria-busy
      aria-label="Carregando"
      className="min-h-full bg-surface pb-12"
    >
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4 sm:p-8">
        <div className="space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-7 w-64" />
          <Skeleton className="h-4 w-full max-w-md" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
        <div className="flex flex-col gap-3 rounded-3xl bg-surface-raised p-5 shadow-soft ring-1 ring-foreground/5 sm:p-6">
          <Skeleton className="h-5 w-48" />
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </div>
    </main>
  );
}
