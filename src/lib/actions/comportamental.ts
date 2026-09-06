"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type Base = {
  projetoId: string;
  leva: number | null;
  rato: string;
  grupoId: string | null;
};

// Campo aberto (6 min): quadrados, urinas, fezes, imobilidade (s). O tempo em
// atividade (360 − imobilidade) é derivado na exibição/exportação, não gravado.
export async function salvarCampoAberto(
  dados: Base & {
    quadrados: number | null;
    urinas: number | null;
    fezes: number | null;
    imobilidadeS: number | null;
    confirmar: boolean;
  }
): Promise<{ erro: string } | void> {
  const supabase = await createClient();
  const { error } = await supabase.from("comportamental").upsert(
    {
      projeto_id: dados.projetoId,
      leva: dados.leva,
      rato: dados.rato,
      grupo_id: dados.grupoId,
      ca_quadrados: dados.quadrados,
      ca_urinas: dados.urinas,
      ca_fezes: dados.fezes,
      ca_imobilidade_s: dados.imobilidadeS,
      ...(dados.confirmar ? { ca_confirmado: true } : {}),
    },
    { onConflict: "projeto_id,leva,rato" }
  );
  if (error) return { erro: error.message };
  revalidatePath(`/comportamental/${dados.projetoId}`);
}

// Nado forçado (6 min): tempo de imobilidade (s).
export async function salvarNadoForcado(
  dados: Base & { imobilidadeS: number | null; confirmar: boolean }
): Promise<{ erro: string } | void> {
  const supabase = await createClient();
  const { error } = await supabase.from("comportamental").upsert(
    {
      projeto_id: dados.projetoId,
      leva: dados.leva,
      rato: dados.rato,
      grupo_id: dados.grupoId,
      nf_imobilidade_s: dados.imobilidadeS,
      ...(dados.confirmar ? { nf_confirmado: true } : {}),
    },
    { onConflict: "projeto_id,leva,rato" }
  );
  if (error) return { erro: error.message };
  revalidatePath(`/comportamental/${dados.projetoId}`);
}
