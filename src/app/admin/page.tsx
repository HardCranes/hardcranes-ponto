import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { mesAtual, rotuloMes } from "@/lib/datas";

export const dynamic = "force-dynamic";

const CARTOES = [
  {
    href: "/admin/colaboradores",
    titulo: "Colaboradores",
    texto: "Cadastrar rosto, PIN, valor/hora e consentimento.",
  },
  {
    href: "/admin/registros",
    titulo: "Registros",
    texto: "Ver e corrigir as batidas, com foto de cada uma.",
  },
  {
    href: "/admin/acertos",
    titulo: "Acertos",
    texto: "Lançar valores extras ou descontos do mês.",
  },
  {
    href: "/admin/fechamento",
    titulo: "Fechamento",
    texto: "Somar horas, ver o total a pagar e exportar a planilha.",
  },
];

export default async function AdminHome() {
  const supabase = await createClient();
  const { count } = await supabase
    .from("ponto_colaboradores")
    .select("*", { count: "exact", head: true })
    .eq("ativo", true);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Painel</h1>
        <p className="text-gray-500">
          {count ?? 0} colaborador(es) ativo(s) · Mês atual:{" "}
          {rotuloMes(mesAtual())}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {CARTOES.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:border-hard-green hover:shadow-md"
          >
            <h2 className="text-lg font-bold text-hard-green">{c.titulo}</h2>
            <p className="mt-1 text-sm text-gray-600">{c.texto}</p>
          </Link>
        ))}
      </div>

      <p className="rounded-xl bg-alert-amber-bg p-4 text-sm text-alert-amber">
        <strong>Antes de usar com a equipe:</strong> este sistema usa biometria
        facial e geolocalização. Confirme com um advogado trabalhista e colha o
        termo de consentimento assinado de cada colaborador antes de operar em
        produção.
      </p>
    </div>
  );
}
