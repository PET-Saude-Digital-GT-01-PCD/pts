import { cn } from "@/lib/utils";

export function WaveDivider({
  className,
  fill = "var(--primary)",
  flip = false,
}: {
  className?: string;
  fill?: string;
  flip?: boolean;
}) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none relative h-10 w-full overflow-hidden sm:h-12",
        flip && "rotate-180",
        className
      )}
    >
      <svg
        className="wave-slide absolute inset-0 h-full w-[200%] max-w-none"
        viewBox="0 0 2880 160"
        preserveAspectRatio="none"
        fill={fill}
      >
        <path d="M0 80 C240 80 480 40 720 80 C960 120 1200 80 1440 80 C1680 80 1920 40 2160 80 C2400 120 2640 80 2880 80 L2880 160 L0 160 Z" />
      </svg>
    </div>
  );
}