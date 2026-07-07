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
      <p className="mt-2 text-black/70 dark:text-white/70">
        Área do bolsista em construção — aqui vão entrar os testes
        bioquímicos (com o passo a passo do manual), a calculadora de curva
        de Lowry e os projetos.
      </p>
    </main>
  );
}
