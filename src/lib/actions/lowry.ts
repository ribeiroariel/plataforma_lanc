"use server";

import { createClient } from "@/lib/supabase/server";

export type AmostraLowry = {
  rotulo: string;
  absorbancia: number;
  fatorDiluicao: number;
  microgramas: number;
  mgPorMl: number;
};

export type EntradaCurvaLowry = {
  absBranco: number;
  abs10: number;
  abs20: number;
  abs40: number;
  abs60: number;
  abs80: number;
  inclinacao: number;
  intercepto: number;
  rQuadrado: number;
  amostras: AmostraLowry[];
};

export async function salvarCurvaLowry(
  dados: EntradaCurvaLowry
): Promise<{ erro: string } | { sucesso: true }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { erro: "Você precisa estar logado para salvar uma curva." };
  }

  const { error } = await supabase.from("curvas_lowry").insert({
    bolsista_id: user.id,
    abs_branco: dados.absBranco,
    abs_10: dados.abs10,
    abs_20: dados.abs20,
    abs_40: dados.abs40,
    abs_60: dados.abs60,
    abs_80: dados.abs80,
    inclinacao: dados.inclinacao,
    intercepto: dados.intercepto,
    r_quadrado: dados.rQuadrado,
    amostras: dados.amostras,
  });

  if (error) {
    return { erro: "Não foi possível salvar a curva: " + error.message };
  }

  return { sucesso: true };
}
