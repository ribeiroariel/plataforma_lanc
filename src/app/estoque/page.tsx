import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUsuarioAtual } from "@/lib/supabase/profile";
import { reagentesConhecidos } from "@/lib/protocoloEnsaio";
import GestaoEstoque, { type ItemEstoque } from "./GestaoEstoque";

export default async function PaginaEstoque() {
  const usuario = await getUsuarioAtual();
  if (!usuario) redirect("/login");

  const supabase = await createClient();
  const { data: itens } = await supabase
    .from("reagentes_estoque")
    .select("id, nome, tipo, quantidade_ml, minimo_ml, localizacao, obs, atualizado_em")
    .order("nome", { ascending: true })
    .returns<ItemEstoque[]>();

  const catalogo = reagentesConhecidos();

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-3xl leading-tight text-ink">
        Reagentes em estoque
      </h1>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-soft">
        Inventário das soluções prontas do laboratório: quanto tem de cada uma e
        onde está guardada (geladeira, freezer, armário de uso ou armário de
        reagentes P.A.). Quando um teste registra o consumo real de um reagente,
        o estoque da solução correspondente é abatido automaticamente. O registro
        detalhado dos reagentes P.A. puros virá depois — por ora, dá para anotar
        quanto tem e onde ficam.
      </p>

      <GestaoEstoque itens={itens ?? []} catalogo={catalogo} podeEditar={true} />
    </main>
  );
}
