"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ResultadoCadastro = { erro: string } | { ok: true };

// Aprova um bolsista pendente. A autorização real acontece na função
// aprovar_cadastro (security definer) no banco — aqui só repassamos.
export async function aprovarCadastro(
  profileId: string
): Promise<ResultadoCadastro> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("aprovar_cadastro", {
    p_profile_id: profileId,
  });
  if (error) return { erro: error.message };
  revalidatePath("/cadastros");
  return { ok: true };
}

// Recusa um cadastro pendente (apaga a conta). Mesma validação no banco.
export async function rejeitarCadastro(
  profileId: string
): Promise<ResultadoCadastro> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("rejeitar_cadastro", {
    p_profile_id: profileId,
  });
  if (error) return { erro: error.message };
  revalidatePath("/cadastros");
  return { ok: true };
}
