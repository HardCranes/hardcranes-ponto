"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatarDataHora } from "@/lib/datas";
import {
  criarAdministrador,
  removerAdministrador,
} from "@/app/admin/administradores/actions";

type Usuario = { id: string; email: string; criado_em: string };

export default function AdministradoresView({
  usuarios,
  meuId,
  erroLista,
}: {
  usuarios: Usuario[];
  meuId: string;
  erroLista: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  function adicionar() {
    setErro(null);
    setOk(null);
    startTransition(async () => {
      const r = await criarAdministrador({ email, senha });
      if (!r.ok) return setErro(r.erro ?? "Falha ao adicionar.");
      setOk(`Administrador ${email.trim().toLowerCase()} criado.`);
      setEmail("");
      setSenha("");
      router.refresh();
    });
  }

  function remover(u: Usuario) {
    if (
      !confirm(
        `Remover o acesso de ${u.email}? Ele não conseguirá mais entrar no painel.`
      )
    )
      return;
    setErro(null);
    setOk(null);
    startTransition(async () => {
      const r = await removerAdministrador(u.id);
      if (!r.ok) return setErro(r.erro ?? "Falha ao remover.");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Adicionar */}
      <section className="rounded-2xl border border-gray-200 bg-white p-5">
        <h2 className="mb-3 font-bold">Adicionar administrador</h2>
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-1 flex-col gap-1">
            <span className="text-sm font-semibold">E-mail</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="pessoa@empresa.com"
              className="rounded-xl border border-gray-300 px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-semibold">Senha temporária</span>
            <input
              type="text"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="mín. 6 caracteres"
              className="w-52 rounded-xl border border-gray-300 px-3 py-2"
            />
          </label>
          <button
            onClick={adicionar}
            disabled={pending}
            className="rounded-xl bg-hard-green px-5 py-2 font-bold text-white disabled:opacity-50"
          >
            Adicionar
          </button>
        </div>
        <p className="mt-2 text-xs text-gray-500">
          A pessoa entra em <strong>/login</strong> com esse e-mail e senha. Peça
          para ela trocar a senha depois, se quiser.
        </p>
        {erro && (
          <p className="mt-3 rounded-xl bg-alert-red-bg p-3 font-semibold text-alert-red">
            {erro}
          </p>
        )}
        {ok && (
          <p className="mt-3 rounded-xl bg-hard-green-light p-3 font-semibold text-hard-green-dark">
            {ok}
          </p>
        )}
      </section>

      {/* Lista */}
      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
        <div className="border-b border-gray-100 px-4 py-3 font-bold">
          Administradores atuais ({usuarios.length})
        </div>
        {erroLista && (
          <p className="px-4 py-3 text-alert-red">
            Não consegui carregar a lista: {erroLista}
          </p>
        )}
        {usuarios.map((u) => (
          <div
            key={u.id}
            className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 px-4 py-3 last:border-b-0"
          >
            <div>
              <span className="font-semibold">{u.email}</span>
              {u.id === meuId && (
                <span className="ml-2 rounded bg-hard-green-light px-2 py-0.5 text-xs text-hard-green-dark">
                  você
                </span>
              )}
              <div className="text-xs text-gray-500">
                Criado em {formatarDataHora(u.criado_em)}
              </div>
            </div>
            {u.id === meuId ? (
              <span className="text-xs text-gray-400">
                não é possível remover o próprio acesso
              </span>
            ) : (
              <button
                onClick={() => remover(u)}
                disabled={pending}
                className="rounded-lg border border-alert-red px-3 py-1.5 text-sm font-semibold text-alert-red hover:bg-alert-red-bg disabled:opacity-50"
              >
                Remover
              </button>
            )}
          </div>
        ))}
      </section>
    </div>
  );
}
