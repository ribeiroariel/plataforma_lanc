"use client";

export default function BotaoImprimir() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded border border-signal px-3 py-1.5 text-sm text-signal transition-colors hover:bg-signal hover:text-paper"
    >
      Imprimir / Salvar PDF
    </button>
  );
}
