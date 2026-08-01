import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUsuarioAtual } from "@/lib/supabase/profile";

type Projeto = { id: string; nome: string };

export default async function PaginaBioterio() {
  const usuario = await getUsuarioAtual();
  if (!usuario) redirect("/login");
  const supabase = await createClient();

  let projetos: Projeto[] = [];
  if (usuario.papel === "orientador") {
    const { data } = await supabase
      .from("projetos")
      .select("id, nome")
      .order("created_at", { ascending: false })
      .returns<Projeto[]>();
    projetos = data ?? [];
  } else {
    const { data: membros } = await supabase
      .from("projeto_membros")
      .select("projeto_id")
      .eq("profile_id", usuario.id);
    const ids = (membros ?? []).map((m) => m.projeto_id);
    if (ids.length > 0) {
      const { data } = await supabase
        .from("projetos")
        .select("id, nome")
        .in("id", ids)
        .order("created_at", { ascending: false })
        .returns<Projeto[]>();
      projetos = data ?? [];
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-3xl leading-tight text-ink">
        Procedimentos de biotério
      </h1>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-soft">
        Organize as caixas dos animais, os tratamentos/induções de cada grupo e
        gere as etiquetas das gaiolas. Escolha um dos seus projetos.
      </p>

      <div className="mt-8 flex flex-col gap-2">
        {projetos.length === 0 ? (
          <p className="text-sm text-ink-soft">
            Você ainda não participa de nenhum projeto.
          </p>
        ) : (
          projetos.map((p) => (
            <Link
              key={p.id}
              href={`/bioterio/${p.id}`}
              className="rounded border border-rule bg-paper-raised px-4 py-3 text-sm transition-colors hover:border-signal"
            >
              <span className="font-medium text-ink">{p.nome}</span>
            </Link>
          ))
        )}
      </div>
    </main>
  );
}
