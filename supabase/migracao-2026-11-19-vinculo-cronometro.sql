-- Migração (2026-11-19): vínculo de cada pessoa com o laboratório, trava no
-- papel do cadastro e cronômetro de teste. O mesmo está em schema.sql. Idempotente.

-- 1) Vínculo: bolsista (IC com bolsa), voluntário, mestrado ou doutorado.
--    A orientadora não usa (fica com o padrão, não aparece na tela).
alter table public.profiles
  add column if not exists vinculo text not null default 'voluntario';
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_vinculo_check') then
    alter table public.profiles
      add constraint profiles_vinculo_check
      check (vinculo in ('bolsista', 'voluntario', 'mestrado', 'doutorado'));
  end if;
end $$;

-- A leitura de profiles é por lista de colunas: sem incluir "vinculo" aqui
-- o site não consegue ler o campo (e a lista precisa ter TODAS as colunas
-- que o site lê — ver o comentário em schema.sql).
grant select (id, nome, papel, aprovado, pode_exportar_dados, pode_aprovar_cadastros, foto_url, apresentacao, vinculo, created_at)
  on public.profiles to anon, authenticated;

-- 2) Cadastro: o papel é SEMPRE bolsista. Antes ele vinha do que o
--    formulário mandava, e dava para criar conta já como "orientador"
--    chamando o Supabase direto. O vínculo vem do formulário (validado).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v text := coalesce(new.raw_user_meta_data ->> 'vinculo', 'voluntario');
begin
  if v not in ('bolsista', 'voluntario', 'mestrado', 'doutorado') then
    v := 'voluntario';
  end if;
  insert into public.profiles (id, nome, email, papel, vinculo)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nome', ''),
    new.email,
    'bolsista',
    v
  );
  return new;
end;
$$;

-- 3) Equipe atual: todos voluntários (padrão), menos o Hugo (bolsista) e as
--    mestrandas Rafaela, Roberta e Naiana. Casa pelo primeiro nome — confira
--    o resultado no select do fim antes de seguir.
update public.profiles set vinculo = 'bolsista'
  where papel = 'bolsista' and nome ilike 'hugo%';
update public.profiles set vinculo = 'mestrado'
  where papel = 'bolsista'
    and (nome ilike 'rafaela%' or nome ilike 'roberta%' or nome ilike 'naiana%');

select nome, vinculo from public.profiles
where papel = 'bolsista' and aprovado
order by vinculo, nome;

-- ════════════════════════════════════════════════════════════════════════════
-- CRONÔMETRO DE TESTE (tempo de bancada de cada teste, dentro das horas no lab)
-- ════════════════════════════════════════════════════════════════════════════
-- Cada vez que alguém aperta "iniciar" num teste vira uma execução, ligada à
-- sessão de laboratório aberta da pessoa (se não havia sessão aberta, o site
-- abre uma junto). Assim o tempo do teste conta dentro das horas no lab.
create table if not exists public.teste_execucoes (
  id uuid primary key default gen_random_uuid(),
  projeto_teste_id uuid not null references public.projeto_testes (id) on delete cascade,
  profile_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  sessao_lab_id uuid references public.sessoes_lab (id) on delete set null,
  inicio timestamptz not null default now(),
  fim timestamptz,
  constraint teste_execucoes_fim_depois check (fim is null or fim >= inicio)
);
create index if not exists teste_execucoes_abertas
  on public.teste_execucoes (profile_id) where fim is null;

alter table public.teste_execucoes enable row level security;
alter table public.teste_execucoes force row level security;

drop policy if exists "Vê as próprias execuções e as do projeto" on public.teste_execucoes;
create policy "Vê as próprias execuções e as do projeto" on public.teste_execucoes for select
  using (
    profile_id = auth.uid()
    or public.is_orientador()
    or exists (
      select 1 from public.projeto_testes pt
      where pt.id = projeto_teste_id and public.eh_membro_projeto(pt.projeto_id)
    )
  );
drop policy if exists "Registra a própria execução" on public.teste_execucoes;
create policy "Registra a própria execução" on public.teste_execucoes for insert
  with check (profile_id = auth.uid());
drop policy if exists "Fecha a própria execução" on public.teste_execucoes;
create policy "Fecha a própria execução" on public.teste_execucoes for update
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());
drop policy if exists "Apaga a própria execução" on public.teste_execucoes;
create policy "Apaga a própria execução" on public.teste_execucoes for delete
  using (profile_id = auth.uid());
