"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { salvarItemEstoque, removerItemEstoque } from "@/lib/actions/estoque";
import {
  CATEGORIAS,
  LOCALIZACOES,
  UNIDADES,
  fmtQuantidade,
  nomeLocalizacao,
  type Categoria,
  type Unidade,
} from "@/lib/estoque";
import { INPUT_SM, BOTAO_SECUNDARIO_SM } from "@/lib/estilos";

export type ItemEstoque = {
  id: string;
  nome: string;
  categoria: string;
  quantidade: number | null;
  unidade: string | null;
  minimo: number | null;
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
  return i.quantidade != null && i.minimo != null && i.quantidade < i.minimo;
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
  const sugestoes = catalogo
    .filter((c) => !nomesNoEstoque.has(c.nome))
    .map((c) => c.nome);

  const baixos = itens.filter(estaBaixo);

  return (
    <div className="mt-8 flex flex-col gap-8">
      {baixos.length > 0 && (
        <div className="rounded border border-alerta/40 bg-alerta/5 p-3 text-sm">
          <p className="font-medium text-alerta">Estoque baixo</p>
          <p className="mt-1 text-ink-soft">
            {baixos
              .map((i) => `${i.nome} (${fmtQuantidade(i.quantidade, i.unidade)})`)
              .join(" · ")}
          </p>
        </div>
      )}

      {podeEditar && (
        <AdicionarForm sugestoes={sugestoes} nomesNoEstoque={nomesNoEstoque} />
      )}

      {CATEGORIAS.map((cat) => {
        const doGrupo = itens.filter((i) => i.categoria === cat.valor);
        return (
          <section key={cat.valor}>
            <p className="mb-1 font-mono text-xs uppercase tracking-[0.12em] text-signal">
              {cat.rotulo}
            </p>
            <p className="mb-3 text-xs text-ink-soft">{cat.descricao}</p>
            {doGrupo.length === 0 ? (
              <p className="text-xs text-ink-soft">Nada cadastrado aqui ainda.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {doGrupo.map((i) => (
                  <LinhaEstoque key={i.id} item={i} podeEditar={podeEditar} />
                ))}
              </div>
            )}
          </section>
        );
      })}
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

  const [categoria, setCategoria] = useState<Categoria>("solucao");
  const [nome, setNome] = useState("");
  const [quantidade, setQuantidade] = useState("");
  const [unidade, setUnidade] = useState<Unidade>("mL");
  const [minimo, setMinimo] = useState("");
  const [local, setLocal] = useState<string>("");
  const [obs, setObs] = useState("");

  function trocarCategoria(c: Categoria) {
    setCategoria(c);
    setUnidade(CATEGORIAS.find((x) => x.valor === c)?.unidadePadrao ?? "un");
  }

  function limpar() {
    setNome("");
    setQuantidade("");
    setMinimo("");
    setLocal("");
    setObs("");
  }

  function adicionar() {
    setErro(null);
    if (!nome.trim()) {
      setErro("Informe o nome do item.");
      return;
    }
    if (nomesNoEstoque.has(nome.trim())) {
      setErro("Esse item já está no estoque — edite a linha dele abaixo.");
      return;
    }
    iniciar(async () => {
      const r = await salvarItemEstoque({
        nome,
        categoria,
        quantidade: parseNum(quantidade),
        unidade,
        minimo: parseNum(minimo),
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
        + Adicionar item ao estoque
      </button>
    );
  }

  return (
    <div className="rounded border border-rule bg-paper-raised p-4">
      <p className="mb-3 font-mono text-xs uppercase tracking-[0.12em] text-ink-soft">
        Novo item no estoque
      </p>
      <div className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-xs text-ink-soft">
          Tópico
          <select
            value={categoria}
            onChange={(e) => trocarCategoria(e.target.value as Categoria)}
            className={`${INPUT_SM} w-64`}
          >
            {CATEGORIAS.map((c) => (
              <option key={c.valor} value={c.valor}>
                {c.rotulo}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs text-ink-soft">
          Nome
          <input
            list={categoria === "solucao" ? "catalogo-reagentes" : undefined}
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder={
              categoria === "solucao"
                ? "Ex.: PBS pH 7,4"
                : categoria === "ponteira"
                ? "Ex.: Ponteira 1000 µL"
                : categoria === "material"
                ? "Ex.: Béquer 100 mL"
                : "Ex.: Ácido clorídrico P.A."
            }
            className={`${INPUT_SM} w-full max-w-md`}
          />
          {categoria === "solucao" && (
            <datalist id="catalogo-reagentes">
              {sugestoes.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          )}
        </label>

        <div className="flex flex-wrap gap-3">
          <label className="flex flex-col gap-1 text-xs text-ink-soft">
            Quantidade
            <input
              inputMode="decimal"
              value={quantidade}
              onChange={(e) => setQuantidade(e.target.value)}
              className={`${INPUT_SM} w-24`}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-ink-soft">
            Unidade
            <select
              value={unidade}
              onChange={(e) => setUnidade(e.target.value as Unidade)}
              className={INPUT_SM}
            >
              {UNIDADES.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-ink-soft">
            Avisar abaixo de
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
    item.quantidade != null ? String(item.quantidade) : ""
  );
  const [unidade, setUnidade] = useState<Unidade>(
    (UNIDADES as string[]).includes(item.unidade ?? "")
      ? (item.unidade as Unidade)
      : "un"
  );
  const [minimo, setMinimo] = useState(item.minimo != null ? String(item.minimo) : "");
  const [local, setLocal] = useState<string>(item.localizacao ?? "");
  const [obs, setObs] = useState(item.obs ?? "");

  const baixo = estaBaixo(item);

  function salvar() {
    setErro(null);
    iniciar(async () => {
      const r = await salvarItemEstoque({
        nome: item.nome,
        categoria: item.categoria,
        quantidade: parseNum(quantidade),
        unidade,
        minimo: parseNum(minimo),
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
        <span className="font-mono tabular-nums text-ink-soft">
          {fmtQuantidade(item.quantidade, item.unidade)}
        </span>
        {item.localizacao && (
          <span className="text-xs text-ink-soft">· {nomeLocalizacao(item.localizacao)}</span>
        )}
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
          Quantidade
          <input
            inputMode="decimal"
            value={quantidade}
            onChange={(e) => setQuantidade(e.target.value)}
            className={`${INPUT_SM} w-20`}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-ink-soft">
          Unidade
          <select
            value={unidade}
            onChange={(e) => setUnidade(e.target.value as Unidade)}
            className={INPUT_SM}
          >
            {UNIDADES.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-ink-soft">
          Avisar abaixo de
          <input
            inputMode="decimal"
            value={minimo}
            onChange={(e) => setMinimo(e.target.value)}
            placeholder="opcional"
            className={`${INPUT_SM} w-20`}
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
