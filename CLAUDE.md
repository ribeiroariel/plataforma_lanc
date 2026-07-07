# plataforma-lanc

Site do **LANC — Laboratório de Neurociências e Comportamento** (FURB), sob
orientação da Profa. Dra. Débora Delwing Dal Magro. Segue a mesma lógica do
projeto irmão `plataforma-atletas` (Next.js + Supabase + Vercel), mas para o
grupo de pesquisa em vez do treinamento de atletismo.

## Status atual (2026-07-07)

Ainda **não há código de aplicação** — este repositório começou pelos
subagentes/skills do pipeline de conteúdo, que já são úteis mesmo antes do
site existir (o rascunho das notícias fica em `content/noticias/` até o
Supabase estar no ar). O scaffold do Next.js/Supabase entra numa fase
seguinte, quando o Ariel confirmar a arquitetura da área de bolsistas.

## As duas frentes do site (visão do produto)

1. **Hall público de notícias** — divulgação do laboratório: artigos
   publicados pela Dra. Débora (notícia + link + print do artigo) e
   atualizações do dia a dia do grupo. Inclui um carrossel dos bolsistas
   (foto + apresentação breve).
2. **Área logada** — dois papéis, `bolsista` e `orientador` (só a Débora):
   - Bolsista: barra lateral com cada teste bioquímico do laboratório
     (protocolo passo a passo, a partir do `Manual_LANC` — ver
     `content/referencias-manual/`), ferramentas específicas por teste
     (ex.: curva padrão de Lowry com cálculo de R² ≥ 0,99 direto na tela),
     controle de qualidade com faixas de referência do manual (ex.:
     pirogalol 0,030–0,070 Abs/min no ensaio de SOD), e um sistema de
     projetos (o bolsista cria um projeto tipo TCC, adiciona coautores e
     ajudantes, designa quem faz qual teste, registra resultados).
   - Orientadora: acompanha todos os bolsistas, o que cada um está
     produzindo, quais testes já/ainda não foram feitos por projeto —
     visão de transparência para ela e para futuros revisores de artigo.
3. **Exportação para análise estatística** — os dados registrados na
   plataforma devem poder virar uma planilha Excel no formato que o
   `LANC` (projeto de R em
   `02 - Pesquisa e Laboratório\Artigos\Estatística\LANC\LANC`) espera,
   para o Ariel baixar e analisar. Import inverso: exportações brutas do
   leitor Tecano (i-control) — cabeçalho de metadados + matriz poços×ciclos
   de absorbância — precisam ser convertidas para o formato de entrada da
   plataforma.

## Subagentes e skills deste projeto

- **Skill `criacao-de-noticias`** (`.claude/skills/criacao-de-noticias/`) —
  transforma conteúdo bruto (artigo publicado, atualização do grupo) em
  post estruturado para o hall de notícias. Aciona o subagente
  `buscar-artigos-LANC` quando o insumo é um artigo publicado (para
  confirmar metadados/DOI/resumo); não aciona para posts de atividade do
  laboratório (economia de tokens).
- **Subagente `buscar-artigos-LANC`** (`.claude/agents/buscar-artigos-LANC.md`)
  — pesquisa PubMed/Google Scholar/portal CAPES por publicações da Dra.
  Débora e do grupo LANC, devolve metadados prontos para a skill acima.
- **Subagente `dev-plataforma-lanc`** (`.claude/agents/dev-plataforma-lanc.md`)
  — dev full-stack deste repo (mesma função que `dev-plataforma-atletas`
  tem no projeto irmão): convenções de stack, deploy, RLS, e apoio nas
  tarefas de interface/adaptabilidade das áreas de bolsista e orientadora.

## Convenção de stack (decidida por analogia ao `plataforma-atletas`)

Next.js (App Router) + TypeScript + Tailwind + Supabase (`@supabase/ssr`) +
Vercel, mesmo padrão de `supabase/schema.sql` como fonte única de verdade
(rodado manualmente no SQL Editor, nunca sozinho em produção) e RLS `force`
em todas as tabelas. Ainda não scaffolded — ver subagente `dev-plataforma-lanc`
para os detalhes assim que o código começar.

## Dados sensíveis e visibilidade do repositório

Decisão (2026-07-07): o dado de pesquisa de verdade (resultados de ensaio,
controles de qualidade, projetos/TCC) mora só no Supabase, protegido por
RLS — nunca no repositório. Com essa separação, o **repositório de código
pode ser público** (mesmo espírito do `plataforma-atletas`). O Ariel vai
criar um projeto Supabase novo e dedicado para este site (não reaproveitar
o do `plataforma-atletas`).

Exceção: `content/referencias-manual/*.txt` (espelho do manual interno do
laboratório — biossegurança, sacrifício animal, códigos de descarte FURB)
está no `.gitignore` por não ser claramente conteúdo pensado para ser
público, mesmo não sendo dado de pesquisa. Fica só local até o Ariel
decidir. `content/noticias/` continua rastreado normalmente — nasce para
virar conteúdo público do hall de notícias.
