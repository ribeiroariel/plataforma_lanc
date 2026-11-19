// Vínculo de cada pessoa com o LANC. Client + server safe (sem imports de
// servidor). Rótulos sem gênero (o nome não diz como a pessoa se identifica).
import type { SupabaseClient } from "@supabase/supabase-js";

export type Vinculo = "bolsista" | "voluntario" | "mestrado" | "doutorado";

export const VINCULOS: { valor: Vinculo; rotulo: string; descricao: string }[] = [
  { valor: "voluntario", rotulo: "Pesquisa voluntária", descricao: "Iniciação científica sem bolsa" },
  { valor: "bolsista", rotulo: "Bolsista de iniciação científica", descricao: "IC com bolsa" },
  { valor: "mestrado", rotulo: "Mestrado", descricao: "Mestranda ou mestrando" },
  { valor: "doutorado", rotulo: "Doutorado", descricao: "Doutoranda ou doutorando" },
];

export function ehVinculo(v: unknown): v is Vinculo {
  return v === "bolsista" || v === "voluntario" || v === "mestrado" || v === "doutorado";
}

export function rotuloVinculo(v: string | null | undefined): string {
  return VINCULOS.find((x) => x.valor === v)?.rotulo ?? "Pesquisa voluntária";
}

/** Ordem de exibição em "Quem somos": pós-graduação primeiro. */
export const ORDEM_VINCULO: Vinculo[] = ["doutorado", "mestrado", "bolsista", "voluntario"];

export type PessoaPublica = {
  id: string;
  nome: string;
  papel: "bolsista" | "orientador";
  foto_url: string | null;
  apresentacao: string | null;
  vinculo: Vinculo | null;
};

/**
 * Perfis aprovados para as páginas públicas. Se a coluna "vinculo" ainda não
 * existir no banco (migração 2026-11-19 não rodada), busca sem ela em vez de
 * quebrar a página.
 */
export async function carregarPessoasPublicas(supabase: SupabaseClient): Promise<PessoaPublica[]> {
  const comVinculo = await supabase
    .from("profiles")
    .select("id, nome, papel, foto_url, apresentacao, vinculo")
    .eq("aprovado", true)
    .order("nome");
  if (!comVinculo.error) return (comVinculo.data ?? []) as PessoaPublica[];
  const sem = await supabase
    .from("profiles")
    .select("id, nome, papel, foto_url, apresentacao")
    .eq("aprovado", true)
    .order("nome");
  return ((sem.data ?? []) as Omit<PessoaPublica, "vinculo">[]).map((p) => ({ ...p, vinculo: null }));
}

/** Vínculo de uma pessoa (null se a coluna ainda não existir). */
export async function carregarVinculo(supabase: SupabaseClient, id: string): Promise<Vinculo | null> {
  const { data, error } = await supabase.from("profiles").select("vinculo").eq("id", id).maybeSingle();
  if (error || !data) return null;
  return ehVinculo(data.vinculo) ? data.vinculo : null;
}
