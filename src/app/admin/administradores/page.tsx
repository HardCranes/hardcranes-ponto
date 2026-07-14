import { createClient, createAdminClient } from "@/lib/supabase/server";
import AdministradoresView from "@/components/admin/AdministradoresView";

export const dynamic = "force-dynamic";

export default async function AdministradoresPage() {
  // Quem está logado (o middleware já bloqueia acesso não autenticado a /admin).
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Lista os administradores pela Admin API (service_role, só no servidor).
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 100,
  });

  const usuarios: { id: string; email: string; criado_em: string }[] = (
    data?.users ?? []
  ).map((u: any) => ({
    id: u.id as string,
    email: (u.email ?? "") as string,
    criado_em: u.created_at as string,
  }));
  usuarios.sort((a, b) => a.email.localeCompare(b.email));

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-bold">Gerenciar Administradores</h1>
        <p className="text-gray-500">
          Pessoas com login de acesso ao painel (e-mail e senha). Isto é separado
          dos colaboradores que batem ponto.
        </p>
      </div>

      <AdministradoresView
        usuarios={usuarios}
        meuId={user?.id ?? ""}
        erroLista={error?.message ?? null}
      />
    </div>
  );
}
