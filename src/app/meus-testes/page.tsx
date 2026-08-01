import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUsuarioAtual } from "@/lib/supabase/profile";
import { testes as catalogoTestes, nomeTecido, tituloSemTecido } from "@/lib/testes";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";

type TesteRow = {
  id: string;
  teste_slug: string;
  status: "pendente" | "concluido";
  responsavel_id: string;
  leva: number | null;
  projeto_id: string;
  projetos: { nome: string } | null;
};

export default async function MeusTestes() {
  const usuario = await getUsuarioAtual();
  if (!usuario) redirect("/login");

  const supabase = await createClient();

  // Testes onde sou responsável.
  const { data: comoResp } = await supabase
    .from("projeto_testes")
    .select("id, teste_slug, status, responsavel_id, leva, projeto_id, projetos:projeto_id(nome)")
    .eq("responsavel_id", usuario.id)
    .returns<TesteRow[]>();

  // Testes onde sou ajudante.
  const { data: ajLinks } = await supabase
    .from("projeto_teste_ajudantes")
    .select("projeto_teste_id")
    .eq("profile_id", usuario.id);

  const idsAjudante = (ajLinks ?? []).map((a) => a.projeto_teste_id);
  let comoAjudante: TesteRow[] = [];
  if (idsAjudante.length > 0) {
    const { data } = await supabase
      .from("projeto_testes")
      .select("id, teste_slug, status, responsavel_id, leva, projeto_id, projetos:projeto_id(nome)")
      .in("id", idsAjudante)
      .returns<TesteRow[]>();
    comoAjudante = data ?? [];
  }

  // Junta, marcando o papel. Se aparecer nos dois, "responsável" prevalece.
  const mapa = new Map<string, { row: TesteRow; papel: "responsavel" | "ajudante" }>();
  for (const r of comoAjudante) mapa.set(r.id, { row: r, papel: "ajudante" });
  for (const r of comoResp ?? []) mapa.set(r.id, { row: r, papel: "responsavel" });

  const itens = Array.from(mapa.values());
  const pendentes = itens.filter((i) => i.row.status === "pendente");
  const concluidos = itens.filter((i) => i.row.status === "concluido");

  function tituloDe(slug: string) {
    const t = catalogoTestes.find((c) => c.slug === slug);
    return t ? tituloSemTecido(t.titulo, t.tecido) : slug;
  }
  function tecidoDe(slug: string) {
    const t = catalogoTestes.find((c) => c.slug === slug);
    return t ? nomeTecido(t.tecido) : "";
  }

  function Linha({
    row,
    papel,
  }: {
    row: TesteRow;
    papel: "responsavel" | "ajudante";
  }) {
    return (
      <Link
        href={`/projetos/${row.projeto_id}/testes/${row.id}`}
        className="flex items-center justify-between gap-3 rounded border border-rule bg-paper-raised px-4 py-3 text-sm transition-colors hover:border-absorbance"
      >
        <div>
          <p className="font-medium text-ink">{tituloDe(row.teste_slug)}</p>
          <p className="text-ink-soft">
            <span className="text-signal">{tecidoDe(row.teste_slug)}</span>
            {" · "}
            {row.projetos?.nome ?? "projeto"}
            {row.leva ? ` · Leva ${row.leva}` : ""}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Badge tom={papel === "responsavel" ? "info" : "neutro"}>
            {papel === "responsavel" ? "responsável" : "ajudante"}
          </Badge>
          <span className="font-mono text-xs uppercase text-signal">
            {papel === "responsavel" && row.status !== "concluido"
              ? "Registrar →"
              : "Ver →"}
          </span>
        </div>
      </Link>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <PageHeader
        eyebrow="Bancada"
        titulo="Meus testes"
        descricao="Testes designados a você (como responsável ou ajudante), de todos os projetos."
      />

      {itens.length === 0 && (
        <EmptyState
          className="mt-8"
          titulo="Nenhum teste designado a você por enquanto"
          descricao="Quando um coautor designar um ensaio a você, ele aparece aqui — pendente ou concluído."
        />
      )}

      {pendentes.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 border-t-2 border-ink pt-2 font-mono text-xs uppercase tracking-[0.12em] text-ink">
            Pendentes ({pendentes.length})
          </h2>
          <div className="flex flex-col gap-2">
            {pendentes.map((i) => (
              <Linha key={i.row.id} row={i.row} papel={i.papel} />
            ))}
          </div>
        </section>
      )}

      {concluidos.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-3 border-t-2 border-ink pt-2 font-mono text-xs uppercase tracking-[0.12em] text-ink">
            Concluídos ({concluidos.length})
          </h2>
          <div className="flex flex-col gap-2">
            {concluidos.map((i) => (
              <Linha key={i.row.id} row={i.row} papel={i.papel} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
