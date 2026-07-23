"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  salvarSobrevivencia,
  marcarDissecado,
  reabrirRato,
  salvarColeta,
  confirmarAliquota,
  encerrarSacrificio,
  reabrirSacrificio,
  type DestinoTecido,
} from "@/lib/actions/sacrificio";
import { ORGAOS_DISSECAVEIS, volumeTampaoUl } from "@/lib/sacrificio";
import { INPUT_SM, BOTAO_SECUNDARIO_SM } from "@/lib/estilos";

type RatoRoster = { numero: number; grupoId: string; grupoNome: string };
type TecidoColeta = {
  tecido: string;
  destino: DestinoTecido;
  motivo: string | null;
};
type AliquotaSalva = {
  tecido: string;
  pesoG: number | null;
  volumeUl: number | null;
  confirmado: boolean;
};
type RatoSalvo = {
  id: string;
  rato: string;
  caixa: string | null;
  ordem: number | null;
  sobreviveu: boolean;
  motivo: string | null;
  status: string;
  tecidos: TecidoColeta[];
  aliquotas: AliquotaSalva[];
};

type Props = {
  projetoId: string;
  sacrificioId: string;
  podeRegistrar: boolean;
  podeEncerrar: boolean;
  status: string;
  roster: RatoRoster[];
  ratos: RatoSalvo[];
};

