"use client";

import { useState, useTransition } from "react";
import {
  salvarSobrevivencia,
  marcarDissecado,
  reabrirRato,
} from "@/lib/actions/sacrificio";
import { INPUT_SM, BOTAO_SECUNDARIO_SM } from "@/lib/estilos";

type RatoRoster = { numero: number; grupoId: string; grupoNome: string };
type RatoSalvo = {
  id: string;
  rato: string;
  caixa: string | null;
  ordem: number | null;
  sobreviveu: boolean;
  motivo: string | null;
  status: string;
};

type Props = {
  projetoId: string;
  sacrificioId: string;
  podeRegistrar: boolean;
  roster: RatoRoster[];
  ratos: RatoSalvo[];
};

export default function DiaSacrificio({
  projetoId,
  sacrificioId,
  podeRegistrar,
  roster,
  ratos,
}: Props) {
  const salvosPorRato = new Map(ratos.map((r) => [r.rato, r]));

  const [pend, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  // --- Sobrevivência ---
  const [sobrev, setSobrev] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    for (const r of roster) {
      const chave = String(r.numero);
      init[chave] = salvosPorRato.get(chave)?.sobreviveu ?? true;
    }
    return init;
  });
  const [motivos, setMotivos] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const r of roster) {
      const chave = String(r.numero);
      init[chave] = salvosPorRato.get(chave)?.motivo ?? "";
    }
    return init;
  });

  function salvarSobrev() {
    setErro(null);
    const linhas = roster.map((r) => ({
      rato: String(r.numero),
      grupoId: r.grupoId,
      sobreviveu: sobrev[String(r.numero)] ?? true,
      motivo: motivos[String(r.numero)] ?? null,
    }));
    iniciar(async () => {
      const res = await salvarSobrevivencia({ projetoId, sacrificioId, linhas });
      if ("erro" in res) setErro(res.erro);
    });
  }

  // --- Contagem ---
  const [caixas, setCaixas] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const r of ratos) init[r.id] = r.caixa ?? "";
    return init;
  });

  function dissecar(r: RatoSalvo) {
    setErro(null);
    iniciar(async () => {
      const res = await marcarDissecado({
        projetoId,
        sacrificioId,
        sacrificioRatoId: r.id,
        caixa: caixas[r.id] ?? null,
      });
      if ("erro" in res) setErro(res.erro);
    });
  }
  function reabrir(r: RatoSalvo) {
    setErro(null);
    iniciar(async () => {
      const res = await reabrirRato({
        projetoId,
        sacrificioId,
        sacrificioRatoId: r.id,
      });
      if ("erro" in res) setErro(res.erro);
    });
  }

  const sobreviventes = ratos.filter((r) => r.sobreviveu);
  const dissecados = sobreviventes
    .filter((r) => r.status === "dissecado")
    .sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0));
  const pendentes = sobreviventes
    .filter((r) => r.status !== "dissecado")
    .sort((a, b) => Number(a.rato) - Number(b.rato));

  return (
    <div className="mt-8 flex flex-col gap-12">
      {erro && <p className="text-sm text-alerta">{erro}</p>}

      {/* 1. Sobrevivência */}
      <section>
        <p className="mb-1 font-mono text-xs uppercase tracking-[0.12em] text-ink-soft">
          1 · Sobrevivência
        </p>
        <p className="mb-3 max-w-2xl text-xs leading-relaxed text-ink-soft">
          Desmarque os ratos que não entram no sacrifício (morreram, adoeceram,
          etc.) e justifique. Salvar gera a fila de contagem abaixo.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-rule text-left font-mono text-[11px] uppercase tracking-wide text-ink-soft">
                <th className="py-2 pr-3 font-normal">Nº</th>
                <th className="py-2 pr-3 font-normal">Grupo</th>
                <th className="py-2 pr-3 font-normal">Sobreviveu</th>
                <th className="py-2 font-normal">Justificativa (se excluído)</th>
              </tr>
            </thead>
            <tbody>
              {roster.map((r) => {
                const chave = String(r.numero);
                const vivo = sobrev[chave] ?? true;
                return (
                  <tr key={chave} className="border-b border-rule/60">
                    <td className="py-1.5 pr-3 font-mono text-ink">{r.numero}</td>
                    <td className="py-1.5 pr-3 whitespace-nowrap text-ink-soft">
                      {r.grupoNome}
                    </td>
                    <td className="py-1.5 pr-3">
                      <input
                        type="checkbox"
                        checked={vivo}
                        onChange={(e) =>
                          setSobrev((p) => ({ ...p, [chave]: e.target.checked }))
                        }
                        disabled={!podeRegistrar}
                      />
                    </td>
                    <td className="py-1.5">
                      {!vivo && (
                        <input
                          type="text"
                          value={motivos[chave] ?? ""}
                          onChange={(e) =>
                            setMotivos((p) => ({ ...p, [chave]: e.target.value }))
                          }
                          disabled={!podeRegistrar}
                          placeholder="Ex.: morreu na indução"
                          className={`${INPUT_SM} w-56`}
                        />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {podeRegistrar && (
          <button
            type="button"
            onClick={salvarSobrev}
            disabled={pend}
            className={`mt-3 ${BOTAO_SECUNDARIO_SM}`}
          >
            {pend ? "Salvando..." : "Salvar sobrevivência"}
          </button>
        )}
      </section>

      {/* 2. Contagem ao vivo */}
      <section>
        <p className="mb-1 font-mono text-xs uppercase tracking-[0.12em] text-ink-soft">
          2 · Contagem ao vivo
        </p>
        {sobreviventes.length === 0 ? (
          <p className="text-xs text-ink-soft">
            Salve a sobrevivência primeiro para gerar a fila.
          </p>
        ) : (
          <>
            <p className="mb-3 text-xs text-ink-soft">
              {dissecados.length} de {sobreviventes.length} dissecados. Digite a
              caixa (etiqueta) de cada rato na hora e marque como dissecado — a
              ordem da sequência é numerada automaticamente.
            </p>

            {pendentes.length > 0 && (
              <div className="mb-4">
                <p className="mb-2 font-mono text-[11px] uppercase tracking-wide text-ink-soft">
                  Pendentes
                </p>
                <div className="flex flex-col gap-1.5">
                  {pendentes.map((r, i) => (
                    <div
                      key={r.id}
                      className={`flex flex-wrap items-center gap-2 rounded border px-2 py-1.5 text-sm ${
                        i === 0
                          ? "border-signal/50 bg-signal/5"
                          : "border-rule/60"
                      }`}
                    >
                      <span className="font-mono text-ink">Rato {r.rato}</span>
                      {i === 0 && (
                        <span className="rounded-full bg-signal/12 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-signal">
                          próximo
                        </span>
                      )}
                      {podeRegistrar ? (
                        <>
                          <input
                            type="text"
                            value={caixas[r.id] ?? ""}
                            onChange={(e) =>
                              setCaixas((p) => ({ ...p, [r.id]: e.target.value }))
                            }
                            placeholder="Caixa"
                            className={`${INPUT_SM} w-28`}
                          />
                          <button
                            type="button"
                            onClick={() => dissecar(r)}
                            disabled={pend}
                            className={BOTAO_SECUNDARIO_SM}
                          >
                            Marcar dissecado
                          </button>
                        </>
                      ) : (
                        <span className="text-xs text-ink-soft">pendente</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {dissecados.length > 0 && (
              <div>
                <p className="mb-2 font-mono text-[11px] uppercase tracking-wide text-ink-soft">
                  Dissecados
                </p>
                <div className="flex flex-col gap-1">
                  {dissecados.map((r) => (
                    <div
                      key={r.id}
                      className="flex flex-wrap items-center gap-2 text-sm text-ink-soft"
                    >
                      <span className="font-mono text-green-700 dark:text-green-400">
                        #{r.ordem}
                      </span>
                      <span className="font-mono text-ink">Rato {r.rato}</span>
                      {r.caixa && <span>· caixa {r.caixa}</span>}
                      {podeRegistrar && (
                        <button
                          type="button"
                          onClick={() => reabrir(r)}
                          disabled={pend}
                          className="text-xs text-ink-soft underline-offset-2 hover:text-alerta hover:underline"
                        >
                          reabrir
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
