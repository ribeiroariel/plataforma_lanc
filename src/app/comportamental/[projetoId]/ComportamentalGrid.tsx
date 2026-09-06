"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  salvarCampoAberto,
  salvarNadoForcado,
} from "@/lib/actions/comportamental";
import { INPUT_SM, BOTAO_SECUNDARIO_SM } from "@/lib/estilos";

const DURACAO_S = 360; // 6 min

export type RatoRoster = {
  numero: number;
  grupoId: string;
  grupoNome: string;
  leva: number;
};
export type RegistroComportamental = {
  rato: string;
  ca_quadrados: number | null;
  ca_urinas: number | null;
  ca_fezes: number | null;
  ca_imobilidade_s: number | null;
  ca_confirmado: boolean;
  nf_imobilidade_s: number | null;
  nf_confirmado: boolean;
};

type CampoAberto = {
  quadrados: string;
  urinas: string;
  fezes: string;
  imob: string;
};

function numOuNull(v: string): number | null {
  const n = parseInt((v ?? "").trim(), 10);
  return Number.isFinite(n) ? n : null;
}

export default function ComportamentalGrid({
  projetoId,
  roster,
  registros,
  numeroLevas,
  podeRegistrar,
}: {
  projetoId: string;
  roster: RatoRoster[];
  registros: RegistroComportamental[];
  numeroLevas: number;
  podeRegistrar: boolean;
}) {
  const router = useRouter();
  const [pend, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [leva, setLeva] = useState<number>(roster[0]?.leva ?? 1);

  const porRato = useMemo(
    () => new Map(registros.map((r) => [r.rato, r])),
    [registros]
  );

  const daLeva = roster.filter((r) => r.leva === leva);

  // Estado editável do campo aberto e do nado forçado, por rato.
  const [ca, setCa] = useState<Record<string, CampoAberto>>(() => {
    const init: Record<string, CampoAberto> = {};
    for (const r of roster) {
      const s = porRato.get(String(r.numero));
      init[String(r.numero)] = {
        quadrados: s?.ca_quadrados != null ? String(s.ca_quadrados) : "",
        urinas: s?.ca_urinas != null ? String(s.ca_urinas) : "",
        fezes: s?.ca_fezes != null ? String(s.ca_fezes) : "",
        imob: s?.ca_imobilidade_s != null ? String(s.ca_imobilidade_s) : "",
      };
    }
    return init;
  });
  const [nf, setNf] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const r of roster) {
      const s = porRato.get(String(r.numero));
      init[String(r.numero)] =
        s?.nf_imobilidade_s != null ? String(s.nf_imobilidade_s) : "";
    }
    return init;
  });

  function grupoDoRato(numero: number): string | null {
    return roster.find((r) => r.numero === numero)?.grupoId ?? null;
  }

  function confirmarCA(numero: number) {
    setErro(null);
    const chave = String(numero);
    const v = ca[chave];
    iniciar(async () => {
      const res = await salvarCampoAberto({
        projetoId,
        leva,
        rato: chave,
        grupoId: grupoDoRato(numero),
        quadrados: numOuNull(v.quadrados),
        urinas: numOuNull(v.urinas),
        fezes: numOuNull(v.fezes),
        imobilidadeS: numOuNull(v.imob),
        confirmar: true,
      });
      if (res && "erro" in res) setErro(res.erro);
      else router.refresh();
    });
  }

  function confirmarNF(numero: number) {
    setErro(null);
    const chave = String(numero);
    iniciar(async () => {
      const res = await salvarNadoForcado({
        projetoId,
        leva,
        rato: chave,
        grupoId: grupoDoRato(numero),
        imobilidadeS: numOuNull(nf[chave]),
        confirmar: true,
      });
      if (res && "erro" in res) setErro(res.erro);
      else router.refresh();
    });
  }

  function salvarRascunho() {
    setErro(null);
    iniciar(async () => {
      for (const r of daLeva) {
        const chave = String(r.numero);
        const reg = porRato.get(chave);
        if (!reg?.ca_confirmado) {
          const v = ca[chave];
          const res = await salvarCampoAberto({
            projetoId,
            leva,
            rato: chave,
            grupoId: r.grupoId,
            quadrados: numOuNull(v.quadrados),
            urinas: numOuNull(v.urinas),
            fezes: numOuNull(v.fezes),
            imobilidadeS: numOuNull(v.imob),
            confirmar: false,
          });
          if (res && "erro" in res) {
            setErro(res.erro);
            return;
          }
        }
        if (!reg?.nf_confirmado) {
          const res = await salvarNadoForcado({
            projetoId,
            leva,
            rato: chave,
            grupoId: r.grupoId,
            imobilidadeS: numOuNull(nf[chave]),
            confirmar: false,
          });
          if (res && "erro" in res) {
            setErro(res.erro);
            return;
          }
        }
      }
      router.refresh();
    });
  }

  function setCampo(numero: number, campo: keyof CampoAberto, valor: string) {
    const chave = String(numero);
    setCa((p) => ({ ...p, [chave]: { ...p[chave], [campo]: valor } }));
  }

  return (
    <div className="mt-8 flex flex-col gap-10">
      {erro && <p className="text-sm text-alerta">{erro}</p>}

      {numeroLevas > 1 && (
        <label className="flex items-center gap-2 text-sm text-ink">
          Leva
          <select
            value={leva}
            onChange={(e) => setLeva(parseInt(e.target.value, 10))}
            className={`${INPUT_SM} w-24`}
          >
            {Array.from({ length: numeroLevas }, (_, i) => i + 1).map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </label>
      )}

      {daLeva.length === 0 ? (
        <p className="text-sm text-ink-soft">Nenhum rato nesta leva.</p>
      ) : (
        <>
          {/* CAMPO ABERTO */}
          <section>
            <p className="mb-1 font-mono text-xs uppercase tracking-[0.12em] text-ink-soft">
              Campo aberto (6 min)
            </p>
            <p className="mb-3 max-w-2xl text-xs leading-relaxed text-ink-soft">
              Quadrados percorridos, nº de urinas, nº de fezes e tempo de
              imobilidade (s). O tempo em atividade é calculado automaticamente
              ({DURACAO_S} − imobilidade). Confirmar trava a linha.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-rule text-left font-mono text-[11px] uppercase tracking-wide text-ink-soft">
                    <th className="py-2 pr-3 font-normal">Nº</th>
                    <th className="py-2 pr-3 font-normal">Grupo</th>
                    <th className="py-2 pr-2 font-normal">Quadrados</th>
                    <th className="py-2 pr-2 font-normal">Urinas</th>
                    <th className="py-2 pr-2 font-normal">Fezes</th>
                    <th className="py-2 pr-2 font-normal">Imobilidade (s)</th>
                    <th className="py-2 pr-2 font-normal">Atividade (s)</th>
                    <th className="py-2 font-normal"></th>
                  </tr>
                </thead>
                <tbody>
                  {daLeva.map((r) => {
                    const chave = String(r.numero);
                    const reg = porRato.get(chave);
                    const travado = reg?.ca_confirmado ?? false;
                    const v = ca[chave];
                    const imobNum = numOuNull(v.imob);
                    const atividade =
                      imobNum != null
                        ? Math.max(0, DURACAO_S - imobNum)
                        : null;
                    return (
                      <tr key={chave} className="border-b border-rule/60">
                        <td className="py-1.5 pr-3 font-mono text-ink">
                          {r.numero}
                        </td>
                        <td className="py-1.5 pr-3 whitespace-nowrap text-ink-soft">
                          {r.grupoNome}
                        </td>
                        {(["quadrados", "urinas", "fezes", "imob"] as const).map(
                          (campo) => (
                            <td key={campo} className="py-1.5 pr-2">
                              {travado ? (
                                <span className="font-mono text-ink">
                                  {campo === "quadrados"
                                    ? reg?.ca_quadrados
                                    : campo === "urinas"
                                    ? reg?.ca_urinas
                                    : campo === "fezes"
                                    ? reg?.ca_fezes
                                    : reg?.ca_imobilidade_s}
                                </span>
                              ) : (
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  value={v[campo]}
                                  onChange={(e) =>
                                    setCampo(r.numero, campo, e.target.value)
                                  }
                                  disabled={!podeRegistrar}
                                  className={`${INPUT_SM} w-16`}
                                />
                              )}
                            </td>
                          )
                        )}
                        <td className="py-1.5 pr-2 font-mono tabular-nums text-ink-soft">
                          {travado
                            ? reg?.ca_imobilidade_s != null
                              ? Math.max(
                                  0,
                                  DURACAO_S - (reg?.ca_imobilidade_s ?? 0)
                                )
                              : "—"
                            : atividade != null
                            ? atividade
                            : "—"}
                        </td>
                        <td className="py-1.5">
                          {travado ? (
                            <span className="text-sucesso" title="confirmado">
                              🔒
                            </span>
                          ) : podeRegistrar ? (
                            <button
                              type="button"
                              onClick={() => confirmarCA(r.numero)}
                              disabled={pend}
                              className={BOTAO_SECUNDARIO_SM}
                            >
                              Confirmar
                            </button>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          {/* NADO FORÇADO */}
          <section>
            <p className="mb-1 font-mono text-xs uppercase tracking-[0.12em] text-ink-soft">
              Nado forçado (6 min)
            </p>
            <p className="mb-3 max-w-2xl text-xs leading-relaxed text-ink-soft">
              Tempo de imobilidade (s). Confirmar trava a linha.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-rule text-left font-mono text-[11px] uppercase tracking-wide text-ink-soft">
                    <th className="py-2 pr-3 font-normal">Nº</th>
                    <th className="py-2 pr-3 font-normal">Grupo</th>
                    <th className="py-2 pr-2 font-normal">Imobilidade (s)</th>
                    <th className="py-2 font-normal"></th>
                  </tr>
                </thead>
                <tbody>
                  {daLeva.map((r) => {
                    const chave = String(r.numero);
                    const reg = porRato.get(chave);
                    const travado = reg?.nf_confirmado ?? false;
                    return (
                      <tr key={chave} className="border-b border-rule/60">
                        <td className="py-1.5 pr-3 font-mono text-ink">
                          {r.numero}
                        </td>
                        <td className="py-1.5 pr-3 whitespace-nowrap text-ink-soft">
                          {r.grupoNome}
                        </td>
                        <td className="py-1.5 pr-2">
                          {travado ? (
                            <span className="font-mono text-ink">
                              {reg?.nf_imobilidade_s}
                            </span>
                          ) : (
                            <input
                              type="text"
                              inputMode="numeric"
                              value={nf[chave] ?? ""}
                              onChange={(e) =>
                                setNf((p) => ({ ...p, [chave]: e.target.value }))
                              }
                              disabled={!podeRegistrar}
                              className={`${INPUT_SM} w-20`}
                            />
                          )}
                        </td>
                        <td className="py-1.5">
                          {travado ? (
                            <span className="text-sucesso" title="confirmado">
                              🔒
                            </span>
                          ) : podeRegistrar ? (
                            <button
                              type="button"
                              onClick={() => confirmarNF(r.numero)}
                              disabled={pend}
                              className={BOTAO_SECUNDARIO_SM}
                            >
                              Confirmar
                            </button>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          {podeRegistrar && (
            <button
              type="button"
              onClick={salvarRascunho}
              disabled={pend}
              className={`self-start ${BOTAO_SECUNDARIO_SM}`}
            >
              {pend ? "Salvando..." : "Salvar rascunho (sem travar)"}
            </button>
          )}
        </>
      )}
    </div>
  );
}
