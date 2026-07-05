import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { requisicaoQuiosqueAutorizada } from "@/lib/device";
import { conferirPin, pinValido } from "@/lib/pin";
import { enviarFotoPresenca } from "@/lib/supabase/storage";
import { formatarHora } from "@/lib/datas";

/**
 * Grava uma batida. Protegido pelo código do dispositivo.
 * A selfie é SEMPRE obrigatória (inclusive no fallback por PIN). Quando o
 * método é 'pin_fallback', o PIN é reconferido aqui (defesa em profundidade).
 */
export async function POST(req: Request) {
  if (!requisicaoQuiosqueAutorizada(req)) {
    return NextResponse.json({ erro: "Dispositivo não autorizado." }, { status: 401 });
  }

  const body = await req.json();
  const {
    colaborador_id,
    tipo,
    metodo,
    match_confianca,
    foto,
    pin,
    dispositivo,
    latitude,
    longitude,
    precisao_m,
  } = body ?? {};

  if (!colaborador_id || (tipo !== "entrada" && tipo !== "saida")) {
    return NextResponse.json({ erro: "Dados incompletos." }, { status: 400 });
  }
  if (metodo !== "facial" && metodo !== "pin_fallback") {
    return NextResponse.json({ erro: "Método inválido." }, { status: 400 });
  }
  if (!foto || typeof foto !== "string") {
    return NextResponse.json(
      { erro: "A foto da batida é obrigatória." },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  const { data: colab, error: errColab } = await admin
    .from("ponto_colaboradores")
    .select("id, nome, ativo, pin_hash")
    .eq("id", colaborador_id)
    .single();

  if (errColab || !colab || !colab.ativo) {
    return NextResponse.json(
      { erro: "Colaborador não encontrado ou inativo." },
      { status: 404 }
    );
  }

  // Fallback por PIN: reconfere o PIN antes de gravar.
  if (metodo === "pin_fallback") {
    if (!pinValido(String(pin ?? "")) || !colab.pin_hash) {
      return NextResponse.json({ erro: "PIN inválido." }, { status: 401 });
    }
    const ok = await conferirPin(String(pin), colab.pin_hash);
    if (!ok) {
      return NextResponse.json({ erro: "PIN incorreto." }, { status: 401 });
    }
  }

  // Sobe a selfie (bucket privado) e grava o caminho, nunca uma URL pública.
  let caminhoFoto: string;
  try {
    caminhoFoto = await enviarFotoPresenca(foto, colaborador_id);
  } catch (e: any) {
    return NextResponse.json(
      { erro: "Falha ao salvar a foto: " + (e?.message ?? "erro") },
      { status: 500 }
    );
  }

  const agora = new Date().toISOString();
  const { error: errIns } = await admin.from("ponto_registros").insert({
    colaborador_id,
    tipo,
    data_hora: agora,
    foto_url: caminhoFoto,
    metodo,
    match_confianca: metodo === "facial" ? match_confianca ?? null : null,
    dispositivo: dispositivo ?? null,
    origem: "quiosque",
    latitude: latitude ?? null,
    longitude: longitude ?? null,
    precisao_m: precisao_m ?? null,
  });

  if (errIns) {
    return NextResponse.json({ erro: errIns.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    nome: colab.nome,
    tipo,
    hora: formatarHora(agora),
  });
}
