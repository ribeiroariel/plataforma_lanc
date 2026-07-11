import { Fragment, type ReactNode } from "react";

// Renderiza o texto do protocolo (extraído literalmente do manual, ver
// content/testes/*.md) como uma seção de métodos de artigo científico, em
// vez de um bloco de texto cru. Não altera o conteúdo — só dá estrutura
// visual: tabela de parâmetros no topo, seções numeradas viram subtítulos,
// e os critérios de controle de qualidade / avisos ganham realce (é a
// parte mais acionável para quem está na bancada).

const RE_SECAO = /^\d+\.\d+\.\s+(.*)$/;

// Tabelas no formato markdown ("| a | b |" com linha separadora "| --- |")
// — usadas p.ex. na curva padrão da Lowry (Tubo · BSA · Água · Reativo C).
function ehLinhaTabela(linha: string): boolean {
  return linha.startsWith("|") && linha.endsWith("|") && linha.length > 1;
}

function ehSeparadorTabela(linha: string): boolean {
  return ehLinhaTabela(linha) && /^\|[\s:|-]+\|$/.test(linha);
}

function celulasTabela(linha: string): string[] {
  return linha
    .slice(1, -1)
    .split("|")
    .map((c) => c.trim());
}

function classeParagrafo(texto: string): string {
  if (/^Controle de Qualidade/i.test(texto)) {
    return "rounded border-l-2 border-reagent bg-reagent/5 px-3 py-2 text-sm leading-relaxed text-ink";
  }
  if (/^(IMPORTANTE|ATENÇÃO)/i.test(texto)) {
    return "rounded border-l-2 border-alerta bg-alerta/5 px-3 py-2 text-sm leading-relaxed text-ink";
  }
  if (/^(Obs\.|Referência|Descarte)/i.test(texto)) {
    return "text-xs leading-relaxed text-ink-soft";
  }
  return "text-sm leading-relaxed text-ink-soft";
}

export function ProtocoloTeste({ conteudo }: { conteudo: string }) {
  const linhas = conteudo
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  // Primeira linha é o título "N. NOME DO TESTE", redundante com o h1.
  const corpo = linhas.slice(1);

  const blocos: ReactNode[] = [];
  let i = 0;

  // Bloco de metadados: "Parâmetro"/"Informação" seguido de pares
  // chave/valor, até a primeira seção numerada.
  if (corpo[0] === "Parâmetro" && corpo[1] === "Informação") {
    i = 2;
    const pares: [string, string][] = [];
    while (i + 1 < corpo.length && !RE_SECAO.test(corpo[i])) {
      pares.push([corpo[i], corpo[i + 1]]);
      i += 2;
    }
    blocos.push(
      <dl
        key="meta"
        className="mb-8 grid grid-cols-[minmax(7rem,auto)_1fr] gap-x-6 gap-y-2.5 rounded border border-rule bg-paper-raised p-4 text-sm"
      >
        {pares.map(([k, v], idx) => (
          <Fragment key={idx}>
            <dt className="font-mono text-xs uppercase tracking-wide text-ink-soft">
              {k}
            </dt>
            <dd className="text-ink">{v}</dd>
          </Fragment>
        ))}
      </dl>
    );
  }

  while (i < corpo.length) {
    const linha = corpo[i];

    // Bloco de tabela: consome as linhas "| ... |" seguidas de uma vez.
    if (ehLinhaTabela(linha)) {
      const inicio = i;
      const linhasTabela: string[] = [];
      while (i < corpo.length && ehLinhaTabela(corpo[i])) {
        linhasTabela.push(corpo[i]);
        i++;
      }
      const semSeparador = linhasTabela.filter((l) => !ehSeparadorTabela(l));
      if (semSeparador.length > 0) {
        const [cabecalho, ...corpoTabela] = semSeparador;
        blocos.push(
          <TabelaProtocolo
            key={inicio}
            cabecalho={celulasTabela(cabecalho)}
            linhas={corpoTabela.map(celulasTabela)}
          />
        );
      }
      continue;
    }

    const m = linha.match(RE_SECAO);
    if (m) {
      blocos.push(
        <h2
          key={i}
          className="mt-7 font-mono text-xs font-medium uppercase tracking-[0.12em] text-absorbance"
        >
          {m[1]}
        </h2>
      );
    } else {
      blocos.push(
        <p key={i} className={classeParagrafo(linha)}>
          {linha}
        </p>
      );
    }
    i++;
  }

  return <div className="flex flex-col gap-2.5">{blocos}</div>;
}

function TabelaProtocolo({
  cabecalho,
  linhas,
}: {
  cabecalho: string[];
  linhas: string[][];
}) {
  return (
    <div className="my-2 overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-rule text-left font-mono text-[11px] uppercase tracking-wide text-ink-soft">
            {cabecalho.map((c, idx) => (
              <th key={idx} className="py-2 pr-4 font-normal">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {linhas.map((linha, r) => (
            <tr key={r} className="border-b border-rule/60">
              {linha.map((cel, c) => (
                <td
                  key={c}
                  className={
                    c === 0
                      ? "py-1.5 pr-4 text-ink"
                      : "py-1.5 pr-4 font-mono tabular-nums text-ink-soft"
                  }
                >
                  {cel}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
