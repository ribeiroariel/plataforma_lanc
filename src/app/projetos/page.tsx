import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getUsuarioAtual } from "@/lib/supabase/profile";
import { BOTAO_PRIMARIO } from "@/lib/estilos";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";

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
    <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <PageHeader
        eyebrow={souOrientador ? "Acompanhamento" : "Pesquisa"}
        titulo={souOrientador ? "Todos os projetos" : "Meus projetos"}
        acao={
          !souOrientador && (
            <Link href="/projetos/novo" className={`text-sm ${BOTAO_PRIMARIO}`}>
              + Novo projeto
            </Link>
          )
        }
      />

      {!projetos || projetos.length === 0 ? (
        <EmptyState
          className="mt-8"
          titulo={
            souOrientador
              ? "Nenhum projeto criado ainda"
              : "Você ainda não participa de nenhum projeto"
          }
          descricao={
            souOrientador
              ? "Assim que os bolsistas criarem projetos, eles aparecem aqui."
              : "Crie um projeto para organizar grupos, designar testes e registrar resultados."
          }
          acao={
            !souOrientador && (
              <Link href="/projetos/novo" className={`text-sm ${BOTAO_PRIMARIO}`}>
                + Novo projeto
              </Link>
            )
          }
        />
      ) : (
        <ul className="mt-8 flex flex-col gap-3">
          {projetos.map((projeto) => (
            <li key={projeto.id}>
              <Link
                href={`/projetos/${projeto.id}`}
                className="group flex items-start justify-between gap-4 rounded border border-rule bg-paper-raised p-5 transition-colors hover:border-absorbance"
              >
                <div className="min-w-0">
                  <p className="font-display text-lg text-ink">{projeto.nome}</p>
                  {projeto.descricao && (
                    <p className="mt-1 text-sm leading-relaxed text-ink-soft">
                      {projeto.descricao}
                    </p>
                  )}
                </div>
                <span
                  aria-hidden="true"
                  className="mt-1 shrink-0 text-ink-soft/50 transition-transform group-hover:translate-x-0.5 group-hover:text-absorbance"
                >
                  →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
