import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { requisicaoQuiosqueAutorizada } from "@/lib/device";
import { conferirPin, pinValido } from "@/lib/pin";

/**
 * Confere o PIN de 4 dígitos de um colaborador (fallback quando o rosto não
 * é reconhecido). A conferência é server-side porque o PIN é guardado com hash.
 */
export async function POST(req: Request) {
  if (!requisicaoQuiosqueAutorizada(req)) {
    return NextResponse.json({ erro: "Dispositivo não autorizado." }, { status: 401 });
  }

  const { colaborador_id, pin } = await req.json();
  if (!colaborador_id || !pinValido(String(pin ?? ""))) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("ponto_colaboradores")
    .select("pin_hash, ativo")
    .eq("id", colaborador_id)
    .single();

  if (error || !data || !data.ativo || !data.pin_hash) {
    return NextResponse.json({ ok: false });
  }

  const ok = await conferirPin(String(pin), data.pin_hash);
  return NextResponse.json({ ok });
}
