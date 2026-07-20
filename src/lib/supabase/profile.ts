import { createClient } from "@/lib/supabase/server";

export type Papel = "bolsista" | "orientador";

export type Profile = {
  id: string;
  nome: string;
  papel: Papel;
  aprovado: boolean;
  pode_exportar_dados: boolean;
  pode_aprovar_cadastros: boolean;
  foto_url: string | null;
  apresentacao: string | null;
};

/** True se o usuário pode aprovar/recusar cadastros (orientadora ou flag). */
export function podeAprovarCadastros(p: Profile | null): boolean {
  return !!p && (p.papel === "orientador" || p.pode_aprovar_cadastros);
}

/** Usuário logado + perfil, ou null se ninguém estiver logado. */
export async function getUsuarioAtual(): Promise<Profile | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "id, nome, papel, aprovado, pode_exportar_dados, pode_aprovar_cadastros, foto_url, apresentacao"
    )
    .eq("id", user.id)
    .single();

  return profile as Profile | null;
}
