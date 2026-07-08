// Publica as notícias que estão como rascunho em content/noticias/*.md na
// tabela "noticias" do Supabase, com publicado = true. Roda só localmente,
// com a chave de serviço (.env.local) — nunca no navegador.
//
// É idempotente: apaga qualquer notícia com o mesmo título antes de
// inserir, então rodar de novo atualiza em vez de duplicar.
//
// Uso:
//   node scripts/publicar-noticias.mjs           (lista o que vai publicar)
//   node scripts/publicar-noticias.mjs --publicar (publica de verdade)

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { readFileSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    "Faltam NEXT_PUBLIC_SUPABASE_URL e/ou SUPABASE_SERVICE_ROLE_KEY em .env.local"
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const DIR_NOTICIAS = join(RAIZ, "content", "noticias");

function parseFrontmatter(texto) {
  const partes = texto.split(/^---\s*$/m);
  if (partes.length < 3) {
    throw new Error("Frontmatter ausente ou malformado.");
  }
  const bruto = partes[1];
  const corpo = partes.slice(2).join("---").trim();

  const meta = {};
  for (const linha of bruto.split(/\r?\n/)) {
    const m = linha.match(/^(\w+):\s*(.*)$/);
    if (!m) continue;
    let valor = m[2].trim();
    if (valor.startsWith('"') && valor.endsWith('"')) {
      valor = valor.slice(1, -1);
    }
    meta[m[1]] = valor === "" ? null : valor;
  }
  return { meta, corpo };
}

const arquivos = readdirSync(DIR_NOTICIAS).filter((f) => f.endsWith(".md"));
const publicar = process.argv.includes("--publicar");

const noticias = arquivos.map((arquivo) => {
  const { meta, corpo } = parseFrontmatter(
    readFileSync(join(DIR_NOTICIAS, arquivo), "utf-8")
  );
  return {
    arquivo,
    titulo: meta.titulo,
    tipo: meta.tipo,
    resumo: meta.resumo,
    corpo,
    link_artigo: meta.link_artigo ?? null,
    imagem_url: meta.imagem ?? null,
    data: meta.data,
    publicado: true,
  };
});

console.log(`${noticias.length} notícia(s) encontrada(s) em content/noticias/:\n`);
for (const n of noticias) {
  console.log(`- [${n.data}] ${n.titulo}  (${n.tipo})`);
}

if (!publicar) {
  console.log(
    "\nNada foi publicado. Rode com --publicar para inserir no Supabase."
  );
  process.exit(0);
}

for (const n of noticias) {
  const { arquivo, ...linha } = n;
  await supabase.from("noticias").delete().eq("titulo", linha.titulo);
  const { error } = await supabase.from("noticias").insert(linha);
  console.log(
    error ? `FALHOU ${arquivo}: ${error.message}` : `OK   ${arquivo}`
  );
}

console.log("\nPronto. As notícias já aparecem na portada do site.");
