"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft, Smartphone, Phone } from "lucide-react"
import toast from "react-hot-toast"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AuthGuard } from "@/components/auth-guard"
import api from "@/lib/api"
import type { Network } from "@/lib/types"

const COUNTRY_OPTIONS = [
  { code: "CI", name: "Côte d'Ivoire", indication: "225" },
  { code: "BF", name: "Burkina Faso", indication: "226" },
  { code: "SN", name: "Sénégal", indication: "221" },
  { code: "BJ", name: "Bénin", indication: "229" },
] as const

const DEFAULT_COUNTRY_CODE = "CI"

function AddPhoneContent() {
  const { t } = useTranslation()
  const router = useRouter()
  const queryClient = useQueryClient()
  const searchParams = useSearchParams()
  const flow = searchParams.get("flow") || "deposit"
  const returnPath =
    searchParams.get("return") || (flow === "withdraw" ? "/withdraw" : "/deposit")
  const platformId = searchParams.get("platform") || ""
  const betUserAppId = searchParams.get("betUserAppId") || ""
  const targetStep = Number(searchParams.get("targetStep") || "5")

  const [phone, setPhone] = useState("")
  const [countryCode, setCountryCode] = useState<string>(DEFAULT_COUNTRY_CODE)
  const [networkId, setNetworkId] = useState<string>("")

  // Get network from URL params
  const preselectedNetworkId = searchParams.get("network")

  // Fetch networks
  const { data: networks, isLoading: loadingNetworks } = useQuery({
    queryKey: ["networks"],
    queryFn: async () => {
      const response = await api.get<Network[]>("/mobcash/network")
      return response.data.filter((n) => n.active_for_deposit)
    },
  })

  // Set preselected network when networks are loaded
  useEffect(() => {
    if (preselectedNetworkId && networks && !networkId) {
      setNetworkId(preselectedNetworkId)
    }
  }, [preselectedNetworkId, networks, networkId])

  // Format phone number: remove +, spaces, and all non-digit characters, keep only digits
  const formatPhoneNumber = (phone: string): string => {
    return phone.replace(/\D/g, '')
  }

  // Add phone mutation
  const addPhoneMutation = useMutation({
    mutationFn: async () => {
      const digitsOnly = formatPhoneNumber(phone)
      const country = COUNTRY_OPTIONS.find((c) => c.code === countryCode) ?? COUNTRY_OPTIONS[0]
      const finalPhone = `${country.indication}${digitsOnly}`
      const response = await api.post("/mobcash/user-phone/", {
        phone: finalPhone,
        network: Number(networkId),
      })
      return response.data
    },
    onSuccess: () => {
      toast.success("Numéro de téléphone ajouté avec succès!")
      queryClient.invalidateQueries({ queryKey: ["phones"] })
      if (
        typeof window !== "undefined" &&
        networkId &&
        platformId &&
        betUserAppId
      ) {
        const storageKey = flow === "withdraw" ? "withdrawReturnData" : "depositReturnData"
        window.localStorage.setItem(
          storageKey,
          JSON.stringify({
            action: "addPhone",
            platformId,
            betUserAppId,
            networkId: Number(networkId),
            phone: `${COUNTRY_OPTIONS.find((c) => c.code === countryCode)?.indication ?? COUNTRY_OPTIONS[0].indication}${formatPhoneNumber(
              phone,
            )}`,
            targetStep,
          }),
        )
      }
      router.push(returnPath)
    },
    onError: (error: any) => {
      toast.error(error.message || "Erreur lors de l'ajout du numéro")
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const digitsOnly = formatPhoneNumber(phone)
    
    if (!phone || digitsOnly.length < 6) {
      toast.error("Veuillez saisir un numéro de téléphone valide")
      return
    }

    if (!networkId) {
      toast.error("Veuillez sélectionner un réseau")
      return
    }

    addPhoneMutation.mutate()
  }

  return (
    <div className="mobile-page">
      {/* Header */}
      <header className="mobile-header">
        <div className="mobile-header-content">
          <button
            className="h-10 w-10 rounded-full flex items-center justify-center hover:bg-accent transition-colors"
            onClick={() => router.push("/dashboard")}
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1 text-center">
            <h1 className="mobile-header-title">Ajouter un ID de pari</h1>
            <p className="mobile-header-subtitle">Numéro de téléphone</p>
          </div>
          <div className="w-10" />
        </div>
      </header>

      <main className="mobile-content stagger-animation">
        {/* Info Card */}
        <Card className="mobile-card bg-gradient-to-br from-primary/5 via-purple-500/5 to-background border-primary/20 shadow-md">
          <CardContent className="p-5">
            <div className="flex items-start gap-4">
              <div className="bg-primary/10 rounded-xl p-3 shrink-0">
                <Smartphone className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-base mb-1">Ajouter un ID de pari</h3>
                <p className="text-sm text-muted-foreground">
                  {preselectedNetworkId 
                    ? `Ajoutez un nouveau numéro pour ${networks?.find(n => n.id.toString() === preselectedNetworkId)?.public_name || 'le réseau sélectionné'}`
                    : "Enregistrez votre numéro pour effectuer vos transactions rapidement"
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Form Card */}
        <Card className="mobile-card shadow-md">
          <CardContent className="p-5">
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Network Selection */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 mb-2">
                  <div className="bg-purple-500/10 rounded-lg p-1.5">
                    <svg className="h-4 w-4 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <Label htmlFor="network" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Réseau mobile</Label>
                </div>
                {loadingNetworks ? (
                  <div className="p-4 border rounded-xl bg-muted/50 text-center">
                    <div className="inline-block h-6 w-6 animate-spin rounded-full border-3 border-primary border-r-transparent mb-2"></div>
                    <p className="text-sm text-muted-foreground">Chargement...</p>
                  </div>
                ) : preselectedNetworkId ? (
                  <div className="p-4 border-2 rounded-xl bg-gradient-to-r from-primary/10 to-purple-500/10 border-primary/30">
                    <div className="flex items-center gap-3">
                      <div className="bg-white dark:bg-muted rounded-lg p-2 shrink-0">
                        <img
                          src={networks?.find(n => n.id.toString() === preselectedNetworkId)?.image || "/placeholder.svg"}
                          alt={networks?.find(n => n.id.toString() === preselectedNetworkId)?.name}
                          className="w-8 h-8 object-contain"
                        />
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-base">
                          {networks?.find(n => n.id.toString() === preselectedNetworkId)?.public_name}
                        </p>
                        <p className="text-xs text-primary font-medium">Réseau présélectionné</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <Select value={networkId} onValueChange={setNetworkId}>
                    <SelectTrigger className="mobile-input h-14">
                      <SelectValue placeholder="Sélectionnez votre réseau mobile" />
                    </SelectTrigger>
                    <SelectContent>
                      {networks?.map((network) => (
                        <SelectItem key={network.id} value={network.id.toString()}>
                          <div className="flex items-center gap-3 py-1">
                            <img
                              src={network.image || "/placeholder.svg"}
                              alt={network.name}
                              className="w-6 h-6 object-contain"
                            />
                            <span className="font-medium">{network.public_name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Phone Number */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 mb-2">
                  <div className="bg-emerald-500/10 rounded-lg p-1.5">
                    <Phone className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <Label htmlFor="phone" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Numéro de téléphone</Label>
                </div>
                <div className="flex gap-3">
                  <Select value={countryCode} onValueChange={setCountryCode}>
                    <SelectTrigger className="mobile-input w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COUNTRY_OPTIONS.map((country) => (
                        <SelectItem key={country.code} value={country.code}>
                          <div className="flex flex-col items-start">
                            <span className="font-medium">{country.code}</span>
                            <span className="text-xs text-muted-foreground">+{country.indication}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="relative flex-1">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="07 00 00 00 00"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="mobile-input pl-10"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                  <svg className="h-4 w-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-xs text-muted-foreground">
                    Indicatif pays : <span className="font-mono font-bold">+{COUNTRY_OPTIONS.find((c) => c.code === countryCode)?.indication ?? COUNTRY_OPTIONS[0].indication}</span>
                  </p>
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full mobile-button bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 shadow-md hover:shadow-lg" 
                disabled={addPhoneMutation.isPending}
              >
                {addPhoneMutation.isPending ? (
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-r-transparent"></div>
                    <span>Ajout en cours...</span>
                  </div>
                ) : (
                  "Ajouter le numéro"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

export default function AddPhonePage() {
  return (
    <AuthGuard>
      <AddPhoneContent />
    </AuthGuard>
  )
}
