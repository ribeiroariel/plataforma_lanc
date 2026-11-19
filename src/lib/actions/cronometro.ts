"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// Hora local do laboratório no formato do campo leitura_inicio/leitura_fim
// (texto "AAAA-MM-DDTHH:MM", ver projeto_testes).
function agoraLocal(): string {
  const p = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const v = (t: string) => p.find((x) => x.type === t)?.value ?? "00";
  return `${v("year")}-${v("month")}-${v("day")}T${v("hour") === "24" ? "00" : v("hour")}:${v("minute")}`;
}

/**
 * Começa a contar o tempo de um teste. Se a pessoa não tinha horas no lab
 * abertas, abre junto — o tempo do teste sempre fica dentro das horas no lab.
 * Se já havia outro teste rodando, ele é parado (um teste por vez).
 */
export async function iniciarCronometroTeste(dados: {
  projetoId: string;
  projetoTesteId: string;
}): Promise<{ erro: string } | { sucesso: true; abriuLab: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { erro: "Você precisa estar logado." };
  const agora = new Date().toISOString();

  // Um teste por vez: fecha o que estiver aberto.
  await supabase
    .from("teste_execucoes")
    .update({ fim: agora })
    .eq("profile_id", user.id)
    .is("fim", null);

  let { data: sessao } = await supabase
    .from("sessoes_lab")
    .select("id")
    .eq("profile_id", user.id)
    .is("fim", null)
    .limit(1)
    .maybeSingle();
  let abriuLab = false;
  if (!sessao) {
    const { data: nova, error } = await supabase
      .from("sessoes_lab")
      .insert({ profile_id: user.id, inicio: agora, topicos: ["teste_bioquimico"] })
      .select("id")
      .single();
    if (error || !nova) return { erro: "Não consegui abrir as horas no lab: " + (error?.message ?? "") };
    sessao = nova;
    abriuLab = true;
  }

  const { error } = await supabase.from("teste_execucoes").insert({
    projeto_teste_id: dados.projetoTesteId,
    profile_id: user.id,
    sessao_lab_id: sessao.id,
    inicio: agora,
  });
  if (error) {
    return {
      erro:
        "Não consegui iniciar o cronômetro: " +
        error.message +
        (error.code === "42P01" ? " (falta rodar a migração do cronômetro no Supabase)" : ""),
    };
  }

  // Preenche o início da leitura do teste se ainda estava vazio (metadado da
  // planilha de transparência e do tempo médio no painel). Teste encerrado
  // recusa a alteração — tudo bem, é só um complemento.
  await supabase
    .from("projeto_testes")
    .update({ leitura_inicio: agoraLocal() })
    .eq("id", dados.projetoTesteId)
    .is("leitura_inicio", null);

  revalidatePath(`/projetos/${dados.projetoId}/testes/${dados.projetoTesteId}`);
  revalidatePath("/laboratorio");
  return { sucesso: true, abriuLab };
}

/** Para o cronômetro do teste (as horas no lab continuam abertas). */
export async function pararCronometroTeste(execucaoId: string): Promise<{ erro: string } | { sucesso: true }> {
  const supabase = await createClient();
  const { data: exec, error } = await supabase
    .from("teste_execucoes")
    .update({ fim: new Date().toISOString() })
    .eq("id", execucaoId)
    .is("fim", null)
    .select("projeto_teste_id")
    .maybeSingle();
  if (error) return { erro: "Não consegui parar: " + error.message };

  if (exec) {
    await supabase
      .from("projeto_testes")
      .update({ leitura_fim: agoraLocal() })
      .eq("id", exec.projeto_teste_id);
  }
  revalidatePath("/laboratorio");
  return { sucesso: true };
}
