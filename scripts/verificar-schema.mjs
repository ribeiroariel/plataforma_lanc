// Checagem rápida: confirma que as tabelas/colunas esperadas existem no
// Supabase depois de rodar supabase/schema.sql. Não altera nada.
//
// Uso: node scripts/verificar-schema.mjs

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const tabelas = [
  "profiles",
  "noticias",
  "curvas_lowry",
  "projetos",
  "projeto_membros",
  "projeto_grupos",
  "projeto_testes",
  "resultados_teste",
];

for (const tabela of tabelas) {
  const { error } = await supabase
    .from(tabela)
    .select("*", { count: "exact", head: true });
  console.log(error ? `FALHOU ${tabela}: ${error.message}` : `OK   ${tabela}`);
}

const { error: erroColuna } = await supabase
  .from("profiles")
  .select("pode_exportar_dados")
  .limit(1);
console.log(
  erroColuna
    ? `FALHOU coluna pode_exportar_dados: ${erroColuna.message}`
    : "OK   coluna pode_exportar_dados"
);
