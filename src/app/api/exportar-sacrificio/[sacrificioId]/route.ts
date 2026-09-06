import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import ExcelJS from "exceljs";
import { createClient } from "@/lib/supabase/server";
import { carregarDia } from "@/lib/sacrificioDados";
import { ORGAOS_DISSECAVEIS, rotuloFuncao } from "@/lib/sacrificio";
import { ROTULO_CATEGORIA } from "@/lib/aliquotas";
import type { CategoriaAliquota } from "@/lib/tiposTeste";

const DURACAO_COMPORTAMENTAL_S = 360;

type Sacrificio = {
  id: string;
  projeto_id: string;
  leva: number | null;
  data: string | null;
  duracao_estimada_min: number | null;
  status: string;
};
type Projeto = {
  nome: string;
  especie: string | null;
  linhagem: string | null;
  numero_levas: number | null;
  tem_bioquimico: boolean | null;
  tem_histologia: boolean | null;
  tem_comportamental: boolean | null;
};
type FuncaoRow = {
  funcao: string;
  profiles: { nome: string } | null;
};
type ComportamentalRow = {
  rato: string;
  ca_quadrados: number | null;
  ca_urinas: number | null;
  ca_fezes: number | null;
  ca_imobilidade_s: number | null;
  ca_confirmado: boolean;
  nf_imobilidade_s: number | null;
  nf_confirmado: boolean;
};

const AZUL = "FF1F3A5F";
const AZUL_CLARO = "FFDCE6F1";

function rotuloOrgao(v: string): string {
  return ORGAOS_DISSECAVEIS.find((o) => o.valor === v)?.rotulo ?? v;
}

// Aplica estilo de cabeçalho (fundo azul, texto branco, borda) numa linha.
function estilizarCabecalho(row: ExcelJS.Row) {
  row.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: AZUL },
    };
    cell.alignment = { vertical: "middle", horizontal: "left" };
    cell.border = {
      top: { style: "thin", color: { argb: "FFB0B0B0" } },
      bottom: { style: "thin", color: { argb: "FFB0B0B0" } },
      left: { style: "thin", color: { argb: "FFB0B0B0" } },
      right: { style: "thin", color: { argb: "FFB0B0B0" } },
    };
  });
  row.height = 20;
}

// Zebra + bordas leves nas linhas de dados.
function estilizarDados(ws: ExcelJS.Worksheet, primeiraLinha: number) {
  for (let i = primeiraLinha; i <= ws.rowCount; i++) {
    const row = ws.getRow(i);
    const par = (i - primeiraLinha) % 2 === 1;
    row.eachCell((cell) => {
      if (par) {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: AZUL_CLARO },
        };
      }
      cell.border = {
        bottom: { style: "hair", color: { argb: "FFD0D0D0" } },
      };
      cell.alignment = { vertical: "middle" };
    });
  }
}

