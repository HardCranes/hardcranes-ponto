"use server";

import { revalidatePath } from "next/cache";
import { createClient, createAdminClient } from "@/lib/supabase/server";

async function exigirLogin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autorizado.");
}

export type Resultado = { ok: boolean; erro?: string };

export async function adicionarAcerto(dados: {
  colaborador_id: string;
  mes_referencia: string;
  descricao: string;
  valor: number;
}): Promise<Resultado> {
  try {
    await exigirLogin();
    if (!dados.descricao.trim())
      return { ok: false, erro: "Informe a descrição." };
    if (!Number.isFinite(dados.valor))
      return { ok: false, erro: "Valor inválido." };
    const admin = createAdminClient();
    const { error } = await admin.from("ponto_acertos").insert({
      colaborador_id: dados.colaborador_id,
      mes_referencia: dados.mes_referencia,
      descricao: dados.descricao.trim(),
      valor: dados.valor,
    });
    if (error) return { ok: false, erro: error.message };
    revalidatePath("/admin/acertos");
    return { ok: true };
  } catch (e: any) {
    return { ok: false, erro: e?.message ?? "Erro." };
  }
}

export async function apagarAcerto(id: string): Promise<Resultado> {
  try {
    await exigirLogin();
    const admin = createAdminClient();
    const { error } = await admin.from("ponto_acertos").delete().eq("id", id);
    if (error) return { ok: false, erro: error.message };
    revalidatePath("/admin/acertos");
    return { ok: true };
  } catch (e: any) {
    return { ok: false, erro: e?.message ?? "Erro." };
  }
}
