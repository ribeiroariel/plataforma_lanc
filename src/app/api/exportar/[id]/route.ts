import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import * as XLSX from "xlsx";
import { createClient } from "@/lib/supabase/server";
import { testes as catalogoTestes } from "@/lib/testes";

type ProjetoTeste = { id: string; teste_slug: string };
type Grupo = { id: string; nome: string };
type Resultado = {
  projeto_teste_id: string;
  rato: string;
  grupo_id: string;
  leituras: Record<string, unknown>;
  valor_calculado: number | null;
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projetoId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
  }

  const { data: perfil } = await supabase
    .from("profiles")
    .select("pode_exportar_dados")
    .eq("id", user.id)
    .single();

  if (!perfil?.pode_exportar_dados) {
    return NextResponse.json({ erro: "Sem permissão." }, { status: 403 });
  }

  const [{ data: projeto }, { data: grupos }, { data: projetoTestes }] =
    await Promise.all([
      supabase.from("projetos").select("nome").eq("id", projetoId).maybeSingle(),
      supabase
        .from("projeto_grupos")
        .select("id, nome")
        .eq("projeto_id", projetoId)
        .returns<Grupo[]>(),
      supabase
        .from("projeto_testes")
        .select("id, teste_slug")
        .eq("projeto_id", projetoId)
        .returns<ProjetoTeste[]>(),
    ]);

  if (!projeto || !projetoTestes || projetoTestes.length === 0) {
    return NextResponse.json(
      { erro: "Projeto não encontrado ou sem testes designados." },
      { status: 404 }
    );
  }

  const { data: resultados } = await supabase
    .from("resultados_teste")
    .select("projeto_teste_id, rato, grupo_id, leituras, valor_calculado")
    .in(
      "projeto_teste_id",
      projetoTestes.map((t) => t.id)
    )
    .returns<Resultado[]>();

  const nomeGrupo = new Map((grupos ?? []).map((g) => [g.id, g.nome]));
  const tituloTeste = (slug: string) =>
    catalogoTestes.find((t) => t.slug === slug)?.titulo ?? slug;

  const workbook = XLSX.utils.book_new();

  // Uma aba "Dados_Brutos" por teste designado, igual ao formato que o
  // Ariel já usa fora do site (ver Para análise estatísica/*_organizado_*.xlsx).
  for (const pt of projetoTestes) {
    const linhas = (resultados ?? [])
      .filter((r) => r.projeto_teste_id === pt.id)
      .sort((a, b) => Number(a.rato) - Number(b.rato))
      .map((r) => ({
        rato: r.rato,
        grupo: nomeGrupo.get(r.grupo_id) ?? "",
        ...r.leituras,
        valor_calculado: r.valor_calculado,
      }));

    if (linhas.length === 0) continue;

    const nomeAba = tituloTeste(pt.teste_slug).slice(0, 31).replace(/[[\]*/\\?:]/g, "");
    const planilha = XLSX.utils.json_to_sheet(linhas);
    XLSX.utils.book_append_sheet(workbook, planilha, nomeAba || pt.teste_slug);
  }

  // Aba "R_Tidy": formato longo (rato, grupo, teste, valor) — pronto pra
  // ler no R, juntando todos os testes do projeto numa tabela só.
  const linhasTidy = (resultados ?? [])
    .filter((r) => r.valor_calculado !== null)
    .map((r) => {
      const teste = projetoTestes.find((t) => t.id === r.projeto_teste_id);
      return {
        rato: r.rato,
        grupo: nomeGrupo.get(r.grupo_id) ?? "",
        teste: teste ? tituloTeste(teste.teste_slug) : "",
        valor: r.valor_calculado,
      };
    })
    .sort((a, b) => Number(a.rato) - Number(b.rato));

  const planilhaTidy = XLSX.utils.json_to_sheet(linhasTidy);
  XLSX.utils.book_append_sheet(workbook, planilhaTidy, "R_Tidy");

  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

  const nomeArquivo = `${projeto.nome.replace(/[^a-zA-Z0-9-_]+/g, "_")}.xlsx`;

  return new NextResponse(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${nomeArquivo}"`,
    },
  });
}
