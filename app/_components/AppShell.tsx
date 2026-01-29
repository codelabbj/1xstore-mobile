"use client"

import Image from "next/image"
import type { ReactNode } from "react"

type AppShellProps = {
  title: string
  subtitle?: string
  status?: string
  actions?: ReactNode
  children: ReactNode
  floatingSlot?: ReactNode
}

export function AppShell({
  title,
  subtitle,
  status,
  actions,
  children,
  floatingSlot,
}: AppShellProps) {
  return (
    <div className="relative min-h-screen bg-background">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[320px] bg-[radial-gradient(circle_at_top,_rgba(63,169,255,0.35),_transparent_65%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-20 mx-auto h-48 w-48 rounded-full bg-primary/40 blur-[140px]"
      />

      <div className="relative z-10 flex min-h-screen flex-col">
        <header className="safe-top px-4 pt-6 pb-4">
          <div className="mx-auto w-full max-w-md rounded-3xl border border-white/60 bg-white/75 px-4 py-4 shadow-[0_20px_80px_rgba(63,169,255,0.25)] backdrop-blur-2xl dark:border-white/10 dark:bg-white/5 dark:shadow-[0_20px_70px_rgba(10,24,41,0.6)]">
            <div className="flex items-center justify-between gap-4">
              <div className="flex h-14 w-24 items-center justify-center rounded-2xl">
                <Image
                  src="/1xstore-logo.png"
                  alt="1xstore"
                  width={120}
                  height={120}
                  className="object-contain w-full h-full"
                  priority
                />
              </div>
              {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 pb-28 pt-4">
          <div className="mx-auto w-full max-w-md space-y-5">{children}</div>
        </main>

        {/* <footer className="safe-bottom px-4 pb-6 text-center text-[0.75rem] text-muted-foreground">
          <div className="mx-auto w-full max-w-md">
            Développé par{" "}
            <a
              href="https://wa.me/22947030588"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary font-medium underline-offset-4 hover:underline"
            >
              Code Lab
            </a>
          </div>
        </footer> */}
      </div>

      {floatingSlot ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-2 z-40 px-5">
          <div className="mx-auto w-full max-w-md drop-shadow-2xl pointer-events-auto">{floatingSlot}</div>
        </div>
      ) : null}
    </div>
  )
}

