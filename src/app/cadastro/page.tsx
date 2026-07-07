"use client";

import { useActionState } from "react";
import Link from "next/link";
import { cadastrar } from "@/lib/actions/auth";

export default function PaginaCadastro() {
  const [estado, formAction, pendente] = useActionState(cadastrar, undefined);

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-sm flex-col justify-center gap-6 px-4">
      <h1 className="text-2xl font-semibold">Cadastro de bolsista</h1>

      <form action={formAction} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          Nome
          <input
            type="text"
            name="nome"
            required
            className="rounded border border-black/15 px-3 py-2 dark:border-white/20"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          E-mail
          <input
            type="email"
            name="email"
            required
            className="rounded border border-black/15 px-3 py-2 dark:border-white/20"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Senha
          <input
            type="password"
            name="senha"
            required
            minLength={6}
            className="rounded border border-black/15 px-3 py-2 dark:border-white/20"
          />
        </label>

        {estado?.erro && (
          <p className="text-sm text-red-600" role="alert">
            {estado.erro}
          </p>
        )}

        <button
          type="submit"
          disabled={pendente}
          className="rounded bg-black px-4 py-2 text-white disabled:opacity-50 dark:bg-white dark:text-black"
        >
          {pendente ? "Criando conta..." : "Criar conta"}
        </button>
      </form>

      <p className="text-sm">
        Já tem conta?{" "}
        <Link href="/login" className="underline">
          Entrar
        </Link>
      </p>
    </main>
  );
}
