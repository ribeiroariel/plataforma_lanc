import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getUsuarioAtual } from "@/lib/supabase/profile";
import { testes as catalogoTestes, nomeTecido, tituloSemTecido } from "@/lib/testes";
import { configDoTeste } from "@/lib/tiposTeste";
import { gerarRoster, type GrupoComContagem } from "@/lib/roster";
import RegistroResultado from "./RegistroResultado";

type ProjetoTeste = {
  id: string;
  projeto_id: string;
  teste_slug: string;
  status: "pendente" | "concluido";
  responsavel_id: string;
  leva: number | null;
};

type Resultado = {
  rato: string;
  grupo_id: string;
  leituras: Record<string, unknown>;
  valor_calculado: number | null;
  dentro_do_padrao: boolean | null;
  observacoes: string | null;
  confirmado: boolean;
};

export default async function PaginaResultado({
  params,
}: {
  params: Promise<{ id: string; testeId: string }>;
}) {
  const { id: projetoId, testeId } = await params;
  const supabase = await createClient();
  const usuario = await getUsuarioAtual();

  const [{ data: projetoTeste }, { data: projeto }, { data: grupos }, { data: membros }, { data: resultados }] =
    await Promise.all([
      supabase
        .from("projeto_testes")
        .select("id, projeto_id, teste_slug, status, responsavel_id, leva")
        .eq("id", testeId)
        .eq("projeto_id", projetoId)
        .maybeSingle()
        .returns<ProjetoTeste>(),
      supabase
        .from("projetos")
        .select("nome, numero_levas")
        .eq("id", projetoId)
        .maybeSingle(),
      supabase
        .from("projeto_grupos")
        .select("id, nome, numero_ratos, ratos_por_leva")
        .eq("projeto_id", projetoId)
        .order("created_at", { ascending: true })
        .returns<GrupoComContagem[]>(),
      supabase
        .from("projeto_membros")
        .select("profile_id, papel")
        .eq("projeto_id", projetoId),
      supabase
        .from("resultados_teste")
        .select("rato, grupo_id, leituras, valor_calculado, dentro_do_padrao, observacoes, confirmado")
        .eq("projeto_teste_id", testeId)
        .returns<Resultado[]>(),
    ]);

  if (!projetoTeste) notFound();

  const teste = catalogoTestes.find((t) => t.slug === projetoTeste.teste_slug);
  const config = configDoTeste(projetoTeste.teste_slug);

  const souResponsavel = projetoTeste.responsavel_id === usuario?.id;
  const souCoautor =
    membros?.some((m) => m.papel === "coautor" && m.profile_id === usuario?.id) ??
    false;
  const souOrientador = usuario?.papel === "orientador";

  if (!souResponsavel && !souCoautor && !souOrientador) {
    // RLS já bloquearia a leitura de "resultados" de quem não é
    // responsável/coautor/orientadora, mas aqui é sobre a designação em
    // si — se chegou até aqui sem ser nenhum dos três, não deveria ver.
    notFound();
  }

  const rosterCompleto = gerarRoster(grupos ?? [], projeto?.numero_levas ?? 1);
  // Se o teste foi designado para uma leva específica, o registro só mostra
  // os ratos daquela leva. Sem leva definida, mostra todos.
  const roster = projetoTeste.leva
    ? rosterCompleto.filter((r) => r.leva === projetoTeste.leva)
    : rosterCompleto;

  if (!config) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <p className="text-sm text-ink-soft">
          Este teste ainda não tem uma tela de registro de resultado
          disponível.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <Link
        href={`/projetos/${projetoId}`}
        className="text-sm text-ink-soft hover:text-absorbance"
      >
        ← {projeto?.nome ?? "Projeto"}
      </Link>
      {teste && (
        <p className="mt-2 font-mono text-xs font-medium uppercase tracking-[0.14em] text-signal">
          {nomeTecido(teste.tecido)}
        </p>
      )}
      <h1 className="mt-1 font-display text-3xl leading-tight text-ink">
        {teste ? tituloSemTecido(teste.titulo, teste.tecido) : projetoTeste.teste_slug}
      </h1>
      {projetoTeste.leva && (
        <p className="mt-1 font-mono text-xs text-ink-soft">
          Leva {projetoTeste.leva}
        </p>
      )}

      <RegistroResultado
        projetoId={projetoId}
        projetoTesteId={projetoTeste.id}
        statusAtual={projetoTeste.status}
        config={config}
        roster={roster}
        resultadosExistentes={resultados ?? []}
        podeRegistrar={souResponsavel}
        podeAlterarStatus={souResponsavel || souCoautor}
      />
    </main>
  );
}
