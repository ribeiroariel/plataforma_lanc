@AGENTS.md

# plataforma-lanc

Site do **LANC — Laboratório de Neurociências e Comportamento** (FURB), sob
orientação da Profa. Dra. Débora Delwing Dal Magro. Segue a mesma lógica do
projeto irmão `plataforma-atletas` (Next.js + Supabase + Vercel), mas para o
grupo de pesquisa em vez do treinamento de atletismo.

## Status atual (2026-07-07)

Scaffold do Next.js já existe (mesma stack/versões do `plataforma-atletas`:
Next 16.2.10 App Router, React 19.2.4, Tailwind 4, `@supabase/ssr`).
`npm run build` e `npm run lint` passam limpos. Implementado até aqui:

- `src/proxy.ts` — renova sessão e controla acesso por rota:
  `/bolsista` só papel `bolsista`, `/orientador` só papel `orientador`,
  `/projetos`, `/testes` e `/perfil` são **compartilhados** entre os dois
  papéis (só exigem login) — a orientadora precisa ler projetos dos
  bolsistas e editar o próprio perfil, então essas telas não podem ficar
  presas debaixo de `/bolsista`. Redireciona pra `/login` se não logado,
  ou pra `/` se o papel não bate com a rota exclusiva.
- `src/lib/supabase/{client,server,profile}.ts` e `src/lib/actions/auth.ts`
  — login, cadastro (sempre cria papel `bolsista` — não existe formulário
  público para criar conta de `orientador`, ver seção de segurança abaixo)
  e logout.
- Página inicial pública (`src/app/page.tsx`) — lista notícias publicadas e
  o carrossel de bolsistas, direto da tabela `profiles`/`noticias`. Se as
  variáveis de ambiente do Supabase não estiverem configuradas, mostra um
  aviso em vez de quebrar a página.
- `/login`, `/cadastro`.
- `/bolsista` — painel do bolsista (link pra `/testes` e `/projetos`).
- `/orientador` — painel da orientadora: lista de bolsistas aprovados (com
  contagem de projetos e testes pendentes/concluídos de cada um) e lista
  de todos os projetos (com membros, testes designados e quais estão
  pendentes) — consegue ler tudo isso porque a função `is_orientador()`
  está somada em toda policy de leitura relevante.
- `/testes` — barra lateral com todos os testes bioquímicos do manual,
  agrupados por tecido (córtex/rins, eritrócitos/plasma, fígado).
  Conteúdo em `content/testes/*.md`, extraído **literalmente** (sem
  reescrita) do manual via `content/testes/_indice.json` +
  `src/lib/testes.ts` — ver script que gerou os cortes em
  `$CLAUDE_JOB_DIR` (não versionado; se precisar refatiar após o manual
  mudar, recriar o script de corte por número de linha).
- `/testes/lowry-cortex-rins/calculadora` — calculadora **solta** da curva
  padrão de Lowry (sem vínculo com projeto/rato): bolsista digita a
  absorbância dos 6 tubos padrão (0, 10, 20, 40, 60, 80 µg de BSA), a
  página calcula regressão linear, R² e concentração das amostras na hora
  (`src/lib/estatistica.ts`), mostra gráfico (recharts) e salva em
  `curvas_lowry` (registro de transparência: sem update/delete pelo
  site). Pra Lowry dentro de um projeto, ver família "curva" abaixo — é
  outra tela, outra tabela.

- `/projetos`, `/projetos/novo`, `/projetos/[id]` — sistema de projetos
  (TCC/estudo). Criar projeto define nome, descrição, número de levas de
  sacrifício (só informativo por enquanto) e os grupos experimentais com
  a quantidade de ratos de cada um (numeração sequencial e global entre
  grupos, do jeito que o Ariel já faz fora do site). O criador vira
  automaticamente "coautor" (função `criar_projeto`, security definer,
  resolve o problema do "ovo e a galinha" das políticas). Coautor pode
  adicionar membros (por e-mail, via `buscar_bolsista_por_email` — não
  expõe a coluna `email` livremente) e designar testes do catálogo
  (`src/lib/tiposTeste.ts` filtra pra só os designáveis — ver abaixo) a um
  responsável. **Regra de visibilidade:** um "ajudante" só vê as
  designações de teste onde ele é o responsável, não o projeto inteiro —
  reforçado via RLS (`eh_coautor_projeto`/`eh_responsavel_teste`), não só
  na interface. A orientadora (e o Ariel, via `pode_exportar_dados()`) vê
  tudo, em qualquer projeto.
- `/projetos/[id]/testes/[testeId]` — registro de resultado, um rato por
  vez (roster gerado por `src/lib/roster.ts` a partir dos grupos). O
  comportamento muda por "família" de teste (`src/lib/tiposTeste.ts`,
  `configDoTeste`):
  - **CAT e SOD**: cálculo automático completo (fórmula do manual é
    autocontida). Entrada cinética (11 pontos/10s pra CAT, 5 pontos/30s
    pra SOD) com regressão linear + gráfico ao vivo
    (`src/lib/estatistica.ts`, mesma função usada pela calculadora de
    Lowry). SOD tem um controle de sessão (pirogalol sem amostra,
    compartilhado por todos os ratos daquela rodada) com o QC do manual
    (0,030–0,070 ΔAbs/min); CAT tem QC do meio de reação (0,70–0,85 Abs).
  - **TBARS, Sulfidrilas, Carboniladas, Tióis-Dissulfetos, Ácido
    Ascórbico, H2O2** ("simples"): a plataforma registra os valores
    brutos exatamente como no protocolo, mas o **valor final é digitado
    pelo bolsista**, não calculado pela plataforma — o manual não fecha
    numa fórmula única (depende de fator de diluição e da concentração de
    proteína de um ensaio de Lowry separado), e decidi não arriscar
    inventar essa conversão. Isso está explicado na própria tela, não é
    um bug escondido.
  - **Lowry** (família "curva"): mesmo padrão do SOD — curva de BSA (6
    pontos) preenchida uma vez por sessão, cada rato só informa a própria
    absorbância + fator de diluição, valor final por interpolação. Usa
    `resultados_teste` (não `curvas_lowry` — essa é só da calculadora
    solta, ver acima).
