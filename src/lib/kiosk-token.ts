"use client";

/**
 * Guarda o código do dispositivo e o nome do celular da parede no navegador
 * (localStorage). É enviado no header de toda chamada do quiosque ao servidor.
 */

const KEY_TOKEN = "hc_kiosk_token";
const KEY_NOME = "hc_kiosk_nome";

export function lerToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(KEY_TOKEN);
}

export function lerNomeDispositivo(): string {
  if (typeof window === "undefined") return "quiosque";
  return window.localStorage.getItem(KEY_NOME) || "quiosque";
}

export function salvarConfig(token: string, nome: string) {
  window.localStorage.setItem(KEY_TOKEN, token);
  window.localStorage.setItem(KEY_NOME, nome || "quiosque");
}

export function limparConfig() {
  window.localStorage.removeItem(KEY_TOKEN);
  window.localStorage.removeItem(KEY_NOME);
}

export const KIOSK_TOKEN_HEADER = "x-kiosk-token";
