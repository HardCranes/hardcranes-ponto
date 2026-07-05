import bcrypt from "bcryptjs";

/**
 * PIN de 4 dígitos — SEMPRE guardado com hash, nunca em texto puro.
 * Usado somente no servidor (rotas /api). O PIN nunca é sugerido
 * automaticamente; cada colaborador define o seu no cadastro.
 */

export function pinValido(pin: string): boolean {
  return /^\d{4}$/.test(pin);
}

export async function gerarHashPin(pin: string): Promise<string> {
  return bcrypt.hash(pin, 10);
}

export async function conferirPin(pin: string, hash: string): Promise<boolean> {
  return bcrypt.compare(pin, hash);
}
