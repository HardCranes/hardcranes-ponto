import { createBrowserClient } from "@supabase/ssr";

/**
 * Cliente Supabase para uso no navegador (Client Components / admin).
 * Usa a chave anon pública — toda a segurança vem da RLS no banco.
 * OBS: a tela do quiosque NÃO usa este cliente; ela fala com o servidor
 * pelas rotas /api/quiosque/*, protegidas pelo código do dispositivo.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
