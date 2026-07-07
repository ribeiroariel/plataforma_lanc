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
  email text not null,
  papel text not null check (papel in ('bolsista', 'orientador')),
  aprovado boolean not null default false,
  pode_exportar_dados boolean not null default false,
  foto_url text,
  apresentacao text,
  created_at timestamptz not null default now()
);

-- Se a tabela já existia de uma versão anterior deste arquivo, garante que
-- as colunas novas apareçam sem apagar nada.
alter table public.profiles add column if not exists email text not null default '';
alter table public.profiles add column if not exists aprovado boolean not null default false;
alter table public.profiles add column if not exists pode_exportar_dados boolean not null default false;

alter table public.profiles enable row level security;
alter table public.profiles force row level security;

-- Qualquer visitante do site (mesmo sem login) pode ler os perfis — é o que
-- alimenta o carrossel público "quem somos" na página inicial. O e-mail
-- fica de fora da leitura pública (só quem usa a chave de serviço enxerga).
revoke select on public.profiles from anon, authenticated;
grant select (id, nome, papel, aprovado, pode_exportar_dados, foto_url, apresentacao, created_at)
  on public.profiles to anon, authenticated;

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

-- Ninguém edita o próprio "papel" (bolsista/orientador), "aprovado" ou
-- "pode_exportar_dados" direto pelo site — evita autopromoção,
-- autoaprovação e autoconcessão da ferramenta de exportação (que, de
-- propósito, só a conta do Ariel deve ter). Só definido manualmente pelo
-- Ariel via SQL Editor, com a chave de serviço.
revoke update (papel, aprovado, pode_exportar_dados) on public.profiles from authenticated;

-- Quando alguém se cadastra (auth.users), cria automaticamente a linha
-- correspondente em profiles, lendo nome/papel que o formulário de cadastro
-- vai enviar. "aprovado" nasce sempre false — todo cadastro novo fica
-- pendente até o Ariel revisar e aprovar manualmente.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, nome, email, papel)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nome', ''),
    new.email,
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

-- ----------------------------------------------------------------------------
-- CURVAS PADRÃO DE LOWRY (registro de transparência)
-- ----------------------------------------------------------------------------
-- Cada linha é uma curva padrão de BSA que um bolsista rodou (6 pontos fixos,
-- conforme content/testes/lowry-cortex-rins.md) + as amostras lidas com essa
-- curva. É um registro de transparência: uma vez salva, não é editável nem
-- apagável pelo site — só leitura, para o próprio bolsista e para a
-- orientadora (inclusive para revisores de artigo no futuro).

create table if not exists public.curvas_lowry (
  id uuid primary key default gen_random_uuid(),
  bolsista_id uuid not null references public.profiles (id) on delete cascade,
  abs_branco numeric not null,
  abs_10 numeric not null,
  abs_20 numeric not null,
  abs_40 numeric not null,
  abs_60 numeric not null,
  abs_80 numeric not null,
  inclinacao numeric not null,
  intercepto numeric not null,
  r_quadrado numeric not null,
  amostras jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.curvas_lowry enable row level security;
alter table public.curvas_lowry force row level security;

drop policy if exists "Bolsista lê as próprias curvas" on public.curvas_lowry;
create policy "Bolsista lê as próprias curvas"
  on public.curvas_lowry
  for select
  using (auth.uid() = bolsista_id);

drop policy if exists "Bolsista registra a própria curva" on public.curvas_lowry;
create policy "Bolsista registra a própria curva"
  on public.curvas_lowry
  for insert
  with check (auth.uid() = bolsista_id);

drop policy if exists "Orientadora lê todas as curvas" on public.curvas_lowry;
create policy "Orientadora lê todas as curvas"
  on public.curvas_lowry
  for select
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.papel = 'orientador'
    )
  );

-- Sem política de update/delete de propósito: uma curva salva é definitiva.

