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
 * Título sem o sufixo de tecido ("Catalase (CAT) — eritrócitos" →
 * "Catalase (CAT)"). O tecido é mostrado separadamente, de forma
 * consistente, para não repetir e padronizar a apresentação.
 */
export function tituloCurto(titulo: string) {
  return titulo.split(" — ")[0].trim();
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
