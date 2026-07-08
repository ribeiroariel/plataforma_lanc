---
name: criacao-de-noticias
description: Transforma conteúdo bruto que o Ariel fornece (um artigo publicado pela Dra. Débora Delwing Dal Magro ou pelo grupo LANC, uma atualização do dia a dia do laboratório, um print/foto) em um post estruturado para o hall de notícias do site plataforma-lanc. Use quando o Ariel colar um link/PDF de artigo, disser "sai um artigo novo", "publica isso no site", "transforma isso em notícia", ou passar qualquer conteúdo que deva virar publicação de divulgação do laboratório. Aciona o subagente buscar-artigos-LANC só quando o insumo é um artigo publicado (para confirmar DOI/resumo/metadados); para posts de atividade do grupo sem publicação associada, monta o post direto do que o Ariel descreveu, sem pesquisa.
---

# criacao-de-noticias

## Quando usar

Sempre que o Ariel fornecer conteúdo que deva virar uma notícia/post no
hall público do site do LANC: (a) um artigo científico recém-publicado
pela Dra. Débora ou pelo grupo, (b) uma atualização de atividade do
laboratório (o que o grupo está fazendo, um marco do projeto, verba
conquistada, etc.), ou (c) um post do Instagram do laboratório
(@lancfurb — https://www.instagram.com/lancfurb/) que o Ariel quer
reaproveitar no site. **Atenção Instagram:** raspagem automatizada do
Instagram não funciona (bloqueia scraping mesmo via ferramenta de
navegador, testado nesta sessão) — peça ao Ariel para colar a legenda e
anexar as imagens do post diretamente, não tente acessar o perfil sozinho.

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
     leigo/divulgação, não um resumo técnico de artigo). Para `publicacao`:
     tom profissional e ponderado, respeitando o estágio/grau de evidência
     — não extrapole resultado de modelo animal como se aplicasse a
     humanos, marque estudo transversal/correlacional como associação (não
     causa), e não esconda resultado misto ou negativo do próprio estudo.
   - `link_artigo`: se houver (DOI ou link do periódico)
   - `imagem`: caminho para print do artigo ou foto da atividade — se o
     Ariel não anexou, pergunte se ele tem uma imagem antes de finalizar.
     **Nunca extraia figura/gráfico/tabela de dentro do artigo** mesmo com
     acesso via CAPES — acesso institucional de leitura não dá direito de
     reprodução pública; a maioria dos periódicos (Elsevier, Wiley, etc.)
     não é acesso aberto. Só reaproveitar figura de artigo explicitamente
     CC-BY/acesso aberto, e mesmo assim confirmar com o Ariel antes.
   - `data`: data de publicação/do evento (não a data de hoje, a menos que
     coincidam)

3. **Mostre o rascunho completo ao Ariel e espere confirmação** antes de
   salvar — igual à convenção já usada no projeto de Universidade Gratuita
   de nunca persistir conteúdo sensível/público sem OK explícito.

4. **Salve o rascunho aprovado** como Markdown com frontmatter em
   `content/noticias/{AAAA-MM-DD}-{slug}.md`. Depois que o Ariel aprovar,
   publique de verdade rodando `node scripts/publicar-noticias.mjs
   --publicar` — o script lê todos os `.md` de `content/noticias/`,
   parseia o frontmatter e insere na tabela `noticias` do Supabase com
   `publicado = true` (idempotente: apaga por título antes de inserir, dá
   pra rodar de novo sem duplicar). Rodar sem `--publicar` só lista o que
   seria publicado (dry-run). Usa a chave de serviço do `.env.local`.

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
