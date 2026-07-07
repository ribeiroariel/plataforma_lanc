import Link from "next/link";
import { getUsuarioAtual } from "@/lib/supabase/profile";

export default async function AreaBolsista() {
  const usuario = await getUsuarioAtual();

  if (usuario && !usuario.aprovado) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-10">
        <h1 className="text-2xl font-semibold">Olá, {usuario.nome}</h1>
        <p className="mt-2 text-black/70 dark:text-white/70">
          Seu cadastro está aguardando aprovação da coordenação do
          laboratório. Assim que for liberado, esta página passa a mostrar
          sua área normalmente.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-2xl font-semibold">Olá, {usuario?.nome}</h1>
      <p className="mt-2 mb-6 text-black/70 dark:text-white/70">
        Sistema de projetos/TCC ainda em construção. Por enquanto:
      </p>
      <Link
        href="/bolsista/testes"
        className="inline-block rounded bg-black px-4 py-2 text-white dark:bg-white dark:text-black"
      >
        Ver protocolos de testes bioquímicos
      </Link>
    </main>
  );
}
