// Constantes do estoque de reagentes do laboratório (locais físicos onde as
// soluções ficam guardadas). Usadas na aba de estoque e no abate por consumo.

export type Localizacao = "geladeira" | "freezer" | "armario_uso" | "armario_pa";

export const LOCALIZACOES: { valor: Localizacao; rotulo: string }[] = [
  { valor: "geladeira", rotulo: "Geladeira" },
  { valor: "freezer", rotulo: "Freezer" },
  { valor: "armario_uso", rotulo: "Armário de uso" },
  { valor: "armario_pa", rotulo: "Armário de reagentes P.A." },
];

export type TipoReagenteEstoque = "solucao" | "pa";

export function ehLocalizacao(v: string | null | undefined): v is Localizacao {
  return (
    v === "geladeira" ||
    v === "freezer" ||
    v === "armario_uso" ||
    v === "armario_pa"
  );
}

export function nomeLocalizacao(v: string | null | undefined): string {
  return LOCALIZACOES.find((l) => l.valor === v)?.rotulo ?? "—";
}

/** Formata um volume em mL de forma legível (mL ou L). */
export function fmtMl(ml: number | null | undefined): string {
  if (ml == null || !Number.isFinite(ml)) return "—";
  if (Math.abs(ml) >= 1000) {
    return `${(ml / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} L`;
  }
  return `${ml.toLocaleString("pt-BR", { maximumFractionDigits: ml < 10 ? 2 : 1 })} mL`;
}
