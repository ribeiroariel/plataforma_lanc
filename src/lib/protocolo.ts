import { readFileSync, existsSync } from "fs";
import path from "path";
import { nomeTecido, type Tecido } from "./tecidos";

// Alguns protocolos do manual (eritrócitos/plasma, fígado) dizem "Idêntico à
// seção X" em vez de repetir Princípio/Equipamentos/Preparação. No site cada
// aba precisa ser completa, então aqui a gente COMPÕE o protocolo do tecido
// variante reaproveitando o texto exato do protocolo de córtex/rins do mesmo
// ensaio (que veio direto do manual — nenhum número é redigitado).

const SUFIXOS_TECIDO = [
  "-cortex-rins",
  "-eritrocitos-plasma",
  "-eritrocitos",
  "-plasma",
  "-figado",
];

const RE_SECAO = /^\d+\.\d+\.\s+(.+)$/;

function dirTestes() {
  return path.join(process.cwd(), "content", "testes");
}

/** slug do mesmo ensaio no bloco córtex/rins, ou null se não for variante. */
function slugBase(slug: string): string | null {
  if (slug.endsWith("-cortex-rins")) return null;
  if (
    slug.startsWith("preparo-amostras") ||
    slug.startsWith("valores-referencia") ||
    slug.startsWith("tampoes") ||
    slug.startsWith("referencias")
  ) {
    return null;
  }
  const sufixo = SUFIXOS_TECIDO.find((s) => slug.endsWith(s));
  if (!sufixo) return null;
  const prefixo = slug.slice(0, -sufixo.length);
  const base = `${prefixo}-cortex-rins`;
  return existsSync(path.join(dirTestes(), `${base}.md`)) ? base : null;
}

function valorMeta(linhas: string[], chave: string): string | null {
  const i = linhas.findIndex((l) => l.trim() === chave);
  return i >= 0 && i + 1 < linhas.length ? linhas[i + 1] : null;
}

/** Índice da linha (0-based) do valor de "Expressão dos resultados". */
function fimMetadados(linhas: string[]): number {
  const i = linhas.findIndex((l) => l.trim() === "Expressão dos resultados");
  return i >= 0 ? i + 1 : -1;
}

function indiceSecao(linhas: string[], regexTitulo: RegExp): number {
  return linhas.findIndex((l) => {
    const m = l.match(RE_SECAO);
    return m ? regexTitulo.test(m[1]) : false;
  });
}

/**
 * Devolve o conteúdo do protocolo já completo. Para variantes, injeta as
 * seções compartilhadas do córtex/rins; para os demais, devolve como está.
 */
export function conteudoProtocolo(slug: string): string {
  const bruto = readFileSync(path.join(dirTestes(), `${slug}.md`), "utf-8");
  const base = slugBase(slug);
  if (!base) return bruto;

  const varLinhas = bruto.split("\n");
  const baseLinhas = readFileSync(
    path.join(dirTestes(), `${base}.md`),
    "utf-8"
  ).split("\n");

  const fimMeta = fimMetadados(varLinhas);
  const idxPrincipio = indiceSecao(baseLinhas, /PRINCÍPIO/i);
  const idxProcedimento = indiceSecao(baseLinhas, /PROCEDIMENTO/i);
  const idxExpressao = indiceSecao(baseLinhas, /EXPRESSÃO/i);
  if (fimMeta < 0 || idxPrincipio < 0 || idxProcedimento < 0) {
    return bruto; // formato inesperado — melhor não arriscar, mostra o cru
  }

  // Metadados da variante (com "Idêntico à seção N" resolvido pelo Ensaio base).
  const ensaioBase = valorMeta(baseLinhas, "Ensaio") ?? "";
  const metadados = varLinhas
    .slice(0, fimMeta + 1)
    .map((l) => (/Idêntico à seção/i.test(l) && ensaioBase ? ensaioBase : l));

  // Seções compartilhadas do base: Princípio + Equipamentos + Preparação
  // (tudo entre PRINCÍPIO e PROCEDIMENTO).
  const compartilhado = baseLinhas.slice(idxPrincipio, idxProcedimento);

  // Expressão dos resultados do base (da seção EXPRESSÃO até antes do Descarte).
  let expressao: string[] = [];
  if (idxExpressao >= 0) {
    let fimExpr = baseLinhas.length;
    for (let i = idxExpressao + 1; i < baseLinhas.length; i++) {
      if (/^Descarte/i.test(baseLinhas[i].trim())) {
        fimExpr = i;
        break;
      }
    }
    expressao = baseLinhas.slice(idxExpressao, fimExpr);
  }

  // Corpo da variante (procedimento específico do tecido) e o Descarte dela.
  const corpoVar = varLinhas.slice(fimMeta + 1).filter((l) => l.trim() !== "");
  const procedimentoVar = corpoVar.filter((l) => !/^Descarte/i.test(l.trim()));
  const descarteVar = corpoVar.filter((l) => /^Descarte/i.test(l.trim()));

  const nomeDoTecido = (() => {
    if (slug.includes("figado")) return nomeTecido("figado" as Tecido);
    if (slug.includes("eritrocitos") || slug.includes("plasma"))
      return nomeTecido("eritrocitos-plasma" as Tecido);
    return "";
  })();

  const partes = [
    ...metadados,
    "",
    ...compartilhado,
    `0.1. PROCEDIMENTO${nomeDoTecido ? ` — ${nomeDoTecido}` : ""}`,
    ...procedimentoVar,
    ...(expressao.length > 0 ? ["", ...expressao] : []),
    ...descarteVar,
  ];

  return partes.join("\n");
}
