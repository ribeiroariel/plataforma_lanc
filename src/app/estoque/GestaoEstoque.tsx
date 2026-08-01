"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  salvarItemEstoque,
  removerItemEstoque,
} from "@/lib/actions/estoque";
import {
  LOCALIZACOES,
  fmtMl,
  type Localizacao,
  type TipoReagenteEstoque,
} from "@/lib/estoque";
import { INPUT_SM, BOTAO_SECUNDARIO_SM } from "@/lib/estilos";

export type ItemEstoque = {
  id: string;
  nome: string;
  tipo: TipoReagenteEstoque;
  quantidade_ml: number | null;
  minimo_ml: number | null;
  localizacao: string | null;
  obs: string | null;
  atualizado_em: string | null;
};

type Catalogo = { nome: string; origem: "estoque" | "dia" }[];

function parseNum(s: string): number | null {
  const t = s.trim().replace(",", ".");
  if (t === "") return null;
  const n = parseFloat(t);
  return Number.isFinite(n) ? n : null;
}

function estaBaixo(i: ItemEstoque): boolean {
  return (
    i.quantidade_ml != null &&
    i.minimo_ml != null &&
    i.quantidade_ml < i.minimo_ml
  );
}

export default function GestaoEstoque({
  itens,
  catalogo,
  podeEditar,
}: {
  itens: ItemEstoque[];
  catalogo: Catalogo;
  podeEditar: boolean;
}) {
  const nomesNoEstoque = new Set(itens.map((i) => i.nome));
  // Soluções conhecidas dos protocolos ainda não cadastradas (sugestões).
  const sugestoes = catalogo
    .filter((c) => !nomesNoEstoque.has(c.nome))
    .map((c) => c.nome);

  const porLocal = useMemo(() => {
    const grupos: { chave: Localizacao | "sem"; rotulo: string; itens: ItemEstoque[] }[] =
      LOCALIZACOES.map((l) => ({ chave: l.valor, rotulo: l.rotulo, itens: [] }));
    grupos.push({ chave: "sem", rotulo: "Sem local definido", itens: [] });
    for (const i of itens) {
      const g =
        grupos.find((x) => x.chave === i.localizacao) ??
        grupos[grupos.length - 1];
      g.itens.push(i);
    }
    return grupos.filter((g) => g.itens.length > 0);
  }, [itens]);

  const baixos = itens.filter(estaBaixo);

  return (
    <div className="mt-8 flex flex-col gap-8">
      {baixos.length > 0 && (
        <div className="rounded border border-alerta/40 bg-alerta/5 p-3 text-sm">
          <p className="font-medium text-alerta">Estoque baixo</p>
          <p className="mt-1 text-ink-soft">
            {baixos
              .map((i) => `${i.nome} (${fmtMl(i.quantidade_ml)})`)
              .join(" · ")}
          </p>
        </div>
      )}

      {podeEditar && (
        <AdicionarForm sugestoes={sugestoes} nomesNoEstoque={nomesNoEstoque} />
      )}

      {itens.length === 0 ? (
        <p className="text-sm text-ink-soft">
          Nenhuma solução no estoque ainda. Adicione as soluções que o laboratório
          já tem prontas, com a quantidade e onde ficam guardadas.
        </p>
      ) : (
        porLocal.map((g) => (
          <section key={g.chave}>
            <p className="mb-2 font-mono text-xs uppercase tracking-[0.12em] text-signal">
              {g.rotulo}
            </p>
            <div className="flex flex-col gap-2">
              {g.itens.map((i) => (
                <LinhaEstoque key={i.id} item={i} podeEditar={podeEditar} />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}

function AdicionarForm({
  sugestoes,
  nomesNoEstoque,
}: {
  sugestoes: string[];
  nomesNoEstoque: Set<string>;
}) {
  const router = useRouter();
  const [pend, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [aberto, setAberto] = useState(false);

  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState<TipoReagenteEstoque>("solucao");
  const [quantidade, setQuantidade] = useState("");
  const [minimo, setMinimo] = useState("");
  const [local, setLocal] = useState<string>("");
  const [obs, setObs] = useState("");

  function limpar() {
    setNome("");
    setTipo("solucao");
    setQuantidade("");
    setMinimo("");
    setLocal("");
    setObs("");
  }

  function adicionar() {
    setErro(null);
    if (!nome.trim()) {
      setErro("Informe o nome da solução.");
      return;
    }
    if (nomesNoEstoque.has(nome.trim())) {
      setErro("Essa solução já está no estoque — edite a linha dela abaixo.");
      return;
    }
    iniciar(async () => {
      const r = await salvarItemEstoque({
        nome,
        tipo,
        quantidadeMl: parseNum(quantidade),
        minimoMl: parseNum(minimo),
        localizacao: local || null,
        obs: obs || null,
      });
      if ("erro" in r) {
        setErro(r.erro);
        return;
      }
      limpar();
      setAberto(false);
      router.refresh();
    });
  }

  if (!aberto) {
    return (
      <button
        type="button"
        onClick={() => setAberto(true)}
        className={`w-fit ${BOTAO_SECUNDARIO_SM}`}
      >
        + Adicionar solução ao estoque
      </button>
    );
  }

  return (
    <div className="rounded border border-rule bg-paper-raised p-4">
      <p className="mb-3 font-mono text-xs uppercase tracking-[0.12em] text-ink-soft">
        Nova solução no estoque
      </p>
      <div className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-xs text-ink-soft">
          Nome da solução
          <input
            list="catalogo-reagentes"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Ex.: PBS pH 7,4"
            className={`${INPUT_SM} w-full max-w-md`}
          />
          <datalist id="catalogo-reagentes">
            {sugestoes.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
          <span className="text-[11px] text-ink-soft">
            Comece a digitar para escolher uma solução conhecida dos protocolos,
            ou escreva uma nova.
          </span>
        </label>

        <div className="flex flex-wrap gap-3">
          <label className="flex flex-col gap-1 text-xs text-ink-soft">
            Tipo
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value as TipoReagenteEstoque)}
              className={INPUT_SM}
            >
              <option value="solucao">Solução / tampão</option>
              <option value="pa">Reagente P.A. (puro)</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-ink-soft">
            Quantidade (mL)
            <input
              inputMode="decimal"
              value={quantidade}
              onChange={(e) => setQuantidade(e.target.value)}
              placeholder="Ex.: 100"
              className={`${INPUT_SM} w-28`}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-ink-soft">
            Avisar abaixo de (mL)
            <input
              inputMode="decimal"
              value={minimo}
              onChange={(e) => setMinimo(e.target.value)}
              placeholder="opcional"
              className={`${INPUT_SM} w-28`}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-ink-soft">
            Onde fica
            <select
              value={local}
              onChange={(e) => setLocal(e.target.value)}
              className={INPUT_SM}
            >
              <option value="">—</option>
              {LOCALIZACOES.map((l) => (
                <option key={l.valor} value={l.valor}>
                  {l.rotulo}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="flex flex-col gap-1 text-xs text-ink-soft">
          Observação (opcional)
          <input
            value={obs}
            onChange={(e) => setObs(e.target.value)}
            placeholder="Ex.: preparado em 20/07, validade 30 dias"
            className={`${INPUT_SM} w-full max-w-md`}
          />
        </label>

        {erro && <p className="text-sm text-alerta">{erro}</p>}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={adicionar}
            disabled={pend}
            className={BOTAO_SECUNDARIO_SM}
          >
            {pend ? "Salvando..." : "Adicionar"}
          </button>
          <button
            type="button"
            onClick={() => {
              limpar();
              setAberto(false);
              setErro(null);
            }}
            className="text-xs text-ink-soft underline-offset-2 hover:underline"
          >
            cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

function LinhaEstoque({
  item,
  podeEditar,
}: {
  item: ItemEstoque;
  podeEditar: boolean;
}) {
  const router = useRouter();
  const [pend, iniciar] = useTransition();
  const [editando, setEditando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [quantidade, setQuantidade] = useState(
    item.quantidade_ml != null ? String(item.quantidade_ml) : ""
  );
  const [minimo, setMinimo] = useState(
    item.minimo_ml != null ? String(item.minimo_ml) : ""
  );
  const [local, setLocal] = useState<string>(item.localizacao ?? "");
  const [obs, setObs] = useState(item.obs ?? "");

  const baixo = estaBaixo(item);

  function salvar() {
    setErro(null);
    iniciar(async () => {
      const r = await salvarItemEstoque({
        nome: item.nome,
        tipo: item.tipo,
        quantidadeMl: parseNum(quantidade),
        minimoMl: parseNum(minimo),
        localizacao: local || null,
        obs: obs || null,
      });
      if ("erro" in r) {
        setErro(r.erro);
        return;
      }
      setEditando(false);
      router.refresh();
    });
  }

  function remover() {
    setErro(null);
    iniciar(async () => {
      const r = await removerItemEstoque(item.id);
      if ("erro" in r) setErro(r.erro);
      else router.refresh();
    });
  }

  if (!editando) {
    return (
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded border border-rule bg-paper-raised px-3 py-2 text-sm">
        <span className="font-medium text-ink">{item.nome}</span>
        {item.tipo === "pa" && (
          <span className="rounded-full bg-ink/5 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-ink-soft">
            P.A.
          </span>
        )}
        <span className="font-mono tabular-nums text-ink-soft">
          {fmtMl(item.quantidade_ml)}
        </span>
        {baixo && (
          <span className="rounded-full bg-alerta/12 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-alerta">
            baixo
          </span>
        )}
        {item.obs && <span className="text-xs text-ink-soft">· {item.obs}</span>}
        {podeEditar && (
          <button
            type="button"
            onClick={() => setEditando(true)}
            className="ml-auto text-xs text-signal underline-offset-2 hover:underline"
          >
            editar
          </button>
        )}
        {erro && <p className="w-full text-xs text-alerta">{erro}</p>}
      </div>
    );
  }

  return (
    <div className="rounded border border-signal/40 bg-paper-raised px-3 py-2">
      <p className="mb-2 text-sm font-medium text-ink">{item.nome}</p>
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-xs text-ink-soft">
          Quantidade (mL)
          <input
            inputMode="decimal"
            value={quantidade}
            onChange={(e) => setQuantidade(e.target.value)}
            className={`${INPUT_SM} w-24`}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-ink-soft">
          Avisar abaixo de (mL)
          <input
            inputMode="decimal"
            value={minimo}
            onChange={(e) => setMinimo(e.target.value)}
            placeholder="opcional"
            className={`${INPUT_SM} w-24`}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-ink-soft">
          Onde fica
          <select
            value={local}
            onChange={(e) => setLocal(e.target.value)}
            className={INPUT_SM}
          >
            <option value="">—</option>
            {LOCALIZACOES.map((l) => (
              <option key={l.valor} value={l.valor}>
                {l.rotulo}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="mt-2 flex flex-col gap-1 text-xs text-ink-soft">
        Observação
        <input
          value={obs}
          onChange={(e) => setObs(e.target.value)}
          className={`${INPUT_SM} w-full max-w-md`}
        />
      </label>
      {erro && <p className="mt-1 text-sm text-alerta">{erro}</p>}
      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          onClick={salvar}
          disabled={pend}
          className={BOTAO_SECUNDARIO_SM}
        >
          {pend ? "Salvando..." : "Salvar"}
        </button>
        <button
          type="button"
          onClick={() => {
            setEditando(false);
            setErro(null);
          }}
          className="text-xs text-ink-soft underline-offset-2 hover:underline"
        >
          cancelar
        </button>
        <button
          type="button"
          onClick={remover}
          disabled={pend}
          className="ml-auto text-xs text-alerta underline-offset-2 hover:underline"
        >
          remover
        </button>
      </div>
    </div>
  );
}
