import CalculadoraReagentes from "./CalculadoraReagentes";
import CalculadoraReagentesDia from "./CalculadoraReagentesDia";

export const metadata = {
  title: "Reagentes e calculadora — LANC",
};

export default function PaginaReagentes() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <p className="font-mono text-xs font-medium uppercase tracking-[0.14em] text-signal">
        Preparo e cálculo
      </p>
      <h1 className="mt-1 font-display text-3xl leading-tight text-ink">
        Reagentes e calculadora
      </h1>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-soft">
        Calcule quanto preparar dos reagentes do dia (por ensaio e nº de amostras)
        e escale os tampões e soluções de estoque para o volume que precisar. As
        receitas vêm do manual do laboratório — sempre confira antes de pesar.
      </p>

      <section className="mt-8">
        <div className="mb-3 flex items-baseline gap-3">
          <h2 className="font-display text-xl text-ink">Reagentes do dia</h2>
          <span className="font-mono text-[11px] uppercase tracking-wide text-ink-soft">
            por ensaio · nº de amostras · recipiente
          </span>
        </div>
        <p className="mb-4 max-w-2xl text-xs leading-relaxed text-ink-soft">
          Preparados na hora do experimento. Nos ensaios cuja reação acontece
          dentro da cubeta/poço (catalase, SOD, ácido ascórbico, H₂O₂), escolha o
          recipiente para ajustar o volume; nos demais, o volume é fixo.
        </p>
        <CalculadoraReagentesDia />
      </section>

      <section className="mt-10">
        <div className="mb-3 flex items-baseline gap-3">
          <h2 className="font-display text-xl text-ink">
            Tampões e soluções de estoque
          </h2>
          <span className="font-mono text-[11px] uppercase tracking-wide text-ink-soft">
            por volume final
          </span>
        </div>
        <p className="mb-4 max-w-2xl text-xs leading-relaxed text-ink-soft">
          Soluções que ficam prontas na geladeira/bancada. Escolha a solução e o
          volume final que quer preparar — as quantidades escalam por regra de três.
        </p>
        <CalculadoraReagentes />
      </section>
    </main>
  );
}
