/** Formatação de dinheiro e horas para exibição. */

export function formatarReais(valor: number | null | undefined): string {
  if (valor == null || Number.isNaN(valor)) return "—";
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

/** minutos -> "7h 32min". */
export function formatarDuracao(minutos: number): string {
  if (!minutos || minutos <= 0) return "0h";
  const h = Math.floor(minutos / 60);
  const min = minutos % 60;
  if (min === 0) return `${h}h`;
  return `${h}h ${String(min).padStart(2, "0")}min`;
}

/** minutos -> horas decimais (ex.: 90 -> 1.5). Base do cálculo de pagamento. */
export function minutosParaHorasDecimais(minutos: number): number {
  return Math.round((minutos / 60) * 100) / 100;
}