-- ----------------------------------------------------------------------------
-- PROJETOS (TCC/estudo) — criação, membros, grupos experimentais e testes
-- ----------------------------------------------------------------------------
-- Um bolsista cria um projeto, define os grupos experimentais dele (ex.:
-- Controle, DM1, Controle+EBH75 — nomes livres, definidos por projeto) e
-- adiciona pessoas como "coautor" (mesmo acesso do criador) ou "ajudante"
-- (só enxerga o teste que foi designado a ele, não o projeto inteiro).
--
-- Ordem importa aqui: primeiro TODAS as tabelas (bare, sem policy), depois
-- as funções auxiliares (que já podem referenciar qualquer uma delas), só
-- então RLS + policies de cada tabela. Colocar uma função que referencia
-- "projeto_membros" antes de essa tabela existir quebra o "create or
-- replace function" (funções "language sql" validam os nomes na hora de
-- criar, diferente de plpgsql).

create table if not exists public.projetos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  descricao text,
  -- Contagem informativa de quantas levas de sacrifício estão previstas.
  -- Não distribui ratos por leva automaticamente (isso é feito na hora de
  -- registrar o resultado, numa etapa futura) — só ajuda a orientadora a
  -- ver o tamanho do projeto de cara.
  numero_levas integer,
  criado_por uuid not null references public.profiles (id),
  created_at timestamptz not null default now()
);

alter table public.projetos add column if not exists numero_levas integer;

create table if not exists public.projeto_membros (
  id uuid primary key default gen_random_uuid(),
  projeto_id uuid not null references public.projetos (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  papel text not null check (papel in ('coautor', 'ajudante')),
  created_at timestamptz not null default now(),
  unique (projeto_id, profile_id)
);

create table if not exists public.projeto_grupos (
  id uuid primary key default gen_random_uuid(),
  projeto_id uuid not null references public.projetos (id) on delete cascade,
  nome text not null,
  -- Quantos ratos esse grupo tem. Numeração dos ratos é sequencial e
  -- global no projeto (rato 1..N cruzando todos os grupos, igual ao
  -- exemplo real em "Para análise estatísica" — grupo Controle = ratos
  -- 1-3, DM1 = 4-5 etc.), calculada a partir da ordem dos grupos.
  numero_ratos integer not null default 0,
  created_at timestamptz not null default now(),
  unique (projeto_id, nome)
);

alter table public.projeto_grupos add column if not exists numero_ratos integer not null default 0;

create table if not exists public.projeto_testes (
  id uuid primary key default gen_random_uuid(),
  projeto_id uuid not null references public.projetos (id) on delete cascade,
  teste_slug text not null,
  responsavel_id uuid not null references public.profiles (id),
  status text not null default 'pendente' check (status in ('pendente', 'concluido')),
  created_at timestamptz not null default now()
);

-- Funções auxiliares "security definer": rodam com o dono da função (que
-- tem bypass de RLS no Supabase), pra evitar recursão de política quando a
-- política de uma tabela precisa checar outra linha da própria tabela.

create or replace function public.is_orientador()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where profiles.id = auth.uid() and profiles.papel = 'orientador'
  );
$$;

create or replace function public.eh_membro_projeto(p_projeto_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.projeto_membros
    where projeto_id = p_projeto_id and profile_id = auth.uid()
  );
$$;

create or replace function public.eh_coautor_projeto(p_projeto_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.projeto_membros
    where projeto_id = p_projeto_id
      and profile_id = auth.uid()
      and papel = 'coautor'
  );
$$;

alter table public.projetos enable row level security;
alter table public.projetos force row level security;

drop policy if exists "Membros e orientadora veem o projeto" on public.projetos;
create policy "Membros e orientadora veem o projeto"
  on public.projetos
  for select
  using (public.eh_membro_projeto(id) or public.is_orientador());

drop policy if exists "Bolsista aprovado cria projeto" on public.projetos;
create policy "Bolsista aprovado cria projeto"
  on public.projetos
  for insert
  with check (
    auth.uid() = criado_por
    and exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.papel = 'bolsista'
        and profiles.aprovado = true
    )
  );

drop policy if exists "Coautor edita o projeto" on public.projetos;
create policy "Coautor edita o projeto"
  on public.projetos
  for update
  using (public.eh_coautor_projeto(id))
  with check (public.eh_coautor_projeto(id));

