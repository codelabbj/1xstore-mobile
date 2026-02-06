"use client"

import type React from "react"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft, Search, ShieldCheck, Sparkles, HelpCircle } from "lucide-react"
import toast from "react-hot-toast"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AuthGuard } from "@/components/auth-guard"
import { AppShell } from "@/app/_components/AppShell"
import { AppSection } from "@/app/_components/AppSection"
import { Badge } from "@/components/ui/badge"
import api from "@/lib/api"
import type { Platform } from "@/lib/types"

interface SearchUserResponse {
  UserId: number
  Name: string
  CurrencyId: number
}

function AddBetIdContent() {
  const { t } = useTranslation()
  const router = useRouter()
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()
  const flow = searchParams.get("flow") || "deposit"
  const returnPath =
    searchParams.get("return") || (flow === "withdraw" ? "/withdraw" : "/deposit")
  const targetStep = Number(searchParams.get("targetStep") || "3")

  const [appId, setAppId] = useState("")
  const [platformId, setPlatformId] = useState<string>(searchParams.get("platform") || "")
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [showErrorModal, setShowErrorModal] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [searchResult, setSearchResult] = useState<SearchUserResponse | null>(null)
  const [pendingBetId, setPendingBetId] = useState<{ appId: string; platformId: string } | null>(null)

  // Fetch platforms
  const { data: platforms, isLoading: loadingPlatforms } = useQuery({
    queryKey: ["platforms"],
    queryFn: async () => {
      const response = await api.get<Platform[]>("/mobcash/plateform", {
        params: { type: flow === "withdraw" ? "withdrawal" : "deposit" },
      })
      return response.data.filter((p) => p.enable)
    },
  })

  // Search user mutation
  const searchUserMutation = useMutation({
    mutationFn: async () => {
      if (!platformId || !appId) {
        throw new Error("Veuillez sélectionner une plateforme et saisir un identifiant")
      }
      const response = await api.post<SearchUserResponse>("/mobcash/search-user", {
        app_id: platformId,
        userid: appId,
      })
      return response.data
    },
    onSuccess: (data) => {
      // Validate user exists
      if (data.UserId === 0) {
        setErrorMessage("Utilisateur non trouvé. Veuillez vérifier l'identifiant de pari.")
        setShowErrorModal(true)
        return
      }

      // Validate currency
      if (data.CurrencyId !== 27) {
        setErrorMessage("La devise de cet utilisateur n'est pas valide. Seule la devise XOF (27) est acceptée.")
        setShowErrorModal(true)
        return
      }

      // Valid user - show confirmation modal
      setSearchResult(data)
      setPendingBetId({ appId, platformId })
      setShowConfirmModal(true)
    },
    onError: (error: any) => {
      const errorData =
        error?.originalError?.response?.data ||
        error?.response?.data ||
        error?.data

      // Handle field-specific errors (400 status)
      if (error?.originalError?.response?.status === 400) {
        const errorMsg = errorData?.details || errorData?.detail || errorData?.error || errorData?.message || error.message
        setErrorMessage(errorMsg || "Erreur lors de la recherche de l'utilisateur")
      } else {
        setErrorMessage(error.message || "Erreur lors de la recherche de l'utilisateur")
      }
      setShowErrorModal(true)
    },
  })

  // Add bet ID mutation
  const addBetIdMutation = useMutation({
    mutationFn: async () => {
      if (!pendingBetId) {
        throw new Error("Données manquantes")
      }
      const response = await api.post("/mobcash/user-app-id/", {
        user_app_id: pendingBetId.appId,
        app_name: pendingBetId.platformId,
      })
      return response.data
    },
    onSuccess: () => {
      const pendingData = pendingBetId
      toast.success("Identifiant de pari ajouté avec succès!")
      queryClient.invalidateQueries({ queryKey: ["bet-ids"] })
      setShowConfirmModal(false)
      setAppId("")
      setPendingBetId(null)
      setSearchResult(null)
      if (pendingData && typeof window !== "undefined") {
        const storageKey = flow === "withdraw" ? "withdrawReturnData" : "depositReturnData"
        window.localStorage.setItem(
          storageKey,
          JSON.stringify({
            action: "addBet",
            platformId: pendingData.platformId,
            user_app_id: pendingData.appId,
            targetStep,
          }),
        )
      }
      router.push(returnPath)
    },
    onError: (error: any) => {
      const errorData =
        error?.originalError?.response?.data ||
        error?.response?.data ||
        error?.data

      // Handle field-specific errors (400 status)
      if (error?.originalError?.response?.status === 400) {
        const errorMsg = errorData?.details || errorData?.detail || errorData?.error || errorData?.message || error.message
        toast.error(errorMsg || "Erreur lors de l'ajout de l'identifiant")
      } else {
        toast.error(error.message || "Erreur lors de l'ajout de l'identifiant")
      }
      setShowConfirmModal(false)
    },
  })

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()

    if (!appId || appId.length < 3) {
      toast.error("Veuillez saisir un identifiant valide")
      return
    }

    if (!platformId) {
      toast.error("Veuillez sélectionner une plateforme")
      return
    }

    searchUserMutation.mutate()
  }

  const handleConfirmAdd = () => {
    if (pendingBetId) {
      addBetIdMutation.mutate()
    }
  }

  const shellStatus = searchUserMutation.isPending
    ? "Vérification en cours"
    : platformId
      ? "Plateforme sélectionnée"
      : "Étape 1 · Choisissez votre plateforme"

  const headerActions = (
    <div className="flex items-center gap-2">
      <button
        className="flex h-11 w-11 items-center justify-center rounded-2xl border border-primary/10 bg-white/80 text-foreground shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl dark:border-white/10 dark:bg-white/10"
        onClick={() => router.push(returnPath)}
        aria-label="Retour"
      >
        <ArrowLeft className="h-5 w-5" />
      </button>
    </div>
  )

  const infoChips = [
    { label: "Flux", value: flow === "withdraw" ? "Retrait" : "Dépôt" },
    { label: "Étape cible", value: `Étape ${targetStep}` },
    { label: "Suivi", value: searchResult ? "Utilisateur validé" : "En attente" },
  ]

  return (
    <>
      <AppShell
        title="Associez votre identifiant"
        subtitle="Sécurisez vos opérations en liant votre compte de pari"
        status={shellStatus}
        actions={headerActions}
      >
        <AppSection
          variant="highlight"
          title="Résumé rapide"
          description="Nous vérifions l'identifiant pour garantir des dépôts et retraits fluides."
          badge={
            <Badge className="bg-white/20 text-white gap-2">
              <ShieldCheck className="h-3.5 w-3.5" />
              Conformité XOF
            </Badge>
          }
        >
          <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-3">
            {infoChips.map((chip) => (
              <div
                key={chip.label}
                className="rounded-2xl border border-white/30 bg-white/30 px-4 py-3 text-sm font-medium text-white backdrop-blur-md dark:bg-white/10"
              >
                <p className="text-xs uppercase tracking-[0.08em] text-white/70">{chip.label}</p>
                <p className="text-base font-semibold">{chip.value}</p>
              </div>
            ))}
          </div>
        </AppSection>

        <AppSection
          title="1. Sélectionnez la plateforme"
          description="Choisissez le bookmaker actif puis indiquez l'identifiant du compte joueur."
        >
          <form onSubmit={handleSearch} className="space-y-5">
            <div className="space-y-3">
              <Label htmlFor="platform">{t("platform")}</Label>
              {loadingPlatforms ? (
                <div className="text-sm text-muted-foreground flex items-center gap-2">
                  <div className="h-3 w-3 animate-ping rounded-full bg-primary" />
                  {t("loading")}
                </div>
              ) : (
                <Select value={platformId} onValueChange={setPlatformId}>
                  <SelectTrigger className="h-12 rounded-2xl border-primary/20 bg-white/80 backdrop-blur-md">
                    <SelectValue placeholder="Sélectionner une plateforme" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl">
                    {platforms?.map((platform) => (
                      <SelectItem key={platform.id} value={platform.id}>
                        <div className="flex items-center gap-2">
                          <img
                            src={platform.image || "/placeholder.svg"}
                            alt={platform.name}
                            className="w-6 h-6 object-contain rounded-lg border border-border/50 bg-background"
                          />
                          {platform.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-3">
              <Label htmlFor="appId">Identifiant de pari</Label>
              <Input
                id="appId"
                type="text"
                placeholder="123456789"
                value={appId}
                onChange={(e) => setAppId(e.target.value)}
                className="mobile-input h-12 rounded-2xl"
              />
              <p className="text-xs text-muted-foreground">
                Utilisez l'identifiant exact affiché dans l'application de pari. Il sera synchronisé avec votre dossier 1xstore.
              </p>
            </div>

            <Button
              type="submit"
              className="w-full h-12 rounded-2xl text-base font-semibold shadow-lg shadow-primary/30"
              disabled={searchUserMutation.isPending || addBetIdMutation.isPending}
            >
              {searchUserMutation.isPending ? (
                <>
                  <div className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent mr-2" />
                  {t("loading")}
                </>
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  Rechercher et ajouter
                </>
              )}
            </Button>
          </form>
        </AppSection>

        <AppSection
          title="2. Conseils rapides"
          subtitle="Une vérification aboutie permet d'accélérer vos dépôts et retraits."
          variant="surface"
          badge={
            <Badge variant="secondary" className="gap-2">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Astuces pro
            </Badge>
          }
        >
          <div className="space-y-4 text-sm">
            <div className="flex items-start gap-3 rounded-2xl bg-white/70 p-4 dark:bg-slate-900/60">
              <ShieldCheck className="h-5 w-5 text-primary" />
              <div>
                <p className="font-semibold">Devise XOF obligatoire</p>
                <p className="text-muted-foreground">
                  Nous validons uniquement les comptes paramétrés en franc CFA (ID devise 27). Ajustez la devise dans la plateforme si nécessaire.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-2xl bg-white/70 p-4 dark:bg-slate-900/60">
              <HelpCircle className="h-5 w-5 text-primary" />
              <div>
                <p className="font-semibold">Synchronisation automatique</p>
                <p className="text-muted-foreground">
                  Après confirmation, nous renvoyons l'information vers le flux {flow === "withdraw" ? "retrait" : "dépôt"} et reprenons à l'étape {targetStep}.
                </p>
              </div>
            </div>
          </div>
        </AppSection>
      </AppShell>

      <Dialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmer l'ajout</DialogTitle>
            <DialogDescription>
              Voulez-vous ajouter cet identifiant de pari?
            </DialogDescription>
          </DialogHeader>
          {searchResult && (
            <div className="space-y-3 py-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Nom:</span>
                <span className="font-medium">{searchResult.Name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Identifiant:</span>
                <span className="font-medium">{appId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Plateforme:</span>
                <span className="font-medium">
                  {platforms?.find((p) => p.id === platformId)?.name || platformId}
                </span>
              </div>
            </div>
          )}
          <div className="flex gap-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowConfirmModal(false)
                setPendingBetId(null)
                setSearchResult(null)
              }}
              className="flex-1"
            >
              Annuler
            </Button>
            <Button
              onClick={handleConfirmAdd}
              disabled={addBetIdMutation.isPending}
              className="flex-1"
            >
              {addBetIdMutation.isPending ? t("loading") : "Confirmer"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showErrorModal} onOpenChange={setShowErrorModal}>
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle className="text-destructive">Erreur</DialogTitle>
            <DialogDescription>
              {errorMessage || "Une erreur est survenue"}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end pt-4">
            <Button onClick={() => setShowErrorModal(false)}>
              Fermer
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default function AddBetIdPage() {
  return (
    <AuthGuard>
      <AddBetIdContent />
    </AuthGuard>
  )
}
