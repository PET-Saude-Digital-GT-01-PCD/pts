import { cn } from "@/lib/utils";

const sizes = {
  sm: "size-7 [&_svg]:size-4",
  md: "size-9 [&_svg]:size-5.5",
  lg: "size-14 [&_svg]:size-8.5",
} as const;

const textSizes = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-2xl",
} as const;

export function Logo({
  className,
  size = "md",
  hideWordmark = false,
  nome = "PTS Digital",
  logoUrl = null,
}: {
  className?: string;
  size?: keyof typeof sizes;
  hideWordmark?: boolean;
  /** Nome exibido da org (branding #68); default = "PTS Digital". */
  nome?: string;
  /** Logo da org por URL (#68); null = usa o monograma padrão do produto. */
  logoUrl?: string | null;
}) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- URL externa arbitrária configurada pelo admin, fora do domínio conhecido em build-time
        <img
          src={logoUrl}
          alt=""
          className={cn("shrink-0 rounded-xl object-contain", sizes[size])}
        />
      ) : (
        <span
          aria-hidden="true"
          className={cn(
            "inline-flex shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground",
            sizes[size]
          )}
        >
          <svg viewBox="0 0 40 40" fill="none" className="size-5.5">
            <path
              d="M8 22h5l3-7 5 13 3-7h8"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      )}
      {!hideWordmark && (
        <span className={cn("font-semibold tracking-tight", textSizes[size])}>
          {nome}
        </span>
      )}
    </span>
  );
}