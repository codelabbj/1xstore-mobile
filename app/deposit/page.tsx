"use client"

import { useState, useEffect, MouseEvent } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  Check,
  Plus,
  Pencil,
  Trash,
  Globe,
  IdCard,
  Network as NetworkIcon,
  Smartphone,
  Coins,
  type LucideIcon,
} from "lucide-react"
import toast from "react-hot-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AuthGuard } from "@/components/auth-guard"
import { AppShell } from "@/app/_components/AppShell"
import { AppSection } from "@/app/_components/AppSection"
import { Badge } from "@/components/ui/badge"
import api from "@/lib/api"
import type { Platform, Network as NetworkType, UserPhone, UserAppId, Transaction } from "@/lib/types"
import { useSettings } from "@/hooks/use-settings"
import { cn } from "@/lib/utils"
import { TransactionSummaryDialog } from "@/components/transaction-summary-dialog"

const COUNTRY_OPTIONS = [
  { code: "CI", name: "Côte d'Ivoire", indication: "225" },
  { code: "BF", name: "Burkina Faso", indication: "226" },
  { code: "SN", name: "Sénégal", indication: "221" },
  { code: "BJ", name: "Bénin", indication: "229" },
] as const

const DEFAULT_COUNTRY_CODE = "CI"

type StepDefinition = {
  id: number
  label: string
  icon: LucideIcon
}

const DEPOSIT_STEPS: StepDefinition[] = [
  { id: 1, label: "Plateforme", icon: Globe },
  { id: 2, label: "ID Pari", icon: IdCard },
  { id: 3, label: "Réseau", icon: NetworkIcon },
  { id: 4, label: "Téléphone", icon: Smartphone },
  { id: 5, label: "Montant", icon: Coins },
]

const STEP_STATUS: Record<number, string> = {
  1: "Choisissez votre plateforme",
  2: "Validez l'identifiant de pari",
  3: "Sélectionnez le réseau mobile money",
  4: "Confirmez le numéro débité",
  5: "Renseignez le montant et vérifiez le récapitulatif",
}

const StepProgress = ({ activeStep, steps }: { activeStep: number; steps: StepDefinition[] }) => (
  <div className="space-y-3">
    <div className="flex items-center justify-between">
      {steps.map((step, index) => {
        const Icon = step.icon
        const isCurrent = activeStep === step.id
        const isCompleted = activeStep > step.id
        return (
          <div key={step.id} className="flex items-center flex-1">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={cn(
                  "h-10 w-10 rounded-full flex items-center justify-center transition-all",
                  isCompleted
                    ? "bg-primary text-white"
                    : isCurrent
                      ? "bg-primary/20 text-primary border-2 border-primary"
                      : "bg-muted text-muted-foreground",
                )}
              >
                {isCompleted ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
              </div>
              <span className={cn(
                "text-[10px] font-medium",
                isCurrent || isCompleted ? "text-foreground" : "text-muted-foreground"
              )}>
                {step.label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div className={cn(
                "h-0.5 flex-1 mx-1 transition-colors",
                isCompleted ? "bg-primary" : "bg-muted"
              )} />
            )}
          </div>
        )
      })}
    </div>
  </div>
)

