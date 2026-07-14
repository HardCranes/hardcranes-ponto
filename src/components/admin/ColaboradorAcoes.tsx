"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  excluirColaborador,
  definirAtivoColaborador,
} from "@/app/admin/colaboradores/actions";

/**
 * Botões de ação por colaborador na lista:
 * - Desativar/Reativar (sempre; reversível).
 * - Excluir (definitivo; só se NÃO houver histórico — a regra é validada no
 *   servidor, aqui só exibimos o resultado).
 */
export default function ColaboradorAcoes({
  id,
  nome,
  ativo,
}: {
  id: string;
  nome: string;
  ativo: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [aviso, setAviso] = useState<string | null>(null);

  function alternarAtivo() {
    setAviso(null);
    startTransition(async () => {
      const r = await definirAtivoColaborador(id, !ativo);
      if (!r.ok) setAviso(r.erro ?? "Falha ao atualizar.");
      else router.refresh();
    });
  }

  function excluir() {
    setAviso(null);
    if (!confirm(`Excluir ${nome}? Essa ação não pode ser desfeita.`)) return;
    startTransition(async () => {
      const r = await excluirColaborador(id);
      if (r.ok) {
        router.refresh();
      } else {
        // Se foi bloqueado por histórico, mostramos o aviso orientando a desativar.
        setAviso(r.erro ?? "Não foi possível excluir.");
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex gap-2">
        <button
          onClick={alternarAtivo}
          disabled={pending}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-100 disabled:opacity-50"
        >
          {ativo ? "Desativar" : "Reativar"}
        </button>
        <button
          onClick={excluir}
          disabled={pending}
          className="rounded-lg border border-alert-red px-3 py-1.5 text-sm font-semibold text-alert-red hover:bg-alert-red-bg disabled:opacity-50"
        >
          Excluir
        </button>
      </div>
      {aviso && (
        <p className="max-w-xs rounded-lg bg-alert-amber-bg p-2 text-right text-xs text-alert-amber">
          {aviso}
        </p>
      )}
    </div>
  );
}
