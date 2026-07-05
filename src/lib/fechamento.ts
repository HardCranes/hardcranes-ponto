import { calcularResumo } from "@/lib/horas";
import type { DiaCalculado } from "@/lib/horas";
import { minutosParaHorasDecimais } from "@/lib/dinheiro";
import type { Acerto, Registro } from "@/lib/types";

/** Uma linha do fechamento do mês, pronta para exibir e exportar. */
export type LinhaFechamento = {
  id: string;
  nome: string;
  ativo: boolean;
  minutos: number;
  horasDecimais: number;
  horasSemana: number; // horas decimais em dias de semana
  horasFimSemana: number; // horas decimais em sábado/domingo
  valorHora: number | null;
  valorHoraFimSemana: number | null; // tarifa de fds (null = usa valor_hora)
  subtotalSemana: number | null;
  subtotalFimSemana: number | null;
  subtotal: number | null; // subtotalSemana + subtotalFimSemana
  acertos: number;
  total: number | null; // subtotal + acertos
  temProblema: boolean;
  temBaixaConfianca: boolean;
  problemas: string[]; // mensagens de erro de batida (dia + descrição)
  dias: DiaCalculado[]; // detalhamento diário (para o cartão na planilha)
  acertosLista: { descricao: string; valor: number }[]; // acertos detalhados
};

/**
 * Monta as linhas do fechamento a partir dos dados brutos do mês.
 * Não conta horas de dias inconsistentes (batida ímpar) — apenas os sinaliza.
 */
export function montarFechamento(
  colaboradores: {
    id: string;
    nome: string;
    ativo: boolean;
    valor_hora: number | null;
    valor_hora_fim_semana: number | null;
  }[],
  registrosPorColab: Map<string, Registro[]>,
  acertosPorColab: Map<string, Acerto[]>
): LinhaFechamento[] {
  const linhas: LinhaFechamento[] = [];

  for (const c of colaboradores) {
    const regs = registrosPorColab.get(c.id) ?? [];
    const acertos = acertosPorColab.get(c.id) ?? [];
    const temDados = regs.length > 0 || acertos.length > 0;
    if (!c.ativo && !temDados) continue; // ignora inativos sem movimento

    const resumo = calcularResumo(regs);
    const horasDecimais = minutosParaHorasDecimais(resumo.minutos);
    const horasSemana = minutosParaHorasDecimais(resumo.minutosSemana);
    const horasFimSemana = minutosParaHorasDecimais(resumo.minutosFimSemana);
    const somaAcertos = acertos.reduce((s, a) => s + Number(a.valor), 0);

    // Fim de semana usa a tarifa própria; se não houver, cai na tarifa normal.
    const tarifaFimSemana = c.valor_hora_fim_semana ?? c.valor_hora;

    const subtotalSemana =
      c.valor_hora != null
        ? Math.round(horasSemana * c.valor_hora * 100) / 100
        : null;
    const subtotalFimSemana =
      tarifaFimSemana != null
        ? Math.round(horasFimSemana * tarifaFimSemana * 100) / 100
        : null;
    const subtotal =
      c.valor_hora != null
        ? Math.round(((subtotalSemana ?? 0) + (subtotalFimSemana ?? 0)) * 100) / 100
        : null;
    const total = subtotal != null ? Math.round((subtotal + somaAcertos) * 100) / 100 : null;

    const problemas: string[] = [];
    for (const dia of resumo.dias) {
      for (const p of dia.problemas) problemas.push(p);
    }

    linhas.push({
      id: c.id,
      nome: c.nome,
      ativo: c.ativo,
      minutos: resumo.minutos,
      horasDecimais,
      horasSemana,
      horasFimSemana,
      valorHora: c.valor_hora,
      valorHoraFimSemana: c.valor_hora_fim_semana,
      subtotalSemana,
      subtotalFimSemana,
      subtotal,
      acertos: somaAcertos,
      total,
      temProblema: resumo.temProblema,
      temBaixaConfianca: resumo.temBaixaConfianca,
      problemas,
      dias: resumo.dias,
      acertosLista: acertos.map((a) => ({
        descricao: a.descricao,
        valor: Number(a.valor),
      })),
    });
  }

  // Problemas primeiro, depois por nome.
  linhas.sort((a, b) => {
    if (a.temProblema !== b.temProblema) return a.temProblema ? -1 : 1;
    return a.nome.localeCompare(b.nome);
  });

  return linhas;
}
