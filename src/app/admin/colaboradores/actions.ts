"use server";

import { revalidatePath } from "next/cache";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { enviarFotoCadastro } from "@/lib/supabase/storage";
import { gerarHashPin, pinValido } from "@/lib/pin";

/** Garante que há um admin logado antes de qualquer mutação. */
async function exigirLogin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autorizado.");
  return user;
}

export type ResultadoAcao = { ok: boolean; erro?: string; id?: string };

export async function criarColaborador(dados: {
  nome: string;
  valor_hora: number | null;
  valor_hora_fim_semana: number | null;
  pin: string;
  consentimento_lgpd: boolean;
  face_descriptor: number[] | null;
  foto: string | null; // dataURL
}): Promise<ResultadoAcao> {
  try {
    await exigirLogin();
    const admin = createAdminClient();

    if (!dados.nome.trim()) return { ok: false, erro: "Informe o nome." };
    if (!pinValido(dados.pin))
      return { ok: false, erro: "O PIN deve ter 4 dígitos." };

    const pin_hash = await gerarHashPin(dados.pin);

    // Cria a linha primeiro para obter o id (usado no caminho da foto).
    const { data: inserido, error: errIns } = await admin
      .from("ponto_colaboradores")
      .insert({
        nome: dados.nome.trim(),
        valor_hora: dados.valor_hora,
        valor_hora_fim_semana: dados.valor_hora_fim_semana,
        pin_hash,
        consentimento_lgpd: dados.consentimento_lgpd,
        face_descriptor: dados.face_descriptor,
        ativo: true,
      })
      .select("id")
      .single();

    if (errIns || !inserido)
      return { ok: false, erro: errIns?.message ?? "Falha ao cadastrar." };

    // Sobe a foto de referência (bucket privado) e grava o caminho.
    if (dados.foto) {
      try {
        const caminho = await enviarFotoCadastro(dados.foto, inserido.id);
        await admin
          .from("ponto_colaboradores")
          .update({ foto_cadastro_url: caminho })
          .eq("id", inserido.id);
      } catch {
        // Colaborador já criado; a foto pode ser reenviada na edição.
      }
    }

    revalidatePath("/admin/colaboradores");
    return { ok: true, id: inserido.id };
  } catch (e: any) {
    return { ok: false, erro: e?.message ?? "Erro inesperado." };
  }
}

export async function atualizarColaborador(
  id: string,
  dados: {
    nome?: string;
    valor_hora?: number | null;
    valor_hora_fim_semana?: number | null;
    consentimento_lgpd?: boolean;
    ativo?: boolean;
    pin?: string; // opcional: redefinir
    face_descriptor?: number[] | null;
    foto?: string | null;
  }
): Promise<ResultadoAcao> {
  try {
    await exigirLogin();
    const admin = createAdminClient();

    const patch: Record<string, unknown> = {};
    if (dados.nome !== undefined) patch.nome = dados.nome.trim();
    if (dados.valor_hora !== undefined) patch.valor_hora = dados.valor_hora;
    if (dados.valor_hora_fim_semana !== undefined)
      patch.valor_hora_fim_semana = dados.valor_hora_fim_semana;
    if (dados.consentimento_lgpd !== undefined)
      patch.consentimento_lgpd = dados.consentimento_lgpd;
    if (dados.ativo !== undefined) patch.ativo = dados.ativo;
    if (dados.face_descriptor !== undefined)
      patch.face_descriptor = dados.face_descriptor;

    if (dados.pin) {
      if (!pinValido(dados.pin))
        return { ok: false, erro: "O PIN deve ter 4 dígitos." };
      patch.pin_hash = await gerarHashPin(dados.pin);
    }

    if (dados.foto) {
      const caminho = await enviarFotoCadastro(dados.foto, id);
      patch.foto_cadastro_url = caminho;
    }

    const { error } = await admin
      .from("ponto_colaboradores")
      .update(patch)
      .eq("id", id);
    if (error) return { ok: false, erro: error.message };

    revalidatePath("/admin/colaboradores");
    revalidatePath(`/admin/colaboradores/${id}`);
    return { ok: true, id };
  } catch (e: any) {
    return { ok: false, erro: e?.message ?? "Erro inesperado." };
  }
}
