// Parser das planilhas brutas do leitor Tecan Infinite 200Pro (i-control).
// Puro e client-safe: recebe as abas já lidas (matriz de células) e devolve
// os blocos de dados normalizados. Não usa fs nem a lib xlsx — quem lê o
// arquivo (no navegador) passa as células prontas para cá.
//
// O i-control gera dois esquemas, que o site trata de formas diferentes:
//
//  - CINÉTICO (enzimáticos CAT/SOD): um bloco com a linha "Time [s]" e uma
//    linha por poço (ex. "A1", "D1", ou "D" nas placas de 24 poços), cada
//    uma com a absorbância ao longo dos ciclos. Testes enzimáticos costumam
//    vir em VÁRIOS arquivos/abas (4 amostras por vez), então o parser
//    percorre todas as abas e concatena as séries.
//
//  - PONTO FINAL (TBARS, carboniladas, sulfidrilas, tióis, ác. ascórbico,
//    H2O2): um cabeçalho "<>" com as colunas 1..12 da placa e, abaixo,
//    linhas rotuladas (Branco, Amostra, B. da A...) lidas poço a poço.

export type Celula = string | number | null | undefined;
export type AbaTecan = { nome: string; linhas: Celula[][] };

export type PapelPoco = "amostra" | "branco" | "branco_reagente" | "controle" | "desconhecido";

export type SerieCinetica = {
  aba: string;
  poco: string;
  papel: PapelPoco;
  tempos: number[];
  valores: number[];
};

export type LinhaPontoFinal = {
  aba: string;
  rotulo: string;
  papel: PapelPoco;
  valores: number[];
};

export type ParseTecan = {
  tecanDetectado: boolean;
  series: SerieCinetica[];
  pontoFinal: LinhaPontoFinal[];
};

function texto(c: Celula): string {
  return c == null ? "" : String(c).trim();
}

function ehNumero(c: Celula): boolean {
  if (typeof c === "number") return Number.isFinite(c);
  const t = texto(c).replace(",", ".");
  return t !== "" && Number.isFinite(Number(t));
}

function num(c: Celula): number {
  return typeof c === "number" ? c : Number(texto(c).replace(",", "."));
}

const RE_POCO = /^[A-H]([1-9]|1[0-2])?$/; // A1..H12, ou só a letra da linha (24 poços)

function semAcento(s: string): string {
  return s
    .normalize("NFD")
    .split("")
    .filter((ch) => {
      const cp = ch.codePointAt(0)!;
      return cp < 0x0300 || cp > 0x036f; // remove marcas diacríticas combinantes
    })
    .join("");
}

function classificarPapel(rotulo: string): PapelPoco {
  const t = semAcento(rotulo.toLowerCase());
  if (/(b\.?\s*d[oa]\s*r|branco.*reagente|b\s*do\s*r)/.test(t)) return "branco_reagente";
  if (/(branco|^b\.?\s|b\.?\s*da\s*a|\(b\)|autooxid|pirogalol|controle)/.test(t)) {
    if (/pirogalol|controle|autooxid/.test(t)) return "controle";
    return "branco";
  }
  if (/(amostra|\(a\))/.test(t)) return "amostra";
  return "desconhecido";
}

/** Extrai a faixa de amostras de um rótulo tipo "1-12 (a)" ou "13/24 (b)". */
export function faixaDoRotulo(rotulo: string): { de: number; ate: number } | null {
  const m = rotulo.match(/(\d+)\s*[-/aà]+\s*(\d+)/i);
  if (!m) return null;
  const de = parseInt(m[1], 10);
  const ate = parseInt(m[2], 10);
  if (!Number.isFinite(de) || !Number.isFinite(ate) || ate < de) return null;
  return { de, ate };
}

export function parseTecan(abas: AbaTecan[]): ParseTecan {
  const series: SerieCinetica[] = [];
  const pontoFinal: LinhaPontoFinal[] = [];
  let tecanDetectado = false;

  for (const aba of abas) {
    const L = aba.linhas;
    for (let i = 0; i < L.length; i++) {
      const primeira = texto(L[i][0]);

      // Cabeçalho de identificação do i-control (basta uma ocorrência).
      if (/tecan i-control|infinite 200/i.test(primeira + " " + texto(L[i][4]))) {
        tecanDetectado = true;
      }

      // --- Bloco cinético: linha "Time [s]" define os tempos ---
      if (/^time\s*\[s\]/i.test(primeira)) {
        tecanDetectado = true;
        const tempos: number[] = [];
        for (let c = 1; c < L[i].length; c++) {
          if (ehNumero(L[i][c])) tempos.push(num(L[i][c]));
        }
        // Linhas seguintes que começam com um poço = séries. Antes dos poços
        // há linhas intersticiais ("Temp. [°C]", "Cycle Nr.") que devem ser
        // puladas; depois que os poços começam, a primeira linha que não é
        // poço encerra o bloco.
        let comecouPocos = false;
        for (let j = i + 1; j < L.length; j++) {
          const id = texto(L[j][0]);
          if (RE_POCO.test(id)) {
            comecouPocos = true;
            const valores: number[] = [];
            for (let c = 1; c < L[j].length && valores.length < tempos.length; c++) {
              if (ehNumero(L[j][c])) valores.push(num(L[j][c]));
            }
            if (valores.length > 0) {
              series.push({
                aba: aba.nome,
                poco: id,
                papel: "amostra",
                tempos: tempos.slice(0, valores.length),
                valores,
              });
            }
            continue;
          }
          if (comecouPocos) break; // acabou o bloco de poços
          if (id === "" || /^(temp|cycle)/i.test(id)) continue; // interstício
          break; // metadados antes de qualquer poço → não há bloco de poços aqui
        }
        continue;
      }

      // --- Bloco de ponto final: cabeçalho "<>" com colunas 1..N ---
      if (primeira === "<>") {
        tecanDetectado = true;
        for (let j = i + 1; j < L.length; j++) {
          const rotulo = texto(L[j][0]);
          if (rotulo === "") continue;
          // Fim do bloco ao encontrar metadados/movimentos.
          if (/^(end time|movement|custom action|start time|label|mode|<>)/i.test(rotulo)) break;
          if (/^(pula|skip)$/i.test(rotulo)) continue;
          const valores: number[] = [];
          for (let c = 1; c < L[j].length; c++) {
            if (ehNumero(L[j][c])) valores.push(num(L[j][c]));
          }
          if (valores.length === 0) continue;
          pontoFinal.push({
            aba: aba.nome,
            rotulo,
            papel: classificarPapel(rotulo),
            valores,
          });
        }
      }
    }
  }

  return { tecanDetectado, series, pontoFinal };
}
