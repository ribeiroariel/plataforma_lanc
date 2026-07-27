import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUsuarioAtual } from "@/lib/supabase/profile";
import { rotuloFuncao } from "@/lib/sacrificio";

type FuncaoRow = {
  funcao: string;
  sacrificio_id: string;
  sacrificios: {
    id: string;
    leva: number | null;
    status: string;
    data: string | null;
    projeto_id: string;
    projetos: { nome: string } | null;
  } | null;
};

export default async function MinhasFuncoes() {
  const usuario = await getUsuarioAtual();
  if (!usuario) redirect("/login");

  const supabase = await createClient();

  // Funções de sacrifício designadas a mim (em qualquer projeto). A RLS
  // (eh_designado_sacrificio) libera a leitura mesmo se eu não for membro.
  const { data } = await supabase
    .from("sacrificio_funcoes")
    .select(
      "funcao, sacrificio_id, sacrificios:sacrificio_id(id, leva, status, data, projeto_id, projetos:projeto_id(nome))"
    )
    .eq("profile_id", usuario.id)
    .returns<FuncaoRow[]>();

  const itens = (data ?? []).filter((f) => f.sacrificios);
  const ativos = itens.filter((f) => f.sacrificios!.status !== "concluido");
  const concluidos = itens.filter((f) => f.sacrificios!.status === "concluido");

  function Linha({ f }: { f: FuncaoRow }) {
    const s = f.sacrificios!;
    return (
      <Link
        href={`/projetos/${s.projeto_id}/sacrificio/${s.id}/funcao/${f.funcao}`}
        className="flex items-center justify-between gap-3 rounded border border-rule bg-paper-raised px-4 py-3 text-sm transition-colors hover:border-signal"
      >
        <div>
          <p className="font-medium text-ink">{rotuloFuncao(f.funcao)}</p>
          <p className="text-ink-soft">
            <span className="text-signal">{s.projetos?.nome ?? "projeto"}</span>
            {s.leva ? ` · Leva ${s.leva}` : ""}
            {s.data
              ? ` · ${new Date(s.data + "T00:00:00").toLocaleDateString("pt-BR")}`
              : ""}
          </p>
        </div>
        <span className="shrink-0 font-mono text-xs uppercase text-signal">
          Abrir →
        </span>
      </Link>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <p className="font-mono text-xs uppercase tracking-[0.14em] text-ink-soft">
        Bancada
      </p>
      <h1 className="mt-1 font-display text-3xl leading-tight text-ink">
        Minhas funções no sacrifício
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-ink-soft">
        Funções de sacrifício designadas a você, de todos os projetos. Cada uma
        abre a aba da sua parte no dia — todos os designados à mesma função
        preenchem a mesma aba, ao vivo.
      </p>

      {itens.length === 0 && (
        <p className="mt-8 text-sm text-ink-soft">
          Nenhuma função de sacrifício designada a você por enquanto.
        </p>
      )}

      {ativos.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 border-t-2 border-ink pt-2 font-mono text-xs uppercase tracking-[0.12em] text-ink">
            Ativas ({ativos.length})
          </h2>
          <div className="flex flex-col gap-2">
            {ativos.map((f) => (
              <Linha key={`${f.sacrificio_id}-${f.funcao}`} f={f} />
            ))}
          </div>
        </section>
      )}

      {concluidos.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-3 border-t-2 border-ink pt-2 font-mono text-xs uppercase tracking-[0.12em] text-ink">
            Encerradas ({concluidos.length})
          </h2>
          <div className="flex flex-col gap-2">
            {concluidos.map((f) => (
              <Linha key={`${f.sacrificio_id}-${f.funcao}`} f={f} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
