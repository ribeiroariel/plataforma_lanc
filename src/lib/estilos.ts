// Classes Tailwind reaproveitadas nos formulários e botões do site, pra
// manter a aparência consistente entre páginas de servidor e de cliente
// (por isso são strings, não componentes — evita fronteira server/client).

export const INPUT =
  "rounded border border-rule bg-paper-raised px-3 py-2 text-ink focus:border-absorbance focus:outline-none";

export const INPUT_SM =
  "rounded border border-rule bg-paper-raised px-2 py-1 text-sm text-ink focus:border-absorbance focus:outline-none";

export const BOTAO_PRIMARIO =
  "rounded bg-absorbance px-4 py-2 text-paper transition-colors hover:bg-ink disabled:opacity-50";

export const BOTAO_SECUNDARIO =
  "rounded border border-rule px-4 py-2 text-ink transition-colors hover:border-absorbance disabled:opacity-50";

export const BOTAO_SECUNDARIO_SM =
  "rounded border border-rule px-3 py-1 text-sm text-ink transition-colors hover:border-absorbance disabled:opacity-50";

export const CARD = "rounded border border-rule bg-paper-raised";
