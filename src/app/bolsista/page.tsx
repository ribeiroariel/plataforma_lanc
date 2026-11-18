import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getUsuarioAtual } from "@/lib/supabase/profile";
import { carregarMeusTestes } from "@/lib/meusTestes";
import { rotuloFuncao } from "@/lib/sacrificio";
import { CartaoTeste } from "@/components/testes/CartaoTeste";
import { EmptyState } from "@/components/ui/EmptyState";
import { SectionTitle } from "@/components/ui/SectionTitle";

type FuncaoRow = {
  funcao: string;
  sacrificios: {
    id: string;
    leva: number | null;
    status: string;
    data: string | null;
    projeto_id: string;
    projetos: { nome: string } | null;
  } | null;
};

const ATALHOS = [
  { href: "/testes", titulo: "Protocolos", texto: "Passo a passo de cada ensaio" },
  { href: "/reagentes", titulo: "Reagentes", texto: "Calcular o preparo do dia" },
  { href: "/laboratorio", titulo: "Horas no lab", texto: "Iniciar ou lançar uma sessão" },
  { href: "/projetos/novo", titulo: "Novo projeto", texto: "Grupos, levas e tecidos" },
];

function saudacao() {
  const h = Number(
    new Date().toLocaleString("en-US", { hour: "numeric", hour12: false, timeZone: "America/Sao_Paulo" })
  );
  return h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
}

