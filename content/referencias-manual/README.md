# Referência: Manual do LANC

`manual-lanc-v2-extraido.txt` é um espelho em texto puro (extraído do
`.docx`, sem formatação) do manual de técnicas e testes bioquímicos do
laboratório — 2ª edição, 2026. Serve para grep rápido de protocolos,
valores de referência e critérios de controle de qualidade ao construir o
conteúdo da área de bolsistas, sem precisar reabrir o binário toda vez.

Fonte de verdade (com formatação, figuras e tabelas): os arquivos originais
em `C:\Users\supor\Downloads\Manual_LANC_v2_FINAL.pdf` e
`Manual_LANC_v2_FINAL_3.docx`. Se o Ariel enviar uma nova versão do manual,
regenerar este `.txt` (extração via `zipfile` + regex sobre `word/document.xml`,
não precisa de dependências além da stdlib) e commitar a atualização.

Estrutura do manual (para orientar o schema de conteúdo do site): cada
teste bioquímico segue o padrão Princípio → Equipamentos → Preparação das
Soluções → Procedimento → Expressão dos Resultados, organizado em 3 blocos
por tecido (córtex cerebral e rins; eritrócitos e plasma; fígado), cada
bloco com sua própria seção de "Valores de Referência — Controles". Alguns
testes têm controle de qualidade numérico explícito (ex.: curva padrão de
Lowry exige R² ≥ 0,99; controle do pirogalol no ensaio de SOD deve ficar
entre 0,030–0,070 Abs/min) — esses são os melhores candidatos a virar
ferramentas interativas na plataforma, não só texto estático.
