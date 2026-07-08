import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getUsuarioAtual } from "@/lib/supabase/profile";
import { testes as catalogoTestes } from "@/lib/testes";
import { configDoTeste } from "@/lib/tiposTeste";
import { gerarRoster, type GrupoComContagem } from "@/lib/roster";
import RegistroResultado from "./RegistroResultado";

type ProjetoTeste = {
  id: string;
  projeto_id: string;
  teste_slug: string;
  status: "pendente" | "concluido";
  responsavel_id: string;
};

type Resultado = {
  rato: string;
  grupo_id: string;
  leituras: Record<string, unknown>;
  valor_calculado: number | null;
  dentro_do_padrao: boolean | null;
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
        .select("id, projeto_id, teste_slug, status, responsavel_id")
        .eq("id", testeId)
        .eq("projeto_id", projetoId)
        .maybeSingle()
        .returns<ProjetoTeste>(),
      supabase.from("projetos").select("nome").eq("id", projetoId).maybeSingle(),
      supabase
        .from("projeto_grupos")
        .select("id, nome, numero_ratos")
        .eq("projeto_id", projetoId)
        .order("created_at", { ascending: true })
        .returns<GrupoComContagem[]>(),
      supabase
        .from("projeto_membros")
        .select("profile_id, papel")
        .eq("projeto_id", projetoId),
      supabase
        .from("resultados_teste")
        .select("rato, grupo_id, leituras, valor_calculado, dentro_do_padrao")
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

  const roster = gerarRoster(grupos ?? []);

  if (!config) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-10">
        <p className="text-sm text-black/60 dark:text-white/60">
          Este teste ainda não tem uma tela de registro de resultado
          disponível.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <Link
        href={`/projetos/${projetoId}`}
        className="text-sm text-black/60 hover:underline dark:text-white/60"
      >
        ← {projeto?.nome ?? "Projeto"}
      </Link>
      <h1 className="mt-2 text-2xl font-semibold">
        {teste?.titulo ?? projetoTeste.teste_slug}
      </h1>

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
