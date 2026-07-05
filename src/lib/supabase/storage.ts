import { createAdminClient } from "@/lib/supabase/server";

/**
 * Helpers de Storage — SOMENTE no servidor (usam service_role).
 * Os buckets são privados; o acesso a cada foto é sempre por URL assinada
 * temporária, nunca por link público (LGPD).
 */

export const BUCKET_PRESENCA = "fotos-presenca";
export const BUCKET_CADASTRO = "fotos-cadastro";

/** Converte um dataURL ("data:image/jpeg;base64,....") em Buffer. */
export function dataUrlParaBuffer(dataUrl: string): {
  buffer: Buffer;
  contentType: string;
} {
  const m = dataUrl.match(/^data:(.+?);base64,(.*)$/);
  if (!m) throw new Error("Formato de imagem inválido.");
  return {
    contentType: m[1],
    buffer: Buffer.from(m[2], "base64"),
  };
}

/** Envia uma selfie de batida. Retorna o caminho salvo (não a URL). */
export async function enviarFotoPresenca(
  dataUrl: string,
  colaboradorId: string
): Promise<string> {
  const { buffer, contentType } = dataUrlParaBuffer(dataUrl);
  const admin = createAdminClient();
  const caminho = `${colaboradorId}/${Date.now()}.jpg`;
  const { error } = await admin.storage
    .from(BUCKET_PRESENCA)
    .upload(caminho, buffer, { contentType, upsert: false });
  if (error) throw error;
  return caminho;
}

/** Envia a foto de referência do cadastro. Retorna o caminho salvo. */
export async function enviarFotoCadastro(
  dataUrl: string,
  colaboradorId: string
): Promise<string> {
  const { buffer, contentType } = dataUrlParaBuffer(dataUrl);
  const admin = createAdminClient();
  const caminho = `${colaboradorId}/referencia.jpg`;
  const { error } = await admin.storage
    .from(BUCKET_CADASTRO)
    .upload(caminho, buffer, { contentType, upsert: true });
  if (error) throw error;
  return caminho;
}

/** Gera uma URL assinada temporária para exibir uma foto privada. */
export async function assinarUrl(
  bucket: string,
  caminho: string | null | undefined,
  segundos = 60 * 60
): Promise<string | null> {
  if (!caminho) return null;
  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from(bucket)
    .createSignedUrl(caminho, segundos);
  if (error) return null;
  return data.signedUrl;
}

/** Apaga um arquivo do Storage (usado no expurgo LGPD). */
export async function apagarFoto(
  bucket: string,
  caminho: string
): Promise<void> {
  const admin = createAdminClient();
  await admin.storage.from(bucket).remove([caminho]);
}
