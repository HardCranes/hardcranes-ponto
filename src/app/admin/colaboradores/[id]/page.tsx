import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { assinarUrl, BUCKET_CADASTRO } from "@/lib/supabase/storage";
import EditColaboradorForm from "@/components/admin/EditColaboradorForm";
import type { Colaborador } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function EditarColaboradorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("ponto_colaboradores")
    .select("*")
    .eq("id", id)
    .single();

  if (!data) notFound();
  const c = data as Colaborador;
  const fotoUrl = await assinarUrl(BUCKET_CADASTRO, c.foto_cadastro_url);

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl font-bold">Editar — {c.nome}</h1>
      <EditColaboradorForm
        colaborador={{
          id: c.id,
          nome: c.nome,
          valor_hora: c.valor_hora,
          valor_hora_fim_semana: c.valor_hora_fim_semana,
          ativo: c.ativo,
          consentimento_lgpd: c.consentimento_lgpd,
          temDescriptor: Array.isArray(c.face_descriptor),
        }}
        fotoUrl={fotoUrl}
      />
    </div>
  );
}
