"use server";

import { revalidatePath } from "next/cache";
import { createClient, createAdminClient } from "@/lib/supabase/server";

/**
 * Gestão de ADMINISTRADORES (Supabase Auth) — nada a ver com a tabela de
 * colaboradores. Usa a Admin API (service_role), que só existe no servidor;
 * a chave nunca vai ao navegador. Toda ação exige um admin já autenticado.
 */

async function exigirLogin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autorizado.");
  return user;
}

export type Resultado = { ok: boolean; erro?: string };

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export async function criarAdministrador(dados: {
  email: string;
  senha: string;
}): Promise<Resultado> {
  try {
    await exigirLogin();
    const email = dados.email.trim().toLowerCase();
    if (!EMAIL_RE.test(email)) return { ok: false, erro: "E-mail inválido." };
    if (!dados.senha || dados.senha.length < 6)
      return { ok: false, erro: "A senha precisa ter ao menos 6 caracteres." };

    const admin = createAdminClient();
    const { error } = await admin.auth.admin.createUser({
      email,
      password: dados.senha,
      email_confirm: true, // já pode entrar, sem confirmar e-mail
    });
    if (error) {
      const dup = /already|exists|registered/i.test(error.message);
      return {
        ok: false,
        erro: dup
          ? "Já existe um administrador com esse e-mail."
          : error.message,
      };
    }
    revalidatePath("/admin/administradores");
    return { ok: true };
  } catch (e: any) {
    return { ok: false, erro: e?.message ?? "Erro inesperado." };
  }
}

export async function removerAdministrador(id: string): Promise<Resultado> {
  try {
    const atual = await exigirLogin();
    if (atual.id === id)
      return {
        ok: false,
        erro: "Você não pode remover o seu próprio acesso.",
      };
    const admin = createAdminClient();
    const { error } = await admin.auth.admin.deleteUser(id);
    if (error) return { ok: false, erro: error.message };
    revalidatePath("/admin/administradores");
    return { ok: true };
  } catch (e: any) {
    return { ok: false, erro: e?.message ?? "Erro inesperado." };
  }
}
