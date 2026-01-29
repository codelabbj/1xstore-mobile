"use client"

import { useState, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { useRouter } from "next/navigation"
import { ArrowLeft, Gift, TrendingUp, Sparkles, Coins } from "lucide-react"
import toast from "react-hot-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AuthGuard } from "@/components/auth-guard"
import { AppShell } from "@/app/_components/AppShell"
import { AppSection } from "@/app/_components/AppSection"
import { Badge } from "@/components/ui/badge"
import { getUser } from "@/lib/auth"
import api from "@/lib/api"
import type { Bonus, PaginatedResponse, Platform, UserAppId } from "@/lib/types"
import { formatDate } from "@/lib/utils"
import { useSettings } from "@/hooks/use-settings"

function BonusContent() {
  const { t } = useTranslation()
  const router = useRouter()
  const queryClient = useQueryClient()
  const user = getUser()
  const { referralBonusEnabled, isLoading: settingsLoading } = useSettings()

  // Form state for bonus transaction
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | null>(null)
  const [selectedBetId, setSelectedBetId] = useState<UserAppId | null>(null)
  const [amount, setAmount] = useState("")
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)

  // Redirect if referral bonus is disabled
  useEffect(() => {
    if (!settingsLoading && !referralBonusEnabled) {
      router.push("/dashboard")
    }
  }, [referralBonusEnabled, settingsLoading, router])

  // Show loading or nothing while checking settings
  if (settingsLoading) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent mb-2"></div>
          <p className="text-sm text-muted-foreground">{t("loading")}</p>
        </div>
      </div>
    )
  }

  // Don't render if referral bonus is disabled
  if (!referralBonusEnabled) {
    return null
  }

  // Fetch platforms
  const { data: platforms, isLoading: loadingPlatforms } = useQuery({
    queryKey: ["platforms"],
    queryFn: async () => {
      const response = await api.get<Platform[]>("/mobcash/plateform")
      return response.data.filter((p) => p.enable)
    },
  })

  // Fetch bet IDs
  const { data: betIds, isLoading: loadingBetIds } = useQuery({
    queryKey: ["bet-ids", selectedPlatform?.id],
    queryFn: async () => {
      if (!selectedPlatform) return []
      const response = await api.get<UserAppId[]>("/mobcash/user-app-id", {
        params: { app_name: selectedPlatform.id },
      })
      return response.data
    },
    enabled: !!selectedPlatform,
  })

  // Fetch user profile to get current bonus_available
  const { data: userProfile } = useQuery({
    queryKey: ["user-profile"],
    queryFn: async () => {
      const response = await api.get("/auth/me")
      return response.data
    },
  })

  const { data: bonusData, isLoading: bonusLoading } = useQuery<PaginatedResponse<Bonus>>({
    queryKey: ["bonus"],
    queryFn: async () => {
      const response = await api.get<PaginatedResponse<Bonus>>("/mobcash/bonus")
      return response.data
    },
  })

  // Use bonus_available from user profile, fallback to localStorage user
  const bonusAvailable = userProfile?.bonus_available ?? user?.bonus_available ?? 0

  // Create bonus transaction mutation
  const bonusTransactionMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post("/mobcash/transaction-bonus", {
        app: selectedPlatform!.id,
        user_app_id: selectedBetId!.user_app_id,
        amount: Number(amount),
      })
      return response.data
    },
    onSuccess: () => {
      toast.success("Transaction bonus créée avec succès!")
      queryClient.invalidateQueries({ queryKey: ["bonus"] })
      queryClient.invalidateQueries({ queryKey: ["recent-transactions"] })
      queryClient.invalidateQueries({ queryKey: ["user-profile"] })
      setShowConfirmDialog(false)
      setAmount("")
      setSelectedPlatform(null)
      setSelectedBetId(null)
    },
    onError: (error: any) => {
      const errorData = 
        error?.originalError?.response?.data || 
        error?.response?.data || 
        error?.data
      
      if (error?.originalError?.response?.status === 400) {
        const errorMsg = errorData?.details || errorData?.detail || errorData?.error || errorData?.message || error.message
        toast.error(errorMsg || "Erreur lors de la création de la transaction bonus")
      } else {
        toast.error(error.message || "Erreur lors de la création de la transaction bonus")
      }
    },
  })

  const totalBonus = bonusData?.results.reduce((sum, bonus) => sum + Number(bonus.amount), 0) || 0

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedPlatform) {
      toast.error("Veuillez sélectionner une plateforme")
      return
    }

    if (!selectedBetId) {
      toast.error("Veuillez sélectionner un identifiant de pari")
      return
    }

    const amountNum = Number(amount)
    if (!amount || amountNum <= 0) {
      toast.error("Veuillez saisir un montant valide")
      return
    }

    if (amountNum > bonusAvailable) {
      toast.error("Le montant ne peut pas dépasser votre bonus disponible")
      return
    }

    setShowConfirmDialog(true)
  }

  const handleConfirm = () => {
    setShowConfirmDialog(false)
    bonusTransactionMutation.mutate()
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
      <Badge variant="secondary" className="rounded-2xl border border-purple-200 bg-purple-500/10 text-purple-700 dark:border-purple-900/40 dark:text-purple-200">
        {bonusAvailable.toLocaleString()} FCFA
      </Badge>
    </div>
  )

  return (
    <>
      <AppShell
        title="Mes Bonus"
        subtitle="Transformez vos gains en dépôts"
        status="Bonus disponible"
        actions={headerActions}
      >
        <div className="space-y-6">
          {/* Hero Bonus Card */}
          <AppSection
            variant="highlight"
            title="Solde bonus"
            subtitle="Utilisez vos bonus pour alimenter vos comptes de paris"
            // badge={
            //   <Badge className="gap-2 bg-purple-500/20 text-purple-100">
            //     <Sparkles className="h-3.5 w-3.5" />
            //     Parrainage
            //   </Badge>
            // }
          >
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-2xl border border-white/40 bg-white/40 px-4 py-4 backdrop-blur dark:border-white/10 dark:bg-white/10">
                <p className="text-xs uppercase tracking-[0.08em] text-muted-foreground">Disponible</p>
                <p className="text-2xl font-bold text-foreground">{bonusAvailable.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">FCFA</p>
              </div>
              <div className="rounded-2xl border border-white/40 bg-white/40 px-4 py-4 backdrop-blur dark:border-white/10 dark:bg-white/10">
                <p className="text-xs uppercase tracking-[0.08em] text-muted-foreground">Total gagné</p>
                <p className="text-2xl font-bold text-foreground">{totalBonus.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">FCFA</p>
              </div>
            </div>
          </AppSection>

          {/* Create Bonus Transaction */}
          <AppSection
            title="Utiliser mon bonus"
            subtitle="Transférez votre bonus vers un compte de pari"
          >
            {bonusAvailable > 0 ? (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="platform" className="font-medium">{t("platform")}</Label>
                  {loadingPlatforms ? (
                    <div className="flex h-12 items-center rounded-xl border border-input bg-background px-4 text-sm text-muted-foreground">
                      Chargement...
                    </div>
                  ) : (
                    <Select
                      value={selectedPlatform?.id || ""}
                      onValueChange={(value) => {
                        const platform = platforms?.find((p) => p.id === value)
                        setSelectedPlatform(platform || null)
                        setSelectedBetId(null)
                      }}
                    >
                      <SelectTrigger className="h-12 rounded-xl text-base">
                        <SelectValue placeholder="Sélectionner une plateforme" />
                      </SelectTrigger>
                      <SelectContent>
                        {platforms?.map((platform) => (
                          <SelectItem key={platform.id} value={platform.id}>
                            <div className="flex items-center gap-2">
                              <img
                                src={platform.image || "/placeholder.svg"}
                                alt={platform.name}
                                className="h-6 w-6 object-contain"
                              />
                              {platform.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                {selectedPlatform && (
                  <div className="space-y-2">
                    <Label htmlFor="betId" className="font-medium">{t("selectBetId")}</Label>
                    {loadingBetIds ? (
                      <div className="flex h-12 items-center rounded-xl border border-input bg-background px-4 text-sm text-muted-foreground">
                        Chargement...
                      </div>
                    ) : (
                      <Select
                        value={selectedBetId?.id.toString() || ""}
                        onValueChange={(value) => {
                          const betId = betIds?.find((b) => b.id.toString() === value)
                          setSelectedBetId(betId || null)
                        }}
                      >
                        <SelectTrigger className="h-12 rounded-xl text-base">
                          <SelectValue placeholder="Sélectionner un identifiant de pari" />
                        </SelectTrigger>
                        <SelectContent>
                          {betIds?.map((betId) => (
                            <SelectItem key={betId.id} value={betId.id.toString()}>
                              {betId.user_app_id}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="amount" className="font-medium">Montant (FCFA)</Label>
                  <Input
                    id="amount"
                    type="number"
                    placeholder="1000"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    max={bonusAvailable}
                    className="h-12 rounded-xl text-lg"
                  />
                  <p className="text-xs text-muted-foreground">
                    Maximum: {bonusAvailable.toLocaleString()} FCFA
                  </p>
                </div>

                <Button
                  type="submit"
                  className="h-12 w-full rounded-xl bg-gradient-to-r from-purple-500 to-fuchsia-500 hover:from-purple-600 hover:to-fuchsia-600"
                  disabled={!selectedPlatform || !selectedBetId || !amount || bonusTransactionMutation.isPending}
                >
                  {bonusTransactionMutation.isPending ? "Création..." : "Créer la transaction"}
                </Button>
              </form>
            ) : (
              <div className="rounded-2xl border border-dashed border-primary/30 bg-primary/5 px-4 py-8 text-center text-sm text-muted-foreground">
                Aucun bonus disponible. Parrainez des amis pour gagner des bonus !
              </div>
            )}
          </AppSection>

          {/* Bonus History */}
          <AppSection
            title="Historique des bonus"
            subtitle="Retrouvez tous vos gains de parrainage"
          >
            {bonusLoading ? (
              <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-primary/30 bg-white/70 py-10 text-sm text-muted-foreground dark:bg-slate-900/40">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-3 border-primary border-r-transparent" />
                Chargement...
              </div>
            ) : !bonusData?.results || bonusData.results.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-primary/30 bg-primary/5 px-4 py-8 text-center text-sm text-muted-foreground">
                Aucun historique de bonus
              </div>
            ) : (
              <div className="space-y-3">
                {bonusData.results.map((bonus) => (
                  <div
                    key={bonus.id}
                    className="flex items-center gap-3 rounded-2xl border border-border/60 bg-white/90 px-4 py-3 dark:bg-slate-900/60"
                  >
                    <div className="rounded-xl bg-purple-500/10 p-2.5 text-purple-600 dark:text-purple-300">
                      <Gift className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{bonus.reason_bonus}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(bonus.created_at)}</p>
                    </div>
                    <p className="text-sm font-bold text-purple-600 dark:text-purple-300">+{bonus.amount.toLocaleString()}</p>
                  </div>
                ))}
              </div>
            )}
          </AppSection>
        </div>
      </AppShell>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmer la transaction bonus</DialogTitle>
            <DialogDescription>Veuillez vérifier les informations avant de confirmer</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("platform")}</span>
              <span className="font-medium">{selectedPlatform?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">ID de pari</span>
              <span className="font-medium">{selectedBetId?.user_app_id}</span>
            </div>
            <div className="flex justify-between border-t pt-2 text-lg font-bold">
              <span>Montant</span>
              <span className="text-purple-600">{amount} FCFA</span>
            </div>
          </div>
          <div className="flex gap-4">
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)} className="flex-1">
              {t("cancel")}
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={bonusTransactionMutation.isPending}
              className="flex-1 bg-gradient-to-r from-purple-500 to-fuchsia-500 hover:from-purple-600 hover:to-fuchsia-600"
            >
              {bonusTransactionMutation.isPending ? t("loading") : "Confirmer"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default function BonusPage() {
  return (
    <AuthGuard>
      <BonusContent />
    </AuthGuard>
  )
}
