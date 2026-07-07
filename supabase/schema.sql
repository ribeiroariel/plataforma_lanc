-- ============================================================================
-- plataforma-lanc — schema inicial (Etapa 1: login + notícias)
--
-- Este arquivo é a fonte única de verdade do banco. Ele NÃO roda sozinho em
-- produção: sempre que mudar, copie e cole no SQL Editor do Supabase e rode
-- manualmente. Rodar de novo o arquivo inteiro é seguro (usa "if not exists"
-- e "or replace" onde dá), mas revise antes se já tiver dado real nas
-- tabelas.
--
-- Ainda não inclui: testes, projetos/TCC, resultados de ensaio, controle de
-- qualidade. Isso vem numa próxima versão deste arquivo, depois de
-- desenharmos juntos como essas tabelas devem funcionar.
-- ============================================================================

create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- PERFIS (login de bolsista e da orientadora)
-- ----------------------------------------------------------------------------
-- Uma linha por pessoa logada. "papel" define se é bolsista ou orientadora
-- (só a Débora deve ter papel = 'orientador'). Os dados aqui (nome, foto,
-- apresentação) são os mesmos usados no carrossel público de bolsistas.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nome text not null,
  papel text not null check (papel in ('bolsista', 'orientador')),
  foto_url text,
  apresentacao text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.profiles force row level security;

-- Qualquer visitante do site (mesmo sem login) pode ler os perfis — é o que
-- alimenta o carrossel público "quem somos" na página inicial.
drop policy if exists "Perfis são públicos para leitura" on public.profiles;
create policy "Perfis são públicos para leitura"
  on public.profiles
  for select
  using (true);

-- Cada pessoa só pode editar o próprio perfil.
drop policy if exists "Usuário atualiza o próprio perfil" on public.profiles;
create policy "Usuário atualiza o próprio perfil"
  on public.profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Ninguém edita o próprio "papel" (bolsista/orientador) direto pelo site —
-- isso evita que um bolsista se autopromova a orientador. Só é definido na
-- criação da conta (via trigger abaixo) ou manualmente pelo Ariel no painel.
revoke update (papel) on public.profiles from authenticated;

-- Quando alguém se cadastra (auth.users), cria automaticamente a linha
-- correspondente em profiles, lendo nome/papel que o formulário de cadastro
-- vai enviar.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, nome, papel)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nome', ''),
    coalesce(new.raw_user_meta_data ->> 'papel', 'bolsista')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ----------------------------------------------------------------------------
-- NOTÍCIAS (hall público de divulgação)
-- ----------------------------------------------------------------------------
-- Cada linha é um post: um artigo publicado ou uma atualização do
-- laboratório. "publicado = false" é rascunho (só a orientadora enxerga);
-- "publicado = true" aparece pra qualquer visitante do site.

create table if not exists public.noticias (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  tipo text not null check (tipo in ('publicacao', 'atividade')),
  resumo text not null,
  corpo text not null,
  link_artigo text,
  imagem_url text,
  data date not null,
  publicado boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.noticias enable row level security;
alter table public.noticias force row level security;

-- Qualquer visitante lê só as notícias já publicadas.
drop policy if exists "Notícias publicadas são públicas" on public.noticias;
create policy "Notícias publicadas são públicas"
  on public.noticias
  for select
  using (publicado = true);

-- A orientadora pode ler/criar/editar/apagar qualquer notícia, publicada ou
-- rascunho (revisão de conteúdo antes de ir ao ar).
drop policy if exists "Orientadora gerencia notícias" on public.noticias;
create policy "Orientadora gerencia notícias"
  on public.noticias
  for all
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.papel = 'orientador'
    )
  )
  with check (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.papel = 'orientador'
    )
  );

-- Observação: a skill "criacao-de-noticias" (rodando localmente, no
-- computador do Ariel) vai publicar notícias usando a chave de serviço do
-- Supabase, que ignora essas travas — as políticas acima protegem o que
-- acontece pelo site, não o script local.
