"use client";

import { useState } from "react";
import Link from "next/link";
import { formatarReais, formatarDuracao } from "@/lib/dinheiro";
import { formatarData, formatarHora } from "@/lib/datas";
import { TIPO_LABEL } from "@/lib/types";
import type { LinhaFechamento } from "@/lib/fechamento";

/** Dia da semana curto ("sáb.", "seg.") avaliado no fuso de São Paulo. */
function diaSemanaCurto(dia: string): string {
  return new Date(`${dia}T12:00:00-03:00`)
    .toLocaleDateString("pt-BR", { weekday: "short" })
    .replace(".", "");
}

/** Nome de aba válido no Excel (≤31 chars, sem caracteres proibidos, único). */
function nomeAba(nome: string, usados: Set<string>): string {
  let base = nome.replace(/[\\/?*[\]:]/g, " ").trim().slice(0, 28) || "Colab";
  let nomeFinal = base;
  let i = 2;
  while (usados.has(nomeFinal.toLowerCase())) {
    nomeFinal = `${base.slice(0, 25)} ${i++}`;
  }
  usados.add(nomeFinal.toLowerCase());
  return nomeFinal;
}

function situacao(l: LinhaFechamento): string {
  if (l.temProblema) return "REVISAR — erro de batida";
  if (l.temBaixaConfianca) return "Conferir confiança do rosto";
  return "OK";
}

