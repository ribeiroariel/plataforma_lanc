// Resumo preliminar dos resultados de um teste, por grupo — para a aba
// "Resultados" do projeto (bolsista e orientadora acompanharem sem exportar).
// NÃO substitui a análise no R: nos ensaios "simples" a plataforma não
// normaliza por proteína nem aplica fator de diluição; aqui mostra só a
// absorbância líquida (amostra − brancos registrados), dita assim na tela.
import type { ConfigTeste } from "@/lib/tiposTeste";

export type ValorRato = { rato: string; grupoId: string; valor: number };

export type EstatGrupo = {
  grupoId: string;
  n: number;
  media: number | null;
  dp: number | null;
  epm: number | null;
  min: number | null;
  max: number | null;
};

function num(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

/** Rótulo do valor resumido de cada família de teste. */
export function rotuloValor(config: ConfigTeste): { rotulo: string; unidade: string } {
  if (config.familia !== "simples") {
    return { rotulo: "Valor calculado", unidade: config.unidadeResultado };
  }
  const campos = config.camposBrutos ?? [];
  if (campos.some((c) => c.chave === "abs_tiois_livres")) {
    return { rotulo: "Abs. tióis livres", unidade: "Abs" };
  }
  const temBranco =
    campos.some((c) => c.chave === "abs_branco_amostra") || Boolean(config.brancoReagente);
  return {
    rotulo: temBranco ? "Abs. líquida (amostra − brancos)" : "Abs. da amostra",
    unidade: "Abs",
  };
}

/**
 * Valor resumido de um rato. Família com cálculo automático → valor_calculado.
 * "Simples" → absorbância da amostra menos o branco da amostra e o branco do
 * reagente que estiverem registrados (o que faltar não é subtraído).
 */
export function valorResumo(
  config: ConfigTeste,
  colunas: Record<string, unknown>,
  valorCalculado: number | null,
  brancoReagente: number | null
): number | null {
  if (config.familia !== "simples") return valorCalculado;
  if ("abs_tiois_livres" in colunas || (config.camposBrutos ?? []).some((c) => c.chave === "abs_tiois_livres")) {
    return num(colunas.abs_tiois_livres);
  }
  const amostra = num(colunas.abs_amostra);
  if (amostra === null) return null;
  const brAmostra = num(colunas.abs_branco_amostra) ?? 0;
  return amostra - brAmostra - (config.brancoReagente ? brancoReagente ?? 0 : 0);
}

export function estatisticas(valores: number[]): Omit<EstatGrupo, "grupoId"> {
  const n = valores.length;
  if (n === 0) return { n, media: null, dp: null, epm: null, min: null, max: null };
  const media = valores.reduce((a, b) => a + b, 0) / n;
  const dp =
    n > 1 ? Math.sqrt(valores.reduce((a, v) => a + (v - media) ** 2, 0) / (n - 1)) : null;
  return {
    n,
    media,
    dp,
    epm: dp !== null ? dp / Math.sqrt(n) : null,
    min: Math.min(...valores),
    max: Math.max(...valores),
  };
}
