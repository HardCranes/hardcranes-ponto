"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Brand } from "@/components/Brand";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [entrando, setEntrando] = useState(false);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setEntrando(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: senha,
      });
      if (error) {
        setErro("E-mail ou senha incorretos.");
        return;
      }
      router.push("/admin");
      router.refresh();
    } catch {
      setErro("Não consegui entrar agora. Tente novamente.");
    } finally {
      setEntrando(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-hard-coal px-6 text-white">
      <div className="flex flex-col items-center gap-2 text-center">
        <Brand invert size="lg" />
        <p className="text-white/70">Administração — Registro de Presença</p>
      </div>

      <form onSubmit={entrar} className="flex w-full max-w-sm flex-col gap-3">
        <input
          type="email"
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="E-mail"
          className="rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-lg outline-none focus:border-hard-green"
        />
        <input
          type="password"
          autoComplete="current-password"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          placeholder="Senha"
          className="rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-lg outline-none focus:border-hard-green"
        />
        {erro && (
          <p className="text-center font-semibold text-alert-red">{erro}</p>
        )}
        <button
          type="submit"
          disabled={entrando}
          className="min-h-touch rounded-2xl bg-hard-green px-6 py-3 text-xl font-bold text-white active:bg-hard-green-dark disabled:opacity-50"
        >
          {entrando ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </main>
  );
}
