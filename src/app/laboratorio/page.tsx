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
        chegar, inicie uma sessão; ao sair, encerre e marque o que fez. Também dá
        para lançar uma sessão passada, informando o dia e os horários.
      </p>

      <Laboratorio aberta={aberta} fechadas={fechadas} totalMin={totalMin} />
    </main>
  );
}
