"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useRouter } from "next/navigation"
import { useTranslation } from "react-i18next"
import toast from "react-hot-toast"
import Link from "next/link"
import Image from "next/image"
import { Eye, EyeOff, ShieldCheck, User, Mail, Phone, Lock, Gift } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import api from "@/lib/api"
import { useSettings } from "@/hooks/use-settings"

const registerSchema = z.object({
  first_name: z.string().min(1, "Le prénom est requis"),
  last_name: z.string().min(1, "Le nom est requis"),
  email: z.string().email("Email invalide"),
  phone: z.string().min(10, "Numéro de téléphone invalide"),
  password: z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères"),
  re_password: z.string().min(6, "Veuillez confirmer votre mot de passe"),
  referrer_code: z.string().optional(),
})

export default function RegisterPage() {
  const { t } = useTranslation()
  const router = useRouter()
  const { referralBonusEnabled, isLoading: settingsLoading } = useSettings()
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(registerSchema),
  })

  const onSubmit = async (data: any) => {
    setIsLoading(true)
    try {
      const payload: any = {
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email,
        phone: data.phone,
        password: data.password,
        re_password: data.re_password,
      }

      // Only include referrer_code if referral_bonus is enabled
      if (referralBonusEnabled && data.referrer_code) {
        payload.referrer_code = data.referrer_code
      }

      await api.post("/auth/registration", payload)
      toast.success("Inscription réussie! Veuillez vous connecter.")
      router.push("/login")
    } catch (error: any) {
      toast.error(error.message || "Erreur d'inscription")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background px-4 py-8">
      {/* Background decorations */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[400px] bg-[radial-gradient(circle_at_top,_rgba(63,169,255,0.35),_transparent_65%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-32 mx-auto h-64 w-64 rounded-full bg-primary/30 blur-[140px]"
      />

      <div className="relative z-10 w-full max-w-md space-y-6">
        {/* Header */}
        <div className="space-y-4 text-center">
          <Image
            src="/1xstore-logo.png"
            alt="1xstore"
            width={100}
            height={100}
            className="mx-auto"
            priority
          />
          <div className="space-y-2">
            <h1 className="text-display">Créer un compte</h1>
            <p className="text-sm text-muted-foreground">
              Rejoignez la communauté des agents 1xstore
            </p>
          </div>
          
        </div>

        {/* Card */}
        <div>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Name fields */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="first_name" className="text-sm font-medium">{t("firstName")}</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="first_name"
                    type="text"
                    placeholder="John"
                    className="h-12 rounded-2xl pl-10"
                    {...register("first_name")}
                    disabled={isLoading}
                  />
                </div>
                {errors.first_name && <p className="text-xs text-destructive">{errors.first_name.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="last_name" className="text-sm font-medium">{t("lastName")}</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="last_name"
                    type="text"
                    placeholder="Doe"
                    className="h-12 rounded-2xl pl-10"
                    {...register("last_name")}
                    disabled={isLoading}
                  />
                </div>
                {errors.last_name && <p className="text-xs text-destructive">{errors.last_name.message}</p>}
              </div>
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">{t("email")}</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="john@example.com"
                  className="h-12 rounded-2xl pl-10"
                  {...register("email")}
                  disabled={isLoading}
                />
              </div>
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-sm font-medium">{t("phone")}</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="phone"
                  type="tel"
                  placeholder="2250700000000"
                  className="h-12 rounded-2xl pl-10"
                  {...register("phone")}
                  disabled={isLoading}
                />
              </div>
              {errors.phone && <p className="text-xs text-destructive">{errors.phone.message}</p>}
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">{t("password")}</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className="h-12 rounded-2xl pl-10 pr-12"
                  {...register("password")}
                  disabled={isLoading}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 h-10 w-10 -translate-y-1/2 hover:bg-transparent"
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

            {/* Confirm Password */}
            <div className="space-y-2">
              <Label htmlFor="re_password" className="text-sm font-medium">{t("confirmPassword")}</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="re_password"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className="h-12 rounded-2xl pl-10 pr-12"
                  {...register("re_password")}
                  disabled={isLoading}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 h-10 w-10 -translate-y-1/2 hover:bg-transparent"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={isLoading}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
              {errors.re_password && <p className="text-xs text-destructive">{errors.re_password.message}</p>}
            </div>

            {/* Referral Code */}
            {referralBonusEnabled && (
              <div className="space-y-2">
                <Label htmlFor="referrer_code" className="text-sm font-medium">Code de parrainage (optionnel)</Label>
                <div className="relative">
                  <Gift className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="referrer_code"
                    type="text"
                    placeholder="Entrez un code de parrainage"
                    className="h-12 rounded-2xl pl-10"
                    {...register("referrer_code")}
                    disabled={isLoading || settingsLoading}
                  />
                </div>
                {errors.referrer_code && <p className="text-xs text-destructive">{errors.referrer_code?.message}</p>}
              </div>
            )}

            <Button
              type="submit"
              className="h-12 w-full rounded-2xl bg-gradient-to-r from-primary to-blue-600 text-base font-semibold shadow-lg shadow-primary/30 transition hover:shadow-xl hover:shadow-primary/40"
              disabled={isLoading || settingsLoading}
            >
              {isLoading ? t("loading") : "Créer mon compte"}
            </Button>
          </form>
        </div>

        {/* Footer */}
        <div className="space-y-4 text-center">
          <p className="text-sm text-muted-foreground">
            {t("alreadyHaveAccount")}{" "}
            <Link href="/login" className="font-semibold text-primary">
              {t("login")}
            </Link>
          </p>
          
        </div>

      </div>
    </div>
  )
}
