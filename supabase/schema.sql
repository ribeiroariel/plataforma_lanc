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
-- ATENÇÃO: mantenha esta lista de colunas SEMPRE em sincronia com o que
-- getUsuarioAtual/proxy leem de profiles. `pode_aprovar_cadastros` estava
-- faltando aqui — rodar o schema inteiro revogava a leitura dessa coluna e
-- derrubava o login (todo usuário aparecia deslogado). Ver src/lib/supabase/profile.ts.
grant select (id, nome, papel, aprovado, pode_exportar_dados, pode_aprovar_cadastros, foto_url, apresentacao, created_at)
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
  -- Projeto finalizado: vira somente-leitura (não dá mais pra editar
  -- grupos/levas). Como um resultado confirmado, mas no nível do projeto.
  finalizado boolean not null default false,
  finalizado_em timestamptz,
  criado_por uuid not null references public.profiles (id),
  created_at timestamptz not null default now()
);

alter table public.projetos add column if not exists numero_levas integer;
alter table public.projetos add column if not exists finalizado boolean not null default false;
alter table public.projetos add column if not exists finalizado_em timestamptz;
-- Modelo animal do projeto: espécie (rato ou camundongo) e linhagem/raça
-- (ex.: Wistar, Swiss). Aplica-se a todos os animais do projeto.
alter table public.projetos add column if not exists especie text;
alter table public.projetos add column if not exists linhagem text;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'projetos_especie_check') then
    alter table public.projetos
      add constraint projetos_especie_check check (especie in ('rato', 'camundongo'));
  end if;
end $$;
-- Tecidos que o projeto vai analisar (ex.: {"figado","cortex-rins"}). Filtra
-- os testes oferecidos na designação — só testes desses tecidos. Vazio = sem
-- restrição (projetos antigos criados antes desta coluna).
alter table public.projetos add column if not exists tecidos text[] not null default '{}';

-- Histórico de versões do projeto (cada edição grava um "retrato" do estado
-- em jsonb). Registro de transparência de como o desenho experimental mudou
-- ao longo do tempo (levas imprevistas, ratos perdidos).
create table if not exists public.projeto_versoes (
  id uuid primary key default gen_random_uuid(),
  projeto_id uuid not null references public.projetos (id) on delete cascade,
  retrato jsonb not null,
  nota text,
  criado_por uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

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
  -- Total de ratos do grupo (soma de todas as levas). Mantido por
  -- compatibilidade e para leitura rápida.
  numero_ratos integer not null default 0,
  -- Quantos ratos o grupo tem em CADA leva de sacrifício, na ordem das
  -- levas: ratos_por_leva[1] = leva 1, [2] = leva 2, etc. O mesmo grupo
  -- pode ter quantidades diferentes por leva (ex.: Controle com 3 ratos na
  -- leva 1 e 2 na leva 2). A numeração dos ratos é sequencial e global,
  -- ordenada por leva e depois por grupo.
  ratos_por_leva integer[] not null default '{}',
  created_at timestamptz not null default now(),
  unique (projeto_id, nome)
);

alter table public.projeto_grupos add column if not exists numero_ratos integer not null default 0;
alter table public.projeto_grupos add column if not exists ratos_por_leva integer[] not null default '{}';

create table if not exists public.projeto_testes (
  id uuid primary key default gen_random_uuid(),
  projeto_id uuid not null references public.projetos (id) on delete cascade,
  teste_slug text not null,
  responsavel_id uuid not null references public.profiles (id),
  -- Leva de sacrifício em que este teste é feito (null = todas). O registro
  -- só mostra os ratos dessa leva.
  leva integer,
  status text not null default 'pendente' check (status in ('pendente', 'concluido')),
  -- Metadados da leitura (para a planilha de transparência dos dados brutos):
  -- aparelho usado e horário de início/término da leitura no equipamento.
  -- Horários em texto (valor literal digitado, ex.: "2026-07-27T14:30") para
  -- não sofrer com fuso — é transparência, o registrado é o que aparece.
  aparelho_leitura text,
  leitura_inicio text,
  leitura_fim text,
  -- Aparelho de leitura (estruturado) e recipiente escolhidos antes de começar
  -- o teste. Dirigem as calculadoras de reagente do dia (o recipiente tem um
  -- fator de volume) e o "Instrument" da planilha de transparência. null até o
  -- bolsista escolher. Ver src/lib/recipientes.ts.
  aparelho text check (aparelho in ('infinite_200pro', 'uv_vis')),
  recipiente text check (
    recipiente in ('microplaca_96', 'microplaca_24', 'microcubeta', 'cubeta_padrao')
  ),
  -- Encerramento do teste: uma vez encerrado, NADA mais pode ser modificado
  -- (preparação, checklist, tabela de resultados, metadados). É irreversível —
  -- não há caminho de "reabrir". Depois de encerrar, libera a impressão da
  -- tabela (PDF) para colar no caderno de experimentos e o anexo da foto dessa
  -- tabela colada. Guardado quem encerrou e quando.
  encerrado boolean not null default false,
  encerrado_por uuid references public.profiles (id),
  encerrado_em timestamptz,
  created_at timestamptz not null default now()
);

alter table public.projeto_testes add column if not exists leva integer;
alter table public.projeto_testes add column if not exists aparelho_leitura text;
alter table public.projeto_testes add column if not exists leitura_inicio text;
alter table public.projeto_testes add column if not exists leitura_fim text;
alter table public.projeto_testes add column if not exists aparelho text;
alter table public.projeto_testes add column if not exists recipiente text;
alter table public.projeto_testes add column if not exists encerrado boolean not null default false;
alter table public.projeto_testes add column if not exists encerrado_por uuid references public.profiles (id);
alter table public.projeto_testes add column if not exists encerrado_em timestamptz;
-- Considerações gerais do teste (texto livre do bolsista sobre como foi o
-- ensaio: imprevistos, observações, se deu tudo certo).
alter table public.projeto_testes add column if not exists consideracoes text;

