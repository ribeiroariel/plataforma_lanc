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

// Tons do site (globals.css): absorbance (azul de dados), paper-raised
// (off-white), rule (borda), ink (texto).
const ABSORB = "FF24427A";
const OFFWHITE = "FFFAF9F6";
const RULE = "FFE7E2D8";
const INK = "FF1C1A15";
const BRANCO = "FFFFFFFF";
const FONTE = "Arial";
const FONTE_TITULO = "Times New Roman";

const bordaFina = {
  top: { style: "thin" as const, color: { argb: RULE } },
  bottom: { style: "thin" as const, color: { argb: RULE } },
  left: { style: "thin" as const, color: { argb: RULE } },
  right: { style: "thin" as const, color: { argb: RULE } },
};

function rotuloOrgao(v: string): string {
  return ORGAOS_DISSECAVEIS.find((o) => o.valor === v)?.rotulo ?? v;
}

// Título na linha 1 (mesclado), fonte serifada nos tons do site.
function titulo(ws: ExcelJS.Worksheet, texto: string, nColunas: number) {
  ws.mergeCells(1, 1, 1, Math.max(1, nColunas));
  const c = ws.getCell(1, 1);
  c.value = texto;
  c.font = { name: FONTE_TITULO, bold: true, size: 14, color: { argb: ABSORB } };
  c.alignment = { vertical: "middle", wrapText: true };
  ws.getRow(1).height = 26;
}

// Aplica, na faixa de dados de uma tabela (título=1, branco=2, cabeçalho=3,
// dados=4+): fonte, bordas em TODAS as células, quebra de linha, cabeçalho
// azul com texto branco e zebra nas linhas de dados.
function estilizarTabela(ws: ExcelJS.Worksheet) {
  const HEADER = 3;
  const PRIMEIRA_DADOS = 4;
  for (let i = HEADER; i <= ws.rowCount; i++) {
    const row = ws.getRow(i);
    row.eachCell((cell) => {
      cell.font = { name: FONTE, size: 10, color: { argb: INK } };
      cell.alignment = { vertical: "middle", wrapText: true };
      cell.border = bordaFina;
    });
    if (i === HEADER) {
      row.eachCell((cell) => {
        cell.font = { name: FONTE, size: 11, bold: true, color: { argb: BRANCO } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ABSORB } };
      });
      row.height = 22;
    } else {
      const par = (i - PRIMEIRA_DADOS) % 2 === 1;
      if (par) {
        row.eachCell((cell) => {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: OFFWHITE },
          };
        });
      }
    }
  }
  ws.views = [{ state: "frozen", ySplit: HEADER }];
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
    ws.columns = [{ width: 30 }, { width: 64 }];
    titulo(ws, "Sacrifício — resumo", 2);
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
      ["Dissecados", ratos.filter((r) => r.status === "dissecado").length],
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
    for (const [k, v] of linhas) ws.addRow([k, v]);
    // Estilo: fonte + bordas + wrap; 1ª coluna em destaque (azul, negrito).
    for (let i = 3; i <= ws.rowCount; i++) {
      const row = ws.getRow(i);
      row.eachCell((cell) => {
        cell.font = { name: FONTE, size: 10, color: { argb: INK } };
        cell.alignment = { vertical: "middle", wrapText: true };
        cell.border = bordaFina;
      });
      row.getCell(1).font = {
        name: FONTE,
        size: 10,
        bold: true,
        color: { argb: ABSORB },
      };
      row.getCell(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: OFFWHITE },
      };
    }
  }

  // ---------------- Aba 2: Ratos ----------------
  {
    const ws = wb.addWorksheet("Ratos");
    const cabec = ["Nº", "Grupo", "Caixa", "Sobreviveu", "Motivo exclusão", "Status"];
    ws.columns = [
      { width: 8 },
      { width: 28 },
      { width: 10 },
      { width: 12 },
      { width: 32 },
      { width: 12 },
    ];
    titulo(ws, "Ratos", cabec.length);
    ws.addRow([]);
    ws.addRow(cabec);
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
    estilizarTabela(ws);
  }

  // ---------------- Aba 3: Coleta ----------------
  {
    const ws = wb.addWorksheet("Coleta");
    const cabec = ["Nº", "Grupo", "Órgão", "Destino", "Motivo (se não coletado)"];
    ws.columns = [
      { width: 8 },
      { width: 28 },
      { width: 16 },
      { width: 20 },
      { width: 36 },
    ];
    titulo(ws, "Coleta e histologia", cabec.length);
    ws.addRow([]);
    ws.addRow(cabec);
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
    estilizarTabela(ws);
  }

  // ---------------- Abas 4 e 5: Alíquotas (só se bioquímica) ----------------
  if (temBio) {
    const ws = wb.addWorksheet("Alíquotas (peso-tampão)");
    const cabec = ["Nº", "Grupo", "Órgão/tecido", "Peso (g)", "Tampão (µL)", "Confirmado"];
    ws.columns = [
      { width: 8 },
      { width: 28 },
      { width: 18 },
      { width: 12 },
      { width: 14 },
      { width: 12 },
    ];
    titulo(ws, "Alíquotas — peso → tampão (homogenato 10%)", cabec.length);
    ws.addRow([]);
    ws.addRow(cabec);
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
    estilizarTabela(ws);

    const ws2 = wb.addWorksheet("Alíquotas por categoria");
    const cabec2 = ["Nº", "Grupo", "Órgão/tecido", "Categoria", "Volume (µL)", "Confirmado"];
    ws2.columns = [
      { width: 8 },
      { width: 28 },
      { width: 18 },
      { width: 24 },
      { width: 14 },
      { width: 12 },
    ];
    titulo(ws2, "Alíquotas — ependorfs por categoria de teste", cabec2.length);
    ws2.addRow([]);
    ws2.addRow(cabec2);
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
    estilizarTabela(ws2);
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
      { width: 28 },
      { width: 12 },
      { width: 10 },
      { width: 10 },
      { width: 15 },
      { width: 14 },
      { width: 9 },
      { width: 15 },
      { width: 9 },
    ];
    titulo(ws, "Testes comportamentais (6 min cada)", cabec.length);
    ws.addRow([]);
    ws.addRow(cabec);
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
    estilizarTabela(ws);
  }

  // ---------------- Aba: Funções do dia ----------------
  {
    const ws = wb.addWorksheet("Funções do dia");
    const cabec = ["Função", "Pessoas"];
    ws.columns = [{ width: 42 }, { width: 52 }];
    titulo(ws, "Funções designadas", cabec.length);
    ws.addRow([]);
    ws.addRow(cabec);
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
    estilizarTabela(ws);
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
