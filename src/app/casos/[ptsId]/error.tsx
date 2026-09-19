"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <Alert variant="destructive">
        <AlertTitle className="flex items-center gap-2">
          <AlertTriangle className="size-4 shrink-0" aria-hidden />
          Não foi possível carregar o caso
        </AlertTitle>
        <AlertDescription>
          O dado clínico não foi alterado. Tente de novo; se persistir, avise a
          coordenação.
        </AlertDescription>
      </Alert>
      <Button type="button" onClick={reset} className="w-full sm:w-auto">
        Tentar de novo
      </Button>
    </div>
  );
}
