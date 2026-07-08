import Link from "next/link";
import { CadastroForm } from "./CadastroForm";

export default function PaginaCadastro() {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-sm flex-col justify-center px-4 py-16">
      <p className="font-mono text-xs uppercase tracking-[0.14em] text-ink-soft">
        Junte-se ao laboratório
      </p>
      <h1 className="mt-1 font-display text-3xl text-ink">
        Cadastro de bolsista
      </h1>
      <p className="mt-2 text-sm text-ink-soft">
        Seu acesso fica pendente até a coordenação aprovar o cadastro.
      </p>

      <CadastroForm />

      <p className="mt-8 text-sm text-ink-soft">
        Já tem conta?{" "}
        <Link href="/login" className="border-b border-absorbance text-absorbance hover:border-ink hover:text-ink">
          Entrar
        </Link>
      </p>
    </main>
  );
}
