import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Cliente Supabase para Server Components / Route Handlers.
 * Lê a sessão pelos cookies. Respeita a RLS (usa a chave anon).
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(
          cookiesToSet: {
            name: string;
            value: string;
            options?: Record<string, unknown>;
          }[]
        ) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options as never)
            );
          } catch {
            // Chamado a partir de um Server Component — ignorado quando há
            // middleware cuidando da renovação da sessão.
          }
        },
      },
    }
  );
}

/**
 * Cliente ADMIN (service_role) — bypassa a RLS.
 * USE SOMENTE no servidor (rotas /api). A chave nunca vai ao navegador.
 * É por aqui que o quiosque grava batidas, DEPOIS de validar o código
 * do dispositivo.
 */
export function createAdminClient() {
  const { createClient: createSbClient } = require("@supabase/supabase-js");
  return createSbClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}
