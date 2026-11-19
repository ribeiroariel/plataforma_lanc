"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { ehData, ehHora, ehSala, paraIso, tiposDaSala, type TipoReserva } from "@/lib/agenda";

export type DadosReserva = {
  id?: string;
  sala: string;
  data: string;
  horaInicio: string;
  horaFim: string;
  tipo: string;
  titulo: string;
  observacao: string;
  projetoId: string | null;
  projetoTesteId: string | null;
  pessoas: string[];
};

export async function salvarReserva(
  d: DadosReserva
): Promise<{ erro: string } | { sucesso: true; id: string }> {
  if (!ehSala(d.sala)) return { erro: "Escolha a sala." };
  if (!ehData(d.data)) return { erro: "Data inválida." };
  if (!ehHora(d.horaInicio) || !ehHora(d.horaFim)) return { erro: "Horário inválido." };
  if (d.horaFim <= d.horaInicio) return { erro: "O fim tem que ser depois do início." };
  if (!tiposDaSala(d.sala).includes(d.tipo as TipoReserva)) {
    return { erro: "Esse tipo de atividade não é feito nessa sala." };
  }
  if (d.tipo === "outro" && !d.titulo.trim()) {
    return { erro: "Descreva o que vai ser feito." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { erro: "Você precisa estar logado." };

  const linha = {
    sala: d.sala,
    inicio: paraIso(d.data, d.horaInicio),
    fim: paraIso(d.data, d.horaFim),
    tipo: d.tipo,
    titulo: d.titulo.trim() || null,
    observacao: d.observacao.trim() || null,
    projeto_id: d.projetoId || null,
    projeto_teste_id: d.tipo === "teste" ? d.projetoTesteId || null : null,
  };

  let id = d.id;
  if (id) {
    const { error } = await supabase.from("reservas").update(linha).eq("id", id);
    if (error) return { erro: "Não foi possível salvar: " + error.message };
    await supabase.from("reserva_pessoas").delete().eq("reserva_id", id);
  } else {
    const { data, error } = await supabase
      .from("reservas")
      .insert({ ...linha, criado_por: user.id })
      .select("id")
      .single();
    if (error || !data) return { erro: "Não foi possível reservar: " + (error?.message ?? "") };
    id = data.id as string;
  }

  // Quem reservou sempre está na lista.
  const pessoas = Array.from(new Set([...(d.pessoas ?? []), ...(d.id ? [] : [user.id])]));
  if (pessoas.length > 0) {
    const { error } = await supabase
      .from("reserva_pessoas")
      .insert(pessoas.map((p) => ({ reserva_id: id, profile_id: p })));
    if (error) return { erro: "A reserva foi salva, mas não as pessoas: " + error.message };
  }

  revalidatePath("/agenda");
  return { sucesso: true, id: id! };
}

export async function cancelarReserva(id: string): Promise<{ erro: string } | { sucesso: true }> {
  const supabase = await createClient();
  const { error } = await supabase.from("reservas").delete().eq("id", id);
  if (error) return { erro: "Não foi possível cancelar: " + error.message };
  revalidatePath("/agenda");
  return { sucesso: true };
}
