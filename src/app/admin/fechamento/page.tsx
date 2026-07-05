import { createClient } from "@/lib/supabase/server";
import { intervaloDoMes, mesAtual, rotuloMes } from "@/lib/datas";
import { montarFechamento } from "@/lib/fechamento";
import FechamentoTabela from "@/components/admin/FechamentoTabela";
import type { Acerto, Registro } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function FechamentoPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  const sp = await searchParams;
  const mes = sp.mes || mesAtual();
  const { inicio, fim } = intervaloDoMes(mes);

  const supabase = await createClient();

  const [{ data: colabs }, { data: regs }, { data: acs }] = await Promise.all([
    supabase
      .from("ponto_colaboradores")
      .select("id, nome, ativo, valor_hora, valor_hora_fim_semana")
      .order("nome"),
    supabase
      .from("ponto_registros")
      .select("*")
      .gte("data_hora", inicio)
      .lt("data_hora", fim),
    supabase.from("ponto_acertos").select("*").eq("mes_referencia", mes),
  ]);

  const registrosPorColab = new Map<string, Registro[]>();
  for (const r of (regs ?? []) as Registro[]) {
    const l = registrosPorColab.get(r.colaborador_id) ?? [];
    l.push(r);
    registrosPorColab.set(r.colaborador_id, l);
  }
  const acertosPorColab = new Map<string, Acerto[]>();
  for (const a of (acs ?? []) as Acerto[]) {
    const l = acertosPorColab.get(a.colaborador_id) ?? [];
    l.push(a);
    acertosPorColab.set(a.colaborador_id, l);
  }

  const linhas = montarFechamento(
    (colabs ?? []) as any,
    registrosPorColab,
    acertosPorColab
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Fechamento — {rotuloMes(mes)}</h1>
      </div>

      <form className="flex flex-wrap items-end gap-3 rounded-2xl border border-gray-200 bg-white p-4">
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

      <FechamentoTabela mes={mes} rotulo={rotuloMes(mes)} linhas={linhas} />
    </div>
  );
}
