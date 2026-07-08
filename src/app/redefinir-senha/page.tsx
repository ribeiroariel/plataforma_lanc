"use client";

import { useActionState, useState } from "react";
import { definirNovaSenha } from "@/lib/actions/auth";
import { CampoSenha } from "@/components/auth/CampoSenha";
import { MedidorForcaSenha } from "@/components/auth/MedidorForcaSenha";
import { BOTAO_PRIMARIO } from "@/lib/estilos";

export default function RedefinirSenha() {
  const [estado, formAction, pendente] = useActionState(
    definirNovaSenha,
    undefined
  );
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const senhasNaoConferem = confirmarSenha.length > 0 && senha !== confirmarSenha;

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-sm flex-col justify-center px-4 py-16">
      <p className="font-mono text-xs uppercase tracking-[0.14em] text-ink-soft">
        Recuperar acesso
      </p>
      <h1 className="mt-1 font-display text-3xl text-ink">Nova senha</h1>
      <p className="mt-2 text-sm text-ink-soft">
        Escolha uma nova senha para sua conta.
      </p>

      <form action={formAction} className="mt-6 flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <CampoSenha
            name="senha"
            label="Nova senha"
            autoComplete="new-password"
            minLength={6}
            value={senha}
            onChange={setSenha}
          />
          <MedidorForcaSenha senha={senha} />
        </div>

        <div className="flex flex-col gap-1">
          <CampoSenha
            name="confirmar_senha"
            label="Confirmar nova senha"
            autoComplete="new-password"
            minLength={6}
            value={confirmarSenha}
            onChange={setConfirmarSenha}
          />
          {senhasNaoConferem && (
            <p className="text-xs text-alerta">As senhas não coincidem.</p>
          )}
        </div>

        {estado?.erro && (
          <p className="text-sm text-alerta" role="alert">
            {estado.erro}
          </p>
        )}

        <button
          type="submit"
          disabled={pendente || senhasNaoConferem}
          className={`text-sm ${BOTAO_PRIMARIO}`}
        >
          {pendente ? "Salvando..." : "Salvar nova senha"}
        </button>
      </form>
    </main>
  );
}
