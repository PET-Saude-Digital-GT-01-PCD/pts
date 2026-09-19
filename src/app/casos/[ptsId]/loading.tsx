import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6 p-4 sm:p-6" aria-busy="true">
      <span className="sr-only" role="status">
        Carregando caso…
      </span>
      <div className="space-y-3">
        <Skeleton className="h-7 w-2/3 max-w-80" />
        <Skeleton className="h-4 w-1/2 max-w-64" />
      </div>
      <div className="flex gap-2 overflow-hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-24 shrink-0" />
        ))}
      </div>
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    </div>
  );
}
