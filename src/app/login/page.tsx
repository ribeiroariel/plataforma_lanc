"use client";

import { useActionState } from "react";
import Link from "next/link";
import { login } from "@/lib/actions/auth";
import { CampoSenha } from "@/components/auth/CampoSenha";

export default function PaginaLogin() {
  const [estado, formAction, pendente] = useActionState(login, undefined);

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-sm flex-col justify-center px-4 py-16">
      <p className="font-mono text-xs uppercase tracking-[0.14em] text-ink-soft">
        Acesso restrito
      </p>
      <h1 className="mt-1 font-display text-3xl text-ink">Entrar</h1>

      <form action={formAction} className="mt-8 flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm text-ink">
          E-mail
          <input
            type="email"
            name="email"
            required
            className="rounded border border-rule bg-paper-raised px-3 py-2 text-ink focus:border-absorbance focus:outline-none"
          />
        </label>

        <CampoSenha name="senha" label="Senha" />

        {estado?.erro && (
          <p className="text-sm text-alerta" role="alert">
            {estado.erro}
          </p>
        )}

        <button
          type="submit"
          disabled={pendente}
          className="mt-2 rounded bg-absorbance px-4 py-2 text-paper hover:bg-ink disabled:opacity-50"
        >
          {pendente ? "Entrando..." : "Entrar"}
        </button>
      </form>

      <p className="mt-8 text-sm text-ink-soft">
        Ainda não tem conta?{" "}
        <Link href="/cadastro" className="border-b border-absorbance text-absorbance hover:border-ink hover:text-ink">
          Cadastre-se
        </Link>
      </p>
    </main>
  );
}
