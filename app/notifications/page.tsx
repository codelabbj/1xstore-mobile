"use client"

import { useTranslation } from "react-i18next"
import { useRouter } from "next/navigation"
import { ArrowLeft, Bell, Trash2, Sparkles, Info, Clock } from "lucide-react"
import toast from "react-hot-toast"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AuthGuard } from "@/components/auth-guard"
import { AppShell } from "@/app/_components/AppShell"
import { AppSection } from "@/app/_components/AppSection"
import { useNotifications } from "@/hooks/use-notifications"
import { formatDate } from "@/lib/utils"

function NotificationsContent() {
  const { t } = useTranslation()
  const router = useRouter()
  const { notifications, notificationCount, isLoading, clearAllNotifications } = useNotifications()

  const handleClearAll = () => {
    clearAllNotifications()
    toast.success("Toutes les notifications ont été supprimées")
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
      {notifications.length > 0 && (
        <Badge variant="secondary" className="rounded-2xl">
          {notifications.length} message{notifications.length > 1 ? "s" : ""}
        </Badge>
      )}
      {notifications.length > 0 && (
        <Button
          variant="outline"
          size="sm"
          className="rounded-2xl"
          onClick={handleClearAll}
        >
          <Trash2 className="h-4 w-4" />
          Tout effacer
        </Button>
      )}
    </div>
  )

  return (
    <AppShell
      title="Notifications"
      subtitle={notifications.length > 0 ? `${notifications.length} message${notifications.length > 1 ? "s" : ""} enregistré${notifications.length > 1 ? "s" : ""}` : "Toutes vos notifications"}
      status="Centre de messages"
      actions={headerActions}
    >
      <div className="space-y-6">
        {/* Hero Section */}
        <AppSection
          variant="highlight"
          title="Boîte de réception"
          subtitle="Restez informé de vos transactions et annonces"
          badge={
            <Badge className="gap-2 bg-white/20 text-white">
              <Bell className="h-3.5 w-3.5" />
              Notifications
            </Badge>
          }
        >
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-2xl border border-white/40 bg-white/40 px-4 py-4 backdrop-blur dark:border-white/10 dark:bg-white/10">
              <p className="text-xs uppercase tracking-[0.08em] text-muted-foreground">Stockées</p>
              <p className="text-2xl font-bold text-foreground">{notifications.length}</p>
            </div>
            <div className="rounded-2xl border border-white/40 bg-white/40 px-4 py-4 backdrop-blur dark:border-white/10 dark:bg-white/10">
              <p className="text-xs uppercase tracking-[0.08em] text-muted-foreground">Nouvelles</p>
              <p className="text-2xl font-bold text-foreground">{notificationCount}</p>
            </div>
          </div>
        </AppSection>

        {/* Notifications List */}
        <AppSection
          title="Messages récents"
          subtitle="Consultez et marquez vos notifications"
        >
          {isLoading ? (
            <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-primary/30 bg-white/70 py-10 text-sm text-muted-foreground dark:bg-slate-900/40">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-3 border-primary border-r-transparent" />
              Chargement...
            </div>
          ) : notifications.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-primary/30 bg-primary/5 px-4 py-10 text-center">
              <Bell className="mx-auto mb-3 h-12 w-12 text-primary/40" />
              <p className="text-sm font-medium text-muted-foreground">Aucune notification</p>
              <p className="mt-1 text-xs text-muted-foreground">Vos messages apparaîtront ici</p>
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`rounded-3xl border p-4 transition-all ${
                    notification.isOld
                      ? "border-border/60 bg-white/70 dark:bg-slate-900/40"
                      : "border-primary/30 bg-gradient-to-r from-primary/10 to-primary/5 shadow-sm dark:from-primary/20 dark:to-primary/10"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`shrink-0 rounded-xl p-2.5 ${
                        notification.isOld
                          ? "bg-muted text-muted-foreground"
                          : "bg-primary/10 text-primary"
                      }`}
                    >
                      {notification.isOld ? (
                        <Clock className="h-5 w-5" />
                      ) : (
                        <Sparkles className="h-5 w-5" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold">{notification.title}</h3>
                        {!notification.isOld && (
                          <Badge variant="default" className="rounded-full bg-primary px-2 py-0.5 text-[10px]">
                            Nouveau
                          </Badge>
                        )}
                        {notification.isOld && (
                          <Badge variant="secondary" className="rounded-full bg-muted px-2 py-0.5 text-[10px]">
                            Archivé
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{notification.content}</p>
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-muted-foreground">{formatDate(notification.created_at)}</p>
                        <p className="text-xs text-muted-foreground">
                          {notification.isOld ? "Plus de 24h" : "Récent"}
                        </p>
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

export default function NotificationsPage() {
  return (
    <AuthGuard>
      <NotificationsContent />
    </AuthGuard>
  )
}
