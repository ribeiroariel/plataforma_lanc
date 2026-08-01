import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import * as XLSX from "xlsx";
import { createClient } from "@/lib/supabase/server";
import { testes as catalogoTestes } from "@/lib/testes";
import { configDoTeste } from "@/lib/tiposTeste";
import { gerarRoster, type GrupoComContagem } from "@/lib/roster";
import { ehAparelho, nomeAparelhoEn } from "@/lib/recipientes";

// Exportação de TRANSPARÊNCIA (≠ da exportação para o R em /api/exportar):
// dados brutos de leitura, formato estilo Tecan, em inglês, para anexar quando
// revisores pedirem os dados originais. Não faz análise.

type ProjetoTeste = {
  id: string;
  teste_slug: string;
  responsavel_id: string;
  leva: number | null;
  aparelho: string | null;
  aparelho_leitura: string | null;
  leitura_inicio: string | null;
  leitura_fim: string | null;
};
type Resultado = {
  projeto_teste_id: string;
  rato: string;
  grupo_id: string;
  leituras: { colunas?: Record<string, unknown> } | null;
  valor_calculado: number | null;
  dentro_do_padrao: boolean | null;
  observacoes: string | null;
  registrado_por: string;
};

const TECIDO_EN: Record<string, string> = {
  "cortex-rins": "Cerebral cortex and kidney",
  "eritrocitos-plasma": "Erythrocytes and plasma",
  figado: "Liver",
  geral: "General",
};

// Nome do ensaio em inglês, por prefixo do slug (o catálogo é em PT).
const ENSAIO_EN: { prefixo: string; nome: string }[] = [
  { prefixo: "cat-", nome: "Catalase (CAT)" },
  { prefixo: "sod-", nome: "Superoxide dismutase (SOD)" },
  { prefixo: "tbars", nome: "TBARS (lipid peroxidation)" },
  { prefixo: "sulfidrilas", nome: "Sulfhydryls (thiol groups)" },
  { prefixo: "carboniladas", nome: "Protein carbonyls" },
  { prefixo: "tiois-dissulfetos", nome: "Thiols and disulfides" },
  { prefixo: "acido-ascorbico", nome: "Ascorbic acid (vitamin C)" },
  { prefixo: "h2o2", nome: "Hydrogen peroxide (H2O2)" },
  { prefixo: "lowry", nome: "Total protein (Lowry)" },
];

