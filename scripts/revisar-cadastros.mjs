// Lista, aprova ou rejeita cadastros de bolsista pendentes. Roda só
// localmente, com a chave de serviço (.env.local) — nunca no navegador.
//
// Uso:
//   node scripts/revisar-cadastros.mjs listar
//   node scripts/revisar-cadastros.mjs aprovar <email-ou-id>
//   node scripts/revisar-cadastros.mjs rejeitar <email-ou-id>

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

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

function ehUuid(valor) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    valor
  );
}

async function listarPendentes() {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, nome, email, created_at")
    .eq("papel", "bolsista")
    .eq("aprovado", false)
    .order("created_at", { ascending: true });

  if (error) throw error;

  if (!data || data.length === 0) {
    console.log("Nenhum cadastro pendente.");
    return;
  }

  console.log(`${data.length} cadastro(s) pendente(s):\n`);
  for (const pessoa of data) {
    console.log(
      `- ${pessoa.nome} <${pessoa.email}>  (id: ${pessoa.id}, pediu em ${new Date(
        pessoa.created_at
      ).toLocaleString("pt-BR")})`
    );
  }
}

async function localizarPendente(alvo) {
  let query = supabase
    .from("profiles")
    .select("id, nome, email")
    .eq("papel", "bolsista")
    .eq("aprovado", false);

  query = ehUuid(alvo) ? query.eq("id", alvo) : query.eq("email", alvo);

  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  if (!data) {
    throw new Error(`Nenhum cadastro pendente encontrado para "${alvo}".`);
  }
  return data;
}

async function aprovar(alvo) {
  const pessoa = await localizarPendente(alvo);
  const { error } = await supabase
    .from("profiles")
    .update({ aprovado: true })
    .eq("id", pessoa.id);

  if (error) throw error;
  console.log(`Aprovado: ${pessoa.nome} <${pessoa.email}>`);
}

async function rejeitar(alvo) {
  const pessoa = await localizarPendente(alvo);
  // Apaga a conta de login inteira (cascata apaga o profile também), para
  // não deixar um cadastro recusado ocupando o e-mail para sempre.
  const { error } = await supabase.auth.admin.deleteUser(pessoa.id);
  if (error) throw error;
  console.log(`Cadastro removido: ${pessoa.nome} <${pessoa.email}>`);
}

const [, , comando, alvo] = process.argv;

try {
  switch (comando) {
    case "listar":
      await listarPendentes();
      break;
    case "aprovar":
      if (!alvo) throw new Error("Uso: aprovar <email-ou-id>");
      await aprovar(alvo);
      break;
    case "rejeitar":
      if (!alvo) throw new Error("Uso: rejeitar <email-ou-id>");
      await rejeitar(alvo);
      break;
    default:
      console.log(
        "Uso: node scripts/revisar-cadastros.mjs <listar|aprovar|rejeitar> [email-ou-id]"
      );
  }
} catch (err) {
  console.error("Erro:", err.message ?? err);
  process.exit(1);
}
