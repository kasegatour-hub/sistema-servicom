import { useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, KeyRound, Lock, Mail, Phone, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

const brandLogo = "/manus-storage/servicom_logo_final_e7ce35aa.png";

type AccountMode = "login" | "register" | "request" | "reset";

export default function AccountPage() {
  const [mode, setMode] = useState<AccountMode>("login");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [code, setCode] = useState("");
  const [channel, setChannel] = useState<"email" | "sms">("email");

  const registerMutation = trpc.account.register.useMutation({
    onSuccess: () => {
      toast.success("Cuenta creada correctamente. Ya puedes iniciar sesión.");
      setMode("login");
      setPassword("");
    },
    onError: error => toast.error(error.message),
  });
  const loginMutation = trpc.account.login.useMutation({
    onSuccess: () => toast.success("Sesión de usuario iniciada correctamente."),
    onError: error => toast.error(error.message),
  });
  const requestMutation = trpc.account.requestPasswordReset.useMutation({
    onSuccess: result => {
      toast.success(result.message);
      setMode("reset");
    },
    onError: error => toast.error(error.message),
  });
  const resetMutation = trpc.account.resetPassword.useMutation({
    onSuccess: result => {
      toast.success(result.message);
      setMode("login");
      setCode("");
      setNewPassword("");
    },
    onError: error => toast.error(error.message),
  });

  const isPending = registerMutation.isPending || loginMutation.isPending || requestMutation.isPending || resetMutation.isPending;

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (mode === "register") {
      registerMutation.mutate({ email, phone: phone || undefined, password });
    } else if (mode === "login") {
      loginMutation.mutate({ email, password });
    } else if (mode === "request") {
      requestMutation.mutate({ email, channel });
    } else {
      resetMutation.mutate({ email, channel, code, newPassword });
    }
  };

  const title = mode === "register" ? "Crear cuenta" : mode === "request" ? "Recuperar contraseña" : mode === "reset" ? "Confirmar código" : "Iniciar sesión";

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#eef6fb] to-white px-4 py-8">
      <div className="mx-auto max-w-md">
        <Link href="/" className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-[#0B2B5E] hover:text-[#F28C00]">
          <ArrowLeft className="h-4 w-4" /> Volver al rastreo
        </Link>

        <Card className="overflow-hidden border-0 shadow-xl">
          <div className="bg-[#0B2B5E] px-6 py-6 text-white">
            <img src={brandLogo} alt="Servicom Internacional" className="mb-5 h-14 w-auto rounded bg-white p-1" />
            <div className="flex items-center gap-3">
              {mode === "register" ? <UserPlus className="h-7 w-7 text-[#F28C00]" /> : mode === "request" || mode === "reset" ? <KeyRound className="h-7 w-7 text-[#F28C00]" /> : <Lock className="h-7 w-7 text-[#F28C00]" />}
              <div>
                <h1 className="text-2xl font-bold">{title}</h1>
                <p className="mt-1 text-sm text-blue-100">Servicom Internacional en colaboración con Kasega Tour EIRL</p>
              </div>
            </div>
          </div>

          <form onSubmit={submit} className="space-y-4 p-6">
            <div>
              <Label htmlFor="account-email">Correo electrónico</Label>
              <div className="relative mt-2">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input id="account-email" type="email" value={email} onChange={event => setEmail(event.target.value)} className="pl-9" required />
              </div>
            </div>

            {mode === "register" && (
              <div>
                <Label htmlFor="account-phone">Celular con código de país (opcional)</Label>
                <div className="relative mt-2">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input id="account-phone" type="tel" placeholder="+51 970 188 447" value={phone} onChange={event => setPhone(event.target.value)} className="pl-9" />
                </div>
              </div>
            )}

            {(mode === "login" || mode === "register") && (
              <div>
                <Label htmlFor="account-password">Contraseña</Label>
                <Input id="account-password" type="password" minLength={mode === "register" ? 8 : 1} value={password} onChange={event => setPassword(event.target.value)} className="mt-2" required />
                {mode === "register" && <p className="mt-1 text-xs text-slate-500">Usa al menos 8 caracteres.</p>}
              </div>
            )}

            {(mode === "request" || mode === "reset") && (
              <fieldset>
                <legend className="text-sm font-medium text-slate-900">Canal de verificación</legend>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => setChannel("email")} className={`rounded-lg border px-3 py-2 text-sm ${channel === "email" ? "border-[#F28C00] bg-orange-50 text-[#0B2B5E]" : "border-slate-200 text-slate-600"}`}>
                    Correo
                  </button>
                  <button type="button" onClick={() => setChannel("sms")} className={`rounded-lg border px-3 py-2 text-sm ${channel === "sms" ? "border-[#F28C00] bg-orange-50 text-[#0B2B5E]" : "border-slate-200 text-slate-600"}`}>
                    SMS al celular
                  </button>
                </div>
              </fieldset>
            )}

            {mode === "reset" && (
              <>
                <div>
                  <Label htmlFor="verification-code">Código de 6 dígitos</Label>
                  <Input id="verification-code" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={code} onChange={event => setCode(event.target.value)} className="mt-2 tracking-[0.35em]" required />
                </div>
                <div>
                  <Label htmlFor="new-password">Nueva contraseña</Label>
                  <Input id="new-password" type="password" minLength={8} value={newPassword} onChange={event => setNewPassword(event.target.value)} className="mt-2" required />
                </div>
              </>
            )}

            <Button type="submit" disabled={isPending} className="w-full bg-[#0B2B5E] text-white hover:bg-[#123d78]">
              {isPending ? "Procesando..." : mode === "register" ? "Crear cuenta" : mode === "request" ? "Enviar código" : mode === "reset" ? "Cambiar contraseña" : "Iniciar sesión"}
            </Button>

            <div className="flex flex-wrap justify-center gap-x-3 gap-y-2 text-sm">
              {mode !== "login" && <button type="button" onClick={() => setMode("login")} className="font-medium text-[#0B2B5E] hover:text-[#F28C00]">Iniciar sesión</button>}
              {mode !== "register" && <button type="button" onClick={() => setMode("register")} className="font-medium text-[#0B2B5E] hover:text-[#F28C00]">Crear cuenta</button>}
              {(mode === "login" || mode === "register") && <button type="button" onClick={() => setMode("request")} className="font-medium text-[#0B2B5E] hover:text-[#F28C00]">¿Olvidaste tu contraseña?</button>}
              {mode === "request" && <button type="button" onClick={() => setMode("reset")} className="font-medium text-[#0B2B5E] hover:text-[#F28C00]">Ya tengo un código</button>}
            </div>
          </form>
        </Card>

        <p className="mt-5 text-center text-xs text-slate-500">Tus contraseñas se almacenan mediante un hash seguro y nunca se guardan en texto plano.</p>
      </div>
    </main>
  );
}
