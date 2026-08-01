import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUsuarioAtual, podeAprovarCadastros } from "@/lib/supabase/profile";
import GestaoPedidos, { type PedidoRow } from "./GestaoPedidos";

export default async function PaginaPedidos() {
  const usuario = await getUsuarioAtual();
  if (!usuario) redirect("/login");
  // Aba de gestão: orientadora ou quem aprova cadastros (Ariel).
  if (!podeAprovarCadastros(usuario)) redirect("/");

  const supabase = await createClient();
  const { data: pedidos } = await supabase
    .from("pedidos")
    .select(
      "id, item, quantidade, categoria, motivo, obs, status, solicitado_por, criado_em, atendido_em"
    )
    .order("criado_em", { ascending: false })
    .returns<Omit<PedidoRow, "solicitanteNome">[]>();

  const ids = Array.from(new Set((pedidos ?? []).map((p) => p.solicitado_por)));
  const nomePorId = new Map<string, string>();
  if (ids.length > 0) {
    const { data } = await supabase.from("profiles").select("id, nome").in("id", ids);
    for (const p of data ?? []) nomePorId.set(p.id, p.nome);
  }
  const rows: PedidoRow[] = (pedidos ?? []).map((p) => ({
    ...p,
    solicitanteNome: nomePorId.get(p.solicitado_por) ?? "—",
  }));

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-3xl leading-tight text-ink">Pedidos</h1>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-soft">
        Solicitações de reagentes e materiais feitas pelos bolsistas na aba de
        estoque. Veja o que foi pedido, por quem, quando e por quê, e marque como
        atendido quando resolver.
      </p>
      <GestaoPedidos pedidos={rows} />
    </main>
  );
}
