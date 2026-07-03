"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { HolographicPanel } from "@/components/futuristic/holographic-panel";
import { Loader2, Lock } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await signIn("credentials", {
        password,
        redirect: false,
      });
      if (res?.error) {
        setError("Неверный пароль");
      } else {
        router.push("/");
        router.refresh();
      }
    } catch {
      setError("Ошибка входа");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="cosmic-page-shell flex min-h-screen items-center justify-center p-6">
      <HolographicPanel accent="cyan" className="w-full max-w-sm p-8">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-cyan-400/40 bg-cyan-500/10">
            <Lock className="h-5 w-5 text-cyan-300" />
          </div>
          <h1 className="font-mono text-lg font-bold neon-text">JARWISYAN</h1>
          <p className="mt-1 text-[10px] uppercase tracking-widest text-zinc-500">Вход в систему</p>
        </div>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Пароль администратора"
              className="bg-zinc-900/60 border-cyan-400/20"
              autoFocus
            />
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading || !password}>
            {loading ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
            Войти
          </Button>
        </form>
        <p className="mt-4 text-center text-[9px] text-zinc-600">
          Пароль по умолчанию: jarwisyan-admin<br />
          (измените через JARWISYAN_ADMIN_PASSWORD в .env)
        </p>
      </HolographicPanel>
    </div>
  );
}
