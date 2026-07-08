import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getUsuarioAtual } from "@/lib/supabase/profile";

type ProjetoResumo = {
  id: string;
  nome: string;
  descricao: string | null;
  created_at: string;
};

export default async function ListaProjetos() {
  const supabase = await createClient();
  const usuario = await getUsuarioAtual();
  const souOrientador = usuario?.papel === "orientador";

  const { data: projetos } = await supabase
    .from("projetos")
    .select("id, nome, descricao, created_at")
    .order("created_at", { ascending: false })
    .returns<ProjetoResumo[]>();

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">
          {souOrientador ? "Todos os projetos" : "Meus projetos"}
        </h1>
        {!souOrientador && (
          <Link
            href="/projetos/novo"
            className="rounded bg-black px-4 py-2 text-sm text-white dark:bg-white dark:text-black"
          >
            + Novo projeto
          </Link>
        )}
      </div>

      {(!projetos || projetos.length === 0) && (
        <p className="text-black/60 dark:text-white/60">
          {souOrientador
            ? "Nenhum projeto criado ainda."
            : "Você ainda não participa de nenhum projeto."}
        </p>
      )}

      <ul className="flex flex-col gap-3">
        {projetos?.map((projeto) => (
          <li key={projeto.id}>
            <Link
              href={`/projetos/${projeto.id}`}
              className="block rounded border border-black/10 p-4 hover:bg-black/[0.03] dark:border-white/10 dark:hover:bg-white/[0.03]"
            >
              <p className="font-medium">{projeto.nome}</p>
              {projeto.descricao && (
                <p className="mt-1 text-sm text-black/60 dark:text-white/60">
                  {projeto.descricao}
                </p>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
