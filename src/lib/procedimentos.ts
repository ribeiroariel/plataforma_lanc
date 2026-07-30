// Checklist do procedimento de cada ensaio, transcrito passo a passo do Manual
// LANC revisado (seção PROCEDIMENTO). Cada passo é uma ação verificável na
// bancada, com um check que grava em projeto_teste_passos (feito/por/quando).
//
// `id` é ESTÁVEL — é a chave do estado no banco. Nunca renumerar um id já usado
// (mudaria o significado de marcações já gravadas); para reordenar, mude a
// posição no array mantendo o id. `critico` destaca passos de segurança ou de
// controle de qualidade.
//
// Os volumes citados são os do formato de leitura maior (cubeta); os volumes
// reais por recipiente vêm da calculadora de reagentes acima na mesma aba.
//
// PILOTO: por ora só carboniladas está catalogado (o ensaio mais longo), para
// validar o formato/nível de detalhe antes de transcrever os demais.

export type PassoProcedimento = {
  id: string;
  texto: string;
  obs?: string;
  critico?: boolean;
};

const PROCEDIMENTOS: { prefixos: string[]; passos: PassoProcedimento[] }[] = [
  {
    prefixos: ["carboniladas"],
    passos: [
      {
        id: "carbonil-qc-dnph",
        texto:
          "Conferir o DNPH recém-preparado: deve estar amarelo claro. Precipitado ou coloração alaranjada = degradado → descartar e preparar novo lote.",
        critico: true,
        obs: "DNPH é fotossensível e mutagênico — pesar e pipetar no escuro, na capela, com EPI.",
      },
      {
        id: "carbonil-pipeta-amostra",
        texto:
          "Em eppendorfs, pipetar 200 µL de sobrenadante por amostra (amostra e branco da amostra).",
      },
      {
        id: "carbonil-dnph-hcl",
        texto:
          "Na amostra: adicionar 400 µL de DNPH 10 mM. No branco: adicionar 400 µL de HCl 2 M (no lugar do DNPH).",
        critico: true,
        obs: "Pipetar o DNPH sempre no escuro. Volume conforme o recipiente (ver calculadora acima).",
      },
      {
        id: "carbonil-incuba-1h",
        texto:
          "Vortexar e manter no escuro por 1 hora, vortexando a cada 15 minutos (5 vezes).",
      },
      {
        id: "carbonil-tca",
        texto: "Adicionar 500 µL de TCA 20%. Vortexar.",
      },
      {
        id: "carbonil-centrifuga-1",
        texto:
          "Centrifugar a 1.400 rpm por 3 minutos. Descartar o sobrenadante (fica o pellet).",
      },
      {
        id: "carbonil-lavagem-1",
        texto:
          "Ressuspender o pellet em 500 µL de etanol P.A. + 500 µL de acetato de etila.",
        obs: "Etanol e acetato de etila são inflamáveis — na capela, com EPI.",
      },
      {
        id: "carbonil-centrifuga-lavagem",
        texto:
          "Vortexar e centrifugar a 1.400 rpm por 3 minutos. Descartar o sobrenadante.",
      },
      {
        id: "carbonil-lavagens-repete",
        texto:
          "Repetir a lavagem (etanol + acetato + centrifugação) mais 2 vezes — 3 lavagens no total.",
      },
      {
        id: "carbonil-guanidina",
        texto:
          "Ressuspender o pellet em 600 µL de guanidina 6 M. Vortexar. Incubar a 60 °C por 15 minutos.",
      },
      {
        id: "carbonil-centrifuga-final",
        texto: "Centrifugar a 1.400 rpm por 3 minutos.",
      },
      {
        id: "carbonil-leitura",
        texto:
          "Leitura a 370 nm: zerar com HCl 2 M e ler o branco primeiro. No TECAN, pipetar em microplaca UV-Star de 96 poços.",
        critico: true,
        obs: "O branco da amostra (sem DNPH) deve ficar ≤ 0,050 Abs; acima disso, revisar o procedimento.",
      },
      {
        id: "carbonil-descarte",
        texto:
          "Descarte: material com DNPH na bombona CARBONILADAS-DNPH (FURB 40255); a fração etanol + acetato de etila na bombona SOLVENTES-NÃO-HALOGENADOS (FURB 40259).",
      },
    ],
  },
];

/** Passos do procedimento deste ensaio, ou null se ainda não catalogado. */
export function procedimentoDoSlug(slug: string): PassoProcedimento[] | null {
  return (
    PROCEDIMENTOS.find((p) => p.prefixos.some((pref) => slug.startsWith(pref)))
      ?.passos ?? null
  );
}
