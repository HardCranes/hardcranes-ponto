import { createClient } from "@/lib/supabase/server";
import { assinarUrl, BUCKET_PRESENCA } from "@/lib/supabase/storage";
import { intervaloDoMes, mesAtual } from "@/lib/datas";
import RegistrosView from "@/components/admin/RegistrosView";
import type { Colaborador, Registro } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function RegistrosPage({
  searchParams,
}: {
  searchParams: Promise<{ colaborador?: string; mes?: string }>;
}) {
  const sp = await searchParams;
  const mes = sp.mes || mesAtual();
  const colaboradorId = sp.colaborador || "";

  const supabase = await createClient();
  const { data: colabs } = await supabase
    .from("ponto_colaboradores")
    .select("id, nome, ativo")
    .order("ativo", { ascending: false })
    .order("nome");

  let registros: Registro[] = [];
  const fotoUrls: Record<string, string | null> = {};

  if (colaboradorId) {
    const { inicio, fim } = intervaloDoMes(mes);
    const { data } = await supabase
      .from("ponto_registros")
      .select("*")
      .eq("colaborador_id", colaboradorId)
      .gte("data_hora", inicio)
      .lt("data_hora", fim)
      .order("data_hora");
    registros = (data ?? []) as Registro[];
    await Promise.all(
      registros.map(async (r) => {
        fotoUrls[r.id] = await assinarUrl(BUCKET_PRESENCA, r.foto_url);
      })
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl font-bold">Registros</h1>

      <form className="flex flex-wrap items-end gap-3 rounded-2xl border border-gray-200 bg-white p-4">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-semibold">Colaborador</span>
          <select
            name="colaborador"
            defaultValue={colaboradorId}
            className="min-w-[12rem] rounded-xl border border-gray-300 px-3 py-2"
          >
            <option value="">Selecione…</option>
            {(colabs ?? []).map((c: any) => (
              <option key={c.id} value={c.id}>
                {c.nome} {c.ativo ? "" : "(inativo)"}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-semibold">Mês</span>
          <input
            type="month"
            name="mes"
            defaultValue={mes}
            className="rounded-xl border border-gray-300 px-3 py-2"
          />
        </label>
        <button className="rounded-xl bg-hard-green px-5 py-2 font-bold text-white">
          Ver
        </button>
      </form>

      {colaboradorId ? (
        <RegistrosView
          colaboradorId={colaboradorId}
          mes={mes}
          registros={registros}
          fotoUrls={fotoUrls}
        />
      ) : (
        <p className="text-gray-500">
          Escolha um colaborador e o mês para ver as batidas.
        </p>
      )}
    </div>
  );
}
