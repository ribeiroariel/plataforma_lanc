import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getUsuarioAtual } from "@/lib/supabase/profile";
import { gerarRoster, type GrupoComContagem } from "@/lib/roster";
import ComportamentalGrid, {
  type RegistroComportamental,
} from "./ComportamentalGrid";

type Projeto = {
  nome: string;
  numero_levas: number | null;
  tem_comportamental: boolean | null;
};
type Membro = { profile_id: string; papel: "coautor" | "ajudante" };
type RegistroRow = {
  rato: string;
  ca_quadrados: number | null;
  ca_urinas: number | null;
  ca_fezes: number | null;
  ca_imobilidade_s: number | null;
  ca_confirmado: boolean;
  nf_imobilidade_s: number | null;
  nf_confirmado: boolean;
};

export default async function PaginaComportamental({
  params,
}: {
  params: Promise<{ projetoId: string }>;
}) {
  const { projetoId } = await params;
  const supabase = await createClient();
  const usuario = await getUsuarioAtual();

  const { data: projeto } = await supabase
    .from("projetos")
    .select("nome, numero_levas, tem_comportamental")
    .eq("id", projetoId)
    .maybeSingle()
    .returns<Projeto>();
  if (!projeto) notFound();

  const [{ data: grupos }, { data: membros }, { data: registros }] =
    await Promise.all([
      supabase
        .from("projeto_grupos")
        .select("id, nome, numero_ratos, ratos_por_leva")
        .eq("projeto_id", projetoId)
        .order("ordem", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: true })
        .returns<GrupoComContagem[]>(),
      supabase
        .from("projeto_membros")
        .select("profile_id, papel")
        .eq("projeto_id", projetoId)
        .returns<Membro[]>(),
      supabase
        .from("comportamental")
        .select(
          "rato, ca_quadrados, ca_urinas, ca_fezes, ca_imobilidade_s, ca_confirmado, nf_imobilidade_s, nf_confirmado"
        )
        .eq("projeto_id", projetoId)
        .returns<RegistroRow[]>(),
    ]);

  const numeroLevas = projeto.numero_levas ?? 1;
  const roster = gerarRoster(grupos ?? [], numeroLevas);
  const souCoautor =
    membros?.some(
      (m) => m.papel === "coautor" && m.profile_id === usuario?.id
    ) ?? false;
  const podeRegistrar = souCoautor;

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <Link
        href="/comportamental"
        className="text-sm text-ink-soft hover:text-absorbance"
      >
        ← Testes comportamentais
      </Link>
      <h1 className="mt-1 font-display text-3xl leading-tight text-ink">
        {projeto.nome}
      </h1>

      {!projeto.tem_comportamental ? (
        <p className="mt-6 rounded border border-rule bg-paper-raised p-4 text-sm text-ink-soft">
          Este projeto não tem testes comportamentais habilitados. Marque a
          opção &quot;Testes comportamentais&quot; na edição do projeto para
          registrar campo aberto e nado forçado.
        </p>
      ) : (
        <ComportamentalGrid
          projetoId={projetoId}
          roster={roster}
          registros={(registros ?? []) as RegistroComportamental[]}
          numeroLevas={numeroLevas}
          podeRegistrar={podeRegistrar}
        />
      )}
    </main>
  );
}
