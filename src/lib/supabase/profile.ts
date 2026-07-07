import { createClient } from "@/lib/supabase/server";

export type Papel = "bolsista" | "orientador";

export type Profile = {
  id: string;
  nome: string;
  papel: Papel;
  aprovado: boolean;
  foto_url: string | null;
  apresentacao: string | null;
};

/** Usuário logado + perfil (nome/papel/aprovado), ou null se ninguém estiver logado. */
export async function getUsuarioAtual(): Promise<Profile | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, nome, papel, aprovado, foto_url, apresentacao")
    .eq("id", user.id)
    .single();

  return profile as Profile | null;
}
