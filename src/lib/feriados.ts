/**
 * Calendário de feriados (para aplicar a tarifa diferenciada quando alguém
 * TRABALHA num feriado). Reconhece pela data, sem ninguém precisar marcar.
 *
 * Cobre:
 *  - Feriados NACIONAIS fixos.
 *  - Feriados NACIONAIS móveis (calculados a partir da Páscoa): Sexta-feira
 *    Santa e Corpus Christi. (Carnaval NÃO conta como feriado aqui — é ponto
 *    facultativo e a Hard não paga adicional nele.)
 *  - Feriado MUNICIPAL de Joinville: 9 de março (aniversário da cidade).
 *
 * Para ajustar a lista (ex.: incluir outro feriado local), edite as constantes
 * FERIADOS_FIXOS e MOVEIS abaixo.
 */

// Fixos: "MM-DD" -> nome
const FERIADOS_FIXOS: Record<string, string> = {
  "01-01": "Confraternização Universal",
  "03-09": "Aniversário de Joinville",
  "04-21": "Tiradentes",
  "05-01": "Dia do Trabalho",
  "09-07": "Independência",
  "10-12": "Nossa Senhora Aparecida",
  "11-02": "Finados",
  "11-15": "Proclamação da República",
  "11-20": "Consciência Negra",
  "12-25": "Natal",
};

/** Domingo de Páscoa (algoritmo de Butcher), como Date em UTC. */
function domingoDePascoa(ano: number): Date {
  const a = ano % 19;
  const b = Math.floor(ano / 100);
  const c = ano % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(ano, mes - 1, dia));
}

function somarDias(base: Date, dias: number): string {
  const d = new Date(base.getTime() + dias * 86400000);
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${d.getUTCFullYear()}-${mm}-${dd}`;
}

// Cache por ano: "YYYY-MM-DD" -> nome (fixos + móveis do ano).
const cachePorAno = new Map<number, Record<string, string>>();

function feriadosDoAno(ano: number): Record<string, string> {
  const emCache = cachePorAno.get(ano);
  if (emCache) return emCache;

  const mapa: Record<string, string> = {};
  for (const [md, nome] of Object.entries(FERIADOS_FIXOS)) {
    mapa[`${ano}-${md}`] = nome;
  }

  const pascoa = domingoDePascoa(ano);
  mapa[somarDias(pascoa, -2)] = "Sexta-feira Santa";
  mapa[somarDias(pascoa, 60)] = "Corpus Christi";

  cachePorAno.set(ano, mapa);
  return mapa;
}

/** Nome do feriado naquele dia ("YYYY-MM-DD"), ou null se não for feriado. */
export function nomeFeriado(dia: string): string | null {
  const ano = Number(dia.slice(0, 4));
  if (!ano) return null;
  return feriadosDoAno(ano)[dia] ?? null;
}

export function ehFeriado(dia: string): boolean {
  return nomeFeriado(dia) !== null;
}
