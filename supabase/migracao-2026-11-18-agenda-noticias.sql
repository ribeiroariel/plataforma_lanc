-- Migração (2026-11-18): agenda compartilhada de salas + bolsista publica
-- notícia. O mesmo conteúdo está em schema.sql (antes do bloco de Realtime);
-- este arquivo existe para rodar sozinho no SQL Editor. Idempotente.

-- ════════════════════════════════════════════════════════════════════════════
-- Função auxiliar: usuário logado e com cadastro aprovado.
-- ════════════════════════════════════════════════════════════════════════════
create or replace function public.eh_aprovado()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where profiles.id = auth.uid() and profiles.aprovado = true
  );
$$;

-- ════════════════════════════════════════════════════════════════════════════
-- AGENDA DE SALAS (T-129 Subst. Bioativas, T-201 Biofísica — laboratórios; T-206 — biotério)
-- ════════════════════════════════════════════════════════════════════════════
-- Uma reserva = sala + horário + o que vai ser feito + quem vai estar lá.
-- Nos laboratórios: teste (ligado a um teste designado, opcional), sacrifício
-- ou outro. No biotério: a intervenção (gavagem, indução, subcutânea...).
-- Todo mundo aprovado vê a agenda inteira; só quem criou (ou a orientadora)
-- edita/cancela. Choque de horário na mesma sala é avisado na tela, não
-- bloqueado (o laboratório comporta mais de uma pessoa).
create table if not exists public.reservas (
  id uuid primary key default gen_random_uuid(),
  sala text not null check (sala in ('T-201', 'T-129', 'T-206')),
  inicio timestamptz not null,
  fim timestamptz not null,
  tipo text not null check (tipo in (
    'teste', 'sacrificio',
    'gavagem', 'inducao', 'subcutanea', 'intraperitoneal', 'tratamento', 'pesagem',
    'outro'
  )),
  titulo text,
  observacao text,
  projeto_id uuid references public.projetos (id) on delete set null,
  projeto_teste_id uuid references public.projeto_testes (id) on delete set null,
  criado_por uuid not null default auth.uid() references public.profiles (id),
  created_at timestamptz not null default now(),
  constraint reservas_fim_depois check (fim > inicio),
  -- Intervenções de biotério só no biotério; teste/sacrifício só nos labs.
  constraint reservas_tipo_sala check (
    (sala = 'T-206' and tipo in ('gavagem', 'inducao', 'subcutanea', 'intraperitoneal', 'tratamento', 'pesagem', 'outro'))
    or (sala in ('T-201', 'T-129') and tipo in ('teste', 'sacrificio', 'outro'))
  )
);
create index if not exists reservas_inicio_idx on public.reservas (inicio);

create table if not exists public.reserva_pessoas (
  reserva_id uuid not null references public.reservas (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  primary key (reserva_id, profile_id)
);

alter table public.reservas enable row level security;
alter table public.reservas force row level security;
alter table public.reserva_pessoas enable row level security;
alter table public.reserva_pessoas force row level security;

drop policy if exists "Aprovados veem a agenda" on public.reservas;
create policy "Aprovados veem a agenda" on public.reservas for select
  using (public.eh_aprovado());
drop policy if exists "Aprovados reservam" on public.reservas;
create policy "Aprovados reservam" on public.reservas for insert
  with check (public.eh_aprovado() and criado_por = auth.uid());
drop policy if exists "Quem reservou edita" on public.reservas;
create policy "Quem reservou edita" on public.reservas for update
  using (criado_por = auth.uid() or public.is_orientador())
  with check (criado_por = auth.uid() or public.is_orientador());
drop policy if exists "Quem reservou cancela" on public.reservas;
create policy "Quem reservou cancela" on public.reservas for delete
  using (criado_por = auth.uid() or public.is_orientador());

create or replace function public.eh_dono_reserva(p_reserva uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.reservas
    where id = p_reserva and (criado_por = auth.uid() or public.is_orientador())
  );
$$;

drop policy if exists "Aprovados veem quem está na reserva" on public.reserva_pessoas;
create policy "Aprovados veem quem está na reserva" on public.reserva_pessoas for select
  using (public.eh_aprovado());
drop policy if exists "Dono da reserva escolhe as pessoas" on public.reserva_pessoas;
create policy "Dono da reserva escolhe as pessoas" on public.reserva_pessoas for all
  using (public.eh_dono_reserva(reserva_id))
  with check (public.eh_dono_reserva(reserva_id));

-- ════════════════════════════════════════════════════════════════════════════
-- NOTÍCIAS: bolsista monta e publica
-- ════════════════════════════════════════════════════════════════════════════
-- Autor da notícia (null = publicada pelo script local, sem autor no site).
alter table public.noticias add column if not exists autor_id uuid references public.profiles (id) on delete set null;

-- Qualquer aprovado escreve notícia em nome próprio; edita/apaga só as suas
-- (a orientadora continua com acesso total pela policy já existente).
drop policy if exists "Autor lê os próprios rascunhos" on public.noticias;
create policy "Autor lê os próprios rascunhos" on public.noticias for select
  using (autor_id = auth.uid());
drop policy if exists "Aprovados escrevem notícia" on public.noticias;
create policy "Aprovados escrevem notícia" on public.noticias for insert
  with check (public.eh_aprovado() and autor_id = auth.uid());
drop policy if exists "Autor edita a própria notícia" on public.noticias;
create policy "Autor edita a própria notícia" on public.noticias for update
  using (autor_id = auth.uid())
  with check (autor_id = auth.uid());
drop policy if exists "Autor apaga a própria notícia" on public.noticias;
create policy "Autor apaga a própria notícia" on public.noticias for delete
  using (autor_id = auth.uid());

-- Imagens das notícias: bucket público; cada pessoa escreve só na própria
-- pasta "{id}/...".
insert into storage.buckets (id, name, public)
values ('noticias', 'noticias', true)
on conflict (id) do nothing;

drop policy if exists "Aprovado sobe imagem de notícia" on storage.objects;
create policy "Aprovado sobe imagem de notícia" on storage.objects for insert
  with check (
    bucket_id = 'noticias'
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.eh_aprovado()
  );
drop policy if exists "Autor troca a própria imagem de notícia" on storage.objects;
create policy "Autor troca a própria imagem de notícia" on storage.objects for update
  using (bucket_id = 'noticias' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "Autor apaga a própria imagem de notícia" on storage.objects;
create policy "Autor apaga a própria imagem de notícia" on storage.objects for delete
  using (bucket_id = 'noticias' and (storage.foldername(name))[1] = auth.uid()::text);