alter table public.projeto_membros enable row level security;
alter table public.projeto_membros force row level security;

drop policy if exists "Membros e orientadora veem a lista de membros" on public.projeto_membros;
create policy "Membros e orientadora veem a lista de membros"
  on public.projeto_membros
  for select
  using (public.eh_membro_projeto(projeto_id) or public.is_orientador());

drop policy if exists "Coautor adiciona membro" on public.projeto_membros;
create policy "Coautor adiciona membro"
  on public.projeto_membros
  for insert
  with check (public.eh_coautor_projeto(projeto_id));

drop policy if exists "Coautor remove membro" on public.projeto_membros;
create policy "Coautor remove membro"
  on public.projeto_membros
  for delete
  using (public.eh_coautor_projeto(projeto_id));

-- A primeira membresia (o próprio criador, como coautor) nasce dentro da
-- função criar_projeto abaixo, não por esta policy de insert — evita o
-- problema do "ovo e a galinha" (precisar já ser coautor pra virar coautor).

alter table public.projeto_grupos enable row level security;
alter table public.projeto_grupos force row level security;

drop policy if exists "Membros e orientadora veem os grupos" on public.projeto_grupos;
create policy "Membros e orientadora veem os grupos"
  on public.projeto_grupos
  for select
  using (public.eh_membro_projeto(projeto_id) or public.is_orientador());

drop policy if exists "Coautor gerencia grupos" on public.projeto_grupos;
create policy "Coautor gerencia grupos"
  on public.projeto_grupos
  for all
  using (public.eh_coautor_projeto(projeto_id))
  with check (public.eh_coautor_projeto(projeto_id));

alter table public.projeto_testes enable row level security;
alter table public.projeto_testes force row level security;

-- Aqui mora a regra "ajudante só vê o teste dele": quem não é coautor nem
-- orientadora só enxerga as linhas onde é o responsável.
drop policy if exists "Coautor, responsável e orientadora veem a designação" on public.projeto_testes;
create policy "Coautor, responsável e orientadora veem a designação"
  on public.projeto_testes
  for select
  using (
    public.eh_coautor_projeto(projeto_id)
    or responsavel_id = auth.uid()
    or public.is_orientador()
  );

drop policy if exists "Coautor designa teste" on public.projeto_testes;
create policy "Coautor designa teste"
  on public.projeto_testes
  for insert
  with check (public.eh_coautor_projeto(projeto_id));

drop policy if exists "Coautor ou responsável atualiza designação" on public.projeto_testes;
create policy "Coautor ou responsável atualiza designação"
  on public.projeto_testes
  for update
  using (public.eh_coautor_projeto(projeto_id) or responsavel_id = auth.uid())
  with check (public.eh_coautor_projeto(projeto_id) or responsavel_id = auth.uid());

drop policy if exists "Coautor remove designação" on public.projeto_testes;
create policy "Coautor remove designação"
  on public.projeto_testes
  for delete
  using (public.eh_coautor_projeto(projeto_id));

