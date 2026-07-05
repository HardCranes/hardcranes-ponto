import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { requisicaoQuiosqueAutorizada } from "@/lib/device";
import { assinarUrl, BUCKET_CADASTRO } from "@/lib/supabase/storage";
import type { ColaboradorQuiosque } from "@/lib/types";

/**
 * Grade do quiosque: lista os colaboradores ativos.
 * Protegido pelo código do dispositivo. Envia o descritor facial APENAS de
 * quem tem consentimento LGPD marcado (sem consentimento = só PIN, sem
 * processamento biométrico). As fotos vão como URL assinada temporária.
 */
export async function GET(req: Request) {
  if (!requisicaoQuiosqueAutorizada(req)) {
    return NextResponse.json({ erro: "Dispositivo não autorizado." }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("ponto_colaboradores")
    .select("id, nome, foto_cadastro_url, face_descriptor, consentimento_lgpd")
    .eq("ativo", true)
    .order("nome");

  if (error) {
    return NextResponse.json({ erro: error.message }, { status: 500 });
  }

  const colaboradores: ColaboradorQuiosque[] = await Promise.all(
    (data ?? []).map(async (c: any) => ({
      id: c.id,
      nome: c.nome,
      foto_url: await assinarUrl(BUCKET_CADASTRO, c.foto_cadastro_url, 60 * 60),
      // Só processa rosto com consentimento explícito (LGPD).
      face_descriptor: c.consentimento_lgpd ? c.face_descriptor : null,
      consentimento_lgpd: c.consentimento_lgpd,
    }))
  );

  return NextResponse.json({ colaboradores });
}
