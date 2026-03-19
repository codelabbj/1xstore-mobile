"use client"

import { useState } from "react"
import { Loader2, Clock } from "lucide-react"
import toast from "react-hot-toast"
import type { Transaction } from "@/lib/types"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

interface TransactionSummaryDialogProps {
  isOpen: boolean
  onClose: () => void
  transaction: Transaction | null
  onCancel: (reference: string) => Promise<void>
  onFinalize: (reference: string) => Promise<void>
  isLoading?: boolean
  mode?: "pending" | "created"
}

export function TransactionSummaryDialog({
  isOpen,
  onClose,
  transaction,
  onCancel,
  onFinalize,
  isLoading = false,
  mode = "created",
}: TransactionSummaryDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [actionType, setActionType] = useState<"cancel" | "finalize" | null>(null)

  if (!transaction) return null

  const isPendingMode = mode === "pending"

  const handleOpenChange = (open: boolean) => {
    if (isPendingMode) return // bloque la fermeture
    if (!open) onClose()
  }

  // ── "Nouveau dépôt" (mode pending) ────────────────────────────────────────
  const handleNewDeposit = async () => {
    if (!transaction.reference) { toast.error("Référence de transaction manquante"); return }
    setActionType("cancel")
    setIsSubmitting(true)
    try {
      await onCancel(transaction.reference)
      // onCancel gère le toast + fermeture
    } catch (error: any) {
      const errorMessage =
        error?.originalError?.response?.data?.error ||
        error?.originalError?.response?.data?.detail ||
        error?.message ||
        "Erreur lors de l'annulation de la transaction"
      toast.error(errorMessage)
    } finally {
      setIsSubmitting(false)
      setActionType(null)
    }
  }

  // ── "Annuler" (mode created) ───────────────────────────────────────────────
  const handleCancel = async () => {
    if (!transaction.reference) { toast.error("Référence de transaction manquante"); return }
    setActionType("cancel")
    setIsSubmitting(true)
    try {
      await onCancel(transaction.reference)
      toast.success("Transaction annulée avec succès")
      onClose()
    } catch (error: any) {
      const errorMessage =
        error?.originalError?.response?.data?.error ||
        error?.originalError?.response?.data?.detail ||
        error?.message ||
        "Erreur lors de l'annulation de la transaction"
      toast.error(errorMessage)
    } finally {
      setIsSubmitting(false)
      setActionType(null)
    }
  }

  // ── "Finaliser" (les deux modes) ──────────────────────────────────────────
  const handleFinalize = async () => {
    if (!transaction.reference) { toast.error("Référence de transaction manquante"); return }
    setActionType("finalize")
    setIsSubmitting(true)
    try {
      await onFinalize(transaction.reference)
      toast.success("Transaction finalisée avec succès")
      onClose()
    } catch (error: any) {
      const errorMessage =
        error?.originalError?.response?.data?.error ||
        error?.originalError?.response?.data?.detail ||
        error?.message ||
        "Erreur lors de la finalisation de la transaction"
      toast.error(errorMessage)
    } finally {
      setIsSubmitting(false)
      setActionType(null)
    }
  }

  // ✅ Point 5 : case "annuler" ajouté
  const getStatusLabel = (status: string) => {
    const labels: Record<string, { label: string; className: string }> = {
      pending:  { label: "En attente",  className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400" },
      accept:   { label: "Acceptée",   className: "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400" },
      reject:   { label: "Rejetée",    className: "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400" },
      cancel:   { label: "Annulée",    className: "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400" },
      annuler:  { label: "Annulée",    className: "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400" },
      timeout:  { label: "Expirée",    className: "bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400" },
    }
    const config = labels[status] || { label: status, className: "bg-gray-100 text-gray-800" }
    return <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${config.className}`}>{config.label}</span>
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent
        className="sm:max-w-md max-h-[90vh] overflow-y-auto rounded-2xl"
        onEscapeKeyDown={(e) => { if (isPendingMode) e.preventDefault() }}
        onPointerDownOutside={(e) => { if (isPendingMode) e.preventDefault() }}
      >
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="rounded-xl bg-primary/10 p-2 text-primary">
              <Clock className="h-5 w-5" />
            </div>
            <DialogTitle>
              {isPendingMode ? "Transaction en attente" : "Récapitulatif de la transaction"}
            </DialogTitle>
          </div>
          <DialogDescription>
            {isPendingMode
              ? "Vous avez un dépôt en attente. Finalisez-le ou créez un nouveau dépôt."
              : "Votre transaction a été créée. Vous pouvez la finaliser ou l'annuler."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Status */}
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Statut</span>
            {getStatusLabel(transaction.status)}
          </div>

          {/* Reference */}
          <div className="rounded-xl border border-border bg-muted/30 p-3">
            <p className="text-xs text-muted-foreground mb-1">Référence</p>
            <p className="font-mono text-sm font-semibold break-all">{transaction.reference}</p>
          </div>

          {/* Amount */}
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
            <p className="text-xs text-muted-foreground mb-1">Montant</p>
            <p className="text-2xl font-bold text-primary">
              {transaction.amount.toLocaleString("fr-FR", {
                style: "currency",
                currency: "XOF",
                minimumFractionDigits: 0,
              })}
            </p>
          </div>

          {/* Phone */}
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Téléphone</span>
            <span className="font-medium">{transaction.phone_number}</span>
          </div>

          {/* Type */}
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Type</span>
            <span className="font-medium">{transaction.type_trans === "deposit" ? "Dépôt" : "Retrait"}</span>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          {isPendingMode ? (
            // ── Mode pending : "Nouveau dépôt" | "Finaliser" ─────────────────
            <>
              <Button
                variant="outline"
                onClick={handleNewDeposit}
                disabled={isSubmitting || isLoading || transaction.status !== "pending"}
                className="flex-1 rounded-xl"
              >
                {isSubmitting && actionType === "cancel" ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Annulation...</>
                ) : "Nouveau dépôt"}
              </Button>
              <Button
                onClick={handleFinalize}
                disabled={isSubmitting || isLoading || transaction.status !== "pending"}
                className="flex-1 rounded-xl"
              >
                {isSubmitting && actionType === "finalize" ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Finalisation...</>
                ) : "Finaliser"}
              </Button>
            </>
          ) : (
            // ── Mode created : "Annuler" | "Finaliser" ────────────────────────
            <>
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={isSubmitting || isLoading || transaction.status !== "pending"}
                className="flex-1 rounded-xl"
              >
                {isSubmitting && actionType === "cancel" ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Annulation...</>
                ) : "Annuler"}
              </Button>
              <Button
                onClick={handleFinalize}
                disabled={isSubmitting || isLoading || transaction.status !== "pending"}
                className="flex-1 rounded-xl"
              >
                {isSubmitting && actionType === "finalize" ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Finalisation...</>
                ) : "Finaliser"}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
