"use client";

import { useState } from "react";
import type { RatoDoRoster } from "@/lib/roster";
import type { ConfigTeste, CampoBruto } from "@/lib/tiposTeste";
import {
  parseTecan,
  faixaDoRotulo,
  type SerieCinetica,
  type LinhaPontoFinal,
} from "@/lib/tecan";

type Props = {
  familia: ConfigTeste["familia"];
  tempos: number[];
  camposBrutos: CampoBruto[];
  roster: RatoDoRoster[];
  // Recebe { [numeroRato]: { [colKey]: valorString } } para mesclar na tabela.
  onAplicar: (preenchimento: Record<string, Record<string, string>>) => void;
};

const IGNORAR = "__ignorar__";

// Mapeia cada série cinética a um número de rato (ou IGNORAR), chutando a
// partir da faixa no nome da aba ("21-24", "Branco e 25-28").
function chutarMapaSeries(
  series: SerieCinetica[],
  roster: RatoDoRoster[]
): string[] {
  const numeros = new Set(roster.map((r) => String(r.numero)));
  const mapa = series.map(() => IGNORAR);
  // agrupa índices por aba, na ordem
  const porAba = new Map<string, number[]>();
  series.forEach((s, i) => {
    const lista = porAba.get(s.aba) ?? [];
    lista.push(i);
    porAba.set(s.aba, lista);
  });
  for (const [aba, indices] of porAba) {
    const faixa = faixaDoRotulo(aba);
    if (!faixa) continue;
    const ratos: number[] = [];
    for (let n = faixa.de; n <= faixa.ate; n++) ratos.push(n);
    // Aba com "branco" e um poço a mais → o primeiro poço é o branco.
    let offset = 0;
    if (/branco/i.test(aba) && indices.length === ratos.length + 1) offset = 1;
    for (let k = 0; k + offset < indices.length && k < ratos.length; k++) {
      const alvo = String(ratos[k]);
      if (numeros.has(alvo)) mapa[indices[k + offset]] = alvo;
    }
  }
  return mapa;
}

function fmt(v: number) {
  return v.toFixed(4);
}