export default function FechamentoTabela({
  mes,
  rotulo,
  linhas,
}: {
  mes: string;
  rotulo: string;
  linhas: LinhaFechamento[];
}) {
  const [exportando, setExportando] = useState(false);

  const totalGeral = linhas.reduce((s, l) => s + (l.total ?? 0), 0);
  const comProblema = linhas.filter((l) => l.temProblema);

  async function exportar() {
    setExportando(true);
    try {
      const XLSX = await import("xlsx");
      const wb = XLSX.utils.book_new();

      // ---------- Aba 1: Resumo (todos os colaboradores) ----------
      const resumoAoa: (string | number)[][] = [
        ["FECHAMENTO DE PRESENÇA — HARD CRANES"],
        [`Mês de referência: ${rotulo}`],
        [`Gerado em: ${new Date().toLocaleString("pt-BR")}`],
        [],
        [
          "Colaborador",
          "Situação",
          "Horas",
          "Horas (decimal)",
          "Valor/hora (R$)",
          "Subtotal (R$)",
          "Acertos (R$)",
          "Total a pagar (R$)",
        ],
        ...linhas.map((l) => [
          l.nome,
          situacao(l),
          formatarDuracao(l.minutos),
          l.horasDecimais,
          l.valorHora ?? "",
          l.subtotal ?? "",
          l.acertos,
          l.total ?? "",
        ]),
        [],
        ["", "", "", "", "", "", "TOTAL GERAL", totalGeral],
      ];
      const wsResumo = XLSX.utils.aoa_to_sheet(resumoAoa);
      wsResumo["!cols"] = [
        { wch: 26 },
        { wch: 28 },
        { wch: 10 },
        { wch: 14 },
        { wch: 14 },
        { wch: 13 },
        { wch: 12 },
        { wch: 16 },
      ];
      XLSX.utils.book_append_sheet(wb, wsResumo, "Resumo");

      // ---------- Aba: Localizações (uma linha por batida, com link do mapa) ----------
      const locAoa: (string | number)[][] = [
        ["LOCALIZAÇÕES DAS BATIDAS — HARD CRANES"],
        [`Mês de referência: ${rotulo}`],
        [],
        ["Colaborador", "Data", "Hora", "Tipo", "Precisão (m)", "Link do mapa"],
      ];
      const urls: string[] = [];
      for (const l of linhas) {
        for (const d of l.dias) {
          for (const b of d.batidas) {
            if (b.latitude != null && b.longitude != null) {
              const url = `https://www.google.com/maps?q=${b.latitude},${b.longitude}`;
              locAoa.push([
                l.nome,
                formatarData(d.dia),
                formatarHora(b.data_hora),
                TIPO_LABEL[b.tipo],
                b.precisao_m != null ? Math.round(b.precisao_m) : "",
                url,
              ]);
              urls.push(url);
            }
          }
        }
      }
      if (urls.length === 0) {
        locAoa.push(["Nenhuma batida com localização neste mês."]);
      }
      const wsLoc = XLSX.utils.aoa_to_sheet(locAoa);
      // Torna a coluna do link clicável.
      urls.forEach((u, i) => {
        const ref = XLSX.utils.encode_cell({ c: 5, r: 4 + i });
        if (wsLoc[ref]) wsLoc[ref].l = { Target: u, Tooltip: "Abrir no Google Maps" };
      });
      wsLoc["!cols"] = [
        { wch: 24 },
        { wch: 12 },
        { wch: 8 },
        { wch: 10 },
        { wch: 12 },
        { wch: 46 },
      ];
      XLSX.utils.book_append_sheet(wb, wsLoc, "Localizações");

      // ---------- Uma aba por colaborador (cartão de presença) ----------
      const usados = new Set<string>();
      for (const l of linhas) {
        // Quantas colunas de Entrada/Saída este colaborador precisa no mês.
        const maxBatidas = Math.max(
          2,
          ...l.dias.map((d) => d.batidas.length)
        );
        const numPares = Math.ceil(maxBatidas / 2);

        // Cabeçalho: Dia | Entrada 1 | Saída 1 | ... | Horas | Situação
        const cab: string[] = ["Dia"];
        for (let i = 1; i <= numPares; i++) {
          cab.push(`Entrada ${i}`, `Saída ${i}`);
        }
        cab.push("Horas", "Situação");

        const tarifaFDS = l.valorHoraFimSemana ?? l.valorHora;
        const aoa: (string | number)[][] = [
          ["CARTÃO DE PRESENÇA — FECHAMENTO"],
          [`Colaborador: ${l.nome}`],
          [`Mês: ${rotulo}`],
          [`Valor/hora (R$): ${l.valorHora ?? "—"}`],
          [`Valor/hora fim de semana/feriado (R$): ${tarifaFDS ?? "—"}`],
          [],
          cab,
        ];

        for (const d of l.dias) {
          const linha: (string | number)[] = [
            `${formatarData(d.dia)} (${diaSemanaCurto(d.dia)})`,
          ];
          // Coloca cada batida (em ordem) na sua coluna Entrada/Saída.
          for (let i = 0; i < numPares * 2; i++) {
            const b = d.batidas[i];
            linha.push(b ? formatarHora(b.data_hora) : "");
          }
          const sit = d.problemas.length
            ? "REVISAR: " + d.problemas.join(" | ")
            : d.baixaConfianca
            ? "Conferir confiança do rosto"
            : d.feriado
            ? `OK (feriado: ${d.feriado})`
            : d.fimDeSemana
            ? "OK (fim de semana)"
            : "OK";
          linha.push(formatarDuracao(d.minutos), sit);
          aoa.push(linha);
        }

        // Rodapé com o resumo financeiro (separando semana × fim de semana).
        aoa.push([]);
        aoa.push(["RESUMO DO MÊS"]);
        aoa.push([
          "Horas em dias de semana",
          `${l.horasSemana} h`,
          l.valorHora != null ? `x R$ ${l.valorHora}` : "",
          l.subtotalSemana != null ? `= R$ ${l.subtotalSemana}` : "",
        ]);
        aoa.push([
          "Horas em fim de semana/feriado",
          `${l.horasFimSemana} h`,
          tarifaFDS != null ? `x R$ ${tarifaFDS}` : "",
          l.subtotalFimSemana != null ? `= R$ ${l.subtotalFimSemana}` : "",
        ]);
        aoa.push(["Subtotal (R$)", l.subtotal ?? ""]);

        if (l.acertosLista.length > 0) {
          aoa.push([]);
          aoa.push(["Acertos do mês:"]);
          for (const a of l.acertosLista) {
            aoa.push([a.descricao, a.valor]);
          }
        }
        aoa.push(["Total de acertos (R$)", l.acertos]);
        aoa.push(["TOTAL A PAGAR (R$)", l.total ?? ""]);

        const ws = XLSX.utils.aoa_to_sheet(aoa);
        const cols = [{ wch: 18 }];
        for (let i = 0; i < numPares * 2; i++) cols.push({ wch: 11 });
        cols.push({ wch: 11 }, { wch: 40 });
        ws["!cols"] = cols;
        XLSX.utils.book_append_sheet(wb, ws, nomeAba(l.nome, usados));
      }

      XLSX.writeFile(wb, `fechamento-presenca-${mes}.xlsx`);
    } finally {
      setExportando(false);
    }
  }

  if (linhas.length === 0) {
    return <p className="text-gray-500">Nenhum dado para este mês.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      {comProblema.length > 0 && (
        <div className="rounded-2xl border border-alert-red bg-alert-red-bg p-4">
          <p className="font-bold text-alert-red">
            {comProblema.length} colaborador(es) com erro de batida — resolva em
            Registros antes de fechar:
          </p>
          <ul className="mt-2 list-inside list-disc text-sm text-alert-red">
            {comProblema.map((l) => (
              <li key={l.id}>
                <Link
                  href={`/admin/registros?colaborador=${l.id}&mes=${mes}`}
                  className="underline"
                >
                  {l.nome}
                </Link>{" "}
                — {l.problemas[0]}
                {l.problemas.length > 1 && ` (+${l.problemas.length - 1})`}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="text-gray-600">
          Total geral a pagar:{" "}
          <strong className="text-hard-coal">{formatarReais(totalGeral)}</strong>
        </p>
        <button
          onClick={exportar}
          disabled={exportando}
          className="rounded-xl bg-hard-green px-5 py-2 font-bold text-white disabled:opacity-50"
        >
          {exportando ? "Gerando…" : "Exportar planilha (.xlsx)"}
        </button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white">
        <table className="w-full min-w-[46rem] text-sm">
          <thead className="bg-hard-coal text-left text-white">
            <tr>
              <th className="px-3 py-2">Colaborador</th>
              <th className="px-3 py-2">Situação</th>
              <th className="px-3 py-2 text-right">Horas</th>
              <th className="px-3 py-2 text-right">Valor/hora</th>
              <th className="px-3 py-2 text-right">Subtotal</th>
              <th className="px-3 py-2 text-right">Acertos</th>
              <th className="px-3 py-2 text-right">Total a pagar</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((l) => (
              <tr
                key={l.id}
                className={`border-t border-gray-100 ${
                  l.temProblema
                    ? "bg-alert-red-bg"
                    : l.temBaixaConfianca
                    ? "bg-alert-amber-bg"
                    : ""
                }`}
              >
                <td className="px-3 py-2 font-semibold">
                  {l.nome}
                  {!l.ativo && (
                    <span className="ml-1 text-xs text-gray-400">(inativo)</span>
                  )}
                </td>
                <td className="px-3 py-2">
                  {l.temProblema ? (
                    <span className="font-bold text-alert-red">
                      {situacao(l)}
                    </span>
                  ) : l.temBaixaConfianca ? (
                    <span className="text-alert-amber">{situacao(l)}</span>
                  ) : (
                    <span className="text-hard-green-dark">OK</span>
                  )}
                </td>
                <td className="px-3 py-2 text-right">
                  {formatarDuracao(l.minutos)}
                  {l.horasFimSemana > 0 && (
                    <div className="text-xs text-gray-400">
                      FDS: {l.horasFimSemana.toFixed(2)}h
                    </div>
                  )}
                </td>
                <td className="px-3 py-2 text-right">
                  {l.valorHora != null ? formatarReais(l.valorHora) : "—"}
                  {l.valorHoraFimSemana != null && (
                    <div className="text-xs text-gray-400">
                      FDS: {formatarReais(l.valorHoraFimSemana)}
                    </div>
                  )}
                </td>
                <td className="px-3 py-2 text-right">
                  {l.subtotal != null ? formatarReais(l.subtotal) : "—"}
                </td>
                <td
                  className={`px-3 py-2 text-right ${
                    l.acertos < 0 ? "text-alert-red" : ""
                  }`}
                >
                  {formatarReais(l.acertos)}
                </td>
                <td className="px-3 py-2 text-right font-bold">
                  {l.total != null ? (
                    formatarReais(l.total)
                  ) : (
                    <span className="text-xs font-normal text-alert-amber">
                      sem valor/hora
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-hard-coal bg-gray-50 font-bold">
              <td className="px-3 py-2" colSpan={6}>
                TOTAL GERAL
              </td>
              <td className="px-3 py-2 text-right">{formatarReais(totalGeral)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