function tituloAba(ws: ExcelJS.Worksheet, texto: string, nColunas: number) {
  ws.mergeCells(1, 1, 1, Math.max(1, nColunas));
  const c = ws.getCell(1, 1);
  c.value = texto;
  c.font = { bold: true, size: 14, color: { argb: AZUL } };
  ws.getRow(1).height = 24;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ sacrificioId: string }> }
) {
  const { sacrificioId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
  }

  const { data: sacrificio } = await supabase
    .from("sacrificios")
    .select("id, projeto_id, leva, data, duracao_estimada_min, status")
    .eq("id", sacrificioId)
    .maybeSingle()
    .returns<Sacrificio>();
  if (!sacrificio) {
    // RLS já bloqueia quem não pode ver — trata como não encontrado.
    return NextResponse.json({ erro: "Sacrifício não encontrado." }, { status: 404 });
  }

  const { data: projeto } = await supabase
    .from("projetos")
    .select(
      "nome, especie, linhagem, numero_levas, tem_bioquimico, tem_histologia, tem_comportamental"
    )
    .eq("id", sacrificio.projeto_id)
    .maybeSingle()
    .returns<Projeto>();

  const { roster, ratos } = await carregarDia(
    supabase,
    sacrificio.projeto_id,
    sacrificioId,
    sacrificio.leva,
    projeto?.numero_levas ?? 1
  );

  const [{ data: funcoes }, { data: comportamental }] = await Promise.all([
    supabase
      .from("sacrificio_funcoes")
      .select("funcao, profiles:profile_id(nome)")
      .eq("sacrificio_id", sacrificioId)
      .returns<FuncaoRow[]>(),
    supabase
      .from("comportamental")
      .select(
        "rato, ca_quadrados, ca_urinas, ca_fezes, ca_imobilidade_s, ca_confirmado, nf_imobilidade_s, nf_confirmado"
      )
      .eq("projeto_id", sacrificio.projeto_id)
      .eq("leva", sacrificio.leva ?? 1)
      .returns<ComportamentalRow[]>(),
  ]);

  const grupoPorRato = new Map(roster.map((r) => [String(r.numero), r.grupoNome]));
  const dadosPorRato = new Map(ratos.map((r) => [r.rato, r]));
  const compPorRato = new Map((comportamental ?? []).map((c) => [c.rato, c]));
  const ordenadosPorNumero = [...roster].sort((a, b) => a.numero - b.numero);
  const seedadosOrdenados = [...ratos].sort(
    (a, b) => Number(a.rato) - Number(b.rato)
  );

  const temBio = projeto?.tem_bioquimico ?? true;
  const temComp = projeto?.tem_comportamental ?? false;

  const wb = new ExcelJS.Workbook();
  wb.creator = "Plataforma LANC";
  wb.created = new Date();

  // ---------------- Aba 1: Resumo ----------------
  {
    const ws = wb.addWorksheet("Resumo");
    ws.columns = [{ width: 28 }, { width: 60 }];
    tituloAba(ws, "Sacrifício — resumo", 2);
    ws.addRow([]);
    const linhas: [string, string | number][] = [
      ["Projeto", projeto?.nome ?? ""],
      [
        "Espécie / linhagem",
        [projeto?.especie, projeto?.linhagem].filter(Boolean).join(" · ") || "—",
      ],
      ["Leva", sacrificio.leva ?? "—"],
      ["Data", sacrificio.data ?? "—"],
      ["Duração estimada (min)", sacrificio.duracao_estimada_min ?? "—"],
      ["Status", sacrificio.status],
      ["Grupos", new Set(roster.map((r) => r.grupoNome)).size],
      ["Ratos previstos (leva)", roster.length],
      ["Sobreviventes", ratos.filter((r) => r.sobreviveu).length],
      [
        "Dissecados",
        ratos.filter((r) => r.status === "dissecado").length,
      ],
      [
        "Análises",
        [
          temBio ? "bioquímica" : null,
          projeto?.tem_histologia ? "histologia" : null,
          temComp ? "comportamental" : null,
        ]
          .filter(Boolean)
          .join(", ") || "—",
      ],
    ];
    for (const [k, v] of linhas) {
      const row = ws.addRow([k, v]);
      row.getCell(1).font = { bold: true, color: { argb: AZUL } };
    }
  }

  // ---------------- Aba 2: Ratos ----------------
  {
    const ws = wb.addWorksheet("Ratos");
    const cabec = [
      "Nº",
      "Grupo",
      "Caixa",
      "Sobreviveu",
      "Motivo exclusão",
      "Status",
    ];
    ws.columns = [
      { width: 8 },
      { width: 26 },
      { width: 10 },
      { width: 12 },
      { width: 30 },
      { width: 12 },
    ];
    tituloAba(ws, "Ratos", cabec.length);
    ws.addRow([]);
    estilizarCabecalho(ws.addRow(cabec));
    for (const r of ordenadosPorNumero) {
      const d = dadosPorRato.get(String(r.numero));
      ws.addRow([
        r.numero,
        r.grupoNome,
        d?.caixa ?? "",
        d ? (d.sobreviveu ? "Sim" : "Não") : "",
        d?.motivo ?? "",
        d?.status ?? "",
      ]);
    }
    ws.views = [{ state: "frozen", ySplit: 3 }];
    estilizarDados(ws, 4);
  }

  // ---------------- Aba 3: Coleta ----------------
  {
    const ws = wb.addWorksheet("Coleta");
    const cabec = ["Nº", "Grupo", "Órgão", "Destino", "Motivo (se não coletado)"];
    ws.columns = [
      { width: 8 },
      { width: 26 },
      { width: 16 },
      { width: 18 },
      { width: 34 },
    ];
    tituloAba(ws, "Coleta e histologia", cabec.length);
    ws.addRow([]);
    estilizarCabecalho(ws.addRow(cabec));
    const rotuloDestino: Record<string, string> = {
      coleta: "Coleta (bioquímica)",
      histologia: "Histologia",
      nao_coletado: "Não coletado",
    };
    for (const r of seedadosOrdenados) {
      for (const t of r.tecidos) {
        ws.addRow([
          Number(r.rato),
          grupoPorRato.get(r.rato) ?? "",
          rotuloOrgao(t.tecido),
          rotuloDestino[t.destino] ?? t.destino,
          t.motivo ?? "",
        ]);
      }
    }
    ws.views = [{ state: "frozen", ySplit: 3 }];
    estilizarDados(ws, 4);
  }

  // ---------------- Aba 4 e 5: Alíquotas (só se bioquímica) ----------------
  if (temBio) {
    const ws = wb.addWorksheet("Alíquotas (peso-tampão)");
    const cabec = ["Nº", "Grupo", "Órgão/tecido", "Peso (g)", "Tampão (µL)", "Confirmado"];
    ws.columns = [
      { width: 8 },
      { width: 26 },
      { width: 18 },
      { width: 12 },
      { width: 14 },
      { width: 12 },
    ];
    tituloAba(ws, "Alíquotas — peso → tampão (homogenato 10%)", cabec.length);
    ws.addRow([]);
    estilizarCabecalho(ws.addRow(cabec));
    for (const r of seedadosOrdenados) {
      for (const a of r.aliquotas) {
        ws.addRow([
          Number(r.rato),
          grupoPorRato.get(r.rato) ?? "",
          rotuloOrgao(a.tecido),
          a.pesoG ?? "",
          a.volumeUl ?? "",
          a.confirmado ? "Sim" : "Não",
        ]);
      }
    }
    ws.views = [{ state: "frozen", ySplit: 3 }];
    estilizarDados(ws, 4);

    const ws2 = wb.addWorksheet("Alíquotas por categoria");
    const cabec2 = ["Nº", "Grupo", "Órgão/tecido", "Categoria", "Volume (µL)", "Confirmado"];
    ws2.columns = [
      { width: 8 },
      { width: 26 },
      { width: 18 },
      { width: 22 },
      { width: 14 },
      { width: 12 },
    ];
    tituloAba(ws2, "Alíquotas — ependorfs por categoria de teste", cabec2.length);
    ws2.addRow([]);
    estilizarCabecalho(ws2.addRow(cabec2));
    for (const r of seedadosOrdenados) {
      for (const c of r.categoriasAliquota) {
        ws2.addRow([
          Number(r.rato),
          grupoPorRato.get(r.rato) ?? "",
          rotuloOrgao(c.tecido),
          ROTULO_CATEGORIA[c.categoria as CategoriaAliquota] ?? c.categoria,
          c.volumeUl ?? "",
          c.confirmado ? "Sim" : "Não",
        ]);
      }
    }
    ws2.views = [{ state: "frozen", ySplit: 3 }];
    estilizarDados(ws2, 4);
  }

  // ---------------- Aba: Comportamental (só se habilitado) ----------------
  if (temComp) {
    const ws = wb.addWorksheet("Comportamental");
    const cabec = [
      "Nº",
      "Grupo",
      "CA quadrados",
      "CA urinas",
      "CA fezes",
      "CA imobilidade (s)",
      "CA atividade (s)",
      "CA conf.",
      "NF imobilidade (s)",
      "NF conf.",
    ];
    ws.columns = [
      { width: 8 },
      { width: 26 },
      { width: 13 },
      { width: 11 },
      { width: 11 },
      { width: 17 },
      { width: 16 },
      { width: 10 },
      { width: 17 },
      { width: 10 },
    ];
    tituloAba(ws, "Testes comportamentais (6 min cada)", cabec.length);
    ws.addRow([]);
    estilizarCabecalho(ws.addRow(cabec));
    for (const r of ordenadosPorNumero) {
      const c = compPorRato.get(String(r.numero));
      const atividade =
        c?.ca_imobilidade_s != null
          ? Math.max(0, DURACAO_COMPORTAMENTAL_S - c.ca_imobilidade_s)
          : "";
      ws.addRow([
        r.numero,
        r.grupoNome,
        c?.ca_quadrados ?? "",
        c?.ca_urinas ?? "",
        c?.ca_fezes ?? "",
        c?.ca_imobilidade_s ?? "",
        atividade,
        c ? (c.ca_confirmado ? "Sim" : "Não") : "",
        c?.nf_imobilidade_s ?? "",
        c ? (c.nf_confirmado ? "Sim" : "Não") : "",
      ]);
    }
    ws.views = [{ state: "frozen", ySplit: 3 }];
    estilizarDados(ws, 4);
  }

  // ---------------- Aba: Funções do dia ----------------
  {
    const ws = wb.addWorksheet("Funções do dia");
    const cabec = ["Função", "Pessoas"];
    ws.columns = [{ width: 40 }, { width: 50 }];
    tituloAba(ws, "Funções designadas", cabec.length);
    ws.addRow([]);
    estilizarCabecalho(ws.addRow(cabec));
    const porFuncao = new Map<string, string[]>();
    for (const f of funcoes ?? []) {
      const nome = f.profiles?.nome ?? "—";
      const arr = porFuncao.get(f.funcao) ?? [];
      arr.push(nome);
      porFuncao.set(f.funcao, arr);
    }
    for (const [funcao, pessoas] of porFuncao) {
      ws.addRow([rotuloFuncao(funcao), pessoas.join(", ")]);
    }
    ws.views = [{ state: "frozen", ySplit: 3 }];
    estilizarDados(ws, 4);
  }

  const buffer = await wb.xlsx.writeBuffer();
  const nomeArq = `sacrificio-${(projeto?.nome ?? "projeto")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase()
    .slice(0, 40)}-leva${sacrificio.leva ?? ""}.xlsx`;

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${nomeArq}"`,
      "Cache-Control": "no-store",
    },
  });
}
