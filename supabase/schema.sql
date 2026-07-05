-- =========================================================================
--  Controle de Presença Hard Cranes — Schema do banco (Supabase / Postgres)
--
--  COMO RODAR:
--    1. Abra o Supabase do seu projeto.
--    2. Menu lateral: "SQL Editor" -> "New query".
--    3. Cole TODO este arquivo e clique em "Run".
--    Pode rodar de novo sem medo: tudo usa IF NOT EXISTS / CREATE OR REPLACE.
--
--  IMPORTANTE (mesmo Supabase de outros apps):
--    Todas as tabelas deste sistema começam com "ponto_" para NUNCA colidir
--    com as tabelas do app de Ferramentas ou de Frota.
--
--  SEGURANÇA (LGPD — biometria facial):
--    - Buckets de fotos são PRIVADOS. Nunca públicos.
--    - RLS bloqueia todo acesso anônimo. O quiosque grava as batidas por uma
--      rota de servidor (service_role) que valida o código do dispositivo.
--    - Só o admin logado (Supabase Auth) enxerga os dados pelo app.
-- =========================================================================

-- gen_random_uuid() já vem no Postgres do Supabase.

-- -------------------------------------------------------------------------
--  Tabela: colaboradores
-- -------------------------------------------------------------------------
create table if not exists public.ponto_colaboradores (
  id                  uuid primary key default gen_random_uuid(),
  nome                text not null,
  foto_cadastro_url   text,
  -- Vetor de 128 números gerado pelo face-api a partir da foto de referência.
  -- É ISTO que é comparado a cada batida (não a foto crua).
  face_descriptor     jsonb,
  -- PIN de 4 dígitos definido pelo colaborador. Guardado com hash (bcrypt),
  -- NUNCA em texto puro. Fallback quando o rosto não é reconhecido.
  pin_hash            text,
  valor_hora          numeric(10, 2),
  -- Tarifa aplicada às horas de sábado/domingo. Se nula, usa valor_hora.
  valor_hora_fim_semana numeric(10, 2),
  ativo               boolean not null default true,
  -- Consentimento específico para tratamento de dado biométrico facial.
  -- Sem isto = true, o colaborador NÃO deve ser processado por reconhecimento.
  consentimento_lgpd  boolean not null default false,
  criado_em           timestamptz not null default now()
);

-- -------------------------------------------------------------------------
--  Tabela: registros (as batidas)
-- -------------------------------------------------------------------------
create table if not exists public.ponto_registros (
  id                uuid primary key default gen_random_uuid(),
  colaborador_id    uuid not null references public.ponto_colaboradores(id) on delete cascade,
  -- Escolhido explicitamente pelo colaborador na hora da batida.
  tipo              text not null check (tipo in ('entrada', 'saida')),
  data_hora         timestamptz not null default now(),
  -- Selfie da batida (bucket PRIVADO). Obrigatória nas batidas do quiosque
  -- (inclusive no fallback por PIN); pode ser nula só em ajuste manual do admin.
  foto_url          text,
  -- Como o colaborador foi identificado (auditoria). Nulo em ajuste manual.
  metodo            text check (metodo in ('facial', 'pin_fallback')),
  -- Quão bem o rosto bateu (0 = idêntico). Nulo quando metodo = 'pin_fallback'.
  match_confianca   numeric(6, 4),
  dispositivo       text,
  origem            text not null default 'quiosque'
                    check (origem in ('quiosque', 'ajuste_manual')),
  -- Um ponto de GPS por batida (NÃO rastreamento). Só exibido ao admin.
  latitude          double precision,
  longitude         double precision,
  precisao_m        double precision,
  criado_em         timestamptz not null default now(),
  -- No quiosque, foto e método são obrigatórios; no ajuste manual, opcionais.
  constraint chk_foto_obrigatoria_quiosque
    check (origem = 'ajuste_manual' or foto_url is not null),
  constraint chk_metodo_quiosque
    check (origem = 'ajuste_manual' or metodo is not null)
);

