"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Brand } from "@/components/Brand";

const LINKS = [
  { href: "/admin", label: "Início" },
  { href: "/admin/colaboradores", label: "Colaboradores" },
  { href: "/admin/registros", label: "Registros" },
  { href: "/admin/acertos", label: "Acertos" },
  { href: "/admin/fechamento", label: "Fechamento" },
  { href: "/admin/administradores", label: "Administradores" },
];

export default function AdminNav({ email }: { email: string | null }) {
  const pathname = usePathname();
  const router = useRouter();

  async function sair() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  function ativo(href: string) {
    if (href === "/admin") return pathname === "/admin";
    return pathname.startsWith(href);
  }

  return (
    <header className="bg-hard-coal text-white">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
        <Brand invert size="sm" />
        <span className="sr-only">Hard Cranes</span>
        <nav className="flex flex-wrap gap-1">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                ativo(l.href)
                  ? "bg-hard-green text-white"
                  : "text-white/70 hover:bg-white/10"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          {email && <span className="hidden text-xs text-white/50 sm:inline">{email}</span>}
          <button
            onClick={sair}
            className="rounded-lg border border-white/20 px-3 py-1.5 text-sm text-white/80 hover:bg-white/10"
          >
            Sair
          </button>
        </div>
      </div>
    </header>
  );
}
