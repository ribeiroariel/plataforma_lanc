-- Migração avulsa (2026-11-18) — o mesmo que já está em schema.sql, isolado
-- para rodar sozinho no SQL Editor do Supabase sem reexecutar o arquivo todo.
-- Idempotente: pode rodar mais de uma vez.

-- 1) Branco do reagente da sessão (ver comentário em schema.sql).
alter table public.projeto_testes add column if not exists branco_reagente jsonb;

-- 2) Sulfidrilas: toda designação antiga vira "sulfidrilas totais".
alter table public.projeto_testes disable trigger travar_encerrado;
update public.projeto_testes
set teste_slug = regexp_replace(teste_slug, '^sulfidrilas-', 'sulfidrilas-totais-')
where teste_slug ~ '^sulfidrilas-(cortex|hipocampo|cerebelo|rins|eritrocitos|plasma|figado)$';
alter table public.projeto_testes enable trigger travar_encerrado;

-- Conferência: deve listar só slugs sulfidrilas-totais-* / sulfidrilas-np-*.
select teste_slug, count(*) from public.projeto_testes
where teste_slug like 'sulfidrilas%'
group by teste_slug order by teste_slug;