create index if not exists idx_ponto_registros_colab_data
  on public.ponto_registros (colaborador_id, data_hora);

-- -------------------------------------------------------------------------
--  Tabela: acertos (ajustes do mês — positivos ou negativos)
-- -------------------------------------------------------------------------
create table if not exists public.ponto_acertos (
  id                uuid primary key default gen_random_uuid(),
  colaborador_id    uuid not null references public.ponto_colaboradores(id) on delete cascade,
  mes_referencia    text not null,          -- ex.: '2026-07'
  descricao         text not null,
  valor             numeric(10, 2) not null, -- pode ser negativo (desconto)
  criado_em         timestamptz not null default now()
);

create index if not exists idx_ponto_acertos_colab_mes
  on public.ponto_acertos (colaborador_id, mes_referencia);

-- Migração segura para bancos já criados antes desta coluna existir.
alter table public.ponto_colaboradores
  add column if not exists valor_hora_fim_semana numeric(10, 2);

-- =========================================================================
--  Row Level Security
-- =========================================================================
alter table public.ponto_colaboradores enable row level security;
alter table public.ponto_registros    enable row level security;
alter table public.ponto_acertos      enable row level security;

-- Admin logado (qualquer usuário autenticado via Supabase Auth) tem acesso total.
-- O acesso anônimo (chave anon no navegador) NÃO recebe nenhuma policy = negado.
-- As gravações do quiosque passam por rota de servidor com service_role
-- (que ignora a RLS) DEPOIS de validar o código do dispositivo.

drop policy if exists "admin_all_colaboradores" on public.ponto_colaboradores;
create policy "admin_all_colaboradores" on public.ponto_colaboradores
  for all to authenticated using (true) with check (true);

drop policy if exists "admin_all_registros" on public.ponto_registros;
create policy "admin_all_registros" on public.ponto_registros
  for all to authenticated using (true) with check (true);

drop policy if exists "admin_all_acertos" on public.ponto_acertos;
create policy "admin_all_acertos" on public.ponto_acertos
  for all to authenticated using (true) with check (true);

-- =========================================================================
--  Storage — buckets PRIVADOS para as fotos
-- =========================================================================
insert into storage.buckets (id, name, public)
values ('fotos-presenca', 'fotos-presenca', false)
on conflict (id) do update set public = false;

insert into storage.buckets (id, name, public)
values ('fotos-cadastro', 'fotos-cadastro', false)
on conflict (id) do update set public = false;

-- Só o admin logado lê/escreve pelos objetos via app. O quiosque envia a selfie
-- por rota de servidor (service_role). Nada é público.
drop policy if exists "admin_read_fotos_presenca" on storage.objects;
create policy "admin_read_fotos_presenca" on storage.objects
  for select to authenticated using (bucket_id = 'fotos-presenca');

drop policy if exists "admin_read_fotos_cadastro" on storage.objects;
create policy "admin_read_fotos_cadastro" on storage.objects
  for all to authenticated
  using (bucket_id = 'fotos-cadastro')
  with check (bucket_id = 'fotos-cadastro');

-- =========================================================================
--  LGPD — expurgo de fotos antigas (retenção)
--  Apaga o CAMINHO da foto das batidas com mais de N meses, mantendo o
--  registro numérico de horas (o histórico de pagamento continua íntegro).
--  A remoção do arquivo físico no Storage é feita pelo app (ver README).
--  Rode manualmente quando quiser, ou agende via Supabase Scheduled Functions.
-- =========================================================================
create or replace function public.ponto_fotos_a_expurgar(meses int default 6)
returns table (id uuid, foto_url text)
language sql
security definer
set search_path = public
as $$
  select id, foto_url
  from public.ponto_registros
  where foto_url is not null
    and data_hora < now() - make_interval(months => meses);
$$;
