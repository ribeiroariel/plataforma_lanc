import Link from "next/link";

// Destino do link de confirmação de e-mail (ver emailRedirectTo em
// src/lib/actions/auth.ts). PÚBLICA de propósito: logo após confirmar o
// e-mail o bolsista ainda está com aprovado=false, então mandá-lo para
// /bolsista (rota logada, passa pelo proxy + layout) aparecia como erro
// quando a sessão recém-criada não persistia. Esta página não depende de
// sessão nem de papel, então nunca quebra.
export default function PaginaCadastroConfirmado() {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-16">
      <p className="font-mono text-xs uppercase tracking-[0.14em] text-ink-soft">
        Cadastro confirmado
      </p>
      <h1 className="mt-1 font-display text-3xl leading-tight text-ink">
        E-mail confirmado!
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-ink-soft">
        Seu e-mail foi confirmado com sucesso. Agora seu cadastro está
        aguardando aprovação da coordenação do laboratório. Assim que for
        liberado, você poderá acessar sua área de bolsista normalmente ao
        entrar.
      </p>

      <p className="mt-8 text-sm text-ink-soft">
        <Link
          href="/login"
          className="border-b border-absorbance text-absorbance hover:border-ink hover:text-ink"
        >
          Ir para o login
        </Link>
      </p>
    </main>
  );
}