export default function ImportarTecan({
  familia,
  tempos,
  camposBrutos,
  roster,
  onAplicar,
}: Props) {
  const [aberto, setAberto] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [nomeArquivo, setNomeArquivo] = useState<string | null>(null);
  const [series, setSeries] = useState<SerieCinetica[]>([]);
  const [mapaSeries, setMapaSeries] = useState<string[]>([]);
  const [pontoFinal, setPontoFinal] = useState<LinhaPontoFinal[]>([]);
  const [primeiroRato, setPrimeiroRato] = useState<string>(
    roster[0] ? String(roster[0].numero) : ""
  );

  const ehCinetico = familia === "cat" || familia === "sod";
  const ehEndpoint = familia === "simples";

  async function lerArquivo(file: File) {
    setErro(null);
    setSeries([]);
    setPontoFinal([]);
    try {
      const XLSX = await import("xlsx");
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const abas = wb.SheetNames.map((nome) => ({
        nome,
        linhas: XLSX.utils.sheet_to_json<(string | number | null)[]>(
          wb.Sheets[nome],
          { header: 1, raw: true, defval: null }
        ),
      }));
      const r = parseTecan(abas);
      if (!r.tecanDetectado) {
        setErro(
          "Não parece uma planilha do Tecan i-control. Envie o .xlsx que o Infinite 200Pro gera."
        );
        return;
      }
      setNomeArquivo(file.name);
      if (ehCinetico) {
        if (r.series.length === 0) {
          setErro("Nenhuma leitura cinética (por tempo) encontrada no arquivo.");
          return;
        }
        setSeries(r.series);
        setMapaSeries(chutarMapaSeries(r.series, roster));
      } else if (ehEndpoint) {
        if (r.pontoFinal.length === 0) {
          setErro("Nenhuma leitura de ponto final encontrada no arquivo.");
          return;
        }
        setPontoFinal(r.pontoFinal);
      }
    } catch (e) {
      setErro("Falha ao ler o arquivo: " + (e as Error).message);
    }
  }

  // --- montar preenchimento e aplicar ---
  function aplicarCinetico() {
    const preenchimento: Record<string, Record<string, string>> = {};
    series.forEach((s, i) => {
      const rato = mapaSeries[i];
      if (rato === IGNORAR) return;
      const linha: Record<string, string> = preenchimento[rato] ?? {};
      s.valores.forEach((v, k) => {
        if (k < tempos.length) linha[`t${tempos[k]}`] = fmt(v);
      });
      preenchimento[rato] = linha;
    });
    if (Object.keys(preenchimento).length === 0) {
      setErro("Nenhuma série foi atribuída a um rato.");
      return;
    }
    onAplicar(preenchimento);
    setAberto(false);
  }

  // Concatena as sequências de ponto final por papel (amostra / branco).
  function sequencia(papeis: string[]): number[] {
    return pontoFinal
      .filter((b) => papeis.includes(b.papel))
      .flatMap((b) => b.valores);
  }

  const seqAmostra = ehEndpoint ? sequencia(["amostra", "desconhecido"]) : [];
  const seqBranco = ehEndpoint ? sequencia(["branco", "branco_reagente"]) : [];

  // Do primeiro rato escolhido em diante, na ordem do roster.
  const ratosEmOrdem = roster.map((r) => String(r.numero));
  const iInicio = Math.max(0, ratosEmOrdem.indexOf(primeiroRato));
  const ratosAlvo = ratosEmOrdem.slice(iInicio);

  const campoAmostra = camposBrutos[0];
  const campoBranco = camposBrutos.find((c) => /branco/i.test(c.chave));

  function aplicarEndpoint() {
    const preenchimento: Record<string, Record<string, string>> = {};
    ratosAlvo.forEach((rato, k) => {
      const linha: Record<string, string> = {};
      if (campoAmostra && k < seqAmostra.length)
        linha[campoAmostra.chave] = fmt(seqAmostra[k]);
      if (campoBranco && k < seqBranco.length)
        linha[campoBranco.chave] = fmt(seqBranco[k]);
      if (Object.keys(linha).length > 0) preenchimento[rato] = linha;
    });
    if (Object.keys(preenchimento).length === 0) {
      setErro("Não há valores de amostra para preencher.");
      return;
    }
    onAplicar(preenchimento);
    setAberto(false);
  }

  if (familia === "curva") return null; // Lowry ainda não tem import

  return (
    <div className="mt-6 rounded border border-dashed border-rule bg-paper-raised p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.12em] text-ink-soft">
            Importar planilha do Tecan (Infinite 200Pro)
          </p>
          <p className="mt-1 text-xs text-ink-soft">
            Envie o .xlsx que o i-control gera — o site lê as absorbâncias e
            preenche a tabela. Você confere e depois confirma rato por rato.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setAberto((a) => !a)}
          className="shrink-0 rounded border border-rule px-3 py-1 text-xs text-ink transition-colors hover:border-signal"
        >
          {aberto ? "Fechar" : "Importar .xlsx"}
        </button>
      </div>

      {aberto && (
        <div className="mt-4">
          <input
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) lerArquivo(f);
            }}
            className="block w-full text-xs text-ink-soft file:mr-3 file:rounded file:border file:border-rule file:bg-paper file:px-3 file:py-1.5 file:text-xs file:text-ink hover:file:border-signal"
          />
          {nomeArquivo && (
            <p className="mt-2 font-mono text-[11px] text-ink-soft">
              {nomeArquivo}
            </p>
          )}
          {erro && <p className="mt-2 text-sm text-alerta">{erro}</p>}

          {/* --- Mapeamento cinético (CAT/SOD) --- */}
          {ehCinetico && series.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-xs text-ink-soft">
                {series.length} leitura(s) detectada(s). Confira o rato de cada
                poço (o site chuta pela faixa no nome da aba). Marque branco/
                controle como <em>ignorar</em>.
              </p>
              <div className="max-h-72 overflow-y-auto rounded border border-rule">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-paper-raised">
                    <tr className="text-left font-mono uppercase tracking-wide text-ink-soft">
                      <th className="p-2 font-normal">Aba</th>
                      <th className="p-2 font-normal">Poço</th>
                      <th className="p-2 font-normal">1ª leitura</th>
                      <th className="p-2 font-normal">Rato</th>
                    </tr>
                  </thead>
                  <tbody>
                    {series.map((s, i) => (
                      <tr key={i} className="border-t border-rule/60">
                        <td className="p-2 text-ink-soft">{s.aba}</td>
                        <td className="p-2 font-mono text-ink">{s.poco}</td>
                        <td className="p-2 font-mono text-ink-soft">
                          {fmt(s.valores[0])}
                        </td>
                        <td className="p-2">
                          <select
                            value={mapaSeries[i]}
                            onChange={(e) =>
                              setMapaSeries((prev) => {
                                const novo = [...prev];
                                novo[i] = e.target.value;
                                return novo;
                              })
                            }
                            className="rounded border border-rule bg-paper px-2 py-1 text-xs text-ink"
                          >
                            <option value={IGNORAR}>Ignorar</option>
                            {roster.map((r) => (
                              <option key={r.numero} value={String(r.numero)}>
                                Rato {r.numero} ({r.grupoNome})
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button
                type="button"
                onClick={aplicarCinetico}
                className="mt-3 rounded bg-signal px-4 py-2 text-sm font-medium text-white transition hover:brightness-110"
              >
                Preencher tabela
              </button>
            </div>
          )}

          {/* --- Mapeamento ponto final --- */}
          {ehEndpoint && pontoFinal.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-xs text-ink-soft">
                {seqAmostra.length} amostra(s)
                {seqBranco.length > 0 && ` e ${seqBranco.length} branco(s)`}{" "}
                detectada(s), lidas em sequência. Escolha a partir de qual rato
                a sequência começa.
              </p>
              <label className="flex items-center gap-2 text-xs text-ink-soft">
                Primeiro rato da sequência
                <select
                  value={primeiroRato}
                  onChange={(e) => setPrimeiroRato(e.target.value)}
                  className="rounded border border-rule bg-paper px-2 py-1 text-xs text-ink"
                >
                  {roster.map((r) => (
                    <option key={r.numero} value={String(r.numero)}>
                      Rato {r.numero} ({r.grupoNome})
                    </option>
                  ))}
                </select>
              </label>
              <div className="mt-3 max-h-64 overflow-y-auto rounded border border-rule">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-paper-raised">
                    <tr className="text-left font-mono uppercase tracking-wide text-ink-soft">
                      <th className="p-2 font-normal">Rato</th>
                      {campoAmostra && <th className="p-2 font-normal">Amostra</th>}
                      {campoBranco && <th className="p-2 font-normal">Branco</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {ratosAlvo.map((rato, k) =>
                      k < seqAmostra.length ? (
                        <tr key={rato} className="border-t border-rule/60">
                          <td className="p-2 font-mono text-ink">{rato}</td>
                          {campoAmostra && (
                            <td className="p-2 font-mono text-ink-soft">
                              {k < seqAmostra.length ? fmt(seqAmostra[k]) : "—"}
                            </td>
                          )}
                          {campoBranco && (
                            <td className="p-2 font-mono text-ink-soft">
                              {k < seqBranco.length ? fmt(seqBranco[k]) : "—"}
                            </td>
                          )}
                        </tr>
                      ) : null
                    )}
                  </tbody>
                </table>
              </div>
              <button
                type="button"
                onClick={aplicarEndpoint}
                className="mt-3 rounded bg-signal px-4 py-2 text-sm font-medium text-white transition hover:brightness-110"
              >
                Preencher tabela
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