-- Checks das colunas novas de forma idempotente (add column if not exists não
-- aplica o check em bancos que já tinham a tabela).
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'projeto_testes_aparelho_check') then
    alter table public.projeto_testes
      add constraint projeto_testes_aparelho_check
      check (aparelho in ('infinite_200pro', 'uv_vis'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'projeto_testes_recipiente_check') then
    alter table public.projeto_testes
      add constraint projeto_testes_recipiente_check
      check (recipiente in ('microplaca_96', 'microplaca_24', 'microcubeta', 'cubeta_padrao'));
  end if;
end $$;

-- Ajudantes de um teste designado: além do responsável (que registra os
-- resultados), outras pessoas que fazem o teste junto e também o veem em
-- "Meus testes". Tabela criada aqui (bare); RLS/policies mais abaixo,
-- depois que eh_coautor_do_teste existir.
create table if not exists public.projeto_teste_ajudantes (
  id uuid primary key default gen_random_uuid(),
  projeto_teste_id uuid not null references public.projeto_testes (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  unique (projeto_teste_id, profile_id)
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

-- Usada pela rota de exportação (/api/exportar) — sem isso, marcar
-- "pode_exportar_dados = true" só esconderia/mostraria o botão na tela,
-- mas o RLS ainda bloquearia a leitura de projetos que o Ariel não integra
-- como membro. Mesma ideia do is_orientador(), outra bandeira.
create or replace function public.pode_exportar_dados()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where profiles.id = auth.uid() and profiles.pode_exportar_dados = true
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
  using (
    public.eh_membro_projeto(id)
    or public.is_orientador()
    or public.pode_exportar_dados()
  );

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
  using (
    public.eh_membro_projeto(projeto_id)
    or public.is_orientador()
    or public.pode_exportar_dados()
  );

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
  using (
    public.eh_membro_projeto(projeto_id)
    or public.is_orientador()
    or public.pode_exportar_dados()
  );

drop policy if exists "Coautor gerencia grupos" on public.projeto_grupos;
create policy "Coautor gerencia grupos"
  on public.projeto_grupos
  for all
  using (public.eh_coautor_projeto(projeto_id))
  with check (public.eh_coautor_projeto(projeto_id));

alter table public.projeto_versoes enable row level security;
alter table public.projeto_versoes force row level security;

drop policy if exists "Membros e orientadora veem versões" on public.projeto_versoes;
create policy "Membros e orientadora veem versões"
  on public.projeto_versoes
  for select
  using (
    public.eh_membro_projeto(projeto_id)
    or public.is_orientador()
    or public.pode_exportar_dados()
  );

drop policy if exists "Coautor grava versão" on public.projeto_versoes;
create policy "Coautor grava versão"
  on public.projeto_versoes
  for insert
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
    or exists (
      select 1 from public.projeto_teste_ajudantes a
      where a.projeto_teste_id = projeto_testes.id and a.profile_id = auth.uid()
    )
    or public.is_orientador()
    or public.pode_exportar_dados()
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
--
-- p_grupos é um jsonb: [{"nome": "Controle", "ratosPorLeva": [3, 2]}, ...]
-- onde ratosPorLeva tem uma entrada por leva (tamanho = p_numero_levas).
--
-- Remove a assinatura antiga (text[], integer[]) antes de recriar.
drop function if exists public.criar_projeto(text, text, integer, text[], integer[]);

-- Nota: a assinatura mudou (ganhou p_tecidos). Como não dá pra "create or
-- replace" trocando a lista de argumentos, dropa a versão antiga primeiro.
drop function if exists public.criar_projeto(text, text, integer, jsonb);

create or replace function public.criar_projeto(
  p_nome text,
  p_descricao text,
  p_numero_levas integer,
  p_grupos jsonb,
  p_tecidos text[]
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_projeto_id uuid;
  v_grupo jsonb;
  v_nome text;
  v_ratos integer[];
  v_total integer;
begin
  if not exists (
    select 1 from public.profiles
    where id = auth.uid() and papel = 'bolsista' and aprovado = true
  ) then
    raise exception 'Só bolsistas aprovados podem criar projetos.';
  end if;

  if p_numero_levas is null or p_numero_levas < 1 then
    raise exception 'Informe o número de levas de sacrifício (mínimo 1).';
  end if;

  insert into public.projetos (nome, descricao, numero_levas, tecidos, criado_por)
  values (p_nome, p_descricao, p_numero_levas, coalesce(p_tecidos, '{}'), auth.uid())
  returning id into v_projeto_id;

  insert into public.projeto_membros (projeto_id, profile_id, papel)
  values (v_projeto_id, auth.uid(), 'coautor');

  for v_grupo in select * from jsonb_array_elements(p_grupos) loop
    v_nome := trim(v_grupo ->> 'nome');
    if v_nome <> '' then
      -- converte o array json "ratosPorLeva" em integer[]
      select array_agg(coalesce((x)::integer, 0))
        into v_ratos
        from jsonb_array_elements_text(v_grupo -> 'ratosPorLeva') as x;
      v_ratos := coalesce(v_ratos, '{}');
      select coalesce(sum(n), 0) into v_total from unnest(v_ratos) as n;

      insert into public.projeto_grupos (projeto_id, nome, numero_ratos, ratos_por_leva)
      values (v_projeto_id, v_nome, v_total, v_ratos);
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
grant execute on function public.pode_exportar_dados() to authenticated;
grant execute on function public.eh_membro_projeto(uuid) to authenticated;
grant execute on function public.eh_coautor_projeto(uuid) to authenticated;
grant execute on function public.criar_projeto(text, text, integer, jsonb, text[]) to authenticated;
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

-- Uma pessoa (ajudante OU responsável) faz parte da execução de um teste?
-- Usado para "Meus testes" e para a política de ver resultados.
create or replace function public.eh_executor_teste(p_projeto_teste_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select
    public.eh_responsavel_teste(p_projeto_teste_id)
    or exists (
      select 1 from public.projeto_teste_ajudantes a
      where a.projeto_teste_id = p_projeto_teste_id and a.profile_id = auth.uid()
    );
$$;

grant execute on function public.eh_executor_teste(uuid) to authenticated;

-- RLS + policies da tabela de ajudantes (declarada bem antes, sem policies).
alter table public.projeto_teste_ajudantes enable row level security;
alter table public.projeto_teste_ajudantes force row level security;

drop policy if exists "Ver ajudantes do teste" on public.projeto_teste_ajudantes;
create policy "Ver ajudantes do teste"
  on public.projeto_teste_ajudantes
  for select
  using (
    profile_id = auth.uid()
    or public.eh_coautor_do_teste(projeto_teste_id)
    or public.is_orientador()
    or public.pode_exportar_dados()
  );

drop policy if exists "Coautor gerencia ajudantes" on public.projeto_teste_ajudantes;
create policy "Coautor gerencia ajudantes"
  on public.projeto_teste_ajudantes
  for all
  using (public.eh_coautor_do_teste(projeto_teste_id))
  with check (public.eh_coautor_do_teste(projeto_teste_id));

-- Checklist do procedimento passo a passo (Fatia 3 da aba de teste processual):
-- o ESTADO de cada passo (feito/por/quando) fica aqui; a DEFINIÇÃO dos passos
-- está no código (src/lib/procedimentos.ts), chaveada por passo_id estável.
-- Compartilhado por quem executa o teste (responsável + ajudantes), coautor e
-- orientadora — o mesmo conjunto de quem vê/registra o resultado.
create table if not exists public.projeto_teste_passos (
  id uuid primary key default gen_random_uuid(),
  projeto_teste_id uuid not null references public.projeto_testes (id) on delete cascade,
  passo_id text not null,
  feito boolean not null default false,
  feito_por uuid references public.profiles (id),
  feito_em timestamptz,
  unique (projeto_teste_id, passo_id)
);

alter table public.projeto_teste_passos enable row level security;
alter table public.projeto_teste_passos force row level security;

drop policy if exists "Executor, coautor e orientadora veem os passos" on public.projeto_teste_passos;
create policy "Executor, coautor e orientadora veem os passos"
  on public.projeto_teste_passos
  for select
  using (
    public.eh_executor_teste(projeto_teste_id)
    or public.eh_coautor_do_teste(projeto_teste_id)
    or public.is_orientador()
    or public.pode_exportar_dados()
  );

drop policy if exists "Executor e coautor marcam passos" on public.projeto_teste_passos;
create policy "Executor e coautor marcam passos"
  on public.projeto_teste_passos
  for all
  using (
    public.eh_executor_teste(projeto_teste_id)
    or public.eh_coautor_do_teste(projeto_teste_id)
  )
  with check (
    public.eh_executor_teste(projeto_teste_id)
    or public.eh_coautor_do_teste(projeto_teste_id)
  );

create table if not exists public.resultados_teste (
  id uuid primary key default gen_random_uuid(),
  projeto_teste_id uuid not null references public.projeto_testes (id) on delete cascade,
  rato text not null,
  grupo_id uuid not null references public.projeto_grupos (id),
  leituras jsonb not null default '{}'::jsonb,
  valor_calculado numeric,
  dentro_do_padrao boolean,
  -- Observação do bolsista (amostra hemolisada, rato morreu no sacrifício,
  -- leva imprevista, etc.). Editável mesmo depois de confirmar.
  observacoes text,
  -- Uma vez confirmado, o valor/rato não podem mais ser alterados pelo
  -- site (só as observações). Fim de transparência.
  confirmado boolean not null default false,
  registrado_por uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  unique (projeto_teste_id, rato)
);

alter table public.resultados_teste add column if not exists observacoes text;
alter table public.resultados_teste add column if not exists confirmado boolean not null default false;

alter table public.resultados_teste enable row level security;
alter table public.resultados_teste force row level security;

drop policy if exists "Responsável, coautor e orientadora veem o resultado" on public.resultados_teste;
create policy "Responsável, coautor e orientadora veem o resultado"
  on public.resultados_teste
  for select
  using (
    public.eh_executor_teste(projeto_teste_id)
    or public.eh_coautor_do_teste(projeto_teste_id)
    or public.is_orientador()
    or public.pode_exportar_dados()
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

-- Transparência: a confirmação é POR CÉLULA. Cada leitura gravada em
-- `leituras->'colunas'` é uma célula já confirmada e imutável — não pode mudar
-- de valor nem ser removida (só é permitido ADICIONAR novas células). Quando a
-- linha inteira fecha (`confirmado = true`), o valor calculado também trava e
-- não dá pra "desconfirmar". Vale mesmo para o próprio responsável.
create or replace function public.travar_resultado_confirmado()
returns trigger
language plpgsql
as $$
declare
  chave text;
  cols_old jsonb := coalesce(OLD.leituras->'colunas', '{}'::jsonb);
  cols_new jsonb := coalesce(NEW.leituras->'colunas', '{}'::jsonb);
begin
  -- Cada célula já confirmada é imutável: não pode sumir nem mudar de valor.
  for chave in select jsonb_object_keys(cols_old) loop
    if not (cols_new ? chave) then
      raise exception 'Célula confirmada (%) não pode ser removida.', chave;
    end if;
    if cols_new -> chave is distinct from cols_old -> chave then
      raise exception 'Célula confirmada (%) não pode ter o valor alterado.', chave;
    end if;
  end loop;

  -- Depois que qualquer célula foi confirmada, rato e grupo ficam fixos.
  if cols_old <> '{}'::jsonb then
    if NEW.rato is distinct from OLD.rato
       or NEW.grupo_id is distinct from OLD.grupo_id then
      raise exception 'Rato/grupo não podem mudar depois de confirmar células.';
    end if;
  end if;

  -- Linha totalmente confirmada: valor travado e sem "desconfirmar".
  if OLD.confirmado then
    if NEW.confirmado is distinct from OLD.confirmado then
      raise exception 'Não é possível desconfirmar um resultado.';
    end if;
    if NEW.valor_calculado is distinct from OLD.valor_calculado then
      raise exception 'Resultado confirmado: o valor não pode mais mudar.';
    end if;
  end if;

  return NEW;
end;
$$;

drop trigger if exists travar_confirmado on public.resultados_teste;
create trigger travar_confirmado
  before update on public.resultados_teste
  for each row execute function public.travar_resultado_confirmado();

-- ── Encerramento do teste: imutabilidade garantida no banco ──────────────────
-- Uma vez o teste encerrado, nada mais pode ser gravado nele. Isso dá lastro à
-- promessa da aba: a orientadora cola a tabela impressa no caderno confiando que
-- o que está no sistema é final e não muda mais.
create or replace function public.projeto_teste_esta_encerrado(p_projeto_teste_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select encerrado from public.projeto_testes where id = p_projeto_teste_id),
    false
  );
$$;

-- Bloqueia gravação (insert/update) em resultados/passos de um teste encerrado.
-- DELETE fica de fora de propósito: a exclusão de um projeto inteiro apaga os
-- testes em cascata, e um BEFORE DELETE aqui abortaria essa exclusão.
create or replace function public.bloquear_se_teste_encerrado()
returns trigger
language plpgsql
as $$
begin
  if public.projeto_teste_esta_encerrado(NEW.projeto_teste_id) then
    raise exception 'Teste encerrado: não é possível alterar seus dados.';
  end if;
  return NEW;
end;
$$;

drop trigger if exists bloquear_encerrado_resultados on public.resultados_teste;
create trigger bloquear_encerrado_resultados
  before insert or update on public.resultados_teste
  for each row execute function public.bloquear_se_teste_encerrado();

drop trigger if exists bloquear_encerrado_passos on public.projeto_teste_passos;
create trigger bloquear_encerrado_passos
  before insert or update on public.projeto_teste_passos
  for each row execute function public.bloquear_se_teste_encerrado();

-- A própria designação fica congelada depois de encerrada. A transição
-- false→true (o ato de encerrar) é a única mudança permitida — não há "reabrir".
create or replace function public.travar_teste_encerrado()
returns trigger
language plpgsql
as $$
begin
  if OLD.encerrado then
    raise exception 'Teste encerrado: a designação não pode mais ser alterada.';
  end if;
  return NEW;
end;
$$;

drop trigger if exists travar_encerrado on public.projeto_testes;
create trigger travar_encerrado
  before update on public.projeto_testes
  for each row execute function public.travar_teste_encerrado();

-- ----------------------------------------------------------------------------
-- FOTOS DE PERFIL (Storage) — pro carrossel público "quem somos"
-- ----------------------------------------------------------------------------
-- Bucket público (qualquer um com a URL vê a foto, sem precisar de login —
-- é o mesmo espírito do carrossel público de bolsistas). Caminho do
-- arquivo é sempre "{id da pessoa}/foto.<ext>", então cada pessoa só pode
-- escrever dentro da própria pasta.

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "Dono sobe a própria foto" on storage.objects;
create policy "Dono sobe a própria foto"
  on storage.objects
  for insert
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Dono atualiza a própria foto" on storage.objects;
create policy "Dono atualiza a própria foto"
  on storage.objects
  for update
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Dono apaga a própria foto" on storage.objects;
create policy "Dono apaga a própria foto"
  on storage.objects
  for delete
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ----------------------------------------------------------------------------
-- FOTOS DO CADERNO DE BANCADA (transparência) — opcional, por ensaio
-- ----------------------------------------------------------------------------
-- Registro fotográfico da tabela feita à mão no caderno, ligado ao ensaio
-- (projeto_teste), não ao rato. Não é fonte de dado — a absorbância válida é a
-- digitada em resultados_teste; a foto é só a fonte auditável. Ao contrário do
-- bucket "avatars" (público), este é PRIVADO: só quem vê o resultado vê a
-- foto, via signed URL. Caminho no bucket: "{projeto_teste_id}/{uuid}.<ext>",
-- então o 1º nível do caminho é o ensaio, o que as policies de storage usam.

create table if not exists public.fotos_caderno (
  id uuid primary key default gen_random_uuid(),
  projeto_teste_id uuid not null references public.projeto_testes (id) on delete cascade,
  caminho text not null,
  enviado_por uuid not null references public.profiles (id),
  created_at timestamptz not null default now()
);

alter table public.fotos_caderno enable row level security;
alter table public.fotos_caderno force row level security;

drop policy if exists "Membros e orientadora veem fotos do caderno" on public.fotos_caderno;
create policy "Membros e orientadora veem fotos do caderno"
  on public.fotos_caderno
  for select
  using (
    public.eh_executor_teste(projeto_teste_id)
    or public.eh_coautor_do_teste(projeto_teste_id)
    or public.is_orientador()
    or public.pode_exportar_dados()
  );

drop policy if exists "Responsável anexa foto do caderno" on public.fotos_caderno;
create policy "Responsável anexa foto do caderno"
  on public.fotos_caderno
  for insert
  with check (
    enviado_por = auth.uid()
    and public.eh_responsavel_teste(projeto_teste_id)
  );

drop policy if exists "Responsável remove a própria foto do caderno" on public.fotos_caderno;
create policy "Responsável remove a própria foto do caderno"
  on public.fotos_caderno
  for delete
  using (
    enviado_por = auth.uid()
    and public.eh_responsavel_teste(projeto_teste_id)
  );

-- Bucket PRIVADO (público = false), servido por signed URL.
insert into storage.buckets (id, name, public)
values ('cadernos', 'cadernos', false)
on conflict (id) do nothing;

drop policy if exists "Ver foto de caderno do próprio teste" on storage.objects;
create policy "Ver foto de caderno do próprio teste"
  on storage.objects
  for select
  using (
    bucket_id = 'cadernos'
    and (
      public.eh_executor_teste(((storage.foldername(name))[1])::uuid)
      or public.eh_coautor_do_teste(((storage.foldername(name))[1])::uuid)
      or public.is_orientador()
      or public.pode_exportar_dados()
    )
  );

drop policy if exists "Responsável sobe foto de caderno" on storage.objects;
create policy "Responsável sobe foto de caderno"
  on storage.objects
  for insert
  with check (
    bucket_id = 'cadernos'
    and public.eh_responsavel_teste(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists "Responsável apaga foto de caderno" on storage.objects;
create policy "Responsável apaga foto de caderno"
  on storage.objects
  for delete
  using (
    bucket_id = 'cadernos'
    and public.eh_responsavel_teste(((storage.foldername(name))[1])::uuid)
  );

-- ----------------------------------------------------------------------------
-- SACRIFÍCIO — ferramenta do dia de sacrifício (ver docs/sacrificio-spec.md)
-- ----------------------------------------------------------------------------
-- Um sacrifício por leva do projeto. Escrita = coautores (donos); no dia, a
-- conta do responsável fica aberta e qualquer pessoa presente digita nela.
-- Leitura = membros do projeto + orientadora. RLS force em tudo.

create table if not exists public.sacrificios (
  id uuid primary key default gen_random_uuid(),
  projeto_id uuid not null references public.projetos (id) on delete cascade,
  leva integer,
  data date,
  duracao_estimada_min integer,
  status text not null default 'planejado'
    check (status in ('planejado', 'em_andamento', 'concluido')),
  -- Quando as alíquotas do homogeneizado são separadas: no mesmo dia ou no dia
  -- seguinte (processo demorado; a equipe de alíquotas às vezes faz depois).
  aliquotas_quando text not null default 'mesmo_dia'
    check (aliquotas_quando in ('mesmo_dia', 'dia_seguinte')),
  criado_por uuid not null references public.profiles (id),
  created_at timestamptz not null default now()
);
alter table public.sacrificios
  add column if not exists aliquotas_quando text not null default 'mesmo_dia';

-- Designação de funções do dia (N pessoas por função).
create table if not exists public.sacrificio_funcoes (
  id uuid primary key default gen_random_uuid(),
  sacrificio_id uuid not null references public.sacrificios (id) on delete cascade,
  funcao text not null check (funcao in (
    'decapitacao', 'deslocamento_cervical', 'dissecacao_figado',
    'dissecacao_rim', 'dissecacao_pancreas', 'dissecacao_cortex',
    'separacao_cortex_hipocampo', 'homogeneizacao', 'separacao_aliquotas',
    'separacao_sangue', 'organizacao_geral')),
  profile_id uuid not null references public.profiles (id),
  unique (sacrificio_id, funcao, profile_id)
);

-- Um registro por animal do sacrifício. "caixa" é rótulo digitado ao vivo.
create table if not exists public.sacrificio_ratos (
  id uuid primary key default gen_random_uuid(),
  sacrificio_id uuid not null references public.sacrificios (id) on delete cascade,
  rato text not null,
  grupo_id uuid not null references public.projeto_grupos (id),
  caixa text,
  ordem integer,
  sobreviveu boolean not null default true,
  exclusao_motivo text,
  destino text not null default 'bioquimica'
    check (destino in ('bioquimica', 'histologia', 'ambos')),
  status text not null default 'pendente'
    check (status in ('pendente', 'dissecado')),
  created_at timestamptz not null default now(),
  unique (sacrificio_id, rato)
);

-- Destino de cada órgão por rato, uma linha por (rato, órgão). `destino` é
-- EXCLUSIVO: 'coleta' (vai pra análise bioquímica), 'histologia' (não vai) ou
-- 'nao_coletado' (com motivo). Substitui os antigos flags independentes
-- `coletado`/`para_histologia` (um órgão nunca é coleta E histologia ao mesmo
-- tempo).
create table if not exists public.sacrificio_rato_tecidos (
  id uuid primary key default gen_random_uuid(),
  sacrificio_rato_id uuid not null
    references public.sacrificio_ratos (id) on delete cascade,
  tecido text not null,
  destino text not null default 'coleta'
    check (destino in ('coleta', 'histologia', 'nao_coletado')),
  nao_coletado_motivo text,
  unique (sacrificio_rato_id, tecido)
);

-- Peso da amostra → tampão. Homogenato 10% (1:9): volume_ul = peso_g * 9000
-- (ex.: 1 g → 9000 µL = 9 mL de tampão). Padrão célula→confirma→trava:
-- confirmado trava peso e volume.
create table if not exists public.sacrificio_aliquotas (
  id uuid primary key default gen_random_uuid(),
  sacrificio_rato_id uuid not null
    references public.sacrificio_ratos (id) on delete cascade,
  tecido text not null,
  peso_g numeric,
  volume_tampao_ul numeric,
  confirmado boolean not null default false,
  created_at timestamptz not null default now(),
  unique (sacrificio_rato_id, tecido)
);

-- Separação de alíquotas do homogeneizado em ependorfs, um por (rato, órgão,
-- categoria de teste). volume_ul é calculado no app (ependorfsParaOrgao) e
-- gravado ao confirmar. Padrão célula→confirma→trava.
create table if not exists public.sacrificio_aliquota_categorias (
  id uuid primary key default gen_random_uuid(),
  sacrificio_rato_id uuid not null
    references public.sacrificio_ratos (id) on delete cascade,
  tecido text not null,
  categoria text not null
    check (categoria in ('cat', 'sod', 'tbars', 'ponto_final', 'lowry')),
  volume_ul numeric,
  confirmado boolean not null default false,
  created_at timestamptz not null default now(),
  unique (sacrificio_rato_id, tecido, categoria)
);

-- Helpers p/ RLS: projeto dono de um sacrifício (direto e via rato).
create or replace function public.sac_projeto(p_sac uuid)
returns uuid language sql security definer set search_path = public stable as $$
  select projeto_id from public.sacrificios where id = p_sac;
$$;

create or replace function public.sac_projeto_do_rato(p_rato uuid)
returns uuid language sql security definer set search_path = public stable as $$
  select s.projeto_id
  from public.sacrificio_ratos sr
  join public.sacrificios s on s.id = sr.sacrificio_id
  where sr.id = p_rato;
$$;

grant execute on function public.sac_projeto(uuid) to authenticated;
grant execute on function public.sac_projeto_do_rato(uuid) to authenticated;

-- Fatia 2 do redesenho: pessoas designadas a uma função de sacrifício (mesmo
-- que não sejam membros do projeto) precisam LER o mínimo para ver a lista
-- "Minhas funções" e a aba da função. A escrita continua coautor-only aqui — a
-- escrita por função entra na fatia 3.
create or replace function public.eh_designado_sacrificio(p_sac uuid)
returns boolean language sql security definer set search_path = public stable as $$
  select exists (
    select 1 from public.sacrificio_funcoes
    where sacrificio_id = p_sac and profile_id = auth.uid()
  );
$$;

create or replace function public.eh_designado_projeto(p_projeto uuid)
returns boolean language sql security definer set search_path = public stable as $$
  select exists (
    select 1
    from public.sacrificios s
    join public.sacrificio_funcoes sf on sf.sacrificio_id = s.id
    where s.projeto_id = p_projeto and sf.profile_id = auth.uid()
  );
$$;

grant execute on function public.eh_designado_sacrificio(uuid) to authenticated;
grant execute on function public.eh_designado_projeto(uuid) to authenticated;

-- Reabre a leitura de projetos para designados de sacrifício (redefine a policy
-- da seção de projetos, agora que os helpers de sacrifício já existem).
drop policy if exists "Membros e orientadora veem o projeto" on public.projetos;
create policy "Membros e orientadora veem o projeto"
  on public.projetos for select
  using (
    public.eh_membro_projeto(id)
    or public.is_orientador()
    or public.pode_exportar_dados()
    or public.eh_designado_projeto(id)
  );

-- Fatia 3: designado a partir de um sacrificio_rato (para as tabelas filhas
-- tecidos/alíquotas). Além de LER, os designados passam a ESCREVER a sua parte
-- (a granularidade por função é feita na interface — todos os que escrevem são
-- pessoas designadas ao dia pelo coautor).
create or replace function public.eh_designado_sacrificio_do_rato(p_rato uuid)
returns boolean language sql security definer set search_path = public stable as $$
  select exists (
    select 1
    from public.sacrificio_ratos sr
    join public.sacrificio_funcoes sf on sf.sacrificio_id = sr.sacrificio_id
    where sr.id = p_rato and sf.profile_id = auth.uid()
  );
$$;
grant execute on function public.eh_designado_sacrificio_do_rato(uuid) to authenticated;

-- Roster: designados leem os grupos do projeto (para montar a fila de ratos).
drop policy if exists "Membros e orientadora veem os grupos" on public.projeto_grupos;
create policy "Membros e orientadora veem os grupos"
  on public.projeto_grupos for select
  using (
    public.eh_membro_projeto(projeto_id)
    or public.is_orientador()
    or public.pode_exportar_dados()
    or public.eh_designado_projeto(projeto_id)
  );

-- Fatia 4: a separação de alíquotas precisa saber quais testes o projeto
-- designou (para derivar as categorias/ependorfs). Designados leem a designação.
drop policy if exists "Coautor, responsável e orientadora veem a designação" on public.projeto_testes;
create policy "Coautor, responsável e orientadora veem a designação"
  on public.projeto_testes for select
  using (
    public.eh_coautor_projeto(projeto_id)
    or responsavel_id = auth.uid()
    or exists (
      select 1 from public.projeto_teste_ajudantes a
      where a.projeto_teste_id = projeto_testes.id and a.profile_id = auth.uid()
    )
    or public.is_orientador()
    or public.pode_exportar_dados()
    or public.eh_designado_projeto(projeto_id)
  );

-- Leitura = membros + orientadora; escrita = coautores. Vale p/ as 5 tabelas.
alter table public.sacrificios enable row level security;
alter table public.sacrificios force row level security;
drop policy if exists "Membros veem o sacrifício" on public.sacrificios;
create policy "Membros veem o sacrifício" on public.sacrificios for select
  using (
    public.eh_membro_projeto(projeto_id)
    or public.is_orientador()
    or public.eh_designado_sacrificio(id)
  );
drop policy if exists "Coautor gerencia o sacrifício" on public.sacrificios;
create policy "Coautor gerencia o sacrifício" on public.sacrificios for all
  using (public.eh_coautor_projeto(projeto_id))
  with check (public.eh_coautor_projeto(projeto_id));

alter table public.sacrificio_funcoes enable row level security;
alter table public.sacrificio_funcoes force row level security;
drop policy if exists "Membros veem as funções" on public.sacrificio_funcoes;
create policy "Membros veem as funções" on public.sacrificio_funcoes for select
  using (
    public.eh_membro_projeto(public.sac_projeto(sacrificio_id))
    or public.is_orientador()
    or public.eh_designado_sacrificio(sacrificio_id)
  );
drop policy if exists "Coautor gerencia funções" on public.sacrificio_funcoes;
create policy "Coautor gerencia funções" on public.sacrificio_funcoes for all
  using (public.eh_coautor_projeto(public.sac_projeto(sacrificio_id)))
  with check (public.eh_coautor_projeto(public.sac_projeto(sacrificio_id)));

alter table public.sacrificio_ratos enable row level security;
alter table public.sacrificio_ratos force row level security;
drop policy if exists "Membros veem os ratos do sacrifício" on public.sacrificio_ratos;
create policy "Membros veem os ratos do sacrifício" on public.sacrificio_ratos for select
  using (
    public.eh_membro_projeto(public.sac_projeto(sacrificio_id))
    or public.is_orientador()
    or public.eh_designado_sacrificio(sacrificio_id)
  );
drop policy if exists "Coautor gerencia os ratos do sacrifício" on public.sacrificio_ratos;
create policy "Coautor gerencia os ratos do sacrifício" on public.sacrificio_ratos for all
  using (
    public.eh_coautor_projeto(public.sac_projeto(sacrificio_id))
    or public.eh_designado_sacrificio(sacrificio_id)
  )
  with check (
    public.eh_coautor_projeto(public.sac_projeto(sacrificio_id))
    or public.eh_designado_sacrificio(sacrificio_id)
  );

alter table public.sacrificio_rato_tecidos enable row level security;
alter table public.sacrificio_rato_tecidos force row level security;
drop policy if exists "Membros veem tecidos do rato" on public.sacrificio_rato_tecidos;
create policy "Membros veem tecidos do rato" on public.sacrificio_rato_tecidos for select
  using (
    public.eh_membro_projeto(public.sac_projeto_do_rato(sacrificio_rato_id))
    or public.is_orientador()
    or public.eh_designado_sacrificio_do_rato(sacrificio_rato_id)
  );
drop policy if exists "Coautor gerencia tecidos do rato" on public.sacrificio_rato_tecidos;
create policy "Coautor gerencia tecidos do rato" on public.sacrificio_rato_tecidos for all
  using (
    public.eh_coautor_projeto(public.sac_projeto_do_rato(sacrificio_rato_id))
    or public.eh_designado_sacrificio_do_rato(sacrificio_rato_id)
  )
  with check (
    public.eh_coautor_projeto(public.sac_projeto_do_rato(sacrificio_rato_id))
    or public.eh_designado_sacrificio_do_rato(sacrificio_rato_id)
  );

alter table public.sacrificio_aliquotas enable row level security;
alter table public.sacrificio_aliquotas force row level security;
drop policy if exists "Membros veem alíquotas" on public.sacrificio_aliquotas;
create policy "Membros veem alíquotas" on public.sacrificio_aliquotas for select
  using (
    public.eh_membro_projeto(public.sac_projeto_do_rato(sacrificio_rato_id))
    or public.is_orientador()
    or public.eh_designado_sacrificio_do_rato(sacrificio_rato_id)
  );
drop policy if exists "Coautor gerencia alíquotas" on public.sacrificio_aliquotas;
create policy "Coautor gerencia alíquotas" on public.sacrificio_aliquotas for all
  using (
    public.eh_coautor_projeto(public.sac_projeto_do_rato(sacrificio_rato_id))
    or public.eh_designado_sacrificio_do_rato(sacrificio_rato_id)
  )
  with check (
    public.eh_coautor_projeto(public.sac_projeto_do_rato(sacrificio_rato_id))
    or public.eh_designado_sacrificio_do_rato(sacrificio_rato_id)
  );

-- Trava da alíquota confirmada: peso e volume não mudam mais.
create or replace function public.travar_aliquota_confirmada()
returns trigger language plpgsql as $$
begin
  if OLD.confirmado then
    if NEW.peso_g is distinct from OLD.peso_g
       or NEW.volume_tampao_ul is distinct from OLD.volume_tampao_ul
       or NEW.confirmado is distinct from OLD.confirmado then
      raise exception 'Alíquota confirmada: peso e tampão não podem mais mudar.';
    end if;
  end if;
  return NEW;
end;
$$;
drop trigger if exists travar_aliquota on public.sacrificio_aliquotas;
create trigger travar_aliquota before update on public.sacrificio_aliquotas
  for each row execute function public.travar_aliquota_confirmada();

-- Separação de alíquotas por categoria: mesma regra de leitura/escrita das
-- demais tabelas filhas (membros + orientador + designados).
alter table public.sacrificio_aliquota_categorias enable row level security;
alter table public.sacrificio_aliquota_categorias force row level security;
drop policy if exists "Membros veem categorias de alíquota" on public.sacrificio_aliquota_categorias;
create policy "Membros veem categorias de alíquota" on public.sacrificio_aliquota_categorias for select
  using (
    public.eh_membro_projeto(public.sac_projeto_do_rato(sacrificio_rato_id))
    or public.is_orientador()
    or public.eh_designado_sacrificio_do_rato(sacrificio_rato_id)
  );
drop policy if exists "Coautor gerencia categorias de alíquota" on public.sacrificio_aliquota_categorias;
create policy "Coautor gerencia categorias de alíquota" on public.sacrificio_aliquota_categorias for all
  using (
    public.eh_coautor_projeto(public.sac_projeto_do_rato(sacrificio_rato_id))
    or public.eh_designado_sacrificio_do_rato(sacrificio_rato_id)
  )
  with check (
    public.eh_coautor_projeto(public.sac_projeto_do_rato(sacrificio_rato_id))
    or public.eh_designado_sacrificio_do_rato(sacrificio_rato_id)
  );

-- Trava da categoria de alíquota confirmada: volume não muda mais.
create or replace function public.travar_aliquota_categoria_confirmada()
returns trigger language plpgsql as $$
begin
  if OLD.confirmado then
    if NEW.volume_ul is distinct from OLD.volume_ul
       or NEW.confirmado is distinct from OLD.confirmado then
      raise exception 'Alíquota confirmada: o volume não pode mais mudar.';
    end if;
  end if;
  return NEW;
end;
$$;
drop trigger if exists travar_aliquota_categoria on public.sacrificio_aliquota_categorias;
create trigger travar_aliquota_categoria before update on public.sacrificio_aliquota_categorias
  for each row execute function public.travar_aliquota_categoria_confirmada();

-- ----------------------------------------------------------------------------
-- CONTAGEM PÚBLICA DE PROJETOS
-- ----------------------------------------------------------------------------
-- Só o número, nunca os dados — usado na página inicial pública (barra
-- lateral) pra mostrar "X projetos de pesquisa em andamento" sem expor
-- nome/membros de nenhum projeto a quem não tem permissão de lê-los.
create or replace function public.contagem_projetos_ativos()
returns integer
language sql
security definer
set search_path = public
stable
as $$
  select count(*)::integer from public.projetos;
$$;

grant execute on function public.contagem_projetos_ativos() to anon, authenticated;

-- ----------------------------------------------------------------------------
-- EXCLUSÃO DE PROJETO (só enquanto não há dado registrado)
-- ----------------------------------------------------------------------------
-- Um coautor pode excluir um projeto que acabou de criar e ficou errado, DESDE
-- QUE não haja nada registrado dentro dele: nenhum resultado de teste e nenhum
-- sacrifício. O delete cascateia para grupos, membros, testes, versões e todo
-- o módulo de sacrifício (todas as FKs para projetos são "on delete cascade").
-- Roda como security definer (bypassa RLS, mesmo padrão de criar_projeto) e faz
-- a autorização e a guarda de dados explicitamente aqui dentro — não há política
-- de delete em projetos, essa função é o único caminho de exclusão.
create or replace function public.excluir_projeto(p_projeto_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.eh_coautor_projeto(p_projeto_id) then
    raise exception 'Só um coautor do projeto pode excluí-lo.';
  end if;

  if exists (
    select 1
    from public.resultados_teste rt
    join public.projeto_testes pt on pt.id = rt.projeto_teste_id
    where pt.projeto_id = p_projeto_id
  ) then
    raise exception 'Este projeto já tem resultado de teste registrado e não pode ser excluído.';
  end if;

  if exists (
    select 1 from public.sacrificios where projeto_id = p_projeto_id
  ) then
    raise exception 'Este projeto já tem sacrifício registrado e não pode ser excluído.';
  end if;

  delete from public.projetos where id = p_projeto_id;
end;
$$;

grant execute on function public.excluir_projeto(uuid) to authenticated;

-- ----------------------------------------------------------------------------
-- APROVAÇÃO DE CADASTRO PELO SITE (Ariel + orientadora)
-- ----------------------------------------------------------------------------
-- Até aqui, todo cadastro nascia aprovado=false e só a chave de serviço
-- (script revisar-cadastros.mjs) mudava isso. Esta seção leva a aprovação
-- para dentro do site: uma flag "pode_aprovar_cadastros" (protegida de
-- autoedição igual papel/aprovado/pode_exportar_dados) e duas funções
-- security definer que fazem a autorização explicitamente lá dentro.

alter table public.profiles
  add column if not exists pode_aprovar_cadastros boolean not null default false;

-- Leitura da própria flag (o menu precisa saber se mostra a aba "Cadastros").
-- Aditivo ao grant select de colunas já existente em profiles.
grant select (pode_aprovar_cadastros) on public.profiles to authenticated;

-- Ninguém muda a própria flag pelo site (mesmo motivo de papel/aprovado).
revoke update (pode_aprovar_cadastros) on public.profiles from authenticated;

-- Quem pode aprovar: a orientadora (sempre) ou quem tem a flag ligada
-- (o Ariel). Reusa o mesmo desenho de is_orientador()/pode_exportar_dados().
create or replace function public.pode_aprovar_cadastros()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.is_orientador() or exists (
    select 1 from public.profiles
    where profiles.id = auth.uid() and profiles.pode_aprovar_cadastros = true
  );
$$;

-- Aprova um cadastro pendente. Autoriza e valida aqui dentro (não há policy
-- de update em profiles.aprovado para authenticated). Só aprova bolsista.
create or replace function public.aprovar_cadastro(p_profile_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.pode_aprovar_cadastros() then
    raise exception 'Sem permissão para aprovar cadastros.';
  end if;

  update public.profiles
    set aprovado = true
    where id = p_profile_id and papel = 'bolsista';
end;
$$;

-- Recusa um cadastro: apaga a conta de login inteira (cascata apaga o
-- profile), mesmo efeito do "rejeitar" do script. profiles.id = auth.users.id
-- neste schema, então o delete é direto pelo id do profile. Guarda: nunca
-- deixa apagar uma conta já aprovada nem uma que não seja bolsista.
create or replace function public.rejeitar_cadastro(p_profile_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.pode_aprovar_cadastros() then
    raise exception 'Sem permissão para recusar cadastros.';
  end if;

  if not exists (
    select 1 from public.profiles
    where id = p_profile_id and papel = 'bolsista' and aprovado = false
  ) then
    raise exception 'Só é possível recusar um cadastro de bolsista ainda pendente.';
  end if;

  delete from auth.users where id = p_profile_id;
end;
$$;

-- Lista os cadastros pendentes com e-mail — a coluna email NÃO é exposta no
-- grant de select de profiles (é sensível), então quem aprova só a vê por
-- esta função, e apenas se tiver permissão.
create or replace function public.listar_cadastros_pendentes()
returns table (id uuid, nome text, email text, created_at timestamptz)
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  if not public.pode_aprovar_cadastros() then
    raise exception 'Sem permissão para ver cadastros pendentes.';
  end if;

  return query
    select p.id, p.nome, p.email, p.created_at
    from public.profiles p
    where p.papel = 'bolsista' and p.aprovado = false
    order by p.created_at;
end;
$$;

grant execute on function public.pode_aprovar_cadastros() to authenticated;
grant execute on function public.listar_cadastros_pendentes() to authenticated;
grant execute on function public.aprovar_cadastro(uuid) to authenticated;
grant execute on function public.rejeitar_cadastro(uuid) to authenticated;

-- ═══════════════════════════════════════════════════════════════════════════
-- Estoque de reagentes (inventário do laboratório) + consumo real por teste
-- ═══════════════════════════════════════════════════════════════════════════
-- O estoque é do LABORATÓRIO inteiro (não de um projeto): quais soluções prontas
-- existem, quanto tem (mL) e onde ficam (geladeira/freezer/armário de uso/
-- armário de reagentes PA). Qualquer bolsista ou orientadora vê e mantém.
create table if not exists public.reagentes_estoque (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  -- 'solucao' = solução/tampão pronto; 'pa' = reagente P.A. puro (estrutura já
  -- pronta; o registro detalhado dos P.A. virá depois).
  tipo text not null default 'solucao' check (tipo in ('solucao', 'pa')),
  quantidade_ml numeric, -- legado (soluções); ver `quantidade`/`unidade` abaixo.
  minimo_ml numeric,      -- legado; ver `minimo`.
  localizacao text check (
    localizacao in ('geladeira', 'freezer', 'armario_uso', 'armario_pa')
  ),
  obs text,
  atualizado_por uuid references public.profiles (id),
  atualizado_em timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (nome)
);

-- Categoria (tópico) e unidade genérica do item de estoque. Categorias:
--   'solucao'  = reagentes/soluções prontos (mL/L) — os que o consumo abate;
--   'pa'       = reagentes P.A. puros (mL, L, g, kg);
--   'ponteira' = ponteiras e eppendorfs (por tipo, contagem);
--   'material' = materiais de uso (tubos, béqueres, erlenmeyers... contagem).
alter table public.reagentes_estoque add column if not exists categoria text
  not null default 'solucao';
alter table public.reagentes_estoque add column if not exists quantidade numeric;
alter table public.reagentes_estoque add column if not exists unidade text default 'mL';
alter table public.reagentes_estoque add column if not exists minimo numeric;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'reagentes_estoque_categoria_check') then
    alter table public.reagentes_estoque add constraint reagentes_estoque_categoria_check
      check (categoria in ('solucao', 'pa', 'ponteira', 'material'));
  end if;
end $$;
-- Migra o modelo antigo (quantidade_ml/minimo_ml em mL) para o genérico.
update public.reagentes_estoque
  set quantidade = quantidade_ml
  where quantidade is null and quantidade_ml is not null;
update public.reagentes_estoque
  set minimo = minimo_ml
  where minimo is null and minimo_ml is not null;
update public.reagentes_estoque set unidade = 'mL' where unidade is null;
-- Se a coluna antiga `tipo` existir (versão inicial), alinha categoria com ela.
update public.reagentes_estoque set categoria = 'pa'
  where categoria = 'solucao' and tipo = 'pa';

-- Pedidos dos bolsistas (falta/precisa de algo) — vão para a aba Pedidos do
-- Ariel e da orientadora.
create table if not exists public.pedidos (
  id uuid primary key default gen_random_uuid(),
  item text not null,
  quantidade text,       -- livre (ex.: "2 caixas", "500 mL") — pedido informal.
  categoria text,        -- opcional: solucao/pa/ponteira/material/outro.
  motivo text,
  obs text,
  status text not null default 'aberto' check (status in ('aberto', 'atendido')),
  solicitado_por uuid not null references public.profiles (id),
  criado_em timestamptz not null default now(),
  atendido_por uuid references public.profiles (id),
  atendido_em timestamptz
);

alter table public.pedidos enable row level security;
alter table public.pedidos force row level security;
-- Vê os próprios pedidos; orientadora e quem aprova cadastros (Ariel) veem todos.
drop policy if exists "Vê os pedidos" on public.pedidos;
create policy "Vê os pedidos" on public.pedidos for select
  using (
    solicitado_por = auth.uid()
    or public.is_orientador()
    or public.pode_aprovar_cadastros()
  );
drop policy if exists "Bolsista cria pedido" on public.pedidos;
create policy "Bolsista cria pedido" on public.pedidos for insert
  with check (solicitado_por = auth.uid());
-- Só orientadora / quem aprova cadastros marca como atendido ou remove.
drop policy if exists "Gestor atualiza pedido" on public.pedidos;
create policy "Gestor atualiza pedido" on public.pedidos for update
  using (public.is_orientador() or public.pode_aprovar_cadastros())
  with check (public.is_orientador() or public.pode_aprovar_cadastros());
drop policy if exists "Solicitante ou gestor remove pedido" on public.pedidos;
create policy "Solicitante ou gestor remove pedido" on public.pedidos for delete
  using (
    solicitado_por = auth.uid()
    or public.is_orientador()
    or public.pode_aprovar_cadastros()
  );

alter table public.reagentes_estoque enable row level security;
alter table public.reagentes_estoque force row level security;
drop policy if exists "Usuários veem o estoque" on public.reagentes_estoque;
create policy "Usuários veem o estoque" on public.reagentes_estoque for select
  using (auth.uid() is not null);
drop policy if exists "Usuários mantêm o estoque" on public.reagentes_estoque;
create policy "Usuários mantêm o estoque" on public.reagentes_estoque for all
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

-- Consumo REAL de cada reagente em um teste (o bolsista registra no fim quanto
-- de fato usou, que pode diferir do estimado). Ao gravar, a action dá baixa no
-- estoque da solução correspondente (pelo nome). Uma linha por (teste, reagente).
create table if not exists public.consumo_real (
  id uuid primary key default gen_random_uuid(),
  projeto_teste_id uuid not null references public.projeto_testes (id) on delete cascade,
  reagente_nome text not null,
  volume_estimado_ul numeric,
  volume_real_ul numeric,
  registrado_por uuid references public.profiles (id),
  registrado_em timestamptz not null default now(),
  unique (projeto_teste_id, reagente_nome)
);

alter table public.consumo_real enable row level security;
alter table public.consumo_real force row level security;
drop policy if exists "Equipe do teste vê o consumo" on public.consumo_real;
create policy "Equipe do teste vê o consumo" on public.consumo_real for select
  using (
    public.eh_executor_teste(projeto_teste_id)
    or public.eh_coautor_do_teste(projeto_teste_id)
    or public.is_orientador()
  );
drop policy if exists "Executor registra o consumo" on public.consumo_real;
create policy "Executor registra o consumo" on public.consumo_real for all
  using (
    public.eh_executor_teste(projeto_teste_id)
    or public.eh_coautor_do_teste(projeto_teste_id)
    or public.is_orientador()
  )
  with check (
    public.eh_executor_teste(projeto_teste_id)
    or public.eh_coautor_do_teste(projeto_teste_id)
    or public.is_orientador()
  );

-- Consumo real também congela quando o teste é encerrado (mesma garantia dos
-- resultados/passos).
drop trigger if exists bloquear_encerrado_consumo on public.consumo_real;
create trigger bloquear_encerrado_consumo
  before insert or update on public.consumo_real
  for each row execute function public.bloquear_se_teste_encerrado();

-- ═══════════════════════════════════════════════════════════════════════════
-- Sessões de laboratório (transparência de horas)
-- ═══════════════════════════════════════════════════════════════════════════
-- Cada ida ao laboratório: o bolsista inicia a sessão (fim null = em andamento)
-- e, ao encerrar, marca o que fez (tópicos) e o tempo total fica registrado.
-- Também pode registrar uma sessão passada informando início/fim. Alimenta o
-- painel da orientadora (horas no lab).
create table if not exists public.sessoes_lab (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  inicio timestamptz not null,
  fim timestamptz,
  topicos text[] not null default '{}',
  descricao text,
  criado_em timestamptz not null default now()
);
-- Acelera achar a sessão aberta de cada pessoa.
create index if not exists sessoes_lab_abertas
  on public.sessoes_lab (profile_id) where fim is null;

alter table public.sessoes_lab enable row level security;
alter table public.sessoes_lab force row level security;
drop policy if exists "Vê as próprias sessões" on public.sessoes_lab;
create policy "Vê as próprias sessões" on public.sessoes_lab for select
  using (
    profile_id = auth.uid()
    or public.is_orientador()
    or public.pode_aprovar_cadastros()
  );
drop policy if exists "Registra a própria sessão" on public.sessoes_lab;
create policy "Registra a própria sessão" on public.sessoes_lab for insert
  with check (profile_id = auth.uid());
drop policy if exists "Edita a própria sessão" on public.sessoes_lab;
create policy "Edita a própria sessão" on public.sessoes_lab for update
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());
drop policy if exists "Remove a própria sessão" on public.sessoes_lab;
create policy "Remove a própria sessão" on public.sessoes_lab for delete
  using (profile_id = auth.uid());

-- ═══════════════════════════════════════════════════════════════════════════
-- Procedimentos de biotério: caixas dos ratos + tratamentos/induções por grupo
-- ═══════════════════════════════════════════════════════════════════════════
-- Cada caixa (gaiola) tem um grupo e um nº de animais; a etiqueta é gerada a
-- partir disso + o tratamento do grupo. Caixas do mesmo grupo compartilham o
-- tratamento (a etiqueta repete por caixa). `mortos` acompanha a sobrevivência
-- durante o tratamento.
create table if not exists public.bioterio_caixas (
  id uuid primary key default gen_random_uuid(),
  projeto_id uuid not null references public.projetos (id) on delete cascade,
  numero integer not null,
  grupo_id uuid not null references public.projeto_grupos (id),
  num_ratos integer not null default 0,
  peso_medio_g numeric,
  mortos integer not null default 0,
  criado_por uuid references public.profiles (id),
  criado_em timestamptz not null default now(),
  unique (projeto_id, numero)
);

-- Tratamento por (projeto, grupo): indução (TRATAMENTO 1) + tratamento
-- (TRATAMENTO 2, com nº de dias).
create table if not exists public.bioterio_tratamentos (
  id uuid primary key default gen_random_uuid(),
  projeto_id uuid not null references public.projetos (id) on delete cascade,
  grupo_id uuid not null references public.projeto_grupos (id),
  inducao_ativa boolean not null default false,
  inducao_doenca text,      -- dm1 | dm2 | depressao
  inducao_substancia text,
  inducao_via text,         -- ip | sc | gavagem
  inducao_dose text,
  tratamento_ativa boolean not null default false,
  tratamento_substancia text,
  tratamento_via text,
  tratamento_dose text,
  tratamento_dias integer,
  tratamento_inicio date,
  atualizado_por uuid references public.profiles (id),
  atualizado_em timestamptz not null default now(),
  unique (projeto_id, grupo_id)
);

do $$ begin
  alter table public.bioterio_caixas enable row level security;
  alter table public.bioterio_caixas force row level security;
  alter table public.bioterio_tratamentos enable row level security;
  alter table public.bioterio_tratamentos force row level security;
end $$;

drop policy if exists "Membros veem as caixas" on public.bioterio_caixas;
create policy "Membros veem as caixas" on public.bioterio_caixas for select
  using (public.eh_membro_projeto(projeto_id) or public.is_orientador());
drop policy if exists "Membros gerenciam as caixas" on public.bioterio_caixas;
create policy "Membros gerenciam as caixas" on public.bioterio_caixas for all
  using (public.eh_membro_projeto(projeto_id))
  with check (public.eh_membro_projeto(projeto_id));

drop policy if exists "Membros veem os tratamentos" on public.bioterio_tratamentos;
create policy "Membros veem os tratamentos" on public.bioterio_tratamentos for select
  using (public.eh_membro_projeto(projeto_id) or public.is_orientador());
drop policy if exists "Membros gerenciam os tratamentos" on public.bioterio_tratamentos;
create policy "Membros gerenciam os tratamentos" on public.bioterio_tratamentos for all
  using (public.eh_membro_projeto(projeto_id))
  with check (public.eh_membro_projeto(projeto_id));
