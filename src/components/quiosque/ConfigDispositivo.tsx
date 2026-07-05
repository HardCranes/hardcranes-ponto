"use client";

import { useState } from "react";
import { salvarConfig, KIOSK_TOKEN_HEADER } from "@/lib/kiosk-token";
import { Brand } from "@/components/Brand";

/**
 * Primeira vez no celular da parede: pede o código do dispositivo (senha que o
 * dono definiu) e um nome para identificar este aparelho. Valida contra o
 * servidor antes de salvar.
 */
export default function ConfigDispositivo({
  onPronto,
}: {
  onPronto: () => void;
}) {
  const [token, setToken] = useState("");
  const [nome, setNome] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [testando, setTestando] = useState(false);

  async function salvar() {
    setErro(null);
    if (!token.trim()) {
      setErro("Digite o código do dispositivo.");
      return;
    }
    setTestando(true);
    try {
      const res = await fetch("/api/quiosque/colaboradores", {
        headers: { [KIOSK_TOKEN_HEADER]: token.trim() },
      });
      if (res.status === 401) {
        setErro("Código incorreto. Confira com o responsável.");
        return;
      }
      if (!res.ok) {
        setErro("Não consegui validar agora. Tente novamente.");
        return;
      }
      salvarConfig(token.trim(), nome.trim() || "Quiosque");
      onPronto();
    } catch {
      setErro("Sem conexão. Verifique a internet do celular.");
    } finally {
      setTestando(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-hard-coal px-6 text-white">
      <Brand invert size="lg" />
      <h1 className="text-2xl font-bold text-hard-green">Configurar este celular</h1>
      <p className="max-w-sm text-center text-white/70">
        Esta tela só aparece uma vez. Digite o código do dispositivo que o
        responsável definiu.
      </p>

      <div className="flex w-full max-w-sm flex-col gap-3">
        <label className="text-sm text-white/70">Código do dispositivo</label>
        <input
          value={token}
          onChange={(e) => setToken(e.target.value)}
          type="password"
          className="rounded-xl border border-white/20 bg-white/10 px-4 py-4 text-lg text-white outline-none focus:border-hard-green"
          placeholder="Código do dispositivo"
        />

        <label className="mt-2 text-sm text-white/70">
          Nome deste celular (ex.: Parede Produção)
        </label>
        <input
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          className="rounded-xl border border-white/20 bg-white/10 px-4 py-4 text-lg text-white outline-none focus:border-hard-green"
          placeholder="Parede Produção"
        />

        {erro && (
          <p className="text-center text-lg font-semibold text-alert-red">{erro}</p>
        )}

        <button
          onClick={salvar}
          disabled={testando}
          className="mt-2 min-h-touch rounded-2xl bg-hard-green px-6 py-4 text-xl font-bold text-white active:bg-hard-green-dark disabled:opacity-50"
        >
          {testando ? "Validando…" : "Salvar e começar"}
        </button>
      </div>
    </main>
  );
}
