"use client";

import { useActionState } from "react";
import Link from "next/link";
import { enviarRecuperacao } from "@/lib/actions/auth";
import { INPUT, BOTAO_PRIMARIO } from "@/lib/estilos";

export default function RecuperarSenha() {
  const [estado, formAction, pendente] = useActionState(
    enviarRecuperacao,
    undefined
  );

  const enviado = estado && "enviado" in estado;

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-sm flex-col justify-center px-4 py-16">
      <p className="font-mono text-xs uppercase tracking-[0.14em] text-ink-soft">
        Recuperar acesso
      </p>
      <h1 className="mt-1 font-display text-3xl text-ink">Esqueci a senha</h1>

      {enviado ? (
        <p className="mt-6 rounded border border-rule bg-paper-raised p-4 text-sm leading-relaxed text-ink-soft">
          Se houver uma conta com esse e-mail, enviamos um link para redefinir
          a senha. Verifique sua caixa de entrada (e o spam).
        </p>
      ) : (
        <>
          <p className="mt-2 text-sm text-ink-soft">
            Informe seu e-mail e enviaremos um link para criar uma nova senha.
          </p>
          <form action={formAction} className="mt-6 flex flex-col gap-4">
            <label className="flex flex-col gap-1 text-sm text-ink">
              E-mail
              <input type="email" name="email" required className={INPUT} />
            </label>
            {estado && "erro" in estado && (
              <p className="text-sm text-alerta" role="alert">
                {estado.erro}
              </p>
            )}
            <button
              type="submit"
              disabled={pendente}
              className={`text-sm ${BOTAO_PRIMARIO}`}
            >
              {pendente ? "Enviando..." : "Enviar link de recuperação"}
            </button>
          </form>
        </>
      )}

      <p className="mt-8 text-sm text-ink-soft">
        <Link href="/login" className="text-signal hover:text-ink">
          ← Voltar para o login
        </Link>
      </p>
    </main>
  );
}
