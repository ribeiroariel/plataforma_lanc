import { redirect } from "next/navigation";
import { getUsuarioAtual, podeAprovarCadastros } from "@/lib/supabase/profile";
import { createClient } from "@/lib/supabase/server";
import { ListaCadastros } from "./ListaCadastros";
import type { CadastroPendente } from "./tipos";

export default async function PaginaCadastros() {
  const usuario = await getUsuarioAtual();

  // Defesa extra além do proxy: quem não pode aprovar não vê esta tela.
  if (!podeAprovarCadastros(usuario)) redirect("/");

  const supabase = await createClient();
  const { data } = await supabase.rpc("listar_cadastros_pendentes");
  const pendentes = (data ?? []) as CadastroPendente[];

  return (
    <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <p className="font-mono text-xs uppercase tracking-[0.14em] text-ink-soft">
        Administração
      </p>
      <h1 className="mt-1 font-display text-3xl leading-tight text-ink">
        Cadastros pendentes
      </h1>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-soft">
        Bolsistas que se cadastraram e aguardam liberação para acessar a área
        do laboratório. Aprove quem você reconhece; recuse cadastros indevidos.
      </p>

      <div className="mt-8">
        {pendentes.length === 0 ? (
          <p className="rounded border border-rule bg-paper-raised px-4 py-6 text-center text-sm text-ink-soft">
            Nenhum cadastro pendente no momento.
          </p>
        ) : (
          <ListaCadastros pendentes={pendentes} />
        )}
      </div>
    </main>
  );
}
