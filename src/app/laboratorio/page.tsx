import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUsuarioAtual } from "@/lib/supabase/profile";
import { duracaoMin } from "@/lib/laboratorio";
import Laboratorio, { type SessaoRow } from "./Laboratorio";

export default async function PaginaLaboratorio() {
  const usuario = await getUsuarioAtual();
  if (!usuario) redirect("/login");

  const supabase = await createClient();
  const { data: sessoes } = await supabase
    .from("sessoes_lab")
    .select("id, inicio, fim, topicos, descricao")
    .eq("profile_id", usuario.id)
    .order("inicio", { ascending: false })
    .returns<SessaoRow[]>();

  // Testes cronometrados dentro de cada sessão (se a tabela já existir).
  const ids = (sessoes ?? []).map((s) => s.id);
  const { data: execs } =
    ids.length > 0
      ? await supabase
          .from("teste_execucoes")
          .select("sessao_lab_id, inicio, fim, projeto_testes:projeto_teste_id(teste_slug)")
          .in("sessao_lab_id", ids)
          .returns<
            { sessao_lab_id: string; inicio: string; fim: string | null; projeto_testes: { teste_slug: string } | null }[]
          >()
      : { data: [] };
  const { testes: catalogo, nomeTecido, tituloSemTecido } = await import("@/lib/testes");
  for (const s of sessoes ?? []) {
    const porTeste = new Map<string, { nome: string; minutos: number; contando: boolean }>();
    for (const e of (execs ?? []).filter((x) => x.sessao_lab_id === s.id)) {
      const slug = e.projeto_testes?.teste_slug ?? "";
      const c = catalogo.find((t) => t.slug === slug);
      const nome = c ? `${tituloSemTecido(c.titulo, c.tecido)} — ${nomeTecido(c.tecido)}` : "Teste";
      const atual = porTeste.get(slug) ?? { nome, minutos: 0, contando: false };
      atual.minutos += duracaoMin(e.inicio, e.fim);
      atual.contando ||= !e.fim;
      porTeste.set(slug, atual);
    }
    s.testes = Array.from(porTeste.values());
  }

  const aberta = (sessoes ?? []).find((s) => !s.fim) ?? null;
  const fechadas = (sessoes ?? []).filter((s) => s.fim);
  const totalMin = fechadas.reduce((soma, s) => soma + duracaoMin(s.inicio, s.fim), 0);

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-3xl leading-tight text-ink">
        Laboratório
      </h1>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-soft">
        Registre suas idas ao laboratório para dar transparência às horas. Ao
        chegar, inicie uma sessão; ao sair, encerre e marque o que fez. O
        cronômetro fica no canto da tela enquanto a sessão está aberta, e o
        tempo dos testes que você cronometrar entra dentro dela. Também dá para
        lançar uma sessão passada, informando o dia e os horários.
      </p>

      <Laboratorio aberta={aberta} fechadas={fechadas} totalMin={totalMin} />
    </main>
  );
}
