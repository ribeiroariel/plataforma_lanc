"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { salvarOrdemGrupos } from "@/lib/actions/projetos";
import { BOTAO_SECUNDARIO_SM } from "@/lib/estilos";

type Grupo = { id: string; nome: string };

// Confirmação/reordenação da ordem das caixas ANTES de começar o sacrifício.
// Define a numeração global dos ratos (roster). Arrastar reordena; em tablet/
// celular há também as setas ↑ ↓. Trava assim que houver ratos registrados.
export default function OrdemCaixas({
  projetoId,
  grupos,
  podeEditar,
  travada,
}: {
  projetoId: string;
  grupos: Grupo[];
  podeEditar: boolean;
  travada: boolean;
}) {
  const router = useRouter();
  const [lista, setLista] = useState<Grupo[]>(grupos);
  const [arrastando, setArrastando] = useState<number | null>(null);
  const [pend, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [salvo, setSalvo] = useState(false);

  const editavel = podeEditar && !travada;

  function mover(de: number, para: number) {
    if (para < 0 || para >= lista.length) return;
    setLista((atual) => {
      const nova = [...atual];
      const [item] = nova.splice(de, 1);
      nova.splice(para, 0, item);
      return nova;
    });
    setSalvo(false);
  }

  function salvar() {
    setErro(null);
    iniciar(async () => {
      const res = await salvarOrdemGrupos(
        projetoId,
        lista.map((g) => g.id)
      );
      if (res && "erro" in res) setErro(res.erro);
      else {
        setSalvo(true);
        router.refresh();
      }
    });
  }

  return (
    <section className="rounded border border-rule bg-paper-raised p-4">
      <p className="mb-1 font-mono text-xs uppercase tracking-[0.12em] text-ink-soft">
        Ordem das caixas
      </p>
      <p className="mb-3 max-w-2xl text-xs leading-relaxed text-ink-soft">
        {editavel ? (
          <>
            Confirme a ordem em que as caixas serão processadas — ela define a
            numeração dos ratos (1 → N) em todo o projeto. Arraste para
            reordenar (ou use as setas) e salve <strong>antes de começar</strong>.
          </>
        ) : travada ? (
          <>
            A ordem está travada porque o sacrifício já começou (há ratos
            registrados). A numeração dos ratos segue esta ordem.
          </>
        ) : (
          <>Esta é a ordem das caixas que define a numeração dos ratos.</>
        )}
      </p>

      <ol className="flex flex-col gap-1.5">
        {lista.map((g, i) => (
          <li
            key={g.id}
            draggable={editavel}
            onDragStart={() => setArrastando(i)}
            onDragOver={(e) => {
              if (!editavel || arrastando === null) return;
              e.preventDefault();
            }}
            onDrop={(e) => {
              if (!editavel || arrastando === null) return;
              e.preventDefault();
              mover(arrastando, i);
              setArrastando(null);
            }}
            onDragEnd={() => setArrastando(null)}
            className={`flex items-center gap-2 rounded border px-3 py-2 text-sm ${
              arrastando === i
                ? "border-signal/60 bg-signal/5"
                : "border-rule/60"
            } ${editavel ? "cursor-move" : ""}`}
          >
            <span className="font-mono text-xs text-ink-soft w-6">{i + 1}.</span>
            {editavel && (
              <span className="select-none text-ink-soft" aria-hidden>
                ⠿
              </span>
            )}
            <span className="flex-1 text-ink">{g.nome}</span>
            {editavel && (
              <span className="flex gap-1">
                <button
                  type="button"
                  onClick={() => mover(i, i - 1)}
                  disabled={i === 0}
                  aria-label="Subir"
                  className="rounded border border-rule px-2 py-0.5 text-xs text-ink-soft disabled:opacity-30 hover:enabled:bg-paper"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => mover(i, i + 1)}
                  disabled={i === lista.length - 1}
                  aria-label="Descer"
                  className="rounded border border-rule px-2 py-0.5 text-xs text-ink-soft disabled:opacity-30 hover:enabled:bg-paper"
                >
                  ↓
                </button>
              </span>
            )}
          </li>
        ))}
      </ol>

      {editavel && (
        <div className="mt-3 flex items-center gap-3">
          <button
            type="button"
            onClick={salvar}
            disabled={pend}
            className={BOTAO_SECUNDARIO_SM}
          >
            {pend ? "Salvando..." : "Salvar ordem"}
          </button>
          {salvo && (
            <span className="font-mono text-xs text-sucesso">✓ ordem salva</span>
          )}
        </div>
      )}
      {erro && <p className="mt-2 text-sm text-alerta">{erro}</p>}
    </section>
  );
}
