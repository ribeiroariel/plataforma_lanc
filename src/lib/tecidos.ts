// Dados de testes/tecidos seguros para client E server (sem fs). O módulo
// @/lib/testes (que lê arquivos do disco) reexporta daqui, mas componentes
// de cliente devem importar deste arquivo.
import indice from "../../content/testes/_indice.json";

// Cada tecido é uma categoria de designação independente — um projeto pode
// designar "Catalase — rim" separado de "Catalase — fígado". "cortex",
// "hipocampo" e "cerebelo" usam o mesmo protocolo (mesma homogeneização,
// mesmos volumes; só muda o rótulo do tecido) — ver src/lib/protocolo.ts
// para como o conteúdo de cada variante é composto a partir da base
// "-cortex" do mesmo ensaio.
export type Tecido =
  | "cortex"
  | "hipocampo"
  | "cerebelo"
  | "rins"
  | "eritrocitos"
  | "plasma"
  | "figado"
  | "geral";

export type TesteResumo = {
  slug: string;
  titulo: string;
  tecido: Tecido;
};

export const testes: TesteResumo[] = indice as TesteResumo[];

const NOMES_TECIDO: Record<Tecido, string> = {
  cortex: "Córtex cerebral",
  hipocampo: "Hipocampo",
  cerebelo: "Cerebelo",
  rins: "Rins",
  eritrocitos: "Eritrócitos",
  plasma: "Plasma",
  figado: "Fígado",
  geral: "Geral",
};

export function nomeTecido(tecido: Tecido) {
  return NOMES_TECIDO[tecido];
}

// Tecidos que um projeto pode marcar como "serão analisados". Exclui "geral"
// (tampões, referências, preparo de amostras) — nenhum teste designável tem
// esse tecido. É o conjunto que filtra os testes oferecidos na designação.
export const TECIDOS_ANALISAVEIS: Tecido[] = [
  "cortex",
  "hipocampo",
  "cerebelo",
  "rins",
  "eritrocitos",
  "plasma",
  "figado",
];

/**
 * Só o nome do ensaio, sem o sufixo de matriz ("Catalase (CAT) — eritrócitos"
 * → "Catalase (CAT)"). Usado em contextos que já mostram o tecido/matriz
 * separadamente.
 */
export function tituloCurto(titulo: string) {
  return titulo.split(" — ")[0].trim();
}

/**
 * Rótulo para listas já agrupadas por tecido: com cada matriz sendo o seu
 * próprio grupo agora (diferente de quando "eritrócitos e plasma" era um
 * grupo só, com as duas matrizes juntas), o sufixo do título é sempre
 * redundante com o cabeçalho do grupo — por isso sempre removido.
 */
export function tituloSemTecido(titulo: string, _tecido: Tecido) {
  void _tecido;
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
