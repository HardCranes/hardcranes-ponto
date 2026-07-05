/**
 * Datas SEMPRE no fuso da empresa (America/Sao_Paulo), independente de onde
 * o código roda (Vercel em UTC ou navegador). Os timestamps são gravados em
 * UTC (timestamptz + now()); a conversão para o local acontece só aqui.
 */

const TZ = "America/Sao_Paulo";

/** timestamptz -> "04/07/2026 13:57". */
export function formatarDataHora(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", {
    timeZone: TZ,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** timestamptz -> "13:57". */
export function formatarHora(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("pt-BR", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** "YYYY-MM-DD" -> "DD/MM/YYYY" sem sofrer deslocamento de fuso. */
export function formatarData(iso: string | null | undefined): string {
  if (!iso) return "—";
  const m = iso.slice(0, 10).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  return new Date(iso).toLocaleDateString("pt-BR", { timeZone: TZ });
}

/**
 * Dia local ("YYYY-MM-DD" no fuso SP) a partir de um timestamptz.
 * É a chave usada para agrupar as batidas por dia no cálculo de horas.
 */
export function diaLocal(iso: string): string {
  // en-CA gera "YYYY-MM-DD".
  return new Date(iso).toLocaleDateString("en-CA", { timeZone: TZ });
}

/** Mês local ("YYYY-MM" no fuso SP) a partir de um timestamptz. */
export function mesLocal(iso: string): string {
  return diaLocal(iso).slice(0, 7);
}

/** Mês atual "YYYY-MM" no fuso SP. */
export function mesAtual(): string {
  return mesLocal(new Date().toISOString());
}

/** Rótulo amigável do mês: "2026-07" -> "julho de 2026". */
export function rotuloMes(mes: string): string {
  const m = mes.match(/^(\d{4})-(\d{2})$/);
  if (!m) return mes;
  const data = new Date(Number(m[1]), Number(m[2]) - 1, 1);
  return data.toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
}

/**
 * Converte o valor de um <input type="datetime-local"> (interpretado como
 * horário de São Paulo, UTC-3 fixo — sem horário de verão no Brasil desde 2019)
 * em ISO UTC para gravar no banco.
 */
export function spLocalParaIso(valor: string): string {
  // valor: "YYYY-MM-DDTHH:mm"
  return new Date(`${valor}:00-03:00`).toISOString();
}

/** Inverso: timestamptz -> "YYYY-MM-DDTHH:mm" no fuso SP, para pré-preencher inputs. */
export function isoParaSpLocalInput(iso: string): string {
  const partes = new Intl.DateTimeFormat("sv-SE", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(new Date(iso));
  const get = (t: string) => partes.find((p) => p.type === t)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

/**
 * Intervalo [inicio, fim) em ISO (UTC) que cobre um mês "YYYY-MM" no fuso SP.
 * Usado para filtrar registros do mês no banco.
 */
export function intervaloDoMes(mes: string): { inicio: string; fim: string } {
  const [ano, m] = mes.split("-").map(Number);
  // meia-noite local (SP = UTC-3) => 03:00Z. Aproximação estável o ano todo.
  const inicio = new Date(Date.UTC(ano, m - 1, 1, 3, 0, 0)).toISOString();
  const fim = new Date(Date.UTC(ano, m, 1, 3, 0, 0)).toISOString();
  return { inicio, fim };
}