- `/api/exportar/[id]` — exporta o projeto pra `.xlsx`: uma aba
  "Dados_Brutos"-style por teste designado + uma aba "R_Tidy"
  (rato/grupo/teste/valor, formato longo) juntando todos os testes do
  projeto, no mesmo espírito de
  `Para análise estatísica/*_organizado_*.xlsx` no OneDrive. Baixado via
  botão "Exportar para o R" na página do projeto, só visível se
  `pode_exportar_dados = true`.

**Exportação de dados é só do Ariel — reforçado em dois lugares:**
`profiles.pode_exportar_dados` (protegida de autoedição igual
`papel`/`aprovado`) não só esconde/mostra o botão na interface, como
também tem uma função `pode_exportar_dados()` somada nas policies de
leitura de `projetos`/`projeto_membros`/`projeto_grupos`/`projeto_testes`/
`resultados_teste` — sem isso, marcar a flag não adiantaria nada, porque o
RLS ainda bloquearia o Ariel de ler projetos onde ele não é membro (esse
foi um bug que corrigi antes de implementar a exportação, não depois).
Setar manualmente: `update profiles set pode_exportar_dados = true where id = '<uuid do Ariel>';`

O Ariel já criou o projeto Supabase deste site (ref `yfjvgjpaorpryixumlfz`).
`.env.local` está completo e testado. **Atenção:** o bloco de
`pode_exportar_dados()` + as policies atualizadas foram adicionados numa
sessão em que o Ariel ainda não confirmou ter rodado essa versão mais
recente do `schema.sql` — antes de testar a exportação em produção,
confirmar (rodar o arquivo inteiro de novo é seguro).

**Segurança do papel "orientador":** de propósito, não existe nenhum jeito
de virar `orientador` pelo site. A Débora precisa se cadastrar como
qualquer bolsista e depois o Ariel promove ela manualmente rodando, no SQL
Editor do Supabase (com a chave de serviço, que ignora RLS):
`update profiles set papel = 'orientador', aprovado = true where id = '<uuid da Débora>';`

**Aprovação de cadastro:** todo cadastro novo nasce com `aprovado = false`
e `/bolsista`, `/projetos` e `/testes` mostram "aguardando aprovação" em
vez do conteúdo real até o Ariel liberar (cada área tem seu próprio
`layout.tsx` com essa checagem — `src/app/bolsista/layout.tsx`,
`src/app/projetos/layout.tsx`, `src/app/testes/layout.tsx`).
Não há e-mail automático — o Ariel pede pelo chat ("tem cadastro
pendente?") e a skill `revisar-cadastros-lanc` lista/aprova/rejeita via
`scripts/revisar-cadastros.mjs` (usa a chave de serviço).

- `/perfil` — qualquer pessoa logada (bolsista ou orientadora) edita a
  própria foto e apresentação breve, usadas no carrossel público da
  página inicial. Foto vai pro bucket `avatars` do Supabase Storage
  (público, mas só o dono escreve na própria pasta `{id}/foto.<ext>` —
  policies em `storage.objects`, ver fim do `schema.sql`), caminho
  `{id}/foto.<ext>` fixo (upsert sempre sobrescreve, sem acumular lixo).
  `src/lib/actions/perfil.ts` valida tipo (JPEG/PNG/WebP) e tamanho
  (5 MB).

Ainda não implementado (próximas fases): fórmula automática pra
TBARS/Sulfidrilas/Carboniladas/Tióis-Dissulfetos/Ácido Ascórbico/H2O2
(hoje é entrada manual do valor final — ver seção acima); import do
formato bruto do leitor Tecano pra dentro da tela de registro (hoje o
bolsista digita a leitura já processada).

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
- **Skill `revisar-cadastros-lanc`** (`.claude/skills/revisar-cadastros-lanc/`)
  — lista cadastros de bolsista pendentes e aprova/rejeita quando o Ariel
  pedir explicitamente pelo chat (nunca sozinha). Ver
  `scripts/revisar-cadastros.mjs`.

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

`content/testes/*.md` **é rastreado** (diferente do `referencias-manual/`
acima) — é metodologia científica padrão (Aebi 1984, Lowry 1951, Marklund
&amp; Marklund 1974 etc.), precisa estar no repositório para o site
funcionar em produção, e é conteúdo bem mais restrito que o manual
completo: só os capítulos de ensaio bioquímico (preparo de amostra,
princípio, reagentes, procedimento, expressão de resultados) + valores de
referência + tampões gerais + bibliografia. Ficaram de fora as seções 1-7
(regras do laboratório, biossegurança, manejo/sacrifício animal) e o
capítulo 39 inteiro (limpeza, POP-002, tabela de bombonas/códigos FURB por
resíduo). Cada procedimento individual ainda cita o código FURB da bombona
específica daquele ensaio (ex.: "FURB 40255" no Lowry) porque isso está
embutido no parágrafo do próprio método, não é a tabela consolidada.