-- Cria o projeto, já com o criador como primeiro coautor e os grupos
-- experimentais informados, numa transação só (evita o problema do "ovo e
-- a galinha" das políticas de projeto_membros/projeto_grupos).
create or replace function public.criar_projeto(
  p_nome text,
  p_descricao text,
  p_numero_levas integer,
  p_grupos_nomes text[],
  p_grupos_ratos integer[]
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_projeto_id uuid;
  v_indice integer;
begin
  if not exists (
    select 1 from public.profiles
    where id = auth.uid() and papel = 'bolsista' and aprovado = true
  ) then
    raise exception 'Só bolsistas aprovados podem criar projetos.';
  end if;

  if array_length(p_grupos_nomes, 1) <> array_length(p_grupos_ratos, 1) then
    raise exception 'Cada grupo precisa de uma quantidade de ratos correspondente.';
  end if;

  insert into public.projetos (nome, descricao, numero_levas, criado_por)
  values (p_nome, p_descricao, p_numero_levas, auth.uid())
  returning id into v_projeto_id;

  insert into public.projeto_membros (projeto_id, profile_id, papel)
  values (v_projeto_id, auth.uid(), 'coautor');

  for v_indice in 1 .. array_length(p_grupos_nomes, 1) loop
    if trim(p_grupos_nomes[v_indice]) <> '' then
      insert into public.projeto_grupos (projeto_id, nome, numero_ratos)
      values (
        v_projeto_id,
        trim(p_grupos_nomes[v_indice]),
        coalesce(p_grupos_ratos[v_indice], 0)
      );
    end if;
  end loop;

  return v_projeto_id;
end;
$$;

-- Busca um bolsista aprovado pelo e-mail, sem expor a coluna "email" pra
-- ninguém além de quem já sabe o e-mail exato (usado pra adicionar membro a
-- um projeto). Retorna no máximo 1 linha.
create or replace function public.buscar_bolsista_por_email(p_email text)
returns table (id uuid, nome text, papel text)
language sql
security definer
set search_path = public
stable
as $$
  select id, nome, papel
  from public.profiles
  where email = p_email and aprovado = true;
$$;

grant execute on function public.is_orientador() to authenticated, anon;
grant execute on function public.eh_membro_projeto(uuid) to authenticated;
grant execute on function public.eh_coautor_projeto(uuid) to authenticated;
grant execute on function public.criar_projeto(text, text, integer, text[], integer[]) to authenticated;
grant execute on function public.buscar_bolsista_por_email(text) to authenticated;

-- ----------------------------------------------------------------------------
-- RESULTADOS DE TESTE (um rato por linha, dentro de uma designação de teste)
-- ----------------------------------------------------------------------------
-- "leituras" é flexível (jsonb) porque cada tipo de teste tem um formato
-- diferente de leitura bruta (ex.: Carboniladas usa abs_branco/abs_amostra;
-- CAT/SOD usam uma série de leituras ao longo do tempo). "valor_calculado"
-- é sempre o número final usado na análise estatística (equivalente à
-- coluna "delta_abs" do formato R_Tidy que o Ariel já usa fora do site).

create or replace function public.eh_responsavel_teste(p_projeto_teste_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.projeto_testes
    where id = p_projeto_teste_id and responsavel_id = auth.uid()
  );
$$;

create or replace function public.eh_coautor_do_teste(p_projeto_teste_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.projeto_testes pt
    where pt.id = p_projeto_teste_id and public.eh_coautor_projeto(pt.projeto_id)
  );
$$;

grant execute on function public.eh_responsavel_teste(uuid) to authenticated;
grant execute on function public.eh_coautor_do_teste(uuid) to authenticated;

create table if not exists public.resultados_teste (
  id uuid primary key default gen_random_uuid(),
  projeto_teste_id uuid not null references public.projeto_testes (id) on delete cascade,
  rato text not null,
  grupo_id uuid not null references public.projeto_grupos (id),
  leituras jsonb not null default '{}'::jsonb,
  valor_calculado numeric,
  dentro_do_padrao boolean,
  registrado_por uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  unique (projeto_teste_id, rato)
);

alter table public.resultados_teste enable row level security;
alter table public.resultados_teste force row level security;

drop policy if exists "Responsável, coautor e orientadora veem o resultado" on public.resultados_teste;
create policy "Responsável, coautor e orientadora veem o resultado"
  on public.resultados_teste
  for select
  using (
    public.eh_responsavel_teste(projeto_teste_id)
    or public.eh_coautor_do_teste(projeto_teste_id)
    or public.is_orientador()
  );

drop policy if exists "Responsável registra resultado" on public.resultados_teste;
create policy "Responsável registra resultado"
  on public.resultados_teste
  for insert
  with check (
    registrado_por = auth.uid()
    and public.eh_responsavel_teste(projeto_teste_id)
  );

drop policy if exists "Responsável atualiza o próprio resultado" on public.resultados_teste;
create policy "Responsável atualiza o próprio resultado"
  on public.resultados_teste
  for update
  using (public.eh_responsavel_teste(projeto_teste_id))
  with check (public.eh_responsavel_teste(projeto_teste_id));

-- Sem policy de delete de propósito: apagar um resultado de ensaio já
-- registrado deveria ser exceção rara, tratada manualmente se acontecer.
