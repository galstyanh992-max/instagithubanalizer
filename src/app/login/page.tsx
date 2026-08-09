import { SciFiPanel } from "@/components/ui/sci-fi-panel";
import { signIn } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Lock } from "lucide-react";

type Props = {
  searchParams: Promise<{ error?: string }>;
};

export default async function LoginPage(props: Props) {
  const searchParams = await props.searchParams;
  return (
    <div className="cosmic-page-shell flex min-h-screen items-center justify-center p-6">
      <SciFiPanel accent="cyan" className="w-full max-w-sm p-8">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-cyan-400/40 bg-cyan-500/10">
            <Lock className="h-5 w-5 text-cyan-300" />
          </div>
          <h1 className="font-mono text-lg font-bold neon-text">ДЖАРВИС</h1>
          <p className="mt-1 text-[10px] uppercase tracking-widest text-zinc-500">Вход в систему</p>
        </div>
        <form action={signIn} className="mt-6 space-y-4">
          <div>
            <Input
              name="email"
              type="email"
              required
              placeholder="Email"
              className="bg-zinc-900/60 border-cyan-400/20"
              autoFocus
            />
          </div>
          <div>
            <Input
              name="password"
              type="password"
              required
              placeholder="Пароль"
              className="bg-zinc-900/60 border-cyan-400/20"
            />
          </div>
          {searchParams?.error && <p className="text-xs text-red-400">{searchParams.error}</p>}
          <Button type="submit" className="w-full">
            Войти
          </Button>
        </form>
        <p className="mt-4 text-center text-[9px] text-zinc-600">
          Доступ разрешен только владельцу системы.
        </p>
      </SciFiPanel>
    </div>
  );
}
