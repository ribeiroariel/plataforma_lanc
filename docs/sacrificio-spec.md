# Aba "Sacrifício" — especificação (rascunho)

> Ferramenta viva para o dia de sacrifício de um projeto: planejar funções,
> conduzir os animais pela pipeline sem se perder, registrar sobrevivência/
> exclusões, dissecações por rato, destino histológico, justificativa de
> amostras não coletadas, e uma sub-aba de alíquotas (peso → tampão) no mesmo
> padrão célula→confirma→trava dos resultados.
>
> Status: rascunho para alinhamento. Nada implementado ainda. As **perguntas
> em aberto** no fim precisam de resposta antes do schema fechar.

## 1. Papéis e acesso

- **Donos do projeto (coautores)** organizam: criam o sacrifício, definem data/
  duração e designam funções. Mesmo padrão de permissão de `projeto_membros`.
- **Registro ao vivo:** no dia, uma pessoa fica com o site aberto controlando
  a contagem e as dissecações. *A definir:* qualquer membro do projeto pode
  registrar, ou só um "operador" designado? (ver Q6)
- **Orientadora:** vê tudo (só leitura), como nos resultados.
- RLS `force` em todas as tabelas novas, reusando os helpers existentes
  (`eh_membro_projeto`, `eh_coautor_projeto`, `is_orientador`).

## 2. Estrutura de dados (proposta)

### `sacrificios` — um "dia de sacrifício" por leva do projeto
| coluna | tipo | nota |
|---|---|---|
| id | uuid PK | |
| projeto_id | uuid FK projetos | |
| leva | int null | qual leva (projetos têm várias) |
| data | date | dia previsto |
| duracao_estimada_min | int null | duração aproximada |
| status | text | `planejado` / `em_andamento` / `concluido` |
| criado_por | uuid FK profiles | |

### `sacrificio_funcoes` — designação de funções do dia
| coluna | tipo | nota |
|---|---|---|
| id | uuid PK | |
| sacrificio_id | uuid FK | |
| funcao | text | enum (ver §4) |
| profile_id | uuid FK profiles | 1 linha por pessoa/função; N pessoas por função |

### `sacrificio_ratos` — um registro por animal daquele sacrifício
| coluna | tipo | nota |
|---|---|---|
| id | uuid PK | |
| sacrificio_id | uuid FK | |
| rato | text | número do rato (mesmo esquema do roster) |
| grupo_id | uuid FK projeto_grupos | |
| caixa | text | rótulo da caixa etiquetada |
| ordem | int | sequência de morte ("1º da caixa 1"…) |
| sobreviveu | bool | false = excluído do sacrifício |
| exclusao_motivo | text null | obrigatório se `sobreviveu=false` |
| destino | text | `bioquimica` / `histologia` / `ambos` |
| status | text | `pendente` / `dissecado` |

### `sacrificio_rato_tecidos` — destino de cada órgão por rato
| coluna | tipo | nota |
|---|---|---|
| id | uuid PK | |
| sacrificio_rato_id | uuid FK | |
| tecido | text | órgão (lista do §3) |
| destino | text | **exclusivo**: `coleta` (bioquímica) / `histologia` / `nao_coletado` |
| nao_coletado_motivo | text null | justificativa (crítico p/ sangue) |
| — | — | unique (sacrificio_rato_id, tecido) |

Um órgão nunca é coleta **e** histologia ao mesmo tempo — `destino` substitui os
antigos flags independentes `coletado`/`para_histologia`.

### `sacrificio_aliquotas` — peso → tampão (padrão célula→confirma→trava)
| coluna | tipo | nota |
|---|---|---|
| id | uuid PK | |
| sacrificio_rato_id | uuid FK | |
| tecido | text | |
| peso_g | numeric | em gramas; confirmado e imutável (trigger) |
| volume_tampao_ul | numeric | calculado a partir do peso (ver Q3) |
| confirmado | bool | trava peso e volume |

Reusa a mesma ideia do trigger `travar_resultado_confirmado`: peso confirmado
não muda mais, e o volume de tampão fecha junto.

**Fórmula do tampão (igual para todos os tecidos):** homogenato **10% (1:9)** →
`volume_tampao_ul = peso_g × 9000` (ex.: 1 g → 9000 µL = 9 mL de tampão). Peso
digitado em **gramas**.

## 3. Tecidos/órgãos da dissecação (mais granular que os tecidos de análise)

Análise usa `Tecido` = {cortex-rins, eritrocitos-plasma, figado, geral}. A
dissecação é por **órgão**: fígado, rim, pâncreas, cérebro → (córtex + hipocampo),
sangue → (plasma + eritrócito). Ex.: pâncreas pode ir só pra histologia (sem
teste bioquímico). *Precisa de uma lista canônica de órgãos* (ver Q5).

## 4. Funções do dia (enum, com mínimo de pessoas)

- `decapitacao` / `deslocamento_cervical` (camundongo) — **mín. 2 pessoas** (ambas)
- `dissecacao_figado`, `dissecacao_rim`, `dissecacao_pancreas`
- `dissecacao_cerebro` → subdividido: `dissecacao_cortex`, `separacao_cortex_hipocampo`
- `homogeneizacao`
- `separacao_sangue` (centrifugação → plasma/eritrócito)
- `organizacao_geral` (limpeza de tubos/caixas, ordenamento do lab)

Todas ≥1 pessoa, exceto decapitação (≥2). Uma pessoa pode ter várias funções.

## 5. Fluxo da tela (dia do sacrifício)

1. **Planejar** (antes): coautor cria o sacrifício (leva, data, duração) e
   designa funções às pessoas.
2. **Sobrevivência**: lista todos os ratos da leva; marca os que sobreviveram;
   os excluídos pedem justificativa. Gera a fila de animais a sacrificar.
3. **Contagem ao vivo**: por caixa, na ordem — mostra "próximo: rato X da caixa
   Y (nº Z da sequência)". Ao concluir um rato, marca os tecidos dissecados
   (fecha o rato) e, se for o caso, o destino histológico.
4. **Coleta**: por rato, marca tecido coletado / não coletado + justificativa.
5. **Alíquotas**: registra o peso da amostra → o site calcula o tampão; confirma
   (trava peso e volume) e mostra o volume pronto pra homogeneizar.

## 6. Reaproveitamento

- Padrão célula→confirma→trava (alíquotas) = mesma ideia já feita em
  `RegistroResultado` + trigger.
- Designação de funções = espelho do `FormularioTeste`/`projeto_teste_ajudantes`.
- Roster de ratos = `gerarRoster` já existe (`lib/roster.ts`).

## Decisões (2026-07-10)

1. **Caixas:** rótulo digitado **ao vivo** na contagem (não há cadastro prévio) —
   as caixas mudam no dia (ratos brigam / precisam ser separados). Campo `caixa`
   é texto livre preenchido na hora.
2. **Um sacrifício por leva.** ✔
3. **Tampão:** homogenato 10% (1:9), **igual para todos os tecidos** →
   `volume_tampao_ul = peso_g × 9000` (peso em gramas). ✔
4. **Histologia:** marcada **por órgão** (não o rato inteiro). ✔
5. **Órgãos dissecáveis:** fígado, rim, pâncreas, córtex, hipocampo, sangue
   (plasma/eritrócito) — lista fechada.
6. **Registro ao vivo:** feito na conta do **responsável** (dono do projeto que
   fica com o site aberto), mas qualquer pessoa presente digita nela. Ou seja,
   acesso de escrita = coautores do projeto; sem papel "operador" à parte.
7. **Funções:** lista do §4 confirmada; `deslocamento_cervical` também exige ≥2.
