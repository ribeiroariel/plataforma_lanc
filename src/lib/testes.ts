import { readFileSync } from "fs";
import path from "path";
import indice from "../../content/testes/_indice.json";

export type Tecido = "cortex-rins" | "eritrocitos-plasma" | "figado" | "geral";

export type TesteResumo = {
  slug: string;
  titulo: string;
  tecido: Tecido;
};

export const testes: TesteResumo[] = indice as TesteResumo[];

const NOMES_TECIDO: Record<Tecido, string> = {
  "cortex-rins": "Córtex cerebral e rins",
  "eritrocitos-plasma": "Eritrócitos e plasma",
  figado: "Fígado",
  geral: "Geral",
};

export function nomeTecido(tecido: Tecido) {
  return NOMES_TECIDO[tecido];
}

export function testesPorTecido(): Map<Tecido, TesteResumo[]> {
  const grupos = new Map<Tecido, TesteResumo[]>();
  for (const teste of testes) {
    const lista = grupos.get(teste.tecido) ?? [];
    lista.push(teste);
    grupos.set(teste.tecido, lista);
  }
  return grupos;
}

/** Texto do protocolo, extraído literalmente do manual do LANC (sem reescrita). */
export function conteudoTeste(slug: string): string {
  const caminho = path.join(process.cwd(), "content", "testes", `${slug}.md`);
  return readFileSync(caminho, "utf-8");
}