export default function DiaSacrificio({
  projetoId,
  sacrificioId,
  podeRegistrar,
  podeEncerrar,
  status,
  roster,
  ratos,
}: Props) {
  const salvosPorRato = new Map(ratos.map((r) => [r.rato, r]));

  const router = useRouter();
  const [pend, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  const concluido = status === "concluido";

  function encerrar() {
    setErro(null);
    iniciar(async () => {
      const res = await encerrarSacrificio({ projetoId, sacrificioId });
      if ("erro" in res) setErro(res.erro);
      else router.refresh();
    });
  }
  function reabrirDia() {
    setErro(null);
    iniciar(async () => {
      const res = await reabrirSacrificio({ projetoId, sacrificioId });
      if ("erro" in res) setErro(res.erro);
      else router.refresh();
    });
  }

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
      else router.refresh();
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
      else router.refresh();
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
      else router.refresh();
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

      {(podeEncerrar || concluido) && (
        <div className="flex flex-wrap items-center gap-3 rounded border border-rule bg-paper-raised px-4 py-3">
          {concluido ? (
            <>
              <span className="font-mono text-xs uppercase tracking-wide text-green-700 dark:text-green-400">
                ● Sacrifício encerrado
              </span>
              <span className="text-xs text-ink-soft">
                A edição das etapas está travada.
              </span>
              {podeEncerrar && (
                <button
                  type="button"
                  onClick={reabrirDia}
                  disabled={pend}
                  className="ml-auto text-xs text-ink-soft underline-offset-2 hover:text-alerta hover:underline"
                >
                  reabrir
                </button>
              )}
            </>
          ) : (
            <>
              <span className="font-mono text-xs uppercase tracking-wide text-ink-soft">
                Sacrifício em andamento
              </span>
              <button
                type="button"
                onClick={encerrar}
                disabled={pend}
                className="ml-auto rounded border border-alerta/50 px-3 py-1 text-xs text-alerta transition-colors hover:bg-alerta/10"
              >
                {pend ? "..." : "Encerrar sacrifício"}
              </button>
            </>
          )}
        </div>
      )}

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

      {/* 3. Coleta e histologia */}
      <section>
        <p className="mb-1 font-mono text-xs uppercase tracking-[0.12em] text-ink-soft">
          3 · Coleta e histologia
        </p>
        {dissecados.length === 0 ? (
          <p className="text-xs text-ink-soft">
            Marque ratos como dissecados na contagem para registrar a coleta de
            órgãos.
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            {dissecados.map((r) => (
              <PainelColeta
                key={r.id}
                projetoId={projetoId}
                sacrificioId={sacrificioId}
                rato={r}
                podeRegistrar={podeRegistrar}
              />
            ))}
          </div>
        )}
      </section>

      {/* 4. Alíquotas (peso → tampão) */}
      <section>
        <p className="mb-1 font-mono text-xs uppercase tracking-[0.12em] text-ink-soft">
          4 · Alíquotas (peso → tampão)
        </p>
        <p className="mb-3 max-w-2xl text-xs leading-relaxed text-ink-soft">
          Pese cada órgão coletado (g); o tampão é calculado como homogenato 10%
          (peso × 9000 = µL). Ao confirmar, o peso e o volume travam.
        </p>
        {dissecados.length === 0 ? (
          <p className="text-xs text-ink-soft">
            Registre a coleta dos ratos dissecados para pesar as amostras.
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            {dissecados.map((r) => (
              <PainelAliquotas
                key={r.id}
                projetoId={projetoId}
                sacrificioId={sacrificioId}
                rato={r}
                podeRegistrar={podeRegistrar}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function PainelAliquotas({
  projetoId,
  sacrificioId,
  rato,
  podeRegistrar,
}: {
  projetoId: string;
  sacrificioId: string;
  rato: RatoSalvo;
  podeRegistrar: boolean;
}) {
  const coletados = rato.tecidos.filter((t) => t.destino === "coleta");
  const aliqPorTecido = new Map(rato.aliquotas.map((a) => [a.tecido, a]));
  const router = useRouter();
  const [pend, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState<string | null>(null);
  const [pesos, setPesos] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const t of coletados) {
      const a = aliqPorTecido.get(t.tecido);
      init[t.tecido] = a?.pesoG != null ? String(a.pesoG) : "";
    }
    return init;
  });

  const rotulo = (tecido: string) =>
    ORGAOS_DISSECAVEIS.find((o) => o.valor === tecido)?.rotulo ?? tecido;

  function confirmar(tecido: string) {
    const pesoG = parseFloat((pesos[tecido] ?? "").replace(",", "."));
    if (!Number.isFinite(pesoG) || pesoG <= 0) {
      setErro(`Peso inválido para ${rotulo(tecido)}.`);
      return;
    }
    setErro(null);
    setConfirmando(tecido);
    iniciar(async () => {
      const res = await confirmarAliquota({
        projetoId,
        sacrificioId,
        sacrificioRatoId: rato.id,
        tecido,
        pesoG,
      });
      if ("erro" in res) setErro(res.erro);
      else router.refresh();
      setConfirmando(null);
    });
  }

  if (coletados.length === 0) return null;

  return (
    <div className="rounded border border-rule bg-paper-raised p-3">
      <p className="mb-2 font-mono text-xs text-ink">
        Rato {rato.rato}
        {rato.caixa ? ` · caixa ${rato.caixa}` : ""}
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left font-mono text-[11px] uppercase tracking-wide text-ink-soft">
              <th className="py-1 pr-3 font-normal">Órgão</th>
              <th className="py-1 pr-3 font-normal">Peso (g)</th>
              <th className="py-1 pr-3 font-normal">Tampão (µL)</th>
              <th className="py-1 font-normal"></th>
            </tr>
          </thead>
          <tbody>
            {coletados.map((t) => {
              const a = aliqPorTecido.get(t.tecido);
              const travado = a?.confirmado ?? false;
              const pesoNum = parseFloat((pesos[t.tecido] ?? "").replace(",", "."));
              const previa =
                Number.isFinite(pesoNum) && pesoNum > 0
                  ? volumeTampaoUl(pesoNum)
                  : null;
              return (
                <tr key={t.tecido} className="border-t border-rule/60">
                  <td className="py-1 pr-3 text-ink">{rotulo(t.tecido)}</td>
                  <td className="py-1 pr-3">
                    {travado ? (
                      <span className="font-mono text-ink">{a?.pesoG}</span>
                    ) : (
                      <input
                        type="text"
                        inputMode="decimal"
                        value={pesos[t.tecido] ?? ""}
                        onChange={(e) =>
                          setPesos((p) => ({ ...p, [t.tecido]: e.target.value }))
                        }
                        disabled={!podeRegistrar}
                        className={`${INPUT_SM} w-20`}
                      />
                    )}
                  </td>
                  <td className="py-1 pr-3 font-mono tabular-nums text-ink-soft">
                    {travado ? a?.volumeUl : previa != null ? previa : "—"}
                  </td>
                  <td className="py-1">
                    {travado ? (
                      <span
                        title="alíquota confirmada"
                        className="text-green-700 dark:text-green-400"
                      >
                        🔒 confirmada
                      </span>
                    ) : podeRegistrar ? (
                      <button
                        type="button"
                        onClick={() => confirmar(t.tecido)}
                        disabled={pend || confirmando === t.tecido}
                        className={BOTAO_SECUNDARIO_SM}
                      >
                        {confirmando === t.tecido ? "..." : "Confirmar"}
                      </button>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {erro && <p className="mt-1 text-sm text-alerta">{erro}</p>}
    </div>
  );
}

function PainelColeta({
  projetoId,
  sacrificioId,
  rato,
  podeRegistrar,
}: {
  projetoId: string;
  sacrificioId: string;
  rato: RatoSalvo;
  podeRegistrar: boolean;
}) {
  const salvo = new Map(rato.tecidos.map((t) => [t.tecido, t]));
  const router = useRouter();
  const [pend, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [estados, setEstados] = useState<
    Record<string, { destino: DestinoTecido; motivo: string }>
  >(() => {
    const init: Record<string, { destino: DestinoTecido; motivo: string }> = {};
    for (const o of ORGAOS_DISSECAVEIS) {
      const s = salvo.get(o.valor);
      init[o.valor] = {
        destino: s?.destino ?? "coleta",
        motivo: s?.motivo ?? "",
      };
    }
    return init;
  });

  function setOrgao(
    tecido: string,
    patch: Partial<{ destino: DestinoTecido; motivo: string }>
  ) {
    setEstados((p) => ({ ...p, [tecido]: { ...p[tecido], ...patch } }));
  }

  function salvar() {
    setErro(null);
    const tecidos = ORGAOS_DISSECAVEIS.map((o) => ({
      tecido: o.valor,
      destino: estados[o.valor].destino,
      motivo: estados[o.valor].motivo || null,
    }));
    iniciar(async () => {
      const res = await salvarColeta({
        projetoId,
        sacrificioId,
        sacrificioRatoId: rato.id,
        tecidos,
      });
      if ("erro" in res) setErro(res.erro);
      else router.refresh();
    });
  }

  return (
    <div className="rounded border border-rule bg-paper-raised p-3">
      <p className="mb-2 font-mono text-xs text-ink">
        Rato {rato.rato}
        {rato.caixa ? ` · caixa ${rato.caixa}` : ""}
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left font-mono text-[11px] uppercase tracking-wide text-ink-soft">
              <th className="py-1 pr-3 font-normal">Órgão</th>
              <th className="py-1 pr-3 font-normal">Destino</th>
              <th className="py-1 font-normal">Se não coletado, por quê</th>
            </tr>
          </thead>
          <tbody>
            {ORGAOS_DISSECAVEIS.map((o) => {
              const e = estados[o.valor];
              return (
                <tr key={o.valor} className="border-t border-rule/60">
                  <td className="py-1 pr-3 text-ink">{o.rotulo}</td>
                  <td className="py-1 pr-3">
                    <select
                      value={e.destino}
                      disabled={!podeRegistrar}
                      onChange={(ev) =>
                        setOrgao(o.valor, {
                          destino: ev.target.value as DestinoTecido,
                        })
                      }
                      className={INPUT_SM}
                    >
                      <option value="coleta">Coleta (bioquímica)</option>
                      <option value="histologia">Histologia</option>
                      <option value="nao_coletado">Não coletado</option>
                    </select>
                  </td>
                  <td className="py-1">
                    {e.destino === "nao_coletado" && (
                      <input
                        type="text"
                        value={e.motivo}
                        disabled={!podeRegistrar}
                        onChange={(ev) =>
                          setOrgao(o.valor, { motivo: ev.target.value })
                        }
                        placeholder={
                          o.valor === "plasma" || o.valor === "eritrocito"
                            ? "Ex.: coleta de sangue falhou"
                            : "Motivo"
                        }
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
          onClick={salvar}
          disabled={pend}
          className={`mt-2 ${BOTAO_SECUNDARIO_SM}`}
        >
          {pend ? "Salvando..." : "Salvar coleta"}
        </button>
      )}
      {erro && <p className="mt-1 text-sm text-alerta">{erro}</p>}
    </div>
  );
}
