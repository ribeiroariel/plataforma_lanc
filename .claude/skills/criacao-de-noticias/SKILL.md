---
name: criacao-de-noticias
description: Transforma conteúdo bruto que o Ariel fornece (um artigo publicado pela Dra. Débora Delwing Dal Magro ou pelo grupo LANC, uma atualização do dia a dia do laboratório, um print/foto) em um post estruturado para o hall de notícias do site plataforma-lanc. Use quando o Ariel colar um link/PDF de artigo, disser "sai um artigo novo", "publica isso no site", "transforma isso em notícia", ou passar qualquer conteúdo que deva virar publicação de divulgação do laboratório. Aciona o subagente buscar-artigos-LANC só quando o insumo é um artigo publicado (para confirmar DOI/resumo/metadados); para posts de atividade do grupo sem publicação associada, monta o post direto do que o Ariel descreveu, sem pesquisa.
---

# criacao-de-noticias

## Quando usar

Sempre que o Ariel fornecer conteúdo que deva virar uma notícia/post no
hall público do site do LANC: (a) um artigo científico recém-publicado
pela Dra. Débora ou pelo grupo, ou (b) uma atualização de atividade do
laboratório (o que o grupo está fazendo, um marco do projeto, etc.).

## Passo a passo

1. **Classifique o insumo.**
   - Se for um artigo publicado (link, DOI, PDF, ou só "saiu um artigo da
     Débora sobre X"): acione o subagente `buscar-artigos-LANC` via Agent
     tool para confirmar/completar os metadados (título, autores,
     periódico, DOI, resumo, link). Não invente esses dados sozinho.
   - Se for atualização de atividade do laboratório sem publicação
     associada: não acione o subagente — monte o post direto a partir do
     que o Ariel descreveu. Pesquisar PubMed aqui seria desperdício de
     tokens.

2. **Monte o rascunho da notícia** com esta estrutura:
   - `titulo`: curto, chamativo, mas fiel ao conteúdo
   - `tipo`: `publicacao` ou `atividade`
   - `resumo`: 1-2 frases para o card na listagem
   - `corpo`: 1-3 parágrafos em linguagem acessível (o público do hall é
     leigo/divulgação, não um resumo técnico de artigo)
   - `link_artigo`: se houver (DOI ou link do periódico)
   - `imagem`: caminho para print do artigo ou foto da atividade — se o
     Ariel não anexou, pergunte se ele tem uma imagem antes de finalizar
   - `data`: data de publicação/do evento (não a data de hoje, a menos que
     coincidam)

3. **Mostre o rascunho completo ao Ariel e espere confirmação** antes de
   salvar — igual à convenção já usada no projeto de Universidade Gratuita
   de nunca persistir conteúdo sensível/público sem OK explícito.

4. **Salve o rascunho aprovado** como Markdown com frontmatter em
   `content/noticias/{AAAA-MM-DD}-{slug}.md` (slug curto derivado do
   título). Esse é o estágio atual do pipeline: como o site ainda não tem
   Supabase no ar, o arquivo Markdown é a fonte de verdade temporária.
   Quando o schema de `news` existir no Supabase (ver subagente
   `dev-plataforma-lanc`), este passo passa a ser um upsert na tabela em
   vez de (ou além de) salvar o Markdown — atualize esta skill nesse
   momento.

## Formato do arquivo salvo

```markdown
---
titulo: "..."
tipo: publicacao | atividade
resumo: "..."
link_artigo: "..." # opcional
imagem: "..." # caminho relativo, opcional até o Ariel anexar
data: AAAA-MM-DD
---

Corpo da notícia em markdown normal.
```

## Não fazer

- Não publique (não marque como pronto para o site) sem o Ariel confirmar
  o rascunho.
- Não acione `buscar-artigos-LANC` para posts de atividade sem publicação.
- Não invente resumo/DOI de artigo — isso é sempre trabalho do subagente.
