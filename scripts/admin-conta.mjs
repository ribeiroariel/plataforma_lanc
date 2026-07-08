// Ações administrativas de conta que exigem a chave de serviço (.env.local).
// Roda só localmente, nunca no navegador.
//
// Uso:
//   node scripts/admin-conta.mjs confirmar-email <email>
//       Confirma o e-mail de um usuário já cadastrado (útil enquanto a
//       confirmação por link de e-mail do Supabase não está configurada).
//
//   node scripts/admin-conta.mjs criar-orientador <email> <senha> "<nome>"
//       Cria (ou reaproveita) uma conta já confirmada com papel
//       "orientador" e aprovada — é assim que a conta da Débora deve ser
//       criada. NÃO existe caminho para virar orientador pelo site.

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function acharUsuariosPorEmail(email) {
  // Percorre TODAS as páginas e retorna todos os usuários com o e-mail
  // (o Supabase pode ter duplicatas se permitir múltiplos cadastros não
  // confirmados com o mesmo e-mail).
  const achados = [];
  let pagina = 1;
  for (;;) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page: pagina,
      perPage: 200,
    });
    if (error) throw error;
    for (const u of data.users) {
      if (u.email?.toLowerCase() === email.toLowerCase()) achados.push(u);
    }
    if (data.users.length < 200) break;
    pagina += 1;
  }
  return achados;
}

async function acharUsuarioPorEmail(email) {
  const todos = await acharUsuariosPorEmail(email);
  // Prefere o mais recente (maior created_at).
  todos.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  return todos[0] ?? null;
}

async function recriarBolsista(email, senha, nome) {
  const duplicados = await acharUsuariosPorEmail(email);
  for (const u of duplicados) {
    await supabase.auth.admin.deleteUser(u.id);
  }
  console.log(`Removido(s) ${duplicados.length} cadastro(s) antigo(s).`);

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,
    user_metadata: { nome, papel: "bolsista" },
  });
  if (error) throw error;

  const { error: erroPerfil } = await supabase
    .from("profiles")
    .update({ aprovado: true, nome })
    .eq("id", data.user.id);
  if (erroPerfil) throw erroPerfil;

  console.log(
    `Conta de bolsista recriada: ${email} / senha: ${senha} (confirmada e aprovada).`
  );
}

async function confirmarEmail(email) {
  const usuario = await acharUsuarioPorEmail(email);
  if (!usuario) throw new Error(`Nenhum usuário com e-mail ${email}.`);
  const { error } = await supabase.auth.admin.updateUserById(usuario.id, {
    email_confirm: true,
  });
  if (error) throw error;
  console.log(`E-mail confirmado: ${email} (já pode fazer login).`);
}

async function status(email) {
  const usuario = await acharUsuarioPorEmail(email);
  if (!usuario) {
    console.log(`Nenhum usuário no Auth com e-mail ${email}.`);
    return;
  }
  const { data: perfil } = await supabase
    .from("profiles")
    .select("nome, papel, aprovado")
    .eq("id", usuario.id)
    .maybeSingle();

  console.log(`Auth:`);
  console.log(`  id: ${usuario.id}`);
  console.log(`  email: ${usuario.email}`);
  console.log(
    `  email confirmado: ${usuario.email_confirmed_at ? "SIM (" + usuario.email_confirmed_at + ")" : "NÃO"}`
  );
  console.log(`  último login: ${usuario.last_sign_in_at ?? "nunca"}`);
  console.log(`Profile:`);
  console.log(
    perfil
      ? `  nome: ${perfil.nome} | papel: ${perfil.papel} | aprovado: ${perfil.aprovado}`
      : `  (sem linha em profiles)`
  );
}

async function definirSenha(email, senha) {
  const usuario = await acharUsuarioPorEmail(email);
  if (!usuario) throw new Error(`Nenhum usuário com e-mail ${email}.`);
  const { error } = await supabase.auth.admin.updateUserById(usuario.id, {
    password: senha,
    email_confirm: true,
  });
  if (error) throw error;
  console.log(`Senha definida para ${email}: ${senha} (e-mail confirmado).`);
}

async function criarOrientador(email, senha, nome) {
  let usuario = await acharUsuarioPorEmail(email);

  if (!usuario) {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password: senha,
      email_confirm: true,
      user_metadata: { nome, papel: "orientador" },
    });
    if (error) throw error;
    usuario = data.user;
  }

  // Garante papel/aprovado corretos no profile (o trigger cria a linha).
  const { error } = await supabase
    .from("profiles")
    .update({ papel: "orientador", aprovado: true, nome })
    .eq("id", usuario.id);
  if (error) throw error;

  console.log(
    `Conta de orientadora pronta: ${email} / senha: ${senha} (papel orientador, aprovada).`
  );
}

const [comando, ...args] = process.argv.slice(2);

try {
  if (comando === "status") {
    if (!args[0]) throw new Error("Uso: status <email>");
    await status(args[0]);
  } else if (comando === "recriar-bolsista") {
    if (args.length < 3)
      throw new Error('Uso: recriar-bolsista <email> <senha> "<nome>"');
    await recriarBolsista(args[0], args[1], args.slice(2).join(" "));
  } else if (comando === "confirmar-email") {
    if (!args[0]) throw new Error("Uso: confirmar-email <email>");
    await confirmarEmail(args[0]);
  } else if (comando === "definir-senha") {
    if (args.length < 2) throw new Error("Uso: definir-senha <email> <senha>");
    await definirSenha(args[0], args[1]);
  } else if (comando === "criar-orientador") {
    if (args.length < 3)
      throw new Error('Uso: criar-orientador <email> <senha> "<nome>"');
    await criarOrientador(args[0], args[1], args.slice(2).join(" "));
  } else {
    console.log(
      "Comandos: confirmar-email <email> | criar-orientador <email> <senha> <nome>"
    );
  }
} catch (err) {
  console.error("Erro:", err.message ?? err);
  process.exit(1);
}
