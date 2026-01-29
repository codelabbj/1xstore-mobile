"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useRouter } from "next/navigation"
import { useTranslation } from "react-i18next"
import toast from "react-hot-toast"
import Link from "next/link"
import Image from "next/image"
import { Capacitor } from "@capacitor/core"
import { Eye, EyeOff, ShieldCheck, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import api from "@/lib/api"
import { saveAuthData, type AuthResponse } from "@/lib/auth"
import { notificationService } from "@/lib/firebase-notifications"
import { unifiedFcmService } from "@/lib/firebase"

const loginSchema = z.object({
  email_or_phone: z.string().min(1, "Ce champ est requis"),
  password: z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères"),
})

type LoginFormData = z.infer<typeof loginSchema>

const REMEMBER_KEY = "afr-login-remember"

export default function LoginPage() {
  const { t } = useTranslation()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [isForgotPassword, setIsForgotPassword] = useState(false)
  const [forgotStep, setForgotStep] = useState<1 | 2 | 3>(1)
  const [forgotEmail, setForgotEmail] = useState("")
  const [forgotOtp, setForgotOtp] = useState("")
  const [forgotNewPassword, setForgotNewPassword] = useState("")
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState("")
  const [forgotLoading, setForgotLoading] = useState(false)
  const [showForgotNewPassword, setShowForgotNewPassword] = useState(false)
  const [showForgotConfirmPassword, setShowForgotConfirmPassword] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  const watchedEmail = watch("email_or_phone")

  useEffect(() => {
    if (typeof window === "undefined") return
    const stored = window.localStorage.getItem(REMEMBER_KEY)
    if (stored) {
      setValue("email_or_phone", stored)
      setRememberMe(true)
    }
  }, [setValue])

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true)
    try {
      const response = await api.post<AuthResponse>("/auth/login", data)
      saveAuthData(response.data)
      if (rememberMe) {
        window.localStorage.setItem(REMEMBER_KEY, data.email_or_phone)
      } else {
        window.localStorage.removeItem(REMEMBER_KEY)
      }
      toast.success("Connexion réussie!")

      const platform = Capacitor.getPlatform()
      if (platform === "ios" || platform === "android") {
        try {
          await notificationService.requestMobileNotificationPermissions()

          // Send FCM token to server after login
          setTimeout(async () => {
            await unifiedFcmService.initialize()
            const token = unifiedFcmService.getToken()
            if (token) {
              await unifiedFcmService['sendTokenToServer'](token)
            }
          }, 2000) // Wait a bit longer for token to be available
        } catch (error) {
          console.error("Error requesting notification permissions:", error)
        }
      }

      router.push("/dashboard")
    } catch (error: any) {
      toast.error(error?.message || "Erreur de connexion")
    } finally {
      setIsLoading(false)
    }
  }

  const resetForgotPasswordState = () => {
    setIsForgotPassword(false)
    setForgotStep(1)
    setForgotEmail("")
    setForgotOtp("")
    setForgotNewPassword("")
    setForgotConfirmPassword("")
    setForgotLoading(false)
  }

  const handleForgotPasswordClick = () => {
    setIsForgotPassword(true)
    setForgotStep(1)
    setForgotEmail(watchedEmail || "")
  }

  const handleSendOtp = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!forgotEmail.trim()) {
      toast.error("Veuillez saisir votre email")
      return
    }
    setForgotLoading(true)
    try {
      await api.post("/auth/send_otp", { email: forgotEmail.trim() })
      toast.success("Code envoyé à votre email")
      setForgotStep(2)
    } catch (error: any) {
      toast.error(error?.message || "Impossible d'envoyer le code")
    } finally {
      setForgotLoading(false)
    }
  }

  const handleOtpContinue = (event: React.FormEvent) => {
    event.preventDefault()
    if (!forgotOtp.trim() || forgotOtp.trim().length < 4) {
      toast.error("Veuillez saisir un code OTP valide")
      return
    }
    setForgotStep(3)
  }

  const handleResetPassword = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!forgotNewPassword || forgotNewPassword.length < 6) {
      toast.error("Le mot de passe doit contenir au moins 6 caractères")
      return
    }
    if (forgotNewPassword !== forgotConfirmPassword) {
      toast.error("Les mots de passe ne correspondent pas")
      return
    }
    setForgotLoading(true)
    try {
      await api.post("/auth/reset_password", {
        otp: forgotOtp.trim(),
        new_password: forgotNewPassword,
        confirm_new_password: forgotConfirmPassword,
      })
      toast.success("Mot de passe réinitialisé. Vous pouvez vous connecter.")
      resetForgotPasswordState()
    } catch (error: any) {
      toast.error(error?.message || "Impossible de réinitialiser le mot de passe")
    } finally {
      setForgotLoading(false)
    }
  }

  const renderForgotPasswordForm = () => {
    if (forgotStep === 1) {
      return (
        <form onSubmit={handleSendOtp} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="forgotEmail" className="text-sm font-medium">Adresse email</Label>
            <Input
              id="forgotEmail"
              type="email"
              value={forgotEmail}
              onChange={(event) => setForgotEmail(event.target.value)}
              placeholder="votre@email.com"
              className="h-12 rounded-2xl"
              disabled={forgotLoading}
              autoFocus
            />
          </div>
          <div className="space-y-3">
            <Button type="submit" className="h-12 w-full rounded-2xl bg-gradient-to-r from-primary to-blue-600 font-semibold shadow-lg shadow-primary/30" disabled={forgotLoading}>
              {forgotLoading ? "Envoi..." : "Recevoir le code"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full rounded-2xl"
              onClick={resetForgotPasswordState}
              disabled={forgotLoading}
            >
              Annuler
            </Button>
          </div>
        </form>
      )
    }

    if (forgotStep === 2) {
      return (
        <form onSubmit={handleOtpContinue} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="forgotOtp" className="text-sm font-medium">Code de vérification</Label>
            <Input
              id="forgotOtp"
              value={forgotOtp}
              onChange={(event) => setForgotOtp(event.target.value)}
              placeholder="Entrez le code"
              className="h-12 rounded-2xl text-center text-lg tracking-widest"
              disabled={forgotLoading}
              autoFocus
              maxLength={6}
            />
          </div>
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              className="h-12 flex-1 rounded-2xl"
              onClick={() => setForgotStep(1)}
              disabled={forgotLoading}
            >
              Retour
            </Button>
            <Button type="submit" className="h-12 flex-1 rounded-2xl bg-gradient-to-r from-primary to-blue-600 font-semibold" disabled={forgotLoading}>
              Valider
            </Button>
          </div>
        </form>
      )
    }

    return (
      <form onSubmit={handleResetPassword} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="newPassword" className="text-sm font-medium">Nouveau mot de passe</Label>
          <div className="relative">
            <Input
              id="newPassword"
              type={showForgotNewPassword ? "text" : "password"}
              value={forgotNewPassword}
              onChange={(event) => setForgotNewPassword(event.target.value)}
              placeholder="Min. 6 caractères"
              className="h-12 rounded-2xl pr-12"
              disabled={forgotLoading}
              autoFocus
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 h-10 w-10 -translate-y-1/2"
              onClick={() => setShowForgotNewPassword((prev) => !prev)}
              disabled={forgotLoading}
            >
              {showForgotNewPassword ? (
                <EyeOff className="h-4 w-4 text-muted-foreground" />
              ) : (
                <Eye className="h-4 w-4 text-muted-foreground" />
              )}
            </Button>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirmPassword" className="text-sm font-medium">Confirmer</Label>
          <div className="relative">
            <Input
              id="confirmPassword"
              type={showForgotConfirmPassword ? "text" : "password"}
              value={forgotConfirmPassword}
              onChange={(event) => setForgotConfirmPassword(event.target.value)}
              placeholder="Répétez le mot de passe"
              className="h-12 rounded-2xl pr-12"
              disabled={forgotLoading}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 h-10 w-10 -translate-y-1/2"
              onClick={() => setShowForgotConfirmPassword((prev) => !prev)}
              disabled={forgotLoading}
            >
              {showForgotConfirmPassword ? (
                <EyeOff className="h-4 w-4 text-muted-foreground" />
              ) : (
                <Eye className="h-4 w-4 text-muted-foreground" />
              )}
            </Button>
          </div>
        </div>
        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            className="h-12 flex-1 rounded-2xl"
            onClick={() => setForgotStep(2)}
            disabled={forgotLoading}
          >
            Retour
          </Button>
          <Button type="submit" className="h-12 flex-1 rounded-2xl bg-gradient-to-r from-primary to-blue-600 font-semibold" disabled={forgotLoading}>
            {forgotLoading ? "Envoi..." : "Confirmer"}
          </Button>
        </div>
      </form>
    )
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background px-4">
      {/* Background decorations */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[400px] bg-[radial-gradient(circle_at_top,_rgba(63,169,255,0.35),_transparent_65%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-32 mx-auto h-64 w-64 rounded-full bg-primary/30 blur-[140px]"
      />

      <div className="relative z-10 w-full max-w-md space-y-8 py-8">
        {/* Header */}
        <div className="space-y-4 text-center">
          <Image
            src="/1xstore-logo.png"
            alt="1xstore"
            width={100}
            height={100}
            className="mx-auto object-contain"
            priority
          />
          <div className="space-y-2">
            <h1 className="text-display">
              {isForgotPassword ? "Réinitialisation" : "Connexion"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {isForgotPassword ? "Récupérez l'accès à votre compte" : "Accédez à votre espace agent"}
            </p>
          </div>
          {isForgotPassword && (
            <Badge className="gap-2 bg-primary/10 text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              Étape {forgotStep}/3
            </Badge>
          )}
        </div>

        {/* Card */}
        <div>
          {isForgotPassword ? (
            renderForgotPasswordForm()
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email_or_phone" className="text-sm font-medium">Email ou téléphone</Label>
                <Input
                  id="email_or_phone"
                  type="text"
                  placeholder="Entrez votre email ou numéro"
                  className="h-12 rounded-2xl"
                  {...register("email_or_phone")}
                  disabled={isLoading}
                />
                {errors.email_or_phone && (
                  <p className="text-xs text-destructive">{errors.email_or_phone.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">Mot de passe</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Entrez votre mot de passe"
                    className="h-12 rounded-2xl pr-12"
                    {...register("password")}
                    disabled={isLoading}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 h-10 w-10 -translate-y-1/2"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
                {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(event) => setRememberMe(event.target.checked)}
                    className="h-4 w-4 rounded border-input accent-primary"
                    disabled={isLoading}
                  />
                  <span className="text-sm text-muted-foreground">Se souvenir</span>
                </label>
                <button
                  type="button"
                  className="text-sm font-medium text-primary"
                  onClick={handleForgotPasswordClick}
                  disabled={isLoading}
                >
                  Mot de passe oublié?
                </button>
              </div>

              <Button
                type="submit"
                className="h-12 w-full rounded-2xl bg-gradient-to-r from-primary to-blue-600 text-base font-semibold shadow-lg shadow-primary/30 transition hover:shadow-xl hover:shadow-primary/40"
                disabled={isLoading}
              >
                {isLoading ? "Connexion..." : "Se connecter"}
              </Button>
            </form>
          )}
        </div>

        {/* Footer */}
        {!isForgotPassword && (
          <div className="space-y-4 text-center">
            <p className="text-sm text-muted-foreground">
              Pas encore de compte?{" "}
              <Link href="/register" className="font-semibold text-primary">
                S'inscrire
              </Link>
            </p>
            
          </div>
        )}

      </div>
    </div>
  )
}
