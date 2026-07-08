"use client";

import { useActionState, useState } from "react";
import { cadastrar } from "@/lib/actions/auth";
import { CampoSenha } from "@/components/auth/CampoSenha";
import { MedidorForcaSenha } from "@/components/auth/MedidorForcaSenha";

export function CadastroForm() {
  const [estado, formAction, pendente] = useActionState(cadastrar, undefined);

  const [email, setEmail] = useState("");
  const [confirmarEmail, setConfirmarEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");

  const emailsNaoConferem = confirmarEmail.length > 0 && email !== confirmarEmail;
  const senhasNaoConferem = confirmarSenha.length > 0 && senha !== confirmarSenha;
  const podeEnviar = !emailsNaoConferem && !senhasNaoConferem;

  return (
    <form action={formAction} className="mt-8 flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm text-ink">
        Nome
        <input
          type="text"
          name="nome"
          required
          className="rounded border border-rule bg-paper-raised px-3 py-2 text-ink focus:border-absorbance focus:outline-none"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm text-ink">
        E-mail
        <input
          type="email"
          name="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded border border-rule bg-paper-raised px-3 py-2 text-ink focus:border-absorbance focus:outline-none"
        />
      </label>

      <div className="flex flex-col gap-1">
        <label className="flex flex-col gap-1 text-sm text-ink">
          Confirmar e-mail
          <input
            type="email"
            name="confirmar_email"
            required
            value={confirmarEmail}
            onChange={(e) => setConfirmarEmail(e.target.value)}
            className="rounded border border-rule bg-paper-raised px-3 py-2 text-ink focus:border-absorbance focus:outline-none"
          />
        </label>
        {emailsNaoConferem && (
          <p className="text-xs text-alerta">Os e-mails não coincidem.</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <CampoSenha
          name="senha"
          label="Senha"
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
          label="Confirmar senha"
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
        disabled={pendente || !podeEnviar}
        className="mt-2 rounded bg-absorbance px-4 py-2 text-paper hover:bg-ink disabled:opacity-50"
      >
        {pendente ? "Criando conta..." : "Criar conta"}
      </button>
    </form>
  );
}
