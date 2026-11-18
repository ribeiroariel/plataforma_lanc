// Testes designados ao usuário (responsável ou ajudante), em todos os
// projetos, com o progresso de cada um (ratos confirmados / ratos do roster).
// Usado no início do bolsista e em "Meus testes".
import { createClient } from "@/lib/supabase/server";
import { gerarRoster, type GrupoComContagem } from "@/lib/roster";
import { testes as catalogoTestes, nomeTecido, tituloSemTecido } from "@/lib/testes";

type TesteRow = {
  id: string;
  teste_slug: string;
  status: "pendente" | "concluido";
  responsavel_id: string;
  leva: number | null;
  projeto_id: string;
  encerrado: boolean;
  created_at: string | null;
  projetos: { nome: string; numero_levas: number | null } | null;
};

export type MeuTeste = {
  id: string;
  projetoId: string;
  projetoNome: string;
  titulo: string;
  tecido: string;
  leva: number | null;
  papel: "responsavel" | "ajudante";
  status: "pendente" | "concluido";
  encerrado: boolean;
  confirmados: number;
  total: number;
  /** Último registro confirmado (ISO), pra ordenar "continue de onde parou". */
  ultimoRegistro: string | null;
};

const CAMPOS =
  "id, teste_slug, status, responsavel_id, leva, projeto_id, encerrado, created_at, projetos:projeto_id(nome, numero_levas)";

export async function carregarMeusTestes(usuarioId: string): Promise<MeuTeste[]> {
  const supabase = await createClient();

  const [{ data: comoResp }, { data: ajLinks }] = await Promise.all([
    supabase.from("projeto_testes").select(CAMPOS).eq("responsavel_id", usuarioId).returns<TesteRow[]>(),
    supabase.from("projeto_teste_ajudantes").select("projeto_teste_id").eq("profile_id", usuarioId),
  ]);

  const idsAjudante = (ajLinks ?? []).map((a) => a.projeto_teste_id);
  const { data: comoAjudante } =
    idsAjudante.length > 0
      ? await supabase.from("projeto_testes").select(CAMPOS).in("id", idsAjudante).returns<TesteRow[]>()
      : { data: [] as TesteRow[] };

  // Se aparecer nos dois, "responsável" prevalece.
  const mapa = new Map<string, { row: TesteRow; papel: "responsavel" | "ajudante" }>();
  for (const r of comoAjudante ?? []) mapa.set(r.id, { row: r, papel: "ajudante" });
  for (const r of comoResp ?? []) mapa.set(r.id, { row: r, papel: "responsavel" });
  const itens = Array.from(mapa.values());
  if (itens.length === 0) return [];

  const idsTestes = itens.map((i) => i.row.id);
  const idsProjetos = Array.from(new Set(itens.map((i) => i.row.projeto_id)));
  const [{ data: resultados }, { data: grupos }] = await Promise.all([
    supabase
      .from("resultados_teste")
      .select("projeto_teste_id, confirmado, created_at")
      .in("projeto_teste_id", idsTestes)
      .returns<{ projeto_teste_id: string; confirmado: boolean; created_at: string | null }[]>(),
    supabase
      .from("projeto_grupos")
      .select("id, nome, numero_ratos, ratos_por_leva, projeto_id")
      .in("projeto_id", idsProjetos)
      .order("ordem", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true })
      .returns<(GrupoComContagem & { projeto_id: string })[]>(),
  ]);

  return itens.map(({ row, papel }) => {
    const cat = catalogoTestes.find((c) => c.slug === row.teste_slug);
    const roster = gerarRoster(
      (grupos ?? []).filter((g) => g.projeto_id === row.projeto_id),
      row.projetos?.numero_levas ?? 1
    );
    const total = row.leva ? roster.filter((r) => r.leva === row.leva).length : roster.length;
    const doTeste = (resultados ?? []).filter((r) => r.projeto_teste_id === row.id);
    const ultimo = doTeste
      .map((r) => r.created_at)
      .filter((d): d is string => Boolean(d))
      .sort()
      .pop();
    return {
      id: row.id,
      projetoId: row.projeto_id,
      projetoNome: row.projetos?.nome ?? "projeto",
      titulo: cat ? tituloSemTecido(cat.titulo, cat.tecido) : row.teste_slug,
      tecido: cat ? nomeTecido(cat.tecido) : "",
      leva: row.leva,
      papel,
      status: row.status,
      encerrado: row.encerrado,
      confirmados: doTeste.filter((r) => r.confirmado).length,
      total,
      ultimoRegistro: ultimo ?? row.created_at,
    };
  });
}
