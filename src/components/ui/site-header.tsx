import Link from "next/link";

import { Logo } from "@/components/ui/logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import type { OrgConfigView } from "@/server/iam/org-config-schema";

export function SiteHeader({ orgConfig }: { orgConfig?: OrgConfigView }) {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link
          href="/"
          aria-label={`${orgConfig?.nomeExibido ?? "PTS Digital"} — início`}
          className="rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Logo nome={orgConfig?.nomeExibido} logoUrl={orgConfig?.logoUrl} />
        </Link>
        <ThemeToggle />
      </div>
    </header>
  );
}