"use server";

import { revalidatePath } from "next/cache";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { spLocalParaIso } from "@/lib/datas";
import type { TipoBatida } from "@/lib/types";

async function exigirLogin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autorizado.");
}

export type Resultado = { ok: boolean; erro?: string };

/** Adiciona uma batida faltante (ajuste manual, sem foto). */
export async function adicionarBatidaManual(dados: {
  colaborador_id: string;
  tipo: TipoBatida;
  data_hora_local: string; // "YYYY-MM-DDTHH:mm" no fuso SP
}): Promise<Resultado> {
  try {
    await exigirLogin();
    if (!dados.data_hora_local) return { ok: false, erro: "Informe data e hora." };
    const admin = createAdminClient();
    const { error } = await admin.from("ponto_registros").insert({
      colaborador_id: dados.colaborador_id,
      tipo: dados.tipo,
      data_hora: spLocalParaIso(dados.data_hora_local),
      origem: "ajuste_manual",
      metodo: null,
      foto_url: null,
      match_confianca: null,
    });
    if (error) return { ok: false, erro: error.message };
    revalidatePath("/admin/registros");
    return { ok: true };
  } catch (e: any) {
    return { ok: false, erro: e?.message ?? "Erro." };
  }
}

/** Corrige tipo e/ou horário de uma batida existente (vira ajuste manual). */
export async function editarBatida(
  id: string,
  dados: { tipo: TipoBatida; data_hora_local: string }
): Promise<Resultado> {
  try {
    await exigirLogin();
    const admin = createAdminClient();
    const { error } = await admin
      .from("ponto_registros")
      .update({
        tipo: dados.tipo,
        data_hora: spLocalParaIso(dados.data_hora_local),
        origem: "ajuste_manual",
      })
      .eq("id", id);
    if (error) return { ok: false, erro: error.message };
    revalidatePath("/admin/registros");
    return { ok: true };
  } catch (e: any) {
    return { ok: false, erro: e?.message ?? "Erro." };
  }
}

/** Apaga uma batida (ex.: duplicada). */
export async function apagarBatida(id: string): Promise<Resultado> {
  try {
    await exigirLogin();
    const admin = createAdminClient();
    const { error } = await admin.from("ponto_registros").delete().eq("id", id);
    if (error) return { ok: false, erro: error.message };
    revalidatePath("/admin/registros");
    return { ok: true };
  } catch (e: any) {
    return { ok: false, erro: e?.message ?? "Erro." };
  }
}
