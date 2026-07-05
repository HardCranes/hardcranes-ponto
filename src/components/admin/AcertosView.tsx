"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatarReais } from "@/lib/dinheiro";
import { adicionarAcerto, apagarAcerto } from "@/app/admin/acertos/actions";
import type { Acerto } from "@/lib/types";

function parseValor(txt: string): number {
  const limpo = txt.replace(/\./g, "").replace(",", ".").trim();
  return Number(limpo);
}

export default function AcertosView({
  colaboradorId,
  mes,
  acertos,
}: {
  colaboradorId: string;
  mes: string;
  acertos: Acerto[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  const total = acertos.reduce((s, a) => s + Number(a.valor), 0);

  function adicionar() {
    setErro(null);
    const v = parseValor(valor);
    if (!descricao.trim()) return setErro("Informe a descrição.");
    if (!Number.isFinite(v)) return setErro("Valor inválido.");
    startTransition(async () => {
      const r = await adicionarAcerto({
        colaborador_id: colaboradorId,
        mes_referencia: mes,
        descricao,
        valor: v,
      });
      if (!r.ok) return setErro(r.erro ?? "Falha.");
      setDescricao("");
      setValor("");
      router.refresh();
    });
  }

  function apagar(id: string) {
    startTransition(async () => {
      const r = await apagarAcerto(id);
      if (!r.ok) setErro(r.erro ?? "Falha.");
      else router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-gray-200 bg-white p-4">
        <label className="flex flex-1 flex-col gap-1">
          <span className="text-sm font-semibold">Descrição</span>
          <input
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            placeholder="Ex.: Sábado obra Araufer / Adiantamento"
            className="rounded-xl border border-gray-300 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-semibold">Valor (R$)</span>
          <input
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            inputMode="decimal"
            placeholder="Use - para descontar"
            className="w-40 rounded-xl border border-gray-300 px-3 py-2"
          />
        </label>
        <button
          onClick={adicionar}
          disabled={pending}
          className="rounded-xl bg-hard-green px-5 py-2 font-bold text-white disabled:opacity-50"
        >
          Lançar
        </button>
      </div>

      {erro && (
        <p className="rounded-xl bg-alert-red-bg p-3 font-semibold text-alert-red">
          {erro}
        </p>
      )}

      {acertos.length === 0 ? (
        <p className="text-gray-500">Nenhum acerto lançado neste mês.</p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
          {acertos.map((a) => (
            <div
              key={a.id}
              className="flex items-center justify-between border-b border-gray-100 px-4 py-3 last:border-b-0"
            >
              <span>{a.descricao}</span>
              <div className="flex items-center gap-4">
                <span
                  className={`font-bold ${
                    Number(a.valor) < 0 ? "text-alert-red" : "text-hard-green-dark"
                  }`}
                >
                  {formatarReais(Number(a.valor))}
                </span>
                <button
                  onClick={() => apagar(a.id)}
                  className="text-sm text-gray-400 underline hover:text-alert-red"
                >
                  apagar
                </button>
              </div>
            </div>
          ))}
          <div className="flex items-center justify-between bg-gray-50 px-4 py-3 font-bold">
            <span>Total de acertos</span>
            <span className={total < 0 ? "text-alert-red" : "text-hard-green-dark"}>
              {formatarReais(total)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