function DepositContent() {
  const { t } = useTranslation()
  const router = useRouter()
  const queryClient = useQueryClient()
  const { settings } = useSettings()

  type DepositReturnData =
    | { action: "addBet"; platformId: string; user_app_id: string; targetStep?: number }
    | { action: "addPhone"; platformId: string; betUserAppId: string; networkId: number; phone: string; targetStep?: number }

  type SearchUserResponse = { UserId: number; Name: string; CurrencyId: number }

  // Step state
  const [step, setStep] = useState(1)
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | null>(null)
  const [selectedBetId, setSelectedBetId] = useState<UserAppId | null>(null)
  const [selectedNetwork, setSelectedNetwork] = useState<NetworkType | null>(null)
  const [selectedPhone, setSelectedPhone] = useState<UserPhone | null>(null)
  const [amount, setAmount] = useState("")
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [showTransactionLinkDialog, setShowTransactionLinkDialog] = useState(false)
  const [transactionLink, setTransactionLink] = useState<string | null>(null)
  const [returnData, setReturnData] = useState<DepositReturnData | null>(null)
  const [betEditDialogOpen, setBetEditDialogOpen] = useState(false)
  const [betToEdit, setBetToEdit] = useState<UserAppId | null>(null)
  const [betEditValue, setBetEditValue] = useState("")
  const [betEditError, setBetEditError] = useState<string | null>(null)
  const [phoneEditDialogOpen, setPhoneEditDialogOpen] = useState(false)
  const [phoneToEdit, setPhoneToEdit] = useState<UserPhone | null>(null)
  const [phoneEditValue, setPhoneEditValue] = useState("")
  const [phoneEditError, setPhoneEditError] = useState<string | null>(null)
  const [phoneEditCountry, setPhoneEditCountry] = useState<string>(DEFAULT_COUNTRY_CODE)
  const [betDeleteDialogOpen, setBetDeleteDialogOpen] = useState(false)
  const [betToDelete, setBetToDelete] = useState<UserAppId | null>(null)
  const [phoneDeleteDialogOpen, setPhoneDeleteDialogOpen] = useState(false)
  const [phoneToDelete, setPhoneToDelete] = useState<UserPhone | null>(null)
  const [showMoovUssdDialog, setShowMoovUssdDialog] = useState(false)
  const [moovUssdCode, setMoovUssdCode] = useState<string | null>(null)

  // ── Pending transaction check (on mount) ─────────────────────────────────
  const [pendingTransaction, setPendingTransaction] = useState<Transaction | null>(null)
  const [isPendingCheckDone, setIsPendingCheckDone] = useState(false)
  const [isPendingDialogOpen, setIsPendingDialogOpen] = useState(false)

  useEffect(() => {
    const checkPendingTransaction = async () => {
      try {
        const { data } = await api.get<Transaction>("/mobcash/last-transaction")
        if (data && data.status === "pending" && data.type_trans === "deposit") {
          setPendingTransaction(data)
          setIsPendingDialogOpen(true)
        }
      } catch (error: any) {
        // 404 = aucune transaction, c'est normal
        if (error?.originalError?.response?.status !== 404) {
          console.error("Erreur vérification transaction en attente:", error)
        }
      } finally {
        setIsPendingCheckDone(true)
      }
    }
    checkPendingTransaction()
  }, [])

  // ── Flux partagé post-finalisation / post-création ────────────────────────
  const handlePostFinalization = async (data: any) => {
    const networkName = selectedNetwork?.name?.toLowerCase() || ""
    const networkPublicName = selectedNetwork?.public_name?.toLowerCase() || ""
    const isMoovNetwork = networkName.includes("moov") || networkPublicName.includes("moov")
    const isOrangeNetwork = networkName.includes("orange") || networkPublicName.includes("orange")
    const hasConnectDepositApi = selectedNetwork?.deposit_api === "connect"

    const selectedPhoneCountry = detectCountryFromPhone(selectedPhone?.phone || "")
    const isBurkinaFaso = selectedPhoneCountry === "BF"

    let moovMerchantPhone = settings?.moov_marchand_phone
    let orangeMerchantPhone = settings?.orange_marchand_phone
    if (isBurkinaFaso) {
      moovMerchantPhone = settings?.bf_moov_marchand_phone || moovMerchantPhone
      orangeMerchantPhone = settings?.bf_orange_marchand_phone || orangeMerchantPhone
    }

    // Orange
    if (isOrangeNetwork && hasConnectDepositApi) {
      if (settings?.payment_by_link && data?.transaction_link) {
        setTransactionLink(data.transaction_link)
        setShowTransactionLinkDialog(true)
        return
      } else if (orangeMerchantPhone) {
        const transactionAmount = Number(amount)
        const ussdCode = `*144*2*1*${orangeMerchantPhone}*${transactionAmount}#`
        const encodedUssd = ussdCode.replace(/#/g, "%23")
        setMoovUssdCode(ussdCode)
        setShowMoovUssdDialog(true)
        setTimeout(() => {
          const link = document.createElement("a")
          link.href = `tel:${encodedUssd}`
          link.style.display = "none"
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
        }, 500)
        return
      }
    }

    // Moov
    if (isMoovNetwork && hasConnectDepositApi && moovMerchantPhone) {
      const transactionAmount = Number(amount)
      const amountMinusOnePercent = Math.floor(transactionAmount * 0.99)
      const ussdCode = `*155*2*1*${moovMerchantPhone}*${amountMinusOnePercent}#`
      const encodedUssd = ussdCode.replace(/#/g, "%23")
      setMoovUssdCode(ussdCode)
      setShowMoovUssdDialog(true)
      setTimeout(() => {
        const link = document.createElement("a")
        link.href = `tel:${encodedUssd}`
        link.style.display = "none"
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      }, 500)
      return
    }

    // Fallback
    if (data?.transaction_link) {
      setTransactionLink(data.transaction_link)
      setShowTransactionLinkDialog(true)
    } else {
      router.push("/dashboard")
    }
  }

  // ── Handlers pending dialog ───────────────────────────────────────────────

  const handleCancelPendingAndContinue = async (reference: string) => {
    try {
      await api.post("/mobcash/cancel-transaction", { reference })
      toast.success("Ancienne transaction annulée")
      queryClient.invalidateQueries({ queryKey: ["recent-transactions"] }) // ✅ point 4
      setIsPendingDialogOpen(false)
      setPendingTransaction(null)
    } catch (error: any) {
      const errorMessage =
        error?.originalError?.response?.data?.error ||
        error?.originalError?.response?.data?.detail ||
        error?.message ||
        "Erreur lors de l'annulation de la transaction"
      toast.error(errorMessage)
      throw error
    }
  }

  const handleFinalizePending = async (reference: string) => {
    try {
      const { data } = await api.post<Transaction>("/mobcash/finalize-transaction-user", { reference })
      setIsPendingDialogOpen(false)
      setPendingTransaction(null)
      queryClient.invalidateQueries({ queryKey: ["recent-transactions"] }) // ✅ point 4
      await handlePostFinalization(data)
    } catch (error) {
      throw error
    }
  }

  // ─────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (typeof window === "undefined") return
    const stored = window.localStorage.getItem("depositReturnData")
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as DepositReturnData
        setReturnData(parsed)
      } catch (error) {
        console.error("Failed to parse depositReturnData", error)
      }
      window.localStorage.removeItem("depositReturnData")
    }
  }, [])

  // Fetch platforms
  const { data: platforms, isLoading: loadingPlatforms } = useQuery({
    queryKey: ["platforms", "deposit"],
    queryFn: async () => {
      const response = await api.get<Platform[]>("/mobcash/plateform", { params: { type: "deposit" } })
      return response.data.filter((p) => p.enable)
    },
  })

  const { data: betIds, isLoading: loadingBetIds } = useQuery({
    queryKey: ["bet-ids", "deposit", selectedPlatform?.id],
    queryFn: async () => {
      if (!selectedPlatform) return []
      const response = await api.get<UserAppId[]>("/mobcash/user-app-id", {
        params: { app_name: selectedPlatform.id },
      })
      return response.data
    },
    enabled: !!selectedPlatform,
  })

  const { data: networks, isLoading: loadingNetworks } = useQuery({
    queryKey: ["networks", "deposit"],
    queryFn: async () => {
      const response = await api.get<NetworkType[]>("/mobcash/network", { params: { type: "deposit" } })
      return response.data.filter((n) => n.active_for_deposit)
    },
    enabled: !!selectedPlatform,
  })

  const selectedNetworkKey =
    selectedNetwork?.uid || (selectedNetwork?.id ? String(selectedNetwork.id) : undefined)

  const { data: phones, isLoading: loadingPhones } = useQuery({
    queryKey: ["phones", "deposit", selectedNetworkKey],
    queryFn: async () => {
      if (!selectedNetworkKey) return []
      const response = await api.get<UserPhone[]>("/mobcash/user-phone/", {
        params: { network: selectedNetwork?.uid || selectedNetwork?.id },
      })
      return response.data
    },
    enabled: !!selectedNetworkKey,
  })

  const formatPhoneNumber = (phone: string): string => phone.replace(/\D/g, "")

  const getCountryOption = (code: string) =>
    COUNTRY_OPTIONS.find((country) => country.code === code) ?? COUNTRY_OPTIONS[0]

  const detectCountryFromPhone = (phoneValue: string) => {
    const digits = formatPhoneNumber(phoneValue)
    return (
      COUNTRY_OPTIONS.find((country) => digits.startsWith(country.indication))?.code ||
      DEFAULT_COUNTRY_CODE
    )
  }

  const stripCountryPrefix = (phoneValue: string, countryCode: string) => {
    const digits = formatPhoneNumber(phoneValue)
    const country = getCountryOption(countryCode)
    if (digits.startsWith(country.indication)) return digits.slice(country.indication.length)
    return digits
  }

  const selectionTileClass = (isActive: boolean) =>
    cn(
      "relative overflow-hidden rounded-2xl border p-4 cursor-pointer transition-all mobile-pressable backdrop-blur",
      isActive
        ? "border-primary/70 bg-primary/10 shadow-[0_15px_50px_rgba(63,169,255,0.25)]"
        : "border-border bg-white/80 hover:border-primary/40 dark:border-white/10 dark:bg-white/5",
    )

  const resetBetEditDialog = () => { setBetEditDialogOpen(false); setBetToEdit(null); setBetEditValue(""); setBetEditError(null) }
  const resetPhoneEditDialog = () => { setPhoneEditDialogOpen(false); setPhoneToEdit(null); setPhoneEditValue(""); setPhoneEditError(null); setPhoneEditCountry(DEFAULT_COUNTRY_CODE) }
  const resetBetDeleteDialog = () => { setBetDeleteDialogOpen(false); setBetToDelete(null) }
  const resetPhoneDeleteDialog = () => { setPhoneDeleteDialogOpen(false); setPhoneToDelete(null) }

  const handleCopyMoovCode = () => {
    if (!moovUssdCode) return
    navigator.clipboard?.writeText(moovUssdCode)
      .then(() => toast.success("Code copié dans le presse-papiers"))
      .catch(() => toast.error("Impossible de copier le code"))
  }

  const betEditMutation = useMutation({
    mutationFn: async ({ bet, value }: { bet: UserAppId; value: string }) => {
      const trimmedValue = value.trim()
      if (!trimmedValue) throw new Error("Veuillez saisir un identifiant valide")
      const platformId = selectedPlatform?.id || bet.app
      if (!platformId) throw new Error("Plateforme introuvable")
      const searchResponse = await api.post<SearchUserResponse>("/mobcash/search-user", { app_id: platformId, userid: trimmedValue })
      const searchResult = searchResponse.data
      if (searchResult.UserId === 0) throw new Error("Utilisateur non trouvé. Vérifiez l'identifiant.")
      if (searchResult.CurrencyId !== 27) throw new Error("La devise de cet utilisateur n'est pas XOF (27).")
      await api.patch(`/mobcash/user-app-id/${bet.id}/`, { user_app_id: trimmedValue, app_name: platformId })
    },
    onSuccess: () => { toast.success("Identifiant mis à jour"); queryClient.invalidateQueries({ queryKey: ["bet-ids"] }); resetBetEditDialog() },
    onError: (error: any) => {
      setBetEditError(error?.response?.data?.detail || error?.response?.data?.error || error?.message || "Erreur lors de la mise à jour de l'identifiant")
    },
  })

  const deleteBetMutation = useMutation({
    mutationFn: async (id: number) => { await api.delete(`/mobcash/user-app-id/${id}/`) },
    onSuccess: () => { toast.success("Identifiant supprimé"); queryClient.invalidateQueries({ queryKey: ["bet-ids"] }) },
    onError: (error: any) => { toast.error(error?.message || "Erreur lors de la suppression de l'identifiant") },
  })

  const updatePhoneMutation = useMutation({
    mutationFn: async ({ id, value, networkId }: { id: number; value: string; networkId: number }) => {
      await api.patch(`/mobcash/user-phone/${id}/`, { phone: value, network: networkId })
    },
    onSuccess: () => { toast.success("Numéro mis à jour"); queryClient.invalidateQueries({ queryKey: ["phones"] }); resetPhoneEditDialog() },
    onError: (error: any) => {
      const message = error?.response?.data?.detail || error?.response?.data?.error || error?.message || "Erreur lors de la mise à jour du numéro"
      setPhoneEditError(message); toast.error(message)
    },
  })

  const deletePhoneMutation = useMutation({
    mutationFn: async (id: number) => { await api.delete(`/mobcash/user-phone/${id}/`) },
    onSuccess: () => { toast.success("Numéro supprimé"); queryClient.invalidateQueries({ queryKey: ["phones"] }) },
    onError: (error: any) => { toast.error(error?.message || "Erreur lors de la suppression du numéro") },
  })

  useEffect(() => {
    if (!returnData || !platforms) return
    const platform = platforms.find((p) => p.id === returnData.platformId)
    if (!platform) { setReturnData(null); return }
    if (!selectedPlatform || selectedPlatform.id !== platform.id) { setSelectedPlatform(platform); return }
    if (returnData.action === "addBet") {
      if (!betIds) return
      const bet = betIds.find((betId) => betId.user_app_id === returnData.user_app_id)
      if (!bet) return
      setSelectedBetId(bet); setStep(returnData.targetStep || 3); setReturnData(null)
      return
    }
    if (returnData.action === "addPhone") {
      if (!betIds) return
      const bet = betIds.find((betId) => betId.user_app_id === returnData.betUserAppId)
      if (!bet) return
      if (!selectedBetId || selectedBetId.id !== bet.id) { setSelectedBetId(bet); return }
      if (!networks) return
      const network = networks.find((n) => n.id === returnData.networkId)
      if (!network) return
      if (!selectedNetwork || selectedNetwork.id !== network.id) { setSelectedNetwork(network); return }
      if (!phones) return
      const phone = phones.find((phoneItem) => formatPhoneNumber(phoneItem.phone) === returnData.phone)
      if (!phone) return
      setSelectedPhone(phone); setStep(returnData.targetStep || 5); setReturnData(null)
    }
  }, [returnData, platforms, selectedPlatform, betIds, selectedBetId, networks, selectedNetwork, phones])

  const handleEditBetId = (event: MouseEvent<HTMLButtonElement>, betId: UserAppId) => {
    event.stopPropagation(); setBetToEdit(betId); setBetEditValue(betId.user_app_id); setBetEditError(null); setBetEditDialogOpen(true)
  }
  const handleBetEditConfirm = () => {
    if (!betToEdit) return
    const value = betEditValue.trim()
    if (!value) { setBetEditError("Veuillez saisir un identifiant valide"); return }
    setBetEditError(null); betEditMutation.mutate({ bet: betToEdit, value })
  }
  const handleDeleteBetId = (event: MouseEvent<HTMLButtonElement>, betId: UserAppId) => {
    event.stopPropagation(); setBetToDelete(betId); setBetDeleteDialogOpen(true)
  }
  const handleEditPhone = (event: MouseEvent<HTMLButtonElement>, phone: UserPhone) => {
    event.stopPropagation()
    setPhoneToEdit(phone)
    const detectedCountry = detectCountryFromPhone(phone.phone)
    setPhoneEditCountry(detectedCountry); setPhoneEditValue(stripCountryPrefix(phone.phone, detectedCountry)); setPhoneEditError(null); setPhoneEditDialogOpen(true)
  }
  const handlePhoneEditConfirm = () => {
    if (!phoneToEdit) return
    const value = phoneEditValue.trim()
    if (!value) { setPhoneEditError("Veuillez saisir un numéro de téléphone"); return }
    const formatted = formatPhoneNumber(value)
    if (!formatted) { setPhoneEditError("Numéro invalide"); return }
    setPhoneEditError(null)
    updatePhoneMutation.mutate({ id: phoneToEdit.id, value: `${getCountryOption(phoneEditCountry).indication}${formatted}`, networkId: phoneToEdit.network })
  }
  const handleBetDeleteConfirm = () => {
    if (!betToDelete) return
    deleteBetMutation.mutate(betToDelete.id, { onSuccess: () => resetBetDeleteDialog(), onError: () => resetBetDeleteDialog() })
  }
  const handlePhoneDeleteConfirm = () => {
    if (!phoneToDelete) return
    deletePhoneMutation.mutate(phoneToDelete.id, { onSuccess: () => resetPhoneDeleteDialog(), onError: () => resetPhoneDeleteDialog() })
  }
  const handleDeletePhone = (event: MouseEvent<HTMLButtonElement>, phone: UserPhone) => {
    event.stopPropagation(); setPhoneToDelete(phone); setPhoneDeleteDialogOpen(true)
  }

  // ── Point 2 : submit → directement handlePostFinalization, plus de dialog résumé ──
  const depositMutation = useMutation({
    mutationFn: async () => {
      const formattedPhone = formatPhoneNumber(selectedPhone!.phone)
      const payload: any = {
        amount: Number(amount),
        phone_number: formattedPhone,
        app: selectedPlatform!.id,
        user_app_id: selectedBetId!.user_app_id,
        network: selectedNetwork!.id,
        source: "web",
      }
      if (selectedPlatform!.city) payload.city = selectedPlatform!.city
      if (selectedPlatform!.street) payload.street = selectedPlatform!.street
      const response = await api.post("/mobcash/transaction-deposit", payload)
      return response.data
    },
    onSuccess: async (data) => {
      toast.success("Dépôt créé avec succès! En attente de confirmation.")
      await handlePostFinalization(data)
    },
    onError: (error: any) => {
      const errorData = error?.originalError?.response?.data || error?.response?.data || error?.data
      const timeMessage = errorData?.error_time_message || error?.originalError?.response?.data?.error_time_message || error?.response?.data?.error_time_message
      if (timeMessage) {
        const message = Array.isArray(timeMessage) ? timeMessage[0] : timeMessage
        toast.error(`Trop de tentatives. Veuillez réessayer dans ${message}`)
      } else {
        toast.error(error.message || "Erreur lors de la création du dépôt")
      }
    },
  })

  const handleNext = () => {
    if (step === 1 && !selectedPlatform) { toast.error("Veuillez sélectionner une plateforme"); return }
    if (step === 2 && !selectedBetId) { toast.error("Veuillez sélectionner un identifiant de pari"); return }
    if (step === 3 && !selectedNetwork) { toast.error("Veuillez sélectionner un réseau"); return }
    if (step === 4 && !selectedPhone) { toast.error("Veuillez sélectionner un numéro de téléphone"); return }
    if (step === 5) {
      const amountNum = Number(amount)
      if (!amount || amountNum <= 0) { toast.error("Veuillez saisir un montant valide"); return }
      if (selectedPlatform && amountNum < selectedPlatform.minimun_deposit) { toast.error(`Le montant minimum est ${selectedPlatform.minimun_deposit} FCFA`); return }
      if (selectedPlatform && amountNum > selectedPlatform.max_deposit) { toast.error(`Le montant maximum est ${selectedPlatform.max_deposit} FCFA`); return }
      setShowConfirmDialog(true)
      return
    }
    setStep(step + 1)
  }

  const handleConfirm = () => { setShowConfirmDialog(false); depositMutation.mutate() }

  const handleContinueTransaction = () => {
    if (transactionLink) {
      window.open(transactionLink, "_blank", "noopener,noreferrer")
      setShowTransactionLinkDialog(false)
      router.push("/dashboard")
    }
  }

  const shellStatus = STEP_STATUS[step] || "Dépôt guidé"

  const handleBackNavigation = () => {
    if (step > 1) { setStep(step - 1); return }
    router.push("/dashboard")
  }

  const headerActions = (
    <div className="flex items-center gap-2">
      <button
        className="flex h-11 w-11 items-center justify-center rounded-2xl border border-primary/10 bg-white/80 text-foreground shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl dark:border-white/10 dark:bg-white/10"
        onClick={handleBackNavigation}
        aria-label="Retour"
      >
        <ArrowLeft className="h-5 w-5" />
      </button>
      <Badge variant="secondary" className="rounded-2xl border border-primary/10 bg-primary/5 text-primary">
        Étape {step}/{DEPOSIT_STEPS.length}
      </Badge>
    </div>
  )

  const floatingControls = (
    <div className="flex items-center gap-2 rounded-2xl bg-white/95 px-4 py-3 shadow-2xl shadow-primary/20 backdrop-blur dark:bg-slate-900/80">
      {step > 1 && (
        <Button variant="outline" className="flex-1" onClick={() => setStep(step - 1)}>
          {t("previous")}
        </Button>
      )}
      <Button className="flex-1" onClick={handleNext}>
        {step === 5 ? t("confirm") : t("next")}
      </Button>
    </div>
  )

  // ── Spinner pendant le check initial ─────────────────────────────────────
  if (!isPendingCheckDone) {
    return (
      <AppShell title="Dépôt guidé" subtitle="Vérification en cours..." status="Vérification..." actions={<></>} floatingSlot={<></>}>
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-sm">Vérification en cours...</p>
          </div>
        </div>
      </AppShell>
    )
  }

  return (
    <>
      <AppShell
        title="Dépôt guidé"
        subtitle={`Étape ${step} sur ${DEPOSIT_STEPS.length}`}
        status={shellStatus}
        actions={headerActions}
        floatingSlot={floatingControls}
      >
        <div className="space-y-6">
          {step === 1 && (
            <AppSection title="1. Choisissez la plateforme" subtitle="Sélectionnez le bookmaker sur lequel vous souhaitez déposer.">
              {loadingPlatforms ? (
                <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-primary/30 bg-white/70 py-10 text-sm text-muted-foreground dark:bg-slate-900/40">
                  <div className="inline-block h-8 w-8 animate-spin rounded-full border-3 border-primary border-r-transparent" />
                  Chargement des plateformes...
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {platforms?.map((platform) => (
                    <div key={platform.id} onClick={() => { setSelectedPlatform(platform); setTimeout(() => setStep(2), 120) }} className={selectionTileClass(selectedPlatform?.id === platform.id)}>
                      {selectedPlatform?.id === platform.id && (
                        <div className="absolute top-3 right-3 rounded-full bg-primary p-1.5 text-white shadow-lg"><Check className="h-3.5 w-3.5" /></div>
                      )}
                      <img src={platform.image || "/placeholder.svg"} alt={platform.name} className="mb-3 h-14 w-full object-contain" />
                      <p className="text-center text-sm font-semibold">{platform.name}</p>
                      <p className="mt-1 text-center text-xs text-muted-foreground">{platform.minimun_deposit.toLocaleString()} - {platform.max_deposit.toLocaleString()} FCFA</p>
                    </div>
                  ))}
                </div>
              )}
            </AppSection>
          )}

          {step === 2 && (
            <AppSection title="2. Identifiant de pari" subtitle="Choisissez un identifiant vérifié ou ajoutez-en un nouveau.">
              {loadingBetIds ? (
                <div className="py-8 text-center text-muted-foreground">{t("loading")}</div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    {betIds?.map((betId) => (
                      <div key={betId.id} onClick={() => { setSelectedBetId(betId); setTimeout(() => setStep(3), 120) }} className={selectionTileClass(selectedBetId?.id === betId.id)}>
                        <div className="flex items-center justify-between">
                          <div><p className="font-medium">{betId.user_app_id}</p><p className="text-sm text-muted-foreground">ID de pari</p></div>
                          <div className="flex items-center gap-1">
                            {selectedBetId?.id === betId.id && <div className="bg-primary rounded-full p-1"><Check className="h-4 w-4 text-white" /></div>}
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={(e) => handleEditBetId(e, betId)}><Pencil className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={(e) => handleDeleteBetId(e, betId)}><Trash className="h-4 w-4" /></Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Button variant="outline" className="w-full rounded-2xl border-primary/30 text-primary" onClick={() => {
                    if (!selectedPlatform) { toast.error("Veuillez sélectionner une plateforme"); return }
                    const params = new URLSearchParams({ platform: selectedPlatform.id, flow: "deposit", return: "/deposit", targetStep: "3" })
                    router.push(`/add-bet-id?${params.toString()}`)
                  }}>
                    <Plus className="mr-2 h-4 w-4" />{t("addBetId")}
                  </Button>
                </div>
              )}
            </AppSection>
          )}

          {step === 3 && (
            <AppSection title="3. Réseau mobile money" subtitle="Sélectionnez le réseau qui traitera le dépôt.">
              {loadingNetworks ? (
                <div className="py-8 text-center text-muted-foreground">{t("loading")}</div>
              ) : (
                <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                  {networks?.map((network) => (
                    <div key={network.id} onClick={() => { setSelectedNetwork(network); setTimeout(() => setStep(4), 120) }} className={selectionTileClass(selectedNetwork?.id === network.id)}>
                      {selectedNetwork?.id === network.id && <div className="absolute top-2 right-2 rounded-full bg-primary p-1 text-white"><Check className="h-3 w-3" /></div>}
                      <img src={network.image || "/placeholder.svg"} alt={network.name} className="mb-2 h-16 w-full object-contain" />
                      <p className="text-center text-sm font-medium">{network.public_name}</p>
                    </div>
                  ))}
                </div>
              )}
            </AppSection>
          )}

          {step === 4 && (
            <AppSection title="4. Numéro débité" subtitle="Sélectionnez ou ajoutez le numéro associé à ce réseau.">
              {loadingPhones ? (
                <div className="py-8 text-center text-muted-foreground">{t("loading")}</div>
              ) : (
                <div className="space-y-4">
                  {phones && phones.length > 0 ? (
                    <div className="space-y-2">
                      {phones.map((phone) => (
                        <div key={phone.id} onClick={() => { setSelectedPhone(phone); setTimeout(() => setStep(5), 120) }} className={selectionTileClass(selectedPhone?.id === phone.id)}>
                          <div className="flex items-center justify-between">
                            <div><p className="font-medium">{phone.phone}</p><p className="text-sm text-muted-foreground">Numéro de téléphone</p></div>
                            <div className="flex items-center gap-1">
                              {selectedPhone?.id === phone.id && <div className="bg-primary rounded-full p-1"><Check className="h-4 w-4 text-white" /></div>}
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={(e) => handleEditPhone(e, phone)}><Pencil className="h-4 w-4" /></Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={(e) => handleDeletePhone(e, phone)}><Trash className="h-4 w-4" /></Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-primary/30 bg-primary/5 px-4 py-6 text-center text-sm text-muted-foreground">
                      Aucun numéro disponible pour {selectedNetwork?.public_name}. Ajoutez-en un ci-dessous.
                    </div>
                  )}
                  <Button variant="outline" className="w-full rounded-2xl border-primary/30 text-primary" onClick={() => {
                    if (!selectedPlatform || !selectedBetId || !selectedNetwork) { toast.error("Veuillez sélectionner une plateforme, un identifiant et un réseau"); return }
                    const params = new URLSearchParams({ network: selectedNetwork.id.toString(), platform: selectedPlatform.id, betUserAppId: selectedBetId.user_app_id, flow: "deposit", return: "/deposit", targetStep: "5" })
                    router.push(`/add-phone?${params.toString()}`)
                  }}>
                    <Plus className="mr-2 h-4 w-4" />{t("addPhone")} ({selectedNetwork?.public_name})
                  </Button>
                </div>
              )}
            </AppSection>
          )}

          {step === 5 && (
            <AppSection title="5. Montant et récapitulatif" subtitle={`Respectez les limites de ${selectedPlatform?.minimun_deposit?.toLocaleString() ?? 0} à ${selectedPlatform?.max_deposit?.toLocaleString() ?? 0} FCFA.`}>
              <div className="space-y-6">
                <div className="space-y-3">
                  <Label htmlFor="amount" className="font-medium">{t("amount")} (FCFA)</Label>
                  <Input id="amount" type="number" placeholder="1000" value={amount} onChange={(e) => setAmount(e.target.value)} className="h-12 rounded-2xl text-lg" />
                </div>
                {selectedPlatform?.deposit_tuto_link && (
                  <Button type="button" variant="outline" className="w-full rounded-2xl" onClick={() => window.open(selectedPlatform.deposit_tuto_link!, "_blank", "noopener,noreferrer")}>
                    Voir le tutoriel de dépôt
                  </Button>
                )}
                <div className="space-y-2 rounded-2xl border border-primary/10 bg-primary/5 p-4 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">{t("platform")}</span><span className="font-medium">{selectedPlatform?.name}</span></div>
                  {selectedPlatform?.city && <div className="flex justify-between"><span className="text-muted-foreground">Ville</span><span className="font-medium">{selectedPlatform.city}</span></div>}
                  {selectedPlatform?.street && <div className="flex justify-between"><span className="text-muted-foreground">Rue</span><span className="font-medium">{selectedPlatform.street}</span></div>}
                  <div className="flex justify-between"><span className="text-muted-foreground">ID de pari</span><span className="font-medium">{selectedBetId?.user_app_id}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">{t("network")}</span><span className="font-medium">{selectedNetwork?.public_name}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">{t("phone")}</span><span className="font-medium">{selectedPhone?.phone}</span></div>
                </div>
                {selectedNetwork?.deposit_message && selectedNetwork.deposit_message.trim() !== "" && (
                  <div className="rounded-2xl border border-blue-200/60 bg-blue-50 p-4 text-sm dark:border-blue-900 dark:bg-blue-950/30">
                    <p className="text-blue-900 dark:text-blue-100 whitespace-pre-line">{selectedNetwork.deposit_message}</p>
                  </div>
                )}
              </div>
            </AppSection>
          )}
        </div>
      </AppShell>

      {/* ── Pending transaction dialog (au chargement) ── */}
      <TransactionSummaryDialog
        isOpen={isPendingDialogOpen}
        onClose={() => {}}
        transaction={pendingTransaction}
        onCancel={handleCancelPendingAndContinue}
        onFinalize={handleFinalizePending}
        isLoading={false}
        mode="pending"
      />

      {/* Bet ID Edit Dialog */}
      <Dialog open={betEditDialogOpen} onOpenChange={(open) => (open ? setBetEditDialogOpen(true) : resetBetEditDialog())}>
        <DialogContent>
          <DialogHeader><DialogTitle>Modifier l'identifiant</DialogTitle><DialogDescription>Recherchez et validez l'identifiant avant de l'enregistrer.</DialogDescription></DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="betEditValue">Identifiant de pari</Label>
            <Input id="betEditValue" value={betEditValue} onChange={(e) => setBetEditValue(e.target.value)} />
            {betEditError && <p className="text-sm text-destructive">{betEditError}</p>}
          </div>
          <div className="flex gap-4 pt-4">
            <Button variant="outline" onClick={resetBetEditDialog} className="flex-1">{t("cancel")}</Button>
            <Button onClick={handleBetEditConfirm} disabled={betEditMutation.isPending} className="flex-1">{betEditMutation.isPending ? t("loading") : "Mettre à jour"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Phone Edit Dialog */}
      <Dialog open={phoneEditDialogOpen} onOpenChange={(open) => (open ? setPhoneEditDialogOpen(true) : resetPhoneEditDialog())}>
        <DialogContent>
          <DialogHeader><DialogTitle>Modifier le numéro</DialogTitle><DialogDescription>Mettez à jour votre numéro pour ce réseau.</DialogDescription></DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="phoneEditValue">{t("phone")}</Label>
            <div className="flex gap-2">
              <Select value={phoneEditCountry} onValueChange={setPhoneEditCountry}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>{COUNTRY_OPTIONS.map((country) => (<SelectItem key={country.code} value={country.code}>{country.name} (+{country.indication})</SelectItem>))}</SelectContent>
              </Select>
              <Input id="phoneEditValue" value={phoneEditValue} onChange={(e) => setPhoneEditValue(e.target.value)} placeholder="0700000000" />
            </div>
            <p className="text-xs text-muted-foreground">Indicatif sélectionné : +{getCountryOption(phoneEditCountry).indication}</p>
            {phoneEditError && <p className="text-sm text-destructive">{phoneEditError}</p>}
          </div>
          <div className="flex gap-4 pt-4">
            <Button variant="outline" onClick={resetPhoneEditDialog} className="flex-1">{t("cancel")}</Button>
            <Button onClick={handlePhoneEditConfirm} disabled={updatePhoneMutation.isPending} className="flex-1">{updatePhoneMutation.isPending ? t("loading") : "Mettre à jour"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bet Delete Dialog */}
      <Dialog open={betDeleteDialogOpen} onOpenChange={(open) => (open ? setBetDeleteDialogOpen(true) : resetBetDeleteDialog())}>
        <DialogContent>
          <DialogHeader><DialogTitle>Supprimer l'identifiant</DialogTitle><DialogDescription>Cette action est définitive. Confirmez-vous la suppression ?</DialogDescription></DialogHeader>
          <p className="text-sm text-muted-foreground">{betToDelete?.user_app_id}</p>
          <div className="flex gap-4 pt-4">
            <Button variant="outline" onClick={resetBetDeleteDialog} className="flex-1">{t("cancel")}</Button>
            <Button variant="destructive" onClick={handleBetDeleteConfirm} disabled={deleteBetMutation.isPending} className="flex-1">{deleteBetMutation.isPending ? t("loading") : "Supprimer"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Phone Delete Dialog */}
      <Dialog open={phoneDeleteDialogOpen} onOpenChange={(open) => (open ? setPhoneDeleteDialogOpen(true) : resetPhoneDeleteDialog())}>
        <DialogContent>
          <DialogHeader><DialogTitle>Supprimer le numéro</DialogTitle><DialogDescription>Cette action est définitive. Confirmez-vous la suppression ?</DialogDescription></DialogHeader>
          <p className="text-sm text-muted-foreground">{phoneToDelete?.phone}</p>
          <div className="flex gap-4 pt-4">
            <Button variant="outline" onClick={resetPhoneDeleteDialog} className="flex-1">{t("cancel")}</Button>
            <Button variant="destructive" onClick={handlePhoneDeleteConfirm} disabled={deletePhoneMutation.isPending} className="flex-1">{deletePhoneMutation.isPending ? t("loading") : "Supprimer"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* USSD Dialog */}
      {/* ✅ Point 3 : onOpenChange + bouton Fermer redirigent vers dashboard */}
      <Dialog open={showMoovUssdDialog} onOpenChange={(open) => { if (!open) { setShowMoovUssdDialog(false); router.push("/dashboard") } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Finaliser le paiement</DialogTitle>
            <DialogDescription>Votre dépôt a été créé avec succès. Pour finaliser la transaction, copiez le code USSD ci-dessous et collez-le dans le composeur téléphonique de votre téléphone.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Code USSD à composer</Label>
              <div className="flex gap-2">
                <Input readOnly value={moovUssdCode ?? ""} className="font-mono text-base" />
                <Button type="button" onClick={handleCopyMoovCode}>Copier</Button>
              </div>
            </div>
            <div className="bg-muted p-4 rounded-lg space-y-2">
              <p className="text-sm font-medium">Instructions :</p>
              <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                <li>Cliquez sur le bouton &quot;Copier&quot; pour copier le code USSD</li>
                <li>Ouvrez le composeur téléphonique de votre téléphone</li>
                <li>Collez le code dans le composeur</li>
                <li>Appuyez sur &quot;Appeler&quot; pour valider la transaction</li>
              </ol>
            </div>
          </div>
          <div className="flex justify-end pt-4">
            <Button onClick={() => { setShowMoovUssdDialog(false); router.push("/dashboard") }}>Fermer</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Confirmer le dépôt</DialogTitle><DialogDescription>Veuillez vérifier les informations avant de confirmer</DialogDescription></DialogHeader>
          <div className="space-y-3 py-4">
            <div className="flex justify-between"><span className="text-muted-foreground">{t("platform")}</span><span className="font-medium">{selectedPlatform?.name}</span></div>
            {selectedPlatform?.city && <div className="flex justify-between"><span className="text-muted-foreground">Ville</span><span className="font-medium">{selectedPlatform.city}</span></div>}
            {selectedPlatform?.street && <div className="flex justify-between"><span className="text-muted-foreground">Rue</span><span className="font-medium">{selectedPlatform.street}</span></div>}
            <div className="flex justify-between"><span className="text-muted-foreground">ID de pari</span><span className="font-medium">{selectedBetId?.user_app_id}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">{t("network")}</span><span className="font-medium">{selectedNetwork?.public_name}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">{t("phone")}</span><span className="font-medium">{selectedPhone?.phone}</span></div>
            <div className="flex justify-between text-lg font-bold pt-2 border-t"><span>{t("amount")}</span><span className="text-primary">{amount} FCFA</span></div>
          </div>
          <div className="flex gap-4">
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)} className="flex-1">{t("cancel")}</Button>
            <Button onClick={handleConfirm} disabled={depositMutation.isPending} className="flex-1">{depositMutation.isPending ? t("loading") : t("confirm")}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Transaction Link Dialog */}
      <Dialog open={showTransactionLinkDialog} onOpenChange={setShowTransactionLinkDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Continuer la transaction</DialogTitle><DialogDescription>Cliquez sur continuer pour continuer la transaction</DialogDescription></DialogHeader>
          <div className="flex gap-4 pt-4">
            <Button variant="outline" onClick={() => { setShowTransactionLinkDialog(false); router.push("/dashboard") }} className="flex-1">{t("cancel")}</Button>
            <Button onClick={handleContinueTransaction} className="flex-1">Continuer</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default function DepositPage() {
  return (
    <AuthGuard>
      <DepositContent />
    </AuthGuard>
  )
}