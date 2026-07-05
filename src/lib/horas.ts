import { diaLocal, formatarHora } from "@/lib/datas";
import { nomeFeriado } from "@/lib/feriados";
import type { Registro } from "@/lib/types";

/**
 * Cálculo de horas trabalhadas a partir das batidas, com detecção OBRIGATÓRIA
 * de erro (batida ímpar). Como o tipo (entrada/saída) é escolhido na mão pelo
 * colaborador, erros de clique acontecem — o cálculo NUNCA inventa horário nem
 * conta horas de um dia inconsistente; ele sinaliza o problema para o admin.
 */

/** Limiar de AVISO de baixa confiança do reconhecimento facial (distância). */
export const LIMIAR_AVISO_CONFIANCA = 0.42;

export type Par = {
  entrada: Registro;
  saida: Registro;
  minutos: number;
};

export type DiaCalculado = {
  dia: string; // "YYYY-MM-DD" no fuso SP
  batidas: Registro[];
  pares: Par[];
  minutos: number; // soma dos pares válidos
  problemas: string[]; // mensagens de erro (destaque VERMELHO)
  baixaConfianca: boolean; // alguma batida facial borderline (destaque AMARELO)
  fimDeSemana: boolean; // sábado ou domingo
  feriado: string | null; // nome do feriado, se for feriado (senão null)
  diferenciado: boolean; // fim de semana OU feriado -> tarifa de FDS/feriado
};

export type ResumoColaborador = {
  dias: DiaCalculado[];
  minutos: number; // total do período
  minutosSemana: number; // horas em dias de semana (seg–sex)
  minutosFimSemana: number; // horas em sábado/domingo
  temProblema: boolean; // algum dia com batida ímpar
  temBaixaConfianca: boolean;
};

/** Sábado (6) ou domingo (0), avaliado no fuso de São Paulo. */
export function ehFimDeSemana(dia: string): boolean {
  const d = new Date(`${dia}T12:00:00-03:00`).getDay();
  return d === 0 || d === 6;
}

function minutosEntre(inicioIso: string, fimIso: string): number {
  const ms = new Date(fimIso).getTime() - new Date(inicioIso).getTime();
  return Math.max(0, Math.round(ms / 60000));
}

/** Agrupa batidas por dia local e calcula um dia de cada vez. */
export function calcularResumo(
  registros: Registro[],
  opts: { limiarAviso?: number } = {}
): ResumoColaborador {
  const limiar = opts.limiarAviso ?? LIMIAR_AVISO_CONFIANCA;

  const porDia = new Map<string, Registro[]>();
  for (const r of registros) {
    const dia = diaLocal(r.data_hora);
    const lista = porDia.get(dia) ?? [];
    lista.push(r);
    porDia.set(dia, lista);
  }

  const dias: DiaCalculado[] = [];
  for (const [dia, lista] of Array.from(porDia.entries()).sort()) {
    dias.push(calcularDia(dia, lista, limiar));
  }

  const minutos = dias.reduce((acc, d) => acc + d.minutos, 0);
  const minutosFimSemana = dias
    .filter((d) => d.diferenciado)
    .reduce((acc, d) => acc + d.minutos, 0);
  return {
    dias,
    minutos,
    minutosSemana: minutos - minutosFimSemana,
    minutosFimSemana,
    temProblema: dias.some((d) => d.problemas.length > 0),
    temBaixaConfianca: dias.some((d) => d.baixaConfianca),
  };
}

function batidaBaixaConfianca(r: Registro, limiar: number): boolean {
  return (
    r.metodo === "facial" &&
    r.match_confianca != null &&
    r.match_confianca >= limiar
  );
}

/**
 * Percorre as batidas do dia esperando alternância entrada -> saída.
 * Cada par válido soma horas; qualquer quebra da sequência vira um problema
 * com a mensagem específica (ex.: "Duas entradas seguidas às 07:58 e 13:02").
 */
export function calcularDia(
  dia: string,
  batidasDoDia: Registro[],
  limiar: number
): DiaCalculado {
  const batidas = [...batidasDoDia].sort(
    (a, b) => new Date(a.data_hora).getTime() - new Date(b.data_hora).getTime()
  );

  const pares: Par[] = [];
  const problemas: string[] = [];
  let pendenteEntrada: Registro | null = null;

  for (const b of batidas) {
    if (b.tipo === "entrada") {
      if (pendenteEntrada) {
        problemas.push(
          `Duas entradas seguidas às ${formatarHora(
            pendenteEntrada.data_hora
          )} e ${formatarHora(b.data_hora)} — falta uma saída entre elas.`
        );
      }
      pendenteEntrada = b;
    } else {
      // saída
      if (!pendenteEntrada) {
        problemas.push(
          `Saída às ${formatarHora(
            b.data_hora
          )} sem uma entrada antes — falta registrar a entrada.`
        );
      } else {
        pares.push({
          entrada: pendenteEntrada,
          saida: b,
          minutos: minutosEntre(pendenteEntrada.data_hora, b.data_hora),
        });
        pendenteEntrada = null;
      }
    }
  }

  if (pendenteEntrada) {
    problemas.push(
      `Entrada às ${formatarHora(
        pendenteEntrada.data_hora
      )} sem uma saída depois — falta registrar a saída.`
    );
  }

  const minutos = pares.reduce((acc, p) => acc + p.minutos, 0);
  const baixaConfianca = batidas.some((b) => batidaBaixaConfianca(b, limiar));

  const fimDeSemana = ehFimDeSemana(dia);
  const feriado = nomeFeriado(dia);
  return {
    dia,
    batidas,
    pares,
    minutos,
    problemas,
    baixaConfianca,
    fimDeSemana,
    feriado,
    diferenciado: fimDeSemana || feriado !== null,
  };
}
