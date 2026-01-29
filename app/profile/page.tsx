"use client"

import { useState, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { useRouter } from "next/navigation"
import { ArrowLeft, Eye, EyeOff, UserCircle, Lock, Mail, Phone, ShieldCheck, Sparkles, LogOut } from "lucide-react"
import toast from "react-hot-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AuthGuard } from "@/components/auth-guard"
import { AppShell } from "@/app/_components/AppShell"
import { AppSection } from "@/app/_components/AppSection"
import { Badge } from "@/components/ui/badge"
import api from "@/lib/api"
import { logout } from "@/lib/auth"

interface UserProfile {
  id: string
  bonus_available: number
  is_superuser: boolean
  username: string
  first_name: string
  last_name: string
  email: string
  is_delete: boolean
  phone: string
  otp: string | null
  otp_created_at: string | null
  is_block: boolean
  referrer_code: string | null
  referral_code: string | null
  is_active: boolean
  is_staff: boolean
  is_supperuser: boolean
  date_joined: string
  last_login: string
}

function ProfileContent() {
  const { t } = useTranslation()
  const router = useRouter()
  const queryClient = useQueryClient()
  const [showOldPassword, setShowOldPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // Form states for profile edit
  const [profileForm, setProfileForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
  })

  // Form states for password change
  const [passwordForm, setPasswordForm] = useState({
    old_password: "",
    new_password: "",
    confirm_new_password: "",
  })

  // Fetch user profile
  const { data: profile, isLoading } = useQuery<UserProfile>({
    queryKey: ["user-profile"],
    queryFn: async () => {
      const response = await api.get<UserProfile>("/auth/me")
      return response.data
    },
  })

  // Update form when profile data is loaded
  useEffect(() => {
    if (profile) {
      setProfileForm({
        first_name: profile.first_name || "",
        last_name: profile.last_name || "",
        email: profile.email || "",
        phone: profile.phone || "",
      })
    }
  }, [profile])

  // Edit profile mutation
  const editProfileMutation = useMutation({
    mutationFn: async (data: typeof profileForm) => {
      const response = await api.post("/auth/edit", data)
      return response.data
    },
    onSuccess: (data) => {
      toast.success("Profil mis à jour avec succès!")
      // Update local storage user data
      const currentUser = JSON.parse(localStorage.getItem("user") || "{}")
      const updatedUser = {
        ...currentUser,
        first_name: data.first_name || currentUser.first_name,
        last_name: data.last_name || currentUser.last_name,
        email: data.email || currentUser.email,
        phone: data.phone || currentUser.phone,
      }
      localStorage.setItem("user", JSON.stringify(updatedUser))
      queryClient.invalidateQueries({ queryKey: ["user-profile"] })
    },
    onError: (error: any) => {
      const errorData = 
        error?.originalError?.response?.data || 
        error?.response?.data || 
        error?.data
      
      if (error?.originalError?.response?.status === 400) {
        const errorMsg = errorData?.details || errorData?.detail || errorData?.error || errorData?.message || error.message
        toast.error(errorMsg || "Erreur lors de la mise à jour du profil")
      } else {
        toast.error(error.message || "Erreur lors de la mise à jour du profil")
      }
    },
  })

  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: async (data: typeof passwordForm) => {
      const response = await api.post("/auth/change_password", {
        old_password: data.old_password,
        new_password: data.new_password,
        confirm_new_password: data.confirm_new_password,
      })
      return response.data
    },
    onSuccess: () => {
      toast.success("Mot de passe modifié avec succès!")
      setPasswordForm({
        old_password: "",
        new_password: "",
        confirm_new_password: "",
      })
    },
    onError: (error: any) => {
      const errorData = 
        error?.originalError?.response?.data || 
        error?.response?.data || 
        error?.data
      
      if (error?.originalError?.response?.status === 400) {
        const errorMsg = errorData?.details || errorData?.detail || errorData?.error || errorData?.message || error.message
        toast.error(errorMsg || "Erreur lors du changement de mot de passe")
      } else {
        toast.error(error.message || "Erreur lors du changement de mot de passe")
      }
    },
  })

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    editProfileMutation.mutate(profileForm)
  }

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (passwordForm.new_password !== passwordForm.confirm_new_password) {
      toast.error("Les nouveaux mots de passe ne correspondent pas")
      return
    }

    if (passwordForm.new_password.length < 6) {
      toast.error("Le nouveau mot de passe doit contenir au moins 6 caractères")
      return
    }

    changePasswordMutation.mutate(passwordForm)
  }

  const fullName =
    `${profile?.first_name || ""} ${profile?.last_name || ""}`.trim() ||
    profile?.username ||
    "Utilisateur"
  const joinDate = profile?.date_joined
    ? new Date(profile.date_joined).toLocaleDateString("fr-FR")
    : "N/A"
  const lastLogin = profile?.last_login
    ? new Date(profile.last_login).toLocaleDateString("fr-FR")
    : "N/A"
  const bonusValue =
    typeof profile?.bonus_available === "number"
      ? `${profile.bonus_available.toLocaleString()} FCFA`
      : "0 FCFA"

  const headerActions = (
    <div className="flex items-center gap-2">
      <button
        className="flex h-11 w-11 items-center justify-center rounded-2xl border border-primary/10 bg-white/80 text-foreground shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl dark:border-white/10 dark:bg-white/10"
        onClick={() => router.push("/dashboard")}
        aria-label="Retour"
      >
        <ArrowLeft className="h-5 w-5" />
      </button>
      {profile?.is_active && (
        <Badge variant="secondary" className="gap-2 rounded-2xl border border-emerald-200 bg-emerald-500/10 text-emerald-700 dark:border-emerald-900/40 dark:text-emerald-200">
          <ShieldCheck className="h-3.5 w-3.5" />
          Vérifié
        </Badge>
      )}
    </div>
  )

  if (isLoading) {
    return (
      <AppShell title="Profil" subtitle="Chargement..." actions={headerActions}>
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-primary/30 bg-white/70 py-16 text-sm text-muted-foreground dark:bg-slate-900/40">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-3 border-primary border-r-transparent" />
          Chargement...
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell
      title="Mon Profil"
      subtitle={profile?.email || "Gérez votre compte"}
      status="Compte sécurisé"
      actions={headerActions}
    >
      <div className="space-y-6">
        {/* Profile Hero */}
        <AppSection
          variant="highlight"
          badge={
            <Badge className="gap-2 bg-white/20 text-white">
              <Sparkles className="h-3.5 w-3.5" />
              Agent 1xstore
            </Badge>
          }
        >
          <div className="text-center">
            <div className="relative mx-auto mb-4 w-fit">
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary to-blue-600 opacity-50 blur-md" />
              <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-primary to-blue-600 text-2xl font-bold text-white shadow-lg">
                {fullName.slice(0, 2).toUpperCase()}
              </div>
            </div>
            <h2 className="mb-1 text-xl font-bold">{fullName}</h2>
            <p className="mb-3 text-sm text-muted-foreground">{profile?.email}</p>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-2">
              <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">Compte vérifié</span>
            </div>
          </div>
          <div className="mt-5 grid grid-cols-3 gap-3">
            <div className="rounded-2xl border border-white/40 bg-white/40 px-3 py-3 text-center backdrop-blur dark:border-white/10 dark:bg-white/10">
              <p className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">Bonus</p>
              <p className="text-sm font-bold">{bonusValue}</p>
            </div>
            <div className="rounded-2xl border border-white/40 bg-white/40 px-3 py-3 text-center backdrop-blur dark:border-white/10 dark:bg-white/10">
              <p className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">Statut</p>
              <p className="text-sm font-bold">{profile?.is_active ? "Actif" : "Inactif"}</p>
            </div>
            <div className="rounded-2xl border border-white/40 bg-white/40 px-3 py-3 text-center backdrop-blur dark:border-white/10 dark:bg-white/10">
              <p className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">Parrainage</p>
              <p className="truncate text-sm font-bold">{profile?.referral_code || "—"}</p>
            </div>
          </div>
        </AppSection>

        {/* Profile Information */}
        <AppSection
          title="Informations personnelles"
          subtitle="Mettez à jour vos coordonnées"
        >
          <form onSubmit={handleProfileSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="first_name" className="text-xs font-semibold text-muted-foreground">Prénom</Label>
                <Input
                  id="first_name"
                  className="h-12 rounded-xl"
                  value={profileForm.first_name}
                  onChange={(e) => setProfileForm({ ...profileForm, first_name: e.target.value })}
                  disabled={editProfileMutation.isPending}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name" className="text-xs font-semibold text-muted-foreground">Nom</Label>
                <Input
                  id="last_name"
                  className="h-12 rounded-xl"
                  value={profileForm.last_name}
                  onChange={(e) => setProfileForm({ ...profileForm, last_name: e.target.value })}
                  disabled={editProfileMutation.isPending}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs font-semibold text-muted-foreground">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  className="h-12 rounded-xl pl-10"
                  value={profileForm.email}
                  onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                  disabled={editProfileMutation.isPending}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="text-xs font-semibold text-muted-foreground">Téléphone</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="phone"
                  type="tel"
                  className="h-12 rounded-xl pl-10"
                  value={profileForm.phone}
                  onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                  disabled={editProfileMutation.isPending}
                />
              </div>
            </div>

            <Button
              type="submit"
              className="h-12 w-full rounded-xl bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90"
              disabled={editProfileMutation.isPending}
            >
              {editProfileMutation.isPending ? "Enregistrement..." : "Enregistrer les modifications"}
            </Button>
          </form>
        </AppSection>

        {/* Account Information */}
        <AppSection
          title="Informations du compte"
          subtitle="Détails de votre inscription"
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-2xl bg-muted/50 p-3">
              <span className="text-sm text-muted-foreground">Nom d'utilisateur</span>
              <span className="text-sm font-semibold">{profile?.username || "N/A"}</span>
            </div>
            <div className="flex items-center justify-between rounded-2xl bg-muted/50 p-3">
              <span className="text-sm text-muted-foreground">Date d'inscription</span>
              <span className="text-sm font-semibold">{joinDate}</span>
            </div>
            <div className="flex items-center justify-between rounded-2xl bg-muted/50 p-3">
              <span className="text-sm text-muted-foreground">Dernière connexion</span>
              <span className="text-sm font-semibold">{lastLogin}</span>
            </div>
            {profile?.referral_code && (
              <div className="flex items-center justify-between rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/10 to-blue-500/10 p-3">
                <span className="text-sm font-medium text-muted-foreground">Code de parrainage</span>
                <span className="font-mono text-sm font-bold text-primary">{profile.referral_code}</span>
              </div>
            )}
          </div>
        </AppSection>

        {/* Change Password */}
        <AppSection
          title="Sécurité du compte"
          subtitle="Modifiez votre mot de passe"
        >
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="old_password" className="text-xs font-semibold text-muted-foreground">Ancien mot de passe</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="old_password"
                  type={showOldPassword ? "text" : "password"}
                  placeholder="Entrez votre ancien mot de passe"
                  className="h-12 rounded-xl pl-10 pr-12"
                  value={passwordForm.old_password}
                  onChange={(e) => setPasswordForm({ ...passwordForm, old_password: e.target.value })}
                  disabled={changePasswordMutation.isPending}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 h-10 w-10 -translate-y-1/2 hover:bg-transparent"
                  onClick={() => setShowOldPassword(!showOldPassword)}
                  disabled={changePasswordMutation.isPending}
                >
                  {showOldPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="new_password" className="text-xs font-semibold text-muted-foreground">Nouveau mot de passe</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="new_password"
                  type={showNewPassword ? "text" : "password"}
                  placeholder="Min. 6 caractères"
                  value={passwordForm.new_password}
                  onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
                  disabled={changePasswordMutation.isPending}
                  className="h-12 rounded-xl pl-10 pr-12"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 h-10 w-10 -translate-y-1/2 hover:bg-transparent"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  disabled={changePasswordMutation.isPending}
                >
                  {showNewPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm_new_password" className="text-xs font-semibold text-muted-foreground">Confirmer le nouveau mot de passe</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="confirm_new_password"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirmez votre mot de passe"
                  value={passwordForm.confirm_new_password}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirm_new_password: e.target.value })}
                  disabled={changePasswordMutation.isPending}
                  className="h-12 rounded-xl pl-10 pr-12"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 h-10 w-10 -translate-y-1/2 hover:bg-transparent"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={changePasswordMutation.isPending}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>

            <Button
              type="submit"
              className="h-12 w-full rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 text-white hover:from-orange-600 hover:to-orange-700"
              disabled={changePasswordMutation.isPending}
            >
              {changePasswordMutation.isPending ? "Changement en cours..." : "Mettre à jour le mot de passe"}
            </Button>
          </form>
        </AppSection>

        {/* Logout */}
        <AppSection>
          <Button
            onClick={logout}
            variant="destructive"
            className="h-12 w-full rounded-xl"
          >
            <LogOut className="mr-2 h-5 w-5" />
            Déconnexion
          </Button>
        </AppSection>
      </div>
    </AppShell>
  )
}

export default function ProfilePage() {
  return (
    <AuthGuard>
      <ProfileContent />
    </AuthGuard>
  )
}

