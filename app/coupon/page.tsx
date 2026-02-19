"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { useRouter } from "next/navigation"
import { ArrowLeft, Copy, Check, Ticket, Share2, LockKeyhole, Download } from "lucide-react"
import toast from "react-hot-toast"
import { Button } from "@/components/ui/button"
import { AuthGuard } from "@/components/auth-guard"
import { AppShell } from "@/app/_components/AppShell"
import { AppSection } from "@/app/_components/AppSection"
import { Badge } from "@/components/ui/badge"
import api from "@/lib/api"
import type { Coupon, PaginatedResponse, Transaction } from "@/lib/types"
import { formatDate } from "@/lib/utils"

function CouponContent() {
  const { t } = useTranslation()
  const router = useRouter()
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  // Check if user has at least one successful deposit
  const { data: depositCheck, isLoading: depositCheckLoading } = useQuery({
    queryKey: ["deposit-check"],
    queryFn: async () => {
      const response = await api.get<{ count: number; results: Transaction[] }>("/mobcash/transaction-history", {
        params: { type_trans: "deposit", status: "accept", page: 1, page_size: 1 },
      })
      return response.data
    },
  })

  const hasSuccessfulDeposit = (depositCheck?.count ?? 0) > 0

  const { data: couponData, isLoading: couponLoading } = useQuery<PaginatedResponse<Coupon>>({
    queryKey: ["coupons"],
    queryFn: async () => {
      const response = await api.get<PaginatedResponse<Coupon>>("/mobcash/coupon")
      return response.data
    },
  })

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(code)
    toast.success("Code copié!")
    setTimeout(() => setCopiedCode(null), 2000)
  }

  const handleShareCode = async (code: string, platformName?: string) => {
    const text = platformName
      ? `Voici mon code promo ${platformName}: ${code}`
      : `Voici mon code promo: ${code}`

    if (navigator.share) {
      try {
        await navigator.share({ text })
      } catch {
        handleCopyCode(code)
      }
    } else {
      handleCopyCode(code)
    }
  }

  const headerActions = (
    <div className="flex items-center gap-2">
      <button
        className="flex h-11 w-11 items-center justify-center rounded-2xl border border-primary/10 bg-white/80 text-foreground shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl dark:border-white/10 dark:bg-white/10"
        onClick={() => router.push("/dashboard")}
        aria-label="Retour"
      >
        <ArrowLeft className="h-5 w-5" />
      </button>
      <Badge variant="secondary" className="rounded-2xl border border-primary/10 bg-primary/5 text-primary">
        {couponData?.count || 0} coupon{(couponData?.count || 0) > 1 ? "s" : ""}
      </Badge>
    </div>
  )

  // --- Deposit gate ---
  if (depositCheckLoading) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent mb-2" />
          <p className="text-sm text-muted-foreground">Vérification...</p>
        </div>
      </div>
    )
  }

  if (!hasSuccessfulDeposit) {
    return (
      <AppShell
        title="Mes Coupons"
        subtitle="Codes promo actifs et partageables"
        status="Accès restreint"
        actions={
          <button
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-primary/10 bg-white/80 text-foreground shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl dark:border-white/10 dark:bg-white/10"
            onClick={() => router.push("/dashboard")}
            aria-label="Retour"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        }
      >
        <AppSection
          variant="highlight"
          title="Accès réservé"
          subtitle="Effectuez un dépôt pour débloquer les coupons"
        >
          <div className="flex flex-col items-center gap-5 py-4 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/50 shadow-inner dark:bg-white/10">
              <LockKeyhole className="h-10 w-10 text-primary/70" />
            </div>
            <div className="space-y-1">
              <p className="font-semibold text-foreground">Dépôt requis</p>
              <p className="text-sm text-muted-foreground">
                Vous devez effectuer au moins un dépôt accepté avant d'accéder à vos coupons.
              </p>
            </div>
            <Button
              className="h-12 w-full rounded-xl bg-gradient-to-r from-primary to-blue-500 hover:opacity-90"
              onClick={() => router.push("/deposit")}
            >
              <Download className="mr-2 h-4 w-4" />
              Faire un dépôt
            </Button>
          </div>
        </AppSection>
      </AppShell>
    )
  }
  // --- End deposit gate ---

  return (
    <AppShell
      title="Mes Coupons"
      subtitle="Codes promo actifs et partageables"
      status="Prêt à partager"
      actions={headerActions}
    >
      <div className="space-y-6">
        {/* Hero Section */}
        <AppSection
          variant="highlight"
          title="Espace coupons"
          subtitle="Partagez vos codes et gagnez des bonus"
        // badge={
        //   <Badge className="gap-2 bg-white/20 text-white">
        //     <Sparkles className="h-3.5 w-3.5" />
        //     Parrainage
        //   </Badge>
        // }
        >
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-2xl border border-white/40 bg-white/40 px-4 py-4 backdrop-blur dark:border-white/10 dark:bg-white/10">
              <p className="text-xs uppercase tracking-[0.08em] text-muted-foreground">Coupons actifs</p>
              <p className="text-2xl font-bold text-foreground">{couponData?.count || 0}</p>
            </div>
            <div className="rounded-2xl border border-white/40 bg-white/40 px-4 py-4 backdrop-blur dark:border-white/10 dark:bg-white/10">
              <p className="text-xs uppercase tracking-[0.08em] text-muted-foreground">Partages</p>
              <p className="text-2xl font-bold text-foreground">∞</p>
            </div>
          </div>
        </AppSection>

        {/* Coupons List */}
        <AppSection
          title="Codes disponibles"
          subtitle="Copiez ou partagez vos codes promo"
        >
          {couponLoading ? (
            <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-primary/30 bg-white/70 py-10 text-sm text-muted-foreground dark:bg-slate-900/40">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-3 border-primary border-r-transparent" />
              Chargement...
            </div>
          ) : !couponData?.results || couponData.results.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-primary/30 bg-primary/5 px-4 py-10 text-center">
              <Ticket className="mx-auto mb-3 h-12 w-12 text-primary/40" />
              <p className="text-sm font-medium text-muted-foreground">Aucun coupon pour le moment</p>
              <p className="mt-1 text-xs text-muted-foreground">Vos coupons apparaîtront ici</p>
            </div>
          ) : (
            <div className="space-y-3">
              {couponData.results.map((coupon) => (
                <div
                  key={coupon.id}
                  className="rounded-3xl border border-primary/20 bg-gradient-to-r from-white via-primary/5 to-primary/10 p-4 dark:from-slate-900 dark:via-primary/10 dark:to-primary/20"
                >
                  <div className="flex items-center gap-3">
                    {coupon.bet_app_details?.image ? (
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white shadow-sm dark:bg-slate-800">
                        <img
                          src={coupon.bet_app_details.image}
                          alt={coupon.bet_app_details.name || "Platform"}
                          className="h-8 w-8 object-contain"
                        />
                      </div>
                    ) : (
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                        <Ticket className="h-6 w-6" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      {coupon.bet_app_details?.name && (
                        <p className="text-sm font-medium text-foreground">{coupon.bet_app_details.name}</p>
                      )}
                      <p className="font-mono text-lg font-bold text-primary">{coupon.code}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(coupon.created_at)}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 rounded-xl border-primary/30 text-primary"
                      onClick={() => handleCopyCode(coupon.code)}
                    >
                      {copiedCode === coupon.code ? (
                        <>
                          <Check className="mr-2 h-4 w-4" />
                          Copié
                        </>
                      ) : (
                        <>
                          <Copy className="mr-2 h-4 w-4" />
                          Copier
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 rounded-xl border-primary/30 text-primary"
                      onClick={() => handleShareCode(coupon.code, coupon.bet_app_details?.name)}
                    >
                      <Share2 className="mr-2 h-4 w-4" />
                      Partager
                    </Button>
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

export default function CouponPage() {
  return (
    <AuthGuard>
      <CouponContent />
    </AuthGuard>
  )
}
