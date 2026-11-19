import Link from "next/link";
import type { MeuTeste } from "@/lib/meusTestes";
import { Badge } from "@/components/ui/Badge";

// Cartão de um teste designado, com a barra de progresso dos ratos
// confirmados — o mesmo em "Início" e "Meus testes".
export function CartaoTeste({ t, destaque = false }: { t: MeuTeste; destaque?: boolean }) {
  const pct = t.total > 0 ? Math.round((t.confirmados / t.total) * 100) : 0;
  const acao =
    t.papel === "responsavel" && !t.encerrado
      ? t.confirmados > 0
        ? "Continuar registro"
        : "Começar"
      : "Ver";
  return (
    <Link
      href={`/projetos/${t.projetoId}/testes/${t.id}`}
      className={`group flex flex-col rounded-lg border bg-paper-raised p-4 transition-colors ${
        destaque ? "border-signal/50" : "border-rule hover:border-absorbance"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-signal font-medium">
            {t.tecido}
            {t.leva ? ` · Leva ${t.leva}` : ""}
          </p>
          <p className="mt-0.5 font-medium leading-snug text-ink">{t.titulo}</p>
          <p className="mt-0.5 truncate text-xs text-ink-soft">{t.projetoNome}</p>
        </div>
        {t.encerrado ? (
          <Badge tom="neutro">encerrado</Badge>
        ) : t.papel === "ajudante" ? (
          <Badge tom="neutro">ajudante</Badge>
        ) : t.status === "concluido" ? (
          <Badge tom="sucesso">concluído</Badge>
        ) : null}
      </div>
      <div className="mt-3 flex items-center gap-2">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-rule">
          <div
            className={`h-full rounded-full ${pct >= 100 ? "bg-sucesso" : "bg-absorbance"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="font-mono text-[11px] text-ink-soft">
          {t.confirmados}/{t.total}
        </span>
      </div>
      <span className="mt-3 inline-flex items-center gap-1 font-mono text-[11px] text-absorbance">
        {acao}
      </span>
    </Link>
  );
}
