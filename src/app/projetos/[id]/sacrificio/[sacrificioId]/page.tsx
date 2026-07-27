import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getUsuarioAtual } from "@/lib/supabase/profile";
import { carregarDia } from "@/lib/sacrificioDados";
import DiaSacrificio from "./DiaSacrificio";

type Sacrificio = {
  id: string;
  projeto_id: string;
  leva: number | null;
  data: string | null;
  status: string;
};
type Projeto = { nome: string; numero_levas: number | null; finalizado: boolean };
type Membro = { profile_id: string; papel: "coautor" | "ajudante" };
type MinhaFuncao = { funcao: string };

export default async function PaginaDiaSacrificio({
  params,
}: {
  params: Promise<{ id: string; sacrificioId: string }>;
}) {
  const { id, sacrificioId } = await params;
  const supabase = await createClient();
  const usuario = await getUsuarioAtual();

  const { data: sacrificio } = await supabase
    .from("sacrificios")
    .select("id, projeto_id, leva, data, status")
    .eq("id", sacrificioId)
    .eq("projeto_id", id)
    .maybeSingle()
    .returns<Sacrificio>();
  if (!sacrificio) notFound();

  const [{ data: projeto }, { data: membros }, { data: minhasFuncoes }] =
    await Promise.all([
      supabase
        .from("projetos")
        .select("nome, numero_levas, finalizado")
        .eq("id", id)
        .maybeSingle()
        .returns<Projeto>(),
      supabase
        .from("projeto_membros")
        .select("profile_id, papel")
        .eq("projeto_id", id)
        .returns<Membro[]>(),
      supabase
        .from("sacrificio_funcoes")
        .select("funcao")
        .eq("sacrificio_id", sacrificioId)
        .eq("profile_id", usuario?.id ?? "")
        .returns<MinhaFuncao[]>(),
    ]);

  const souCoautor =
    membros?.some(
      (m) => m.papel === "coautor" && m.profile_id === usuario?.id
    ) ?? false;
  const souOrientador = usuario?.papel === "orientador";
  const temOrganizacaoGeral = (minhasFuncoes ?? []).some(
    (f) => f.funcao === "organizacao_geral"
  );

  // A aba geral (planejamento + consolidação ao vivo) é de quem organiza o dia:
  // coautores, orientador e quem tem a função "Organização geral". Quem só tem
  // uma função de bancada usa a aba da função.
  if (!souCoautor && !souOrientador && !temOrganizacaoGeral) {
    redirect("/minhas-funcoes");
  }

  const { roster, ratos, ratosErro } = await carregarDia(
    supabase,
    id,
    sacrificioId,
    sacrificio.leva,
    projeto?.numero_levas ?? 1
  );

  const finalizado = projeto?.finalizado ?? false;
  // Escreve quem tem RLS de escrita nos dados: coautor ou designado (aqui, quem
  // tem "Organização geral"). Encerrar/reabrir mexe na tabela sacrificios, cuja
  // escrita é coautor-only.
  const podeRegistrar =
    (souCoautor || temOrganizacaoGeral) &&
    sacrificio.status !== "concluido" &&
    !finalizado;
  const podeEncerrar = souCoautor && !finalizado;

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <Link
        href={`/projetos/${id}/sacrificio`}
        className="text-sm text-ink-soft hover:text-absorbance"
      >
        ← Sacrifício
      </Link>
      <h1 className="mt-1 font-display text-3xl leading-tight text-ink">
        Dia do sacrifício{sacrificio.leva ? ` — Leva ${sacrificio.leva}` : ""}
      </h1>
      <p className="mt-1 font-mono text-xs text-ink-soft">
        {projeto?.nome} · {sacrificio.status}
      </p>

      {ratosErro && (
        <p className="mt-4 rounded border border-alerta/50 bg-alerta/10 p-3 text-sm text-alerta">
          Não foi possível carregar os ratos deste sacrifício, então as etapas
          abaixo (contagem, coleta e homogeneização) podem não aparecer mesmo
          depois de salvar. Detalhe técnico: {ratosErro}
        </p>
      )}

      <DiaSacrificio
        projetoId={id}
        sacrificioId={sacrificio.id}
        podeRegistrar={podeRegistrar}
        podeEncerrar={podeEncerrar}
        status={sacrificio.status}
        roster={roster}
        ratos={ratos}
      />
    </main>
  );
}