function nomeEnsaioEn(slug: string): string {
  const m = ENSAIO_EN.find((e) => slug.startsWith(e.prefixo));
  if (m) return m.nome;
  return catalogoTestes.find((t) => t.slug === slug)?.titulo ?? slug;
}

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

  // Permissão: coautor do projeto, orientadora, ou quem exporta dados (Ariel).
  const [{ data: perfil }, { data: membros }] = await Promise.all([
    supabase
      .from("profiles")
      .select("papel, pode_exportar_dados")
      .eq("id", user.id)
      .single(),
    supabase
      .from("projeto_membros")
      .select("profile_id, papel")
      .eq("projeto_id", projetoId),
  ]);
  const souCoautor = (membros ?? []).some(
    (m) => m.papel === "coautor" && m.profile_id === user.id
  );
  if (
    !souCoautor &&
    perfil?.papel !== "orientador" &&
    !perfil?.pode_exportar_dados
  ) {
    return NextResponse.json({ erro: "Sem permissão." }, { status: 403 });
  }

  const [{ data: projeto }, { data: grupos }, { data: projetoTestes }] =
    await Promise.all([
      supabase
        .from("projetos")
        .select("nome, numero_levas, especie, linhagem")
        .eq("id", projetoId)
        .maybeSingle(),
      supabase
        .from("projeto_grupos")
        .select("id, nome, numero_ratos, ratos_por_leva")
        .eq("projeto_id", projetoId)
        .order("created_at", { ascending: true })
        .returns<GrupoComContagem[]>(),
      supabase
        .from("projeto_testes")
        .select(
          "id, teste_slug, responsavel_id, leva, aparelho, aparelho_leitura, leitura_inicio, leitura_fim"
        )
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
    .select(
      "projeto_teste_id, rato, grupo_id, leituras, valor_calculado, dentro_do_padrao, observacoes, registrado_por"
    )
    .in(
      "projeto_teste_id",
      projetoTestes.map((t) => t.id)
    )
    .returns<Resultado[]>();

  // Nomes das pessoas (responsável do teste + quem registrou cada leitura).
  const idsPessoas = new Set<string>();
  projetoTestes.forEach((t) => idsPessoas.add(t.responsavel_id));
  (resultados ?? []).forEach((r) => idsPessoas.add(r.registrado_por));
  const { data: pessoas } = await supabase
    .from("profiles")
    .select("id, nome")
    .in("id", Array.from(idsPessoas));
  const nomePessoa = new Map((pessoas ?? []).map((p) => [p.id, p.nome]));

  const nomeGrupo = new Map((grupos ?? []).map((g) => [g.id, g.nome]));
  const roster = gerarRoster(grupos ?? [], projeto.numero_levas ?? 1);
  const levaDoRato = new Map(roster.map((r) => [String(r.numero), r.leva]));
  const tecidoDe = (slug: string) =>
    catalogoTestes.find((t) => t.slug === slug)?.tecido ?? "";

  const wb = XLSX.utils.book_new();

  // --- About / cover ---
  const cover: (string | number)[][] = [
    ["LANC — Laboratory of Neuroscience and Behavior (FURB)"],
    ["Raw data — transparency export"],
    [],
    ["Project", projeto.nome],
    [
      "Animal model",
      [
        projeto.especie === "camundongo"
          ? "Mouse"
          : projeto.especie === "rato"
          ? "Rat"
          : null,
        projeto.linhagem,
      ]
        .filter(Boolean)
        .join(" ") || "—",
    ],
    ["Exported on", new Date().toISOString().slice(0, 16).replace("T", " ")],
    ["Experimental groups", (grupos ?? []).map((g) => g.nome).join(", ")],
    ["Number of batches", projeto.numero_levas ?? 1],
    ["Assays included", projetoTestes.length],
    [],
    [
      "Note",
      "Raw readings recorded in the platform. This is NOT a statistical analysis — it is provided for transparency, e.g. when reviewers request the original data.",
    ],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(cover), "About");

  // --- One sheet per assay (Tecan-like: metadata header + raw table) ---
  const usados = new Set<string>();
  for (const pt of projetoTestes) {
    const linhas = (resultados ?? [])
      .filter((r) => r.projeto_teste_id === pt.id)
      .sort((a, b) => Number(a.rato) - Number(b.rato));

    // União das chaves de leitura bruta presentes (variam por tipo de teste).
    const chaves: string[] = [];
    for (const r of linhas) {
      const cols = (r.leituras?.colunas ?? {}) as Record<string, unknown>;
      for (const k of Object.keys(cols)) if (!chaves.includes(k)) chaves.push(k);
    }

    const config = configDoTeste(pt.teste_slug);
    const meta: (string | number)[][] = [
      ["Assay", nomeEnsaioEn(pt.teste_slug)],
      ["Tissue / matrix", TECIDO_EN[tecidoDe(pt.teste_slug)] ?? tecidoDe(pt.teste_slug)],
      [
        "Instrument",
        (ehAparelho(pt.aparelho) ? nomeAparelhoEn(pt.aparelho) : null) ??
          pt.aparelho_leitura ??
          "—",
      ],
      ["Reading start", pt.leitura_inicio ? pt.leitura_inicio.replace("T", " ") : "—"],
      ["Reading end", pt.leitura_fim ? pt.leitura_fim.replace("T", " ") : "—"],
      ["Result unit", config?.unidadeResultado || "—"],
      ["Responsible", nomePessoa.get(pt.responsavel_id) ?? "—"],
      ["Batch", pt.leva ?? "all"],
      [],
    ];
    const header = [
      "Animal",
      "Group",
      "Batch",
      ...chaves,
      "Final value",
      "Within QC",
      "Observations",
      "Recorded by",
    ];
    const dados: (string | number)[][] = linhas.map((r) => {
      const cols = (r.leituras?.colunas ?? {}) as Record<string, unknown>;
      return [
        r.rato,
        nomeGrupo.get(r.grupo_id) ?? "",
        levaDoRato.get(r.rato) ?? "",
        ...chaves.map((k) => {
          const v = cols[k];
          return typeof v === "number" || typeof v === "string" ? v : "";
        }),
        r.valor_calculado ?? "",
        r.dentro_do_padrao === null ? "" : r.dentro_do_padrao ? "yes" : "no",
        r.observacoes ?? "",
        nomePessoa.get(r.registrado_por) ?? "",
      ];
    });

    const ws = XLSX.utils.aoa_to_sheet([...meta, header, ...dados]);
    // Nome de aba único e válido (<=31 chars, sem caracteres proibidos).
    const base = nomeEnsaioEn(pt.teste_slug)
      .slice(0, 27)
      .replace(/[[\]*/\\?:]/g, "");
    let nome = base;
    let i = 2;
    while (usados.has(nome)) nome = `${base} ${i++}`;
    usados.add(nome);
    XLSX.utils.book_append_sheet(wb, ws, nome || pt.teste_slug);
  }

  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  const nomeArquivo = `${projeto.nome.replace(/[^a-zA-Z0-9-_]+/g, "_")}_raw-data.xlsx`;

  return new NextResponse(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${nomeArquivo}"`,
    },
  });
}
