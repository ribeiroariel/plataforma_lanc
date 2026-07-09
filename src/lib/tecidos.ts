// Dados de testes/tecidos seguros para client E server (sem fs). O módulo
// @/lib/testes (que lê arquivos do disco) reexporta daqui, mas componentes
// de cliente devem importar deste arquivo.
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

/**
 * Só o nome do ensaio, sem o sufixo de matriz ("Catalase (CAT) — eritrócitos"
 * → "Catalase (CAT)"). Usado em contextos que já mostram o tecido/matriz
 * separadamente.
 */
export function tituloCurto(titulo: string) {
  return titulo.split(" — ")[0].trim();
}

/**
 * Rótulo para listas que já vêm agrupadas por tecido: mostra a matriz
 * específica apenas quando ela distingue itens do mesmo grupo. Só o grupo
 * "eritrócitos e plasma" tem matrizes diferentes (eritrócitos vs plasma) —
 * nos demais o cabeçalho do grupo já diz o tecido, então o sufixo é
 * redundante e é removido.
 */
export function tituloSemTecido(titulo: string, tecido: Tecido) {
  const partes = titulo.split(" — ");
  const ensaio = partes[0].trim();
  const matriz = partes[1]?.trim();
  if (!matriz) return ensaio;
  return tecido === "eritrocitos-plasma" ? `${ensaio} — ${matriz}` : ensaio;
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
