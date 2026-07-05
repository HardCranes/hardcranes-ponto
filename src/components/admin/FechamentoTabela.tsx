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
      const ExcelJSmod: any = await import("exceljs");
      const ExcelJS = ExcelJSmod.default ?? ExcelJSmod;

      // Paleta Hard Cranes (ARGB).
      const VERDE = "FF2D9D4C";
      const VERDE_ESC = "FF25823E";
      const VERDE_CLARO = "FFE7F5EC";
      const CHUMBO = "FF151516";
      const BRANCO = "FFFFFFFF";
      const CINZA = "FFF3F4F6";
      const BORDA = "FFD1D5DB";
      const VERM_BG = "FFFEE2E2";
      const VERM = "FFDC2626";
      const AMBAR_BG = "FFFEF3C7";
      const AZUL = "FF1D4ED8";
      const MOEDA = '"R$" #,##0.00';

      const linha = { style: "thin", color: { argb: BORDA } } as const;
      const bordas = { top: linha, left: linha, bottom: linha, right: linha };
      const fill = (argb: string) => ({
        type: "pattern",
        pattern: "solid",
        fgColor: { argb },
      });

      const wb = new ExcelJS.Workbook();
      wb.creator = "Hard Cranes";
      wb.created = new Date();

      const banner = (ws: any, texto: string, ncols: number) => {
        ws.mergeCells(1, 1, 1, ncols);
        const c = ws.getCell(1, 1);
        c.value = texto;
        c.font = { bold: true, size: 14, color: { argb: VERDE } };
        c.fill = fill(CHUMBO);
        c.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
        ws.getRow(1).height = 28;
      };
      const cabecalho = (ws: any, rowIdx: number, titulos: string[]) => {
        const row = ws.getRow(rowIdx);
        titulos.forEach((t, i) => {
          const c = row.getCell(i + 1);
          c.value = t;
          c.font = { bold: true, color: { argb: BRANCO } };
          c.fill = fill(VERDE);
          c.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
          c.border = bordas;
        });
        row.height = 24;
      };
      const moeda = (cell: any, val: number | null) => {
        if (val != null) {
          cell.value = val;
          cell.numFmt = MOEDA;
        }
      };

      // ===================== Aba 1: Resumo =====================
      const wsR = wb.addWorksheet("Resumo");
      banner(wsR, "FECHAMENTO DE PRESENÇA — HARD CRANES", 8);
      wsR.getCell(2, 1).value = `Mês de referência: ${rotulo}`;
      wsR.getCell(2, 1).font = { bold: true, color: { argb: CHUMBO } };
      wsR.getCell(3, 1).value = `Gerado em ${new Date().toLocaleString("pt-BR")}`;
      wsR.getCell(3, 1).font = { italic: true, size: 9, color: { argb: "FF6B7280" } };

      cabecalho(wsR, 5, [
        "Colaborador",
        "Situação",
        "Horas",
        "Horas (dec.)",
        "Valor/hora",
        "Subtotal",
        "Acertos",
        "Total a pagar",
      ]);

      let r = 6;
      for (const l of linhas) {
        const row = wsR.getRow(r);
        row.getCell(1).value = l.nome + (l.ativo ? "" : " (inativo)");
        row.getCell(2).value = situacao(l);
        row.getCell(3).value = formatarDuracao(l.minutos);
        row.getCell(4).value = l.horasDecimais;
        row.getCell(4).numFmt = "0.00";
        moeda(row.getCell(5), l.valorHora);
        moeda(row.getCell(6), l.subtotal);
        moeda(row.getCell(7), l.acertos);
        moeda(row.getCell(8), l.total);
        const bg = l.temProblema
          ? VERM_BG
          : l.temBaixaConfianca
          ? AMBAR_BG
          : r % 2 === 0
          ? CINZA
          : BRANCO;
        for (let ci = 1; ci <= 8; ci++) {
          const c = row.getCell(ci);
          c.border = bordas;
          c.fill = fill(bg);
        }
        if (l.temProblema) row.getCell(2).font = { bold: true, color: { argb: VERM } };
        r++;
      }

      // Linha de total geral.
      const rt = r + 1;
      const rowT = wsR.getRow(rt);
      rowT.getCell(7).value = "TOTAL GERAL";
      rowT.getCell(8).value = totalGeral;
      rowT.getCell(8).numFmt = MOEDA;
      for (let ci = 1; ci <= 8; ci++) {
        rowT.getCell(ci).fill = fill(VERDE_ESC);
        rowT.getCell(ci).border = bordas;
        rowT.getCell(ci).font = { bold: true, color: { argb: BRANCO } };
      }
      rowT.height = 22;

      [26, 26, 10, 12, 13, 13, 12, 16].forEach((w, i) => {
        wsR.getColumn(i + 1).width = w;
      });
      wsR.views = [{ state: "frozen", ySplit: 5 }];

      // ===================== Aba 2: Localizações =====================
      const wsL = wb.addWorksheet("Localizações");
      banner(wsL, "LOCALIZAÇÕES DAS BATIDAS — HARD CRANES", 6);
      wsL.getCell(2, 1).value = `Mês de referência: ${rotulo}`;
      wsL.getCell(2, 1).font = { bold: true, color: { argb: CHUMBO } };
      cabecalho(wsL, 4, [
        "Colaborador",
        "Data",
        "Hora",
        "Tipo",
        "Precisão (m)",
        "Local (mapa)",
      ]);
      let rl = 5;
      for (const l of linhas) {
        for (const d of l.dias) {
          for (const b of d.batidas) {
            if (b.latitude != null && b.longitude != null) {
              const url = `https://www.google.com/maps?q=${b.latitude},${b.longitude}`;
              const row = wsL.getRow(rl);
              row.getCell(1).value = l.nome;
              row.getCell(2).value = formatarData(d.dia);
              row.getCell(3).value = formatarHora(b.data_hora);
              row.getCell(4).value = TIPO_LABEL[b.tipo];
              row.getCell(5).value =
                b.precisao_m != null ? Math.round(b.precisao_m) : "";
              const cMapa = row.getCell(6);
              cMapa.value = { text: "abrir no mapa", hyperlink: url };
              cMapa.font = { color: { argb: AZUL }, underline: true };
              for (let ci = 1; ci <= 6; ci++) {
                row.getCell(ci).border = bordas;
                if (rl % 2 === 0) row.getCell(ci).fill = fill(CINZA);
              }
              rl++;
            }
          }
        }
      }
      if (rl === 5) {
        wsL.getCell(5, 1).value = "Nenhuma batida com localização neste mês.";
      }
      [24, 12, 8, 10, 12, 22].forEach((w, i) => {
        wsL.getColumn(i + 1).width = w;
      });

      // ===================== Uma aba por colaborador =====================
      const usados = new Set<string>();
      for (const l of linhas) {
        const maxBatidas = Math.max(2, ...l.dias.map((d) => d.batidas.length));
        const numPares = Math.ceil(maxBatidas / 2);
        const ncols = 1 + numPares * 2 + 2; // Dia + pares + Horas + Situação
        const tarifaFDS = l.valorHoraFimSemana ?? l.valorHora;

        const ws = wb.addWorksheet(nomeAba(l.nome, usados));
        banner(ws, "CARTÃO DE PRESENÇA — HARD CRANES", ncols);
        ws.getCell(2, 1).value = `Colaborador: ${l.nome}`;
        ws.getCell(2, 1).font = { bold: true, size: 12, color: { argb: CHUMBO } };
        ws.getCell(3, 1).value = `Mês: ${rotulo}`;
        ws.getCell(4, 1).value = `Valor/hora: ${
          l.valorHora != null ? "R$ " + l.valorHora : "—"
        }   |   Fim de semana/feriado: ${
          tarifaFDS != null ? "R$ " + tarifaFDS : "—"
        }`;
        ws.getCell(4, 1).font = { color: { argb: "FF374151" } };

        // Cabeçalho da tabela (linha 6).
        const cab = ["Dia"];
        for (let i = 1; i <= numPares; i++) cab.push(`Entrada ${i}`, `Saída ${i}`);
        cab.push("Horas", "Situação");
        cabecalho(ws, 6, cab);

        let rr = 7;
        for (const d of l.dias) {
          const row = ws.getRow(rr);
          row.getCell(1).value = `${formatarData(d.dia)} (${diaSemanaCurto(
            d.dia
          )})`;
          for (let i = 0; i < numPares * 2; i++) {
            const b = d.batidas[i];
            row.getCell(2 + i).value = b ? formatarHora(b.data_hora) : "";
          }
          const colHoras = 2 + numPares * 2;
          const colSit = colHoras + 1;
          row.getCell(colHoras).value = formatarDuracao(d.minutos);
          row.getCell(colSit).value = d.problemas.length
            ? "REVISAR: " + d.problemas.join(" | ")
            : d.baixaConfianca
            ? "Conferir confiança do rosto"
            : d.feriado
            ? `OK (feriado: ${d.feriado})`
            : d.fimDeSemana
            ? "OK (fim de semana)"
            : "OK";
          const bg = d.problemas.length
            ? VERM_BG
            : d.feriado || d.fimDeSemana
            ? AMBAR_BG
            : rr % 2 === 0
            ? CINZA
            : BRANCO;
          for (let ci = 1; ci <= ncols; ci++) {
            const c = row.getCell(ci);
            c.border = bordas;
            c.fill = fill(bg);
            c.alignment = {
              horizontal: ci === 1 || ci === colSit ? "left" : "center",
            };
          }
          if (d.problemas.length)
            row.getCell(colSit).font = { bold: true, color: { argb: VERM } };
          rr++;
        }

        // ---- Rodapé financeiro ----
        rr += 1;
        ws.mergeCells(rr, 1, rr, 4);
        const cResumo = ws.getCell(rr, 1);
        cResumo.value = "RESUMO DO MÊS";
        cResumo.font = { bold: true, color: { argb: BRANCO } };
        cResumo.fill = fill(CHUMBO);
        rr++;

        const linhaResumo = (
          rotuloTxt: string,
          horas: number,
          tarifa: number | null,
          subtotal: number | null
        ) => {
          ws.getCell(rr, 1).value = rotuloTxt;
          ws.getCell(rr, 2).value = horas;
          ws.getCell(rr, 2).numFmt = '0.00 "h"';
          if (tarifa != null) {
            ws.getCell(rr, 3).value = tarifa;
            ws.getCell(rr, 3).numFmt = MOEDA;
          }
          moeda(ws.getCell(rr, 4), subtotal);
          rr++;
        };
        linhaResumo(
          "Horas em dias de semana",
          l.horasSemana,
          l.valorHora,
          l.subtotalSemana
        );
        linhaResumo(
          "Horas em fim de semana/feriado",
          l.horasFimSemana,
          tarifaFDS,
          l.subtotalFimSemana
        );

        ws.getCell(rr, 1).value = "Subtotal";
        ws.getCell(rr, 1).font = { bold: true };
        moeda(ws.getCell(rr, 4), l.subtotal);
        ws.getCell(rr, 4).font = { bold: true };
        rr++;

        if (l.acertosLista.length > 0) {
          ws.getCell(rr, 1).value = "Acertos do mês:";
          ws.getCell(rr, 1).font = { bold: true };
          rr++;
          for (const a of l.acertosLista) {
            ws.getCell(rr, 1).value = "  " + a.descricao;
            moeda(ws.getCell(rr, 4), a.valor);
            rr++;
          }
        }
        ws.getCell(rr, 1).value = "Total de acertos";
        moeda(ws.getCell(rr, 4), l.acertos);
        rr++;

        // TOTAL A PAGAR destacado.
        ws.mergeCells(rr, 1, rr, 3);
        const cTot = ws.getCell(rr, 1);
        cTot.value = "TOTAL A PAGAR";
        cTot.font = { bold: true, size: 12, color: { argb: BRANCO } };
        cTot.fill = fill(VERDE);
        cTot.alignment = { horizontal: "right", indent: 1 };
        const cTotVal = ws.getCell(rr, 4);
        if (l.total != null) {
          cTotVal.value = l.total;
          cTotVal.numFmt = MOEDA;
        }
        cTotVal.font = { bold: true, size: 12, color: { argb: BRANCO } };
        cTotVal.fill = fill(VERDE);
        ws.getRow(rr).height = 22;

        // Larguras.
        ws.getColumn(1).width = 18;
        for (let i = 0; i < numPares * 2; i++) ws.getColumn(2 + i).width = 11;
        ws.getColumn(2 + numPares * 2).width = 11;
        ws.getColumn(3 + numPares * 2).width = 40;
        ws.views = [{ state: "frozen", ySplit: 6 }];
        void VERDE_CLARO; // paleta reservada
      }

      // ---- Download ----
      const buf = await wb.xlsx.writeBuffer();
      const blob = new Blob([buf], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `fechamento-presenca-${mes}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
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
