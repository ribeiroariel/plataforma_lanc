import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUsuarioAtual } from "@/lib/supabase/profile";
import { carregarMeusTestes } from "@/lib/meusTestes";
import {
  diasDaSemana,
  ehData,
  ehSala,
  hojeLocal,
  inicioSemana,
  paraIso,
  somarDias,
  type TipoReserva,
} from "@/lib/agenda";
import Agenda, { type ReservaVista } from "./Agenda";

type ReservaRow = {
  id: string;
  sala: string;
  inicio: string;
  fim: string;
  tipo: TipoReserva;
  titulo: string | null;
  observacao: string | null;
  projeto_id: string | null;
  projeto_teste_id: string | null;
  criado_por: string;
  projetos: { nome: string } | null;
  projeto_testes: { teste_slug: string } | null;
  reserva_pessoas: { profile_id: string }[] | null;
};

export default async function PaginaAgenda({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const usuario = await getUsuarioAtual();
  if (!usuario) redirect("/login");
  const sp = await searchParams;

  const semana = inicioSemana(ehData(sp.semana) ? sp.semana : hojeLocal());
  const dias = diasDaSemana(semana);
  const supabase = await createClient();

  const [{ data: reservas, error }, { data: pessoas }, { data: membros }, meusTestes] =
    await Promise.all([
      supabase
        .from("reservas")
        .select(
          "id, sala, inicio, fim, tipo, titulo, observacao, projeto_id, projeto_teste_id, criado_por, projetos:projeto_id(nome), projeto_testes:projeto_teste_id(teste_slug), reserva_pessoas(profile_id)"
        )
        .gte("inicio", paraIso(semana, "00:00"))
        .lt("inicio", paraIso(somarDias(semana, 7), "00:00"))
        .order("inicio")
        .returns<ReservaRow[]>(),
      supabase
        .from("profiles")
        .select("id, nome")
        .eq("aprovado", true)
        .order("nome")
        .returns<{ id: string; nome: string }[]>(),
      supabase
        .from("projeto_membros")
        .select("projetos:projeto_id(id, nome)")
        .eq("profile_id", usuario.id)
        .returns<{ projetos: { id: string; nome: string } | null }[]>(),
      carregarMeusTestes(usuario.id),
    ]);

  // Orientadora reserva para qualquer projeto.
  let projetos = (membros ?? []).flatMap((m) => (m.projetos ? [m.projetos] : []));
  if (usuario.papel === "orientador") {
    const { data } = await supabase
      .from("projetos")
      .select("id, nome")
      .order("created_at", { ascending: false })
      .returns<{ id: string; nome: string }[]>();
    projetos = data ?? [];
  }

  const { testes: catalogo } = await import("@/lib/testes");
  const tituloTeste = (slug: string) => catalogo.find((t) => t.slug === slug)?.titulo ?? slug;

  const vistas: ReservaVista[] = (reservas ?? []).map((r) => ({
    id: r.id,
    sala: r.sala,
    inicio: r.inicio,
    fim: r.fim,
    tipo: r.tipo,
    titulo: r.titulo,
    observacao: r.observacao,
    projetoId: r.projeto_id,
    projetoNome: r.projetos?.nome ?? null,
    projetoTesteId: r.projeto_teste_id,
    testeNome: r.projeto_testes ? tituloTeste(r.projeto_testes.teste_slug) : null,
    criadoPor: r.criado_por,
    pessoas: (r.reserva_pessoas ?? []).map((p) => p.profile_id),
  }));

  // Atalhos vindos de outras telas (?nova=1&sala=T-206&tipo=gavagem&projeto=...).
  const prefill =
    sp.nova === "1"
      ? {
          sala: ehSala(sp.sala) ? sp.sala : undefined,
          tipo: sp.tipo,
          projetoId: sp.projeto,
          projetoTesteId: sp.teste,
          data: ehData(sp.data) ? sp.data : undefined,
        }
      : null;

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <Agenda
        semana={semana}
        dias={dias}
        hoje={hojeLocal()}
        reservas={vistas}
        erroCarregar={error ? error.message : null}
        usuarioId={usuario.id}
        ehOrientadora={usuario.papel === "orientador"}
        pessoas={pessoas ?? []}
        projetos={projetos}
        meusTestes={meusTestes
          .filter((t) => !t.encerrado)
          .map((t) => ({
            id: t.id,
            projetoId: t.projetoId,
            nome: `${t.titulo} — ${t.tecido}`,
            projetoNome: t.projetoNome,
          }))}
        prefill={prefill}
      />
    </main>
  );
}
