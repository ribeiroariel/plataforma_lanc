# plataforma-lanc

Site do LANC — Laboratório de Neurociências e Comportamento (FURB),
orientado pela Profa. Dra. Débora Delwing Dal Magro. Projeto irmão do
`plataforma-atletas`.

Estado atual, subagentes/skills disponíveis e visão de produto completa:
ver `CLAUDE.md`.

## Estrutura

- `.claude/agents/` — subagentes deste projeto (`buscar-artigos-LANC`,
  `dev-plataforma-lanc`).
- `.claude/skills/` — skills deste projeto (`criacao-de-noticias`).
- `content/noticias/` — rascunhos de notícias aprovados (Markdown),
  estágio temporário antes do Supabase estar no ar.
- `content/referencias-manual/` — espelho em texto do manual de técnicas e
  testes bioquímicos do laboratório, para consulta rápida ao construir a
  área de bolsistas.

Código de aplicação (Next.js/Supabase) ainda não existe neste repositório.
