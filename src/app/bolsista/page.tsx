import Link from "next/link";
import { getUsuarioAtual } from "@/lib/supabase/profile";

export default async function AreaBolsista() {
  const usuario = await getUsuarioAtual();

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-2xl font-semibold">Olá, {usuario?.nome}</h1>
      <p className="mt-2 mb-6 text-black/70 dark:text-white/70">
        Escolha o que você quer fazer:
      </p>
      <div className="flex gap-4">
        <Link
          href="/testes"
          className="inline-block rounded bg-black px-4 py-2 text-white dark:bg-white dark:text-black"
        >
          Protocolos de testes bioquímicos
        </Link>
        <Link
          href="/projetos"
          className="inline-block rounded border border-black/20 px-4 py-2 dark:border-white/20"
        >
          Meus projetos
        </Link>
      </div>
    </main>
  );
}
