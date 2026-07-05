import { createClient } from "@/lib/supabase/server";
import { mesAtual, rotuloMes } from "@/lib/datas";
import AcertosView from "@/components/admin/AcertosView";
import type { Acerto } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AcertosPage({
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

  let acertos: Acerto[] = [];
  if (colaboradorId) {
    const { data } = await supabase
      .from("ponto_acertos")
      .select("*")
      .eq("colaborador_id", colaboradorId)
      .eq("mes_referencia", mes)
      .order("criado_em");
    acertos = (data ?? []) as Acerto[];
  }

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl font-bold">Acertos — {rotuloMes(mes)}</h1>

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
        <AcertosView colaboradorId={colaboradorId} mes={mes} acertos={acertos} />
      ) : (
        <p className="text-gray-500">
          Escolha um colaborador e o mês para lançar acertos.
        </p>
      )}
    </div>
  );
}
