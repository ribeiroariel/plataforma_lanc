"use client";

import { Suspense, useActionState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { login } from "@/lib/actions/auth";
import { CampoSenha } from "@/components/auth/CampoSenha";
import { INPUT, BOTAO_PRIMARIO } from "@/lib/estilos";

function Aviso() {
  const params = useSearchParams();
  let texto: string | null = null;
  if (params.get("cadastro") === "ok") {
    texto =
      "Conta criada. Confirme seu e-mail (verifique a caixa de entrada e o spam) para poder entrar.";
  } else if (params.get("senha") === "ok") {
    texto = "Senha alterada. Entre com a nova senha.";
  } else if (params.get("erro") === "link") {
    texto = "O link expirou ou é inválido. Tente novamente.";
  }
  if (!texto) return null;
  return (
    <p className="mb-4 rounded border border-rule bg-paper-raised px-3 py-2 text-sm text-ink">
      {texto}
    </p>
  );
}

export default function PaginaLogin() {
  const [estado, formAction, pendente] = useActionState(login, undefined);

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-sm flex-col justify-center px-4 py-16">
      <p className="font-mono text-xs uppercase tracking-[0.14em] text-ink-soft">
        Acesso restrito
      </p>
      <h1 className="mt-1 font-display text-3xl text-ink">Entrar</h1>

      <div className="mt-8">
        <Suspense fallback={null}>
          <Aviso />
        </Suspense>

        <form action={formAction} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm text-ink">
            E-mail
            <input type="email" name="email" required className={INPUT} />
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
            className={`mt-2 text-sm ${BOTAO_PRIMARIO}`}
          >
            {pendente ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </div>

      <div className="mt-6 flex flex-col gap-2 text-sm">
        <Link href="/recuperar-senha" className="text-signal hover:text-ink">
          Esqueci a senha
        </Link>
        <p className="text-ink-soft">
          Ainda não tem conta?{" "}
          <Link href="/cadastro" className="text-signal hover:text-ink">
            Cadastre-se
          </Link>
        </p>
      </div>
    </main>
  );
}
