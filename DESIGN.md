# Guia visual — Portal do LANC

Base para qualquer mudança **visual** do site do Laboratório de
Neurociências e Comportamento (cores, tipografia, layout, animação, imagens,
textos de tela). A parte funcional já está estabelecida: este guia não pede
migração de stack nem troca de fluxo de deploy.

Consolidado em 25/11/2026 a partir da identidade que o site já tem
(`src/app/globals.css`, componentes de `src/components/ui/`) e de um
briefing de design (NotebookLM) — só a parte visual do briefing foi
aproveitada, e ela foi encaixada na identidade existente, não por cima dela.

---

## 1. Para quem e como é usado

- **Público externo** (página inicial, Notícias, Quem somos): comunidade
  acadêmica, banca, alunos interessados. Precisa transmitir **autoridade
  científica e rigor**, sem ar de propaganda.
- **Área interna** (bolsistas e orientadora): rotina do laboratório —
  testes, projetos, estoque, biotério, agenda. Precisa ser **clara e
  eficiente**, uso frequente, muita informação tabular.
- O mesmo produto nas duas pontas: as telas internas usam a mesma gramática
  do hall público pra não parecerem outro sistema.

## 2. Identidade

### Conceito

**Periódico científico**: papel, tinta, réguas finas, serifa editorial.
A paleta não é "azul de laboratório genérico" — cada cor vem da química
real dos ensaios do LANC.

### Cores (tokens em `src/app/globals.css`, com versão escura)

| Token | Claro | Origem / uso |
|---|---|---|
| `ink` / `ink-soft` | `#1c1a15` / `#6b6558` | Tinta de impressão: texto e texto secundário |
| `paper` / `paper-raised` | `#ffffff` / `#faf9f6` | Papel de periódico |
| `rule` | `#e7e2d8` | Réguas e divisórias finas |
| `signal` | `#157a43` | Verde da logo do LANC: acento **editorial** (sobretítulos, chamadas, faixa do cabeçalho) |
| `absorbance` | `#24427a` | Azul do biureto (Lowry, 650 nm): **dados** — gráficos, links da área logada, foco de teclado |
| `reagent` | `#a8721b` | Âmbar da hidrazona do DNPH: destaque secundário, atenção suave |
| `pyrogallol` | `#5b3b82` | Violeta do pirogalol (SOD): terceira cor de dados/categorias |
| `alerta` | `#a8402f` | Erro, pendência, vencido |
| `sucesso` | `#1f7a4d` | Concluído (não confundir com `signal`) |

Regras:
- Verde (`signal`) = voz editorial do laboratório. Azul (`absorbance`) =
  dado científico. Não trocar os papéis.
- Usar sempre os tokens, nunca cores cruas do Tailwind (`green-600` etc.).
- Toda cor nova precisa de par no tema escuro (`[data-theme="dark"]` e
  `prefers-color-scheme`).

### Tipografia

- **Newsreader** (`font-display`, serifada, com itálico): títulos, nomes de
  artigos, citações. É a marca de "periódico".
- **Public Sans** (`font-sans`): texto corrido e interface.
- **IBM Plex Mono** (`font-mono`, já com números tabulares): datas,
  contagens, absorbâncias, códigos (DOI), sobretítulos curtos.
- Hierarquia por tamanho e peso, não por cor.

### Formas

- Réguas finas (`border-rule`) em vez de cartões com sombra.
- Cantos discretos; nada de bolhas arredondadas exageradas.
- Muito espaço em branco e coluna de leitura confortável (`max-w-2xl` pra
  texto longo).

## 3. Módulos visuais (público)

Ao criar ou refazer estas seções, seguir este desenho:

1. **Notícias e publicações** — cartão com imagem de capa (ou
   `IlustracaoRedox` quando não houver), etiqueta de tipo (*Publicação* /
   *Atividade*), título em serifa, data em mono, resumo curto e dois links:
   "Ler notícia" e **"Artigo (DOI)"** com o código DOI visível em mono.
2. **Linhas de pesquisa** — as cinco frentes (estresse oxidativo, depressão
   experimental, diabetes experimental, neurotoxicidade, bioprospecção de
   plantas nativas). Evitar grade de 5 cartões idênticos: preferir lista
   editorial com régua, número e uma linha de descrição, ou composição
   assimétrica.
3. **Em números** — bolsistas ativos, projetos em andamento, publicações.
   Números grandes em serifa ou mono, contagem animada **uma vez** ao entrar
   na tela, valores sempre reais vindos do banco (nada inventado).
4. **Quem somos** — retratos com o mesmo recorte e tratamento, agrupados
   por papel (Coordenação, Mestrado, Iniciação Científica, Voluntários),
   nome em serifa e função/linha de pesquisa em texto secundário.
5. **Acesso interno** — "Entrar" e "Cadastro de bolsista" sempre visíveis
   no topo; no celular, acessíveis sem rolar.

## 4. Área interna

- Cabeçalho de página com `PageHeader` (sobretítulo + título serifa + ação à
  direita) e blocos separados por `SectionTitle`.
- Tabelas e números em mono, alinhados; status com `Badge` nas cores de
  estado (`sucesso`, `reagent`, `alerta`).
- Estados vazios com `EmptyState` (explica o que fazer, não só "nada aqui").
- Impressão limpa (o CSS de `@media print` já esconde cabeçalho/rodapé).

## 5. Movimento

- Discreto e acadêmico: `Revelar` pra entrada suave, contadores que sobem
  uma vez, hover que sublinha ou desloca 1–2 px.
- **Um** efeito de destaque por página, no máximo (ex.: ilustração de
  redox na abertura). Nada de partículas ou letreiros em loop.
- Sempre respeitar `prefers-reduced-motion` (já tratado em `globals.css`).

## 6. Acessibilidade

- Foco de teclado visível com anel `absorbance` (já global).
- Contraste AA no claro e no escuro; conferir as duas versões.
- Alvos de toque de pelo menos 44 px na área interna (usada no celular
  dentro do laboratório).

## 7. Tom dos textos

- Institucional, preciso e sem exagero. Sem slogans nem frases de efeito.
- Nomes e títulos acadêmicos completos e corretos (ex.: "Profa. Dra. Débora
  Delwing Dal Magro").
- Publicações citadas com dados reais (periódico, ano, DOI). Nunca inventar
  artigo, número ou membro.

## 8. O que evitar (anti "cara de IA")

- Gradientes azul-roxo genéricos, vidro fosco, brilhos.
- Fotos de banco de imagem de "cientista de jaleco olhando tubo".
- Grades simétricas de cartões iguais em toda seção.
- Ícones de estilos misturados ou emojis como ícone.
- Paleta "de laboratório" genérica no lugar dos tokens com significado.

## 9. Como fazer uma mudança visual

1. Olhar a tela atual no celular e no computador, nos temas claro e escuro.
2. Se a mudança for grande, descrever a proposta pro Ariel antes de
   codificar (ele aprova ou rejeita por item).
3. Reaproveitar tokens e componentes de `src/components/ui/`; criar cor ou
   fonte nova só se não houver equivalente.
4. Conferir na prévia local nos dois tamanhos e nos dois temas.
5. Trabalhar num ramo novo e entregar o link do pull request pra ele
   publicar (ele faz o merge pelo botão do GitHub; o ramo principal aqui é
   `master`).
