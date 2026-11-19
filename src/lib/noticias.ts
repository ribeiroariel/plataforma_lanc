// Regras compartilhadas da notícia (formulário no navegador + validação no
// servidor). Client + server safe.

export const LIMITES_NOTICIA = {
  titulo: 140,
  resumo: 300,
};

export type NoticiaEditavel = {
  id: string;
  titulo: string;
  tipo: "publicacao" | "atividade";
  resumo: string;
  corpo: string;
  link_artigo: string | null;
  imagem_url: string | null;
  data: string;
  publicado: boolean;
};
