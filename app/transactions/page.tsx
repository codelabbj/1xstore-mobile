"use client"

import { useState, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { useRouter } from "next/navigation"
import { ArrowLeft, ArrowDownCircle, ArrowUpCircle, Search, Filter, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AuthGuard } from "@/components/auth-guard"
import api from "@/lib/api"
import type { Transaction } from "@/lib/types"
import { formatDate } from "@/lib/utils"
import { 
  TYPE_TRANS, 
  TRANS_STATUS, 
  getTransactionTypeLabel, 
  getTransactionStatusLabel 
} from "@/lib/constants"

function TransactionsContent() {
  const { t } = useTranslation()
  const router = useRouter()
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [showFilters, setShowFilters] = useState<boolean>(false)

  const { data, isLoading } = useQuery({
    queryKey: ["transactions"],
    queryFn: async () => {
      const response = await api.get<{
        count: number
        results: Transaction[]
      }>("/mobcash/transaction-history", {
        params: {
          page: 1,
          page_size: 100,
        }
      })
      return response.data
    },
    refetchInterval: 120000, // Refresh every 2 minutes
  })

  // Filter transactions based on search and filters
  const filteredTransactions = useMemo(() => {
    if (!data?.results) return []
    
    return data.results.filter((transaction) => {
      // Search filter
      const matchesSearch = searchQuery === "" || 
        transaction.reference.toLowerCase().includes(searchQuery.toLowerCase()) ||
        transaction.phone_number.includes(searchQuery) ||
        transaction.amount.toString().includes(searchQuery) ||
        transaction.app_details?.name?.toLowerCase().includes(searchQuery.toLowerCase())
      
      // Type filter
      const matchesType = typeFilter === "all" || transaction.type_trans === typeFilter
      
      // Status filter
      const matchesStatus = statusFilter === "all" || transaction.status === statusFilter
      
      return matchesSearch && matchesType && matchesStatus
    })
  }, [data?.results, searchQuery, typeFilter, statusFilter])

  const getStatusBadge = (status: string) => {
    const statusLabel = getTransactionStatusLabel(status as any)
    switch (status) {
      case "accept":
        return <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white border-0">{statusLabel}</Badge>
      case "error":
        return <Badge variant="destructive">{statusLabel}</Badge>
      case "init_payment":
        return <Badge className="bg-amber-500 hover:bg-amber-600 text-white border-0">{statusLabel}</Badge>
      default:
        return <Badge variant="secondary">{statusLabel}</Badge>
    }
  }

  const getTypeIcon = (type: string) => {
    return type === "deposit" ? (
      <div className="bg-emerald-500/10 rounded-xl p-2.5">
        <ArrowDownCircle className="h-5 w-5 text-emerald-600" />
      </div>
    ) : (
      <div className="bg-orange-500/10 rounded-xl p-2.5">
        <ArrowUpCircle className="h-5 w-5 text-orange-600" />
      </div>
    )
  }

  return (
    <div className="mobile-page">
      {/* Mobile Header */}
      <header className="mobile-header">
        <div className="mobile-header-content">
          <button
            className="h-10 w-10 rounded-full flex items-center justify-center hover:bg-accent transition-colors"
            onClick={() => router.push("/dashboard")}
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="mobile-header-title">{t("transactions")}</h1>
            <p className="mobile-header-subtitle">Historique complet</p>
          </div>
          <button
            className="h-10 w-10 rounded-full flex items-center justify-center hover:bg-accent transition-colors"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-5 w-5" />
          </button>
        </div>
        
        {/* Search Bar */}
        <div className="px-5 pb-3">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Rechercher une transaction..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-11 pr-11 h-11 rounded-xl"
            />
            {searchQuery && (
              <button
                className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full flex items-center justify-center hover:bg-accent transition-colors"
                onClick={() => setSearchQuery("")}
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="mobile-content stagger-animation">
        {/* Mobile Filters */}
        {showFilters && (
          <Card className="mobile-card shadow-md">
            <CardContent className="p-5">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Type de transaction</label>
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="mobile-input">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les types</SelectItem>
                      {TYPE_TRANS.map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Statut</label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="mobile-input">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les statuts</SelectItem>
                      {TRANS_STATUS.map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Results Summary */}
        <div className="flex items-center justify-between px-1">
          <p className="text-sm font-semibold">
            {filteredTransactions.length} transaction{filteredTransactions.length > 1 ? "s" : ""}
          </p>
          {(typeFilter !== "all" || statusFilter !== "all" || searchQuery) && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 text-primary font-medium"
              onClick={() => {
                setTypeFilter("all")
                setStatusFilter("all")
                setSearchQuery("")
              }}
            >
              Réinitialiser
            </Button>
          )}
        </div>

        {/* Mobile Transactions List */}
        {isLoading ? (
          <div className="mobile-card p-12 text-center">
            <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-primary border-r-transparent mb-3"></div>
            <p className="text-sm text-muted-foreground font-medium">Chargement des transactions...</p>
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="mobile-card p-12 text-center">
            <div className="bg-muted/50 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <Search className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-lg font-bold mb-2">Aucune transaction trouvée</p>
            <p className="text-sm text-muted-foreground">
              {searchQuery || typeFilter !== "all" || statusFilter !== "all" 
                ? "Essayez de modifier vos filtres de recherche" 
                : "Vous n'avez pas encore de transactions"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTransactions.map((transaction) => (
              <Card key={transaction.id} className="mobile-card shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                <CardContent className="p-0">
                  {/* Transaction Header */}
                  <div className="p-4 bg-gradient-to-r from-muted/50 to-background">
                    <div className="flex items-start gap-3">
                      <div className="shrink-0">
                        {getTypeIcon(transaction.type_trans)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <p className="font-bold text-base">
                            {getTransactionTypeLabel(transaction.type_trans)}
                          </p>
                          <p className="font-bold text-base whitespace-nowrap">
                            {transaction.amount.toLocaleString()} FCFA
                          </p>
                        </div>
                        {transaction.app_details?.name && (
                          <p className="text-sm text-muted-foreground font-medium mb-2 break-words">
                            {transaction.app_details.name}
                          </p>
                        )}
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs text-muted-foreground">{formatDate(transaction.created_at)}</span>
                          {getStatusBadge(transaction.status)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Transaction Details */}
                  <div className="p-4 space-y-2.5">
                    {transaction.user_app_id && (
                      <div className="flex justify-between items-center py-2 px-3 rounded-lg bg-primary/5">
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">ID de pari</span>
                        <span className="text-sm font-bold font-mono text-primary">{transaction.user_app_id}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center py-2 px-3 rounded-lg bg-muted/30">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Téléphone</span>
                      <span className="text-sm font-medium">{transaction.phone_number}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 px-3 rounded-lg bg-muted/30">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Référence</span>
                      <span className="text-sm font-medium font-mono text-muted-foreground">{transaction.reference}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

export default function TransactionsPage() {
  return (
    <AuthGuard>
      <TransactionsContent />
    </AuthGuard>
  )
}
