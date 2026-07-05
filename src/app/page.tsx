import Link from "next/link";
import { Brand } from "@/components/Brand";

/**
 * Página inicial simples: dois caminhos.
 * - Quiosque: a tela que fica no celular da parede.
 * - Administração: onde o dono faz o fechamento do mês.
 */
export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 bg-hard-coal px-6 text-center text-white">
      <div className="flex flex-col items-center gap-3">
        <Brand invert size="lg" />
        <p className="text-lg text-white/80">Registro de Presença</p>
      </div>

      <div className="flex w-full max-w-sm flex-col gap-4">
        <Link
          href="/quiosque"
          className="rounded-2xl bg-hard-green px-6 py-6 text-2xl font-bold text-white shadow-lg transition hover:bg-hard-green-dark"
        >
          Abrir Quiosque
        </Link>
        <Link
          href="/admin"
          className="rounded-2xl border border-white/20 px-6 py-4 text-lg font-semibold text-white/90 transition hover:bg-white/10"
        >
          Administração
        </Link>
      </div>

      <p className="max-w-xs text-xs text-white/50">
        Apontamento de presença para acerto de pagamento. Não constitui registro
        de ponto/jornada.
      </p>
    </main>
  );
}
