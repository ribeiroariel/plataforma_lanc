// Classes Tailwind reaproveitadas nos formulários e botões do site, pra
// manter a aparência consistente entre páginas de servidor e de cliente
// (por isso são strings, não componentes — evita fronteira server/client).
//
// O foco de teclado (anel absorbance) é aplicado globalmente em globals.css
// via :focus-visible — por isso nenhum estilo aqui usa focus:outline-none, que
// mataria esse anel. Os inputs mantêm só a mudança de cor da borda no foco.

export const INPUT =
  "rounded border border-rule bg-paper-raised px-3 py-2 text-ink transition-colors focus:border-absorbance";

export const INPUT_SM =
  "rounded border border-rule bg-paper-raised px-2 py-1 text-sm text-ink transition-colors focus:border-absorbance";

export const BOTAO_PRIMARIO =
  "inline-flex items-center justify-center gap-1.5 rounded bg-signal px-4 py-2 font-medium text-white transition hover:brightness-110 active:brightness-95 disabled:cursor-not-allowed disabled:opacity-50";

export const BOTAO_SECUNDARIO =
  "inline-flex items-center justify-center gap-1.5 rounded border border-rule px-4 py-2 text-ink transition-colors hover:border-absorbance hover:text-absorbance disabled:cursor-not-allowed disabled:opacity-50";

export const BOTAO_SECUNDARIO_SM =
  "inline-flex items-center justify-center gap-1.5 rounded border border-rule px-3 py-1 text-sm text-ink transition-colors hover:border-absorbance hover:text-absorbance disabled:cursor-not-allowed disabled:opacity-50";

export const CARD = "rounded border border-rule bg-paper-raised";
