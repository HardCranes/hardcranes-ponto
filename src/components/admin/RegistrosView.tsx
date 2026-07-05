"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { calcularResumo } from "@/lib/horas";
import { formatarData, formatarHora, isoParaSpLocalInput } from "@/lib/datas";
import { formatarDuracao } from "@/lib/dinheiro";
import { TIPO_LABEL, METODO_LABEL } from "@/lib/types";
import type { Registro, TipoBatida } from "@/lib/types";
import {
  adicionarBatidaManual,
  editarBatida,
  apagarBatida,
} from "@/app/admin/registros/actions";

export default function RegistrosView({
  colaboradorId,
  mes,
  registros,
  fotoUrls,
}: {
  colaboradorId: string;
  mes: string;
  registros: Registro[];
  fotoUrls: Record<string, string | null>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editando, setEditando] = useState<string | null>(null);
  const [adicionando, setAdicionando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const resumo = calcularResumo(registros);

  function recarregar() {
    router.refresh();
  }

  function onEditar(id: string, tipo: TipoBatida, data_hora_local: string) {
    setErro(null);
    startTransition(async () => {
      const r = await editarBatida(id, { tipo, data_hora_local });
      if (!r.ok) setErro(r.erro ?? "Falha ao editar.");
      else {
        setEditando(null);
        recarregar();
      }
    });
  }

  function onApagar(id: string) {
    if (!confirm("Apagar esta batida?")) return;
    setErro(null);
    startTransition(async () => {
      const r = await apagarBatida(id);
      if (!r.ok) setErro(r.erro ?? "Falha ao apagar.");
      else recarregar();
    });
  }

  function onAdicionar(tipo: TipoBatida, data_hora_local: string) {
    setErro(null);
    startTransition(async () => {
      const r = await adicionarBatidaManual({
        colaborador_id: colaboradorId,
        tipo,
        data_hora_local,
      });
      if (!r.ok) setErro(r.erro ?? "Falha ao adicionar.");
      else {
        setAdicionando(false);
        recarregar();
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-gray-600">
          Total do mês:{" "}
          <strong className="text-hard-coal">
            {formatarDuracao(resumo.minutos)}
          </strong>
          {resumo.temProblema && (
            <span className="ml-2 rounded bg-alert-red-bg px-2 py-0.5 text-sm text-alert-red">
              há dias com erro de batida
            </span>
          )}
        </p>
        <button
          onClick={() => setAdicionando((v) => !v)}
          className="rounded-xl border border-gray-300 px-4 py-2 font-semibold"
        >
          + Adicionar batida
        </button>
      </div>

      {erro && (
        <p className="rounded-xl bg-alert-red-bg p-3 font-semibold text-alert-red">
          {erro}
        </p>
      )}

      {adicionando && (
        <FormBatida
          titulo="Nova batida (ajuste manual)"
          mes={mes}
          disabled={pending}
          onSalvar={onAdicionar}
          onCancelar={() => setAdicionando(false)}
        />
      )}

      {resumo.dias.length === 0 && (
        <p className="text-gray-500">Nenhuma batida neste mês.</p>
      )}

      {resumo.dias.map((dia) => (
        <div
          key={dia.dia}
          className={`rounded-2xl border bg-white p-4 ${
            dia.problemas.length
              ? "border-alert-red"
              : dia.baixaConfianca
              ? "border-alert-amber"
              : "border-gray-200"
          }`}
        >
          <div className="mb-2 flex items-center justify-between">
            <h3 className="font-bold">{formatarData(dia.dia)}</h3>
            <span className="text-sm text-gray-500">
              {formatarDuracao(dia.minutos)}
            </span>
          </div>

          {dia.problemas.map((p, i) => (
            <p
              key={i}
              className="mb-2 rounded-lg bg-alert-red-bg px-3 py-2 text-sm font-semibold text-alert-red"
            >
              ⚠ {p}
            </p>
          ))}
          {dia.baixaConfianca && dia.problemas.length === 0 && (
            <p className="mb-2 rounded-lg bg-alert-amber-bg px-3 py-2 text-sm text-alert-amber">
              Alguma batida teve baixa confiança no reconhecimento facial —
              confira a foto.
            </p>
          )}

          <div className="flex flex-col gap-2">
            {dia.batidas.map((b) => (
              <div key={b.id}>
                {editando === b.id ? (
                  <FormBatida
                    titulo="Editar batida"
                    mes={mes}
                    disabled={pending}
                    inicial={{
                      tipo: b.tipo,
                      data_hora_local: isoParaSpLocalInput(b.data_hora),
                    }}
                    onSalvar={(tipo, dh) => onEditar(b.id, tipo, dh)}
                    onCancelar={() => setEditando(null)}
                  />
                ) : (
                  <BatidaLinha
                    b={b}
                    fotoUrl={fotoUrls[b.id] ?? null}
                    onEditar={() => setEditando(b.id)}
                    onApagar={() => onApagar(b.id)}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function BatidaLinha({
  b,
  fotoUrl,
  onEditar,
  onApagar,
}: {
  b: Registro;
  fotoUrl: string | null;
  onEditar: () => void;
  onApagar: () => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-gray-50 p-2">
      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-gray-200">
        {fotoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={fotoUrl} alt="Selfie" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[10px] text-gray-400">
            sem foto
          </div>
        )}
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span
            className={`rounded px-2 py-0.5 text-sm font-bold ${
              b.tipo === "entrada"
                ? "bg-hard-green-light text-hard-green-dark"
                : "bg-gray-200 text-gray-700"
            }`}
          >
            {TIPO_LABEL[b.tipo]}
          </span>
          <span className="text-lg font-semibold">{formatarHora(b.data_hora)}</span>
        </div>
        <div className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-gray-500">
          <span>
            {b.origem === "ajuste_manual"
              ? "Ajuste manual"
              : b.metodo
              ? METODO_LABEL[b.metodo]
              : "Quiosque"}
          </span>
          {b.match_confianca != null && (
            <span>confiança: {b.match_confianca.toFixed(2)}</span>
          )}
          {b.latitude != null && b.longitude != null && (
            <a
              href={`https://www.google.com/maps?q=${b.latitude},${b.longitude}`}
              target="_blank"
              rel="noreferrer"
              className="text-hard-green underline"
            >
              ver local
            </a>
          )}
        </div>
      </div>
      <div className="flex gap-1">
        <button
          onClick={onEditar}
          className="rounded-lg border border-gray-300 px-2 py-1 text-xs font-semibold"
        >
          Editar
        </button>
        <button
          onClick={onApagar}
          className="rounded-lg border border-alert-red px-2 py-1 text-xs font-semibold text-alert-red"
        >
          Apagar
        </button>
      </div>
    </div>
  );
}

function FormBatida({
  titulo,
  mes,
  inicial,
  disabled,
  onSalvar,
  onCancelar,
}: {
  titulo: string;
  mes: string;
  inicial?: { tipo: TipoBatida; data_hora_local: string };
  disabled: boolean;
  onSalvar: (tipo: TipoBatida, data_hora_local: string) => void;
  onCancelar: () => void;
}) {
  const [tipo, setTipo] = useState<TipoBatida>(inicial?.tipo ?? "entrada");
  const [dh, setDh] = useState(inicial?.data_hora_local ?? `${mes}-01T08:00`);

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-xl border border-hard-green bg-hard-green-light p-3">
      <span className="w-full text-sm font-bold text-hard-green-dark">
        {titulo}
      </span>
      <label className="flex flex-col gap-1">
        <span className="text-xs font-semibold">Tipo</span>
        <select
          value={tipo}
          onChange={(e) => setTipo(e.target.value as TipoBatida)}
          className="rounded-lg border border-gray-300 px-3 py-2"
        >
          <option value="entrada">Entrada</option>
          <option value="saida">Saída</option>
        </select>
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs font-semibold">Data e hora</span>
        <input
          type="datetime-local"
          value={dh}
          onChange={(e) => setDh(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2"
        />
      </label>
      <button
        disabled={disabled}
        onClick={() => onSalvar(tipo, dh)}
        className="rounded-lg bg-hard-green px-4 py-2 font-bold text-white disabled:opacity-50"
      >
        Salvar
      </button>
      <button
        onClick={onCancelar}
        className="rounded-lg border border-gray-300 px-4 py-2 font-semibold"
      >
        Cancelar
      </button>
    </div>
  );
}
