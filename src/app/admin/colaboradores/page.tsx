import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { assinarUrl, BUCKET_CADASTRO } from "@/lib/supabase/storage";
import { formatarReais } from "@/lib/dinheiro";
import type { Colaborador } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ColaboradoresPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("ponto_colaboradores")
    .select("*")
    .order("ativo", { ascending: false })
    .order("nome");

  const colaboradores = (data ?? []) as Colaborador[];
  const comFoto = await Promise.all(
    colaboradores.map(async (c) => ({
      ...c,
      _foto: await assinarUrl(BUCKET_CADASTRO, c.foto_cadastro_url),
    }))
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Colaboradores</h1>
        <Link
          href="/admin/colaboradores/novo"
          className="rounded-xl bg-hard-green px-4 py-2 font-bold text-white"
        >
          + Cadastrar
        </Link>
      </div>

      {comFoto.length === 0 ? (
        <p className="text-gray-500">Nenhum colaborador cadastrado ainda.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {comFoto.map((c) => (
            <Link
              key={c.id}
              href={`/admin/colaboradores/${c.id}`}
              className={`flex items-center gap-4 rounded-2xl border bg-white p-4 shadow-sm transition hover:border-hard-green ${
                c.ativo ? "border-gray-200" : "border-gray-200 opacity-60"
              }`}
            >
              <div className="h-16 w-16 overflow-hidden rounded-full bg-gray-200">
                {c._foto ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={c._foto}
                    alt={c.nome}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xl font-bold text-gray-500">
                    {c.nome.charAt(0)}
                  </div>
                )}
              </div>
              <div className="flex flex-col">
                <span className="font-bold">{c.nome}</span>
                <span className="text-sm text-gray-500">
                  {formatarReais(c.valor_hora)}/h
                </span>
                <div className="mt-1 flex gap-2">
                  {!c.ativo && (
                    <span className="rounded bg-gray-200 px-2 py-0.5 text-xs">
                      Inativo
                    </span>
                  )}
                  <span
                    className={`rounded px-2 py-0.5 text-xs ${
                      c.consentimento_lgpd
                        ? "bg-hard-green-light text-hard-green-dark"
                        : "bg-alert-amber-bg text-alert-amber"
                    }`}
                  >
                    {c.consentimento_lgpd ? "LGPD ok" : "Sem consentimento"}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
