import { getUsuarioAtual } from "@/lib/supabase/profile";

export default async function PainelOrientadora() {
  const usuario = await getUsuarioAtual();

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-2xl font-semibold">Olá, {usuario?.nome}</h1>
      <p className="mt-2 text-black/70 dark:text-white/70">
        Painel da orientadora em construção — aqui vai entrar o
        acompanhamento de todos os bolsistas: quem está fazendo o quê, testes
        já feitos e pendentes por projeto.
      </p>
    </main>
  );
}
