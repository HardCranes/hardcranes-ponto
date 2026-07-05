/**
 * Validação do código do dispositivo (o "celular da parede").
 * Só requisições que enviam o código certo conseguem ler a grade ou gravar
 * batidas. Isso impede alguém registrar presença pelo celular pessoal em casa.
 *
 * O código é definido pelo dono na variável de ambiente KIOSK_DEVICE_TOKEN.
 * Para trocar: mude a variável (na Vercel) e reconfigure o celular da parede.
 */

const HEADER = "x-kiosk-token";

export function tokenEsperado(): string | null {
  return process.env.KIOSK_DEVICE_TOKEN ?? null;
}

export function tokenValido(token: string | null | undefined): boolean {
  const esperado = tokenEsperado();
  if (!esperado || !token) return false;
  return token === esperado;
}

/** Lê e valida o token do header da requisição do quiosque. */
export function requisicaoQuiosqueAutorizada(req: Request): boolean {
  return tokenValido(req.headers.get(HEADER));
}

export const KIOSK_TOKEN_HEADER = HEADER;
