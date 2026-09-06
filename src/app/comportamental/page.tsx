import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

type Proj = { id: string; nome: string };

export default async function ComportamentalIndex() {
  const supabase = await createClient();
  // RLS já restringe aos projetos que o usuário pode ver.
  const { data: projetos } = await supabase
    .from("projetos")
    .select("id, nome")
    .eq("tem_comportamental", true)
    .order("created_at", { ascending: false })
    .returns<Proj[]>();

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <p className="font-mono text-xs uppercase tracking-[0.14em] text-ink-soft">
        Pesquisa
      </p>
      <h1 className="mt-1 font-display text-3xl leading-tight text-ink">
        Testes comportamentais
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-ink-soft">
        Campo aberto e nado forçado, registrados por rato. Aparecem aqui só os
        projetos com testes comportamentais habilitados (na criação ou edição do
        projeto).
      </p>

      {(projetos ?? []).length === 0 ? (
        <p className="mt-8 text-sm text-ink-soft">
          Nenhum projeto com testes comportamentais habilitados. Marque a opção
          &quot;Testes comportamentais&quot; ao criar ou editar um projeto.
        </p>
      ) : (
        <ul className="mt-8 flex flex-col gap-2">
          {(projetos ?? []).map((p) => (
            <li key={p.id}>
              <Link
                href={`/comportamental/${p.id}`}
                className="block rounded border border-rule bg-paper-raised px-4 py-3 text-sm text-ink transition-colors hover:border-signal"
              >
                {p.nome}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
