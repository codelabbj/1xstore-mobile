"use client"

import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import {
  Download,
  Upload,
  Bell,
  Gift,
  Moon,
  Sun,
  Ticket,
  User,
  ShieldCheck,
  Sparkles,
  PhoneCall,
  Smartphone,
  IdCard,
} from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { AuthGuard } from "@/components/auth-guard"
import { AppShell } from "@/app/_components/AppShell"
import { AppSection } from "@/app/_components/AppSection"
import { getUser } from "@/lib/auth"
import api from "@/lib/api"
import type { Transaction } from "@/lib/types"
import { formatDate } from "@/lib/utils"
import { useSettings } from "@/hooks/use-settings"
import toast from "react-hot-toast"

function DashboardContent() {
  const { t } = useTranslation()
  const router = useRouter()
  const user = getUser()
  const { referralBonusEnabled, settings } = useSettings()
  const [adImageErrors, setAdImageErrors] = useState<Set<number>>(new Set())
  const [currentAdIndex, setCurrentAdIndex] = useState(0)
  const [isCarouselPaused, setIsCarouselPaused] = useState(false)
  const { theme, setTheme } = useTheme()
  const [messageMenuOpen, setMessageMenuOpen] = useState(false)

  const { data: transactions, isLoading } = useQuery({
    queryKey: ["recent-transactions"],
    queryFn: async () => {
      const response = await api.get<{
        count: number
        results: Transaction[]
      }>("/mobcash/transaction-history", {
        params: {
          page: 1,
          page_size: 5,
        },
      })
      return response.data.results
    },
    refetchInterval: 120000, // Refresh every 2 minutes
  })

  // Fetch notification count for badge
  const { data: notificationData } = useQuery({
    queryKey: ["notification-count"],
    queryFn: async () => {
      const response = await api.get<{
        count: number
        results: any[]
      }>("/mobcash/notification", {
        params: {
          page: 1,
          page_size: 1, // We only need count
        },
      })
      return response.data.count
    },
    refetchInterval: 120000, // Refresh every 2 minutes
  })

  type AdvertisementEntry = {
    enable?: boolean
    image?: string
    image_url?: string
    url?: string
    banner?: string
    title?: string
    name?: string
    link?: string
  }

  type AdvertisementResponse =
    | AdvertisementEntry[]
    | {
      results?: AdvertisementEntry[]
    }
    | null
    | undefined

  // Fetch advertisements
  const { data: advertisements } = useQuery({
    queryKey: ["advertisements"],
    queryFn: async () => {
      try {
        const response = await api.get<any>("/mobcash/ann")
        const payload: AdvertisementResponse = response.data

        const entries: AdvertisementEntry[] = Array.isArray(payload)
          ? payload
          : payload && "results" in payload && Array.isArray(payload.results)
            ? payload.results
            : []

        if (!entries.length) {
          return []
        }

        // Filter and map enabled advertisements
        const enabledAds = entries
          .filter((item: AdvertisementEntry) => item?.enable === true)
          .map((item: AdvertisementEntry) => {
            const imageUrl =
              item.image ||
              item.image_url ||
              item.url ||
              item.banner ||
              null

            if (!imageUrl) {
              return null
            }

            return {
              image: imageUrl,
              title: item.title || item.name || null,
              link: item.link || item.url || null,
            }
          })
          .filter((ad): ad is { image: string; title: string | null; link: string | null } => ad !== null)

        return enabledAds
      } catch (error) {
        // Return empty array if API fails
        return []
      }
    },
  })

  // Reset current index when advertisements change
  useEffect(() => {
    if (advertisements && advertisements.length > 0) {
      setCurrentAdIndex(0)
      setAdImageErrors(new Set())
    }
  }, [advertisements])

  // Auto-play carousel
  useEffect(() => {
    if (!advertisements || advertisements.length <= 1 || isCarouselPaused) return

    const interval = setInterval(() => {
      setCurrentAdIndex((prev) => (prev + 1) % advertisements.length)
    }, 5000) // Change slide every 5 seconds

    return () => clearInterval(interval)
  }, [advertisements, isCarouselPaused])

  const handleImageError = (index: number) => {
    setAdImageErrors((prev) => new Set(prev).add(index))
  }

  const goToSlide = (index: number) => {
    setCurrentAdIndex(index)
  }

  const handleCarouselPressStart = () => {
    if (!advertisements || advertisements.length <= 1) return
    setIsCarouselPaused(true)
  }

  const handleCarouselPressEnd = () => {
    setIsCarouselPaused(false)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "accept":
        return <Badge className="bg-primary">{t("accept")}</Badge>
      case "reject":
        return <Badge variant="destructive">{t("reject")}</Badge>
      default:
        return <Badge variant="secondary">{t("pending")}</Badge>
    }
  }

  const getTypeIcon = (type: string) => {
    return type === "deposit" ? (
      <Download className="h-5 w-5 text-primary" />
    ) : (
      <Upload className="h-5 w-5 text-primary" />
    )
  }

  const shellStatus = isLoading ? "Synchronisation en cours..." : "Flux sécurisé"

  const headerActions = (
    <div className="flex items-center gap-2">
      <button
        className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-primary/10 bg-white/80 text-foreground shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl dark:border-white/10 dark:bg-white/10"
        onClick={() => router.push("/notifications")}
        aria-label="Ouvrir les notifications"
      >
        <Bell className="h-5 w-5" />
        {notificationData && notificationData > 0 && (
          <Badge
            variant="destructive"
            className="absolute -right-1 -top-1 h-5 min-w-5 rounded-full p-0 text-[10px] leading-none"
          >
            {notificationData > 99 ? '99+' : notificationData}
          </Badge>
        )}
      </button>
      <button
        className="flex h-11 w-11 items-center justify-center rounded-2xl border border-primary/10 bg-white/80 text-foreground shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl dark:border-white/10 dark:bg-white/10"
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        aria-label="Changer le thème"
      >
        {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
      </button>
      <button
        className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-blue-600 text-white shadow-lg transition hover:scale-[1.03]"
        onClick={() => router.push("/profile")}
        aria-label="Profil"
      >
        <User className="h-5 w-5" />
      </button>
    </div>
  )

  const bottomDock = (
    <Popover open={messageMenuOpen} onOpenChange={setMessageMenuOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="secondary"
          className="h-14 w-14 rounded-full bg-gradient-to-br from-primary to-blue-600 text-white shadow-xl hover:opacity-90"
          aria-label="Contacter le support"
        >
          <svg
            className="h-6 w-6"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </Button>
      </PopoverTrigger>
      <PopoverContent side="top" align="end" className="w-72 overflow-hidden rounded-3xl border-0 p-0 shadow-2xl" sideOffset={14}>
        <div className="bg-gradient-to-br from-primary to-blue-600 px-5 py-4 text-white">
          <p className="text-lg font-bold">Besoin d'aide ?</p>
          <p className="text-sm text-white/80">Notre équipe répond en moins de 5 min</p>
        </div>
        <div className="space-y-1 bg-white p-3 dark:bg-slate-900">
          <button
            className="flex w-full items-center gap-4 rounded-2xl p-3 text-left transition hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
            onClick={() => {
              window.open(`https://wa.me/${settings?.whatsapp_phone || "22962795682"}`, "_blank")
              setMessageMenuOpen(false)
            }}
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500">
              <svg
                className="h-6 w-6 text-white"
                fill="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="font-semibold text-foreground">WhatsApp</p>
              <p className="text-xs text-muted-foreground">Réponse instantanée</p>
            </div>
            <svg className="h-5 w-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <button
            className="flex w-full items-center gap-4 rounded-2xl p-3 text-left transition hover:bg-blue-50 dark:hover:bg-blue-950/30"
            onClick={() => {
              window.open(`https://t.me/${settings?.telegram || "Vianelgts"}`, "_blank")
              setMessageMenuOpen(false)
            }}
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500">
              <svg
                className="h-6 w-6 text-white"
                fill="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.161c-.17 1.89-.896 6.46-.896 6.46s-.537 3.953-2.24 4.537c-.44.15-.78.23-1.11.23-.9 0-1.58-.33-2.22-.9l-3.08-2.27s-.45-.33.1-.73l6.64-4.12c.73-.45-.16-.7-1.12-.25l-8.28 5.22c-.73.45-1.42.22-1.42.22l-2.9-1.9s-.9-.56.62-1.12l11.5-4.42c4.5-1.68 2.1-.45 2.1-.45z" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="font-semibold text-foreground">Telegram</p>
              <p className="text-xs text-muted-foreground">Chat en direct</p>
            </div>
            <svg className="h-5 w-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </PopoverContent>
    </Popover>
  )

  const smartTasks = [
    {
      title: "Associer un identifiant de pari",
      description: "Assurez-vous que votre compte est lié avant un dépôt.",
      icon: IdCard,
      action: () => router.push("/add-bet-id?flow=deposit&return=/dashboard"),
    },
    {
      title: "Ajouter un numéro mobile money",
      description: "Préparez vos retraits en enregistrant un numéro fiable.",
      icon: Smartphone,
      action: () => router.push("/add-phone?flow=deposit&return=/dashboard"),
    },
    {
      title: "Contacter le support",
      description: "Obtenez une assistance immédiate via WhatsApp.",
      icon: PhoneCall,
      action: () => window.open("https://wa.me/message/2290000000", "_blank"),
    },
  ]

  return (
    <AppShell
      title="Blue Horizon"
      subtitle="Pilotez vos opérations depuis votre appareil Android"
      status={shellStatus}
      actions={headerActions}
      floatingSlot={bottomDock}
    >
      <div className="space-y-6">


        {referralBonusEnabled && user && user.bonus_available > 0 && (
          <AppSection title="Bonus disponible" subtitle="Transformez vos gains en actions rapides.">
            <div className="rounded-3xl bg-gradient-to-br from-primary to-blue-500 p-5 text-white">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-white/80">Bonus disponible</p>
                  <p className="text-4xl font-semibold tracking-tight">{user.bonus_available.toLocaleString()}</p>
                  <p className="text-sm text-white/70">FCFA</p>
                </div>
                <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4">
                  <Gift className="h-8 w-8" />
                </div>
              </div>
            </div>
          </AppSection>
        )}

        {/* <AppSection
          title="Tâches prioritaires"
          subtitle="Gardez vos informations à jour pour éviter les blocages."
        >
          <div className="space-y-3">
            {smartTasks.map((task) => (
              <button
                key={task.title}
                className="flex w-full items-start gap-3 rounded-3xl border border-border/60 bg-white/90 px-4 py-4 text-left transition hover:-translate-y-0.5 hover:shadow-lg dark:bg-slate-900/60"
                onClick={task.action}
              >
                <div className="rounded-2xl bg-primary/10 p-3 text-primary">
                  <task.icon className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-sm">{task.title}</p>
                  <p className="text-xs text-muted-foreground">{task.description}</p>
                </div>
                <Sparkles className="h-4 w-4 text-primary" />
              </button>
            ))}
          </div>
        </AppSection> */}

        {advertisements && advertisements.length > 0 ? (
          <div
            className="relative overflow-hidden rounded-2xl"
            onMouseEnter={handleCarouselPressStart}
            onMouseLeave={handleCarouselPressEnd}
            onTouchStart={handleCarouselPressStart}
            onTouchEnd={handleCarouselPressEnd}
            onTouchCancel={handleCarouselPressEnd}
          >
            <div className="relative w-full overflow-hidden">
              {advertisements.map((ad, index) => (
                <div
                  key={index}
                  className={`transition-opacity duration-500 ${index === currentAdIndex ? "opacity-100" : "pointer-events-none absolute inset-0 opacity-0"}`}
                >
                  <div
                    className="relative w-full cursor-pointer"
                    onClick={() => {
                      if (ad.link) window.open(ad.link, "_blank", "noopener,noreferrer")
                    }}
                  >
                    {!adImageErrors.has(index) ? (
                      <div className="relative w-full" style={{ aspectRatio: "3 / 1" }}>
                        <img
                          src={ad.image}
                          alt={ad.title || "Advertisement"}
                          className="absolute inset-0 h-full w-full rounded-2xl object-cover"
                          onError={() => handleImageError(index)}
                        />
                      </div>
                    ) : (
                      <div className="flex w-full items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5" style={{ aspectRatio: "3 / 1" }}>
                        <p className="text-sm text-muted-foreground">Publicité</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {advertisements.length > 1 && (
              <div className="absolute bottom-2 left-1/2 z-10 flex -translate-x-1/2 gap-1.5">
                {advertisements.map((_, index) => (
                  <button
                    key={index}
                    onClick={(e) => {
                      e.stopPropagation()
                      goToSlide(index)
                    }}
                    className={`h-1.5 rounded-full transition-all ${index === currentAdIndex ? "w-6 bg-white shadow-md" : "w-2 bg-white/60"}`}
                    aria-label={`Afficher la publicité ${index + 1}`}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="flex w-full items-center justify-center rounded-2xl border border-dashed border-primary/20 bg-primary/5 text-sm text-muted-foreground" style={{ aspectRatio: "3 / 1" }}>
            Publicité en attente
          </div>
        )}

        <AppSection>
          <div className={`grid gap-3 ${referralBonusEnabled ? "grid-cols-4" : "grid-cols-3"}`}>
            <button
              className="mobile-pressable flex flex-col items-center gap-2 rounded-2xl border border-emerald-200 bg-white/90 py-4 px-2 text-emerald-700 shadow-sm backdrop-blur-sm transition hover:-translate-y-0.5 hover:shadow-lg dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-200"
              onClick={() => router.push("/deposit")}
            >
              <div className="rounded-full bg-emerald-500/15 p-2.5">
                <Download className="h-5 w-5" />
              </div>
              <p className="font-semibold text-xs">Dépôt</p>
            </button>
            <button
              className="mobile-pressable flex flex-col items-center gap-2 rounded-2xl border border-orange-200 bg-white/90 py-4 px-2 text-orange-700 shadow-sm backdrop-blur-sm transition hover:-translate-y-0.5 hover:shadow-lg dark:border-orange-900/40 dark:bg-orange-900/20 dark:text-orange-100"
              onClick={() => router.push("/withdraw")}
            >
              <div className="rounded-full bg-orange-500/15 p-2.5">
                <Upload className="h-5 w-5" />
              </div>
              <p className="font-semibold text-xs">Retrait</p>
            </button>
            <button
              className="mobile-pressable flex flex-col items-center gap-2 rounded-2xl border border-primary/20 bg-white/90 py-4 px-2 text-primary shadow-sm backdrop-blur-sm transition hover:-translate-y-0.5 hover:shadow-lg dark:border-primary/40 dark:bg-primary/20 dark:text-white"
              onClick={handleCouponClick}
            >
              <div className="rounded-full bg-primary/15 p-2.5">
                <Ticket className="h-5 w-5" />
              </div>
              <p className="font-semibold text-xs">Coupon</p>
            </button>
            {referralBonusEnabled && (
              <button
                className="mobile-pressable flex flex-col items-center gap-2 rounded-2xl border border-purple-200 bg-white/90 py-4 px-2 text-purple-700 shadow-sm backdrop-blur-sm transition hover:-translate-y-0.5 hover:shadow-lg dark:border-purple-900/40 dark:bg-purple-900/20 dark:text-purple-200"
                onClick={() => router.push("/bonus")}
              >
                <div className="rounded-full bg-purple-500/15 p-2.5">
                  <Gift className="h-5 w-5" />
                </div>
                <p className="font-semibold text-xs">Bonus</p>
              </button>
            )}
          </div>
        </AppSection>

        <AppSection
          title="Transactions récentes"

          action={
            <Button
              variant="ghost"
              size="sm"
              className="h-9 rounded-full px-4 text-primary"
              onClick={() => router.push("/transactions")}
            >
              Voir tout
            </Button>
          }
        >
          {isLoading ? (
            <div className="rounded-2xl border border-dashed border-muted-foreground/30 p-8 text-center">
              <div className="mx-auto mb-2 h-8 w-8 animate-spin rounded-full border-3 border-primary border-r-transparent" />
              <p className="text-sm text-muted-foreground">Chargement...</p>
            </div>
          ) : !transactions || transactions.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-muted-foreground/30 p-8 text-center">
              <p className="text-sm text-muted-foreground">Aucune transaction</p>
            </div>
          ) : (
            <div className="space-y-2">
              {transactions.map((transaction) => (
                <div key={transaction.id} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div
                      className={`shrink-0 rounded-2xl p-2.5 ${transaction.type_trans === "deposit" ? "bg-emerald-500/10" : "bg-orange-500/10"
                        }`}
                    >
                      {transaction.type_trans === "deposit" ? (
                        <Download className="h-5 w-5 text-emerald-600" />
                      ) : (
                        <Upload className="h-5 w-5 text-orange-500" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-sm">
                            {transaction.type_trans === "deposit" ? "Dépôt" : "Retrait"}
                          </p>
                          {transaction.app_details?.name && (
                            <p className="text-xs text-muted-foreground break-words">{transaction.app_details.name}</p>
                          )}
                          {transaction.user_app_id && (
                            <p className="text-xs font-mono text-muted-foreground">ID: {transaction.user_app_id}</p>
                          )}
                        </div>
                        <p className="whitespace-nowrap text-sm font-bold">
                          {transaction.amount.toLocaleString()} FCFA
                        </p>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-muted-foreground">{formatDate(transaction.created_at)}</span>
                        {getStatusBadge(transaction.status)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </AppSection>
      </div>
    </AppShell>
  )
}

export default function DashboardPage() {
  return (
    <AuthGuard>
      <DashboardContent />
    </AuthGuard>
  )
}