export default async function AreaBolsista() {
  const usuario = await getUsuarioAtual();
  const supabase = await createClient();

  const [testes, { data: funcoes }, { data: sessaoAberta }] = await Promise.all([
    usuario ? carregarMeusTestes(usuario.id) : Promise.resolve([]),
    supabase
      .from("sacrificio_funcoes")
      .select("funcao, sacrificios:sacrificio_id(id, leva, status, data, projeto_id, projetos:projeto_id(nome))")
      .eq("profile_id", usuario?.id ?? "")
      .returns<FuncaoRow[]>(),
    supabase
      .from("sessoes_lab")
      .select("id, inicio")
      .eq("profile_id", usuario?.id ?? "")
      .is("fim", null)
      .limit(1)
      .maybeSingle(),
  ]);

  const abertos = testes
    .filter((t) => !t.encerrado && t.status !== "concluido")
    .sort((a, b) => {
      // Em andamento (com ratos confirmados) primeiro, depois o mais recente.
      const ia = a.confirmados > 0 ? 0 : 1;
      const ib = b.confirmados > 0 ? 0 : 1;
      if (ia !== ib) return ia - ib;
      return (b.ultimoRegistro ?? "").localeCompare(a.ultimoRegistro ?? "");
    });
  const concluidos = testes.length - abertos.length;
  const funcoesAtivas = (funcoes ?? []).filter(
    (f) => f.sacrificios && f.sacrificios.status !== "concluido"
  );
  const leiturasPendentes = abertos
    .filter((t) => t.papel === "responsavel")
    .reduce((s, t) => s + Math.max(0, t.total - t.confirmados), 0);

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-rule pb-6">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-signal">
            Área do bolsista
          </p>
          <h1 className="mt-2 font-display text-4xl leading-tight text-ink">
            {saudacao()}, {(usuario?.nome ?? "").split(" ")[0]}.
          </h1>
          <p className="mt-2 text-sm text-ink-soft">
            {abertos.length === 0
              ? "Nenhum teste em aberto — tudo em dia."
              : `${abertos.length} teste(s) em aberto · ${leiturasPendentes} leitura(s) a confirmar.`}
          </p>
        </div>
        <Link
          href="/laboratorio"
          className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition-colors ${
            sessaoAberta
              ? "border-sucesso/40 bg-sucesso/10 text-sucesso hover:bg-sucesso/15"
              : "border-rule text-ink hover:border-signal hover:text-signal"
          }`}
        >
          <span
            aria-hidden
            className={`h-2 w-2 rounded-full ${sessaoAberta ? "animate-pulse bg-sucesso" : "bg-ink-soft/40"}`}
          />
          {sessaoAberta
            ? `No laboratório desde ${new Date(sessaoAberta.inicio).toLocaleTimeString("pt-BR", {
                hour: "2-digit",
                minute: "2-digit",
                timeZone: "America/Sao_Paulo",
              })}`
            : "Cheguei no laboratório"}
        </Link>
      </header>

      {/* Números */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { rotulo: "Em aberto", valor: abertos.length, cor: "var(--color-reagent)" },
          { rotulo: "Concluídos", valor: concluidos, cor: "var(--color-sucesso)" },
          { rotulo: "Leituras a confirmar", valor: leiturasPendentes, cor: "var(--color-absorbance)" },
          { rotulo: "Funções de sacrifício", valor: funcoesAtivas.length, cor: "var(--color-pyrogallol)" },
        ].map((k) => (
          <div key={k.rotulo} className="relative overflow-hidden rounded-lg border border-rule bg-paper-raised px-4 py-3">
            <span aria-hidden className="absolute inset-x-0 top-0 h-[3px]" style={{ background: k.cor }} />
            <p className="font-display text-3xl leading-none tabular-nums text-ink">{k.valor}</p>
            <p className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.1em] text-ink-soft">{k.rotulo}</p>
          </div>
        ))}
      </div>

      <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <section>
          <SectionTitle
            contagem={abertos.length}
            acao={
              <Link href="/meus-testes" className="text-xs text-absorbance hover:underline">
                Todos os testes →
              </Link>
            }
          >
            Continue de onde parou
          </SectionTitle>
          {abertos.length === 0 ? (
            <EmptyState
              titulo="Nada pendente na bancada"
              descricao="Quando um coautor designar um ensaio a você, ele aparece aqui com o progresso."
              acao={
                <Link href="/projetos" className="text-sm text-absorbance hover:underline">
                  Ver projetos →
                </Link>
              }
            />
          ) : (
            <div className="anim-cascata grid gap-3 sm:grid-cols-2">
              {abertos.slice(0, 6).map((t, i) => (
                <CartaoTeste key={t.id} t={t} destaque={i === 0 && t.confirmados > 0} />
              ))}
            </div>
          )}
        </section>

        <aside className="flex flex-col gap-8">
          {funcoesAtivas.length > 0 && (
            <section>
              <SectionTitle contagem={funcoesAtivas.length}>Sacrifícios</SectionTitle>
              <div className="flex flex-col gap-2">
                {funcoesAtivas.map((f) => {
                  const s = f.sacrificios!;
                  return (
                    <Link
                      key={s.id + f.funcao}
                      href={`/projetos/${s.projeto_id}/sacrificio/${s.id}/funcao/${f.funcao}`}
                      className="rounded-lg border border-rule bg-paper-raised px-4 py-3 text-sm transition-colors hover:border-pyrogallol"
                    >
                      <p className="font-medium text-ink">{rotuloFuncao(f.funcao)}</p>
                      <p className="text-xs text-ink-soft">
                        {s.projetos?.nome ?? "projeto"}
                        {s.leva ? ` · Leva ${s.leva}` : ""}
                        {s.data ? ` · ${new Date(s.data + "T00:00:00").toLocaleDateString("pt-BR")}` : ""}
                      </p>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}

          <section>
            <SectionTitle>Atalhos</SectionTitle>
            <div className="grid grid-cols-2 gap-2">
              {ATALHOS.map((a) => (
                <Link
                  key={a.href}
                  href={a.href}
                  className="group rounded-lg border border-rule bg-paper-raised p-3 transition-colors hover:border-signal"
                >
                  <p className="text-sm font-medium text-ink group-hover:text-signal">{a.titulo}</p>
                  <p className="mt-0.5 text-xs leading-snug text-ink-soft">{a.texto}</p>
                </Link>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
}
