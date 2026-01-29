import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

type AccentVariant = "primary" | "amber" | "emerald"

type GradientShellProps = {
  children: ReactNode
  accent?: AccentVariant
  className?: string
}

const ACCENT_PRESETS: Record<
  AccentVariant,
  {
    background: string
    spots: Array<{ className: string }>
  }
> = {
  primary: {
    background:
      "from-purple-50 via-background to-background dark:from-[#0d0218] dark:via-[#05010a] dark:to-black",
    spots: [
      { className: "bg-primary/25 dark:bg-primary/40 h-80 w-80 -top-32 -right-16 blur-[140px]" },
      { className: "bg-fuchsia-400/20 dark:bg-fuchsia-600/30 h-96 w-96 -bottom-40 -left-20 blur-[180px]" },
      { className: "bg-indigo-300/10 dark:bg-indigo-900/30 h-72 w-72 top-1/3 left-1/2 -translate-x-1/2 blur-[160px]" },
    ],
  },
  amber: {
    background:
      "from-amber-50 via-background to-background dark:from-[#1b0d00] dark:via-[#090200] dark:to-black",
    spots: [
      { className: "bg-amber-400/30 dark:bg-amber-500/40 h-72 w-72 -top-24 -right-16 blur-[140px]" },
      { className: "bg-orange-400/20 dark:bg-orange-600/30 h-96 w-96 -bottom-48 -left-12 blur-[200px]" },
      { className: "bg-white/20 dark:bg-white/5 h-64 w-64 top-1/2 left-1/3 blur-[160px]" },
    ],
  },
  emerald: {
    background:
      "from-emerald-50 via-background to-background dark:from-[#001a17] dark:via-[#000d0b] dark:to-black",
    spots: [
      { className: "bg-emerald-400/25 dark:bg-emerald-500/30 h-80 w-80 -top-28 -right-10 blur-[150px]" },
      { className: "bg-teal-400/20 dark:bg-teal-600/30 h-96 w-96 -bottom-44 -left-24 blur-[200px]" },
      { className: "bg-cyan-200/20 dark:bg-cyan-900/30 h-72 w-72 top-1/3 left-2/3 blur-[170px]" },
    ],
  },
}

export function GradientShell({ children, accent = "primary", className }: GradientShellProps) {
  const preset = ACCENT_PRESETS[accent] ?? ACCENT_PRESETS.primary

  return (
    <div
      className={cn(
        "relative min-h-screen overflow-hidden bg-gradient-to-b",
        preset.background,
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-0 -z-10">
        {preset.spots.map((spot, index) => (
          <div
            key={index}
            className={cn(
              "absolute rounded-full opacity-70 transition-all duration-500 will-change-transform",
              spot.className,
            )}
          />
        ))}
      </div>
      <div className="relative z-10">{children}</div>
    </div>
  )
}

