import { readFileSync } from "fs";
import path from "path";

// Reexporta os dados client-safe de @/lib/tecidos e adiciona a leitura do
// conteúdo do protocolo (que usa fs, então só pode rodar no servidor).
export {
  testes,
  nomeTecido,
  tituloCurto,
  tituloSemTecido,
  testesPorTecido,
  type Tecido,
  type TesteResumo,
} from "./tecidos";

/** Texto do protocolo, extraído literalmente do manual do LANC (sem reescrita). */
export function conteudoTeste(slug: string): string {
  const caminho = path.join(process.cwd(), "content", "testes", `${slug}.md`);
  return readFileSync(caminho, "utf-8");
}
