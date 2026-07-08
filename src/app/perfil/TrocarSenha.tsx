"use client";

import { useActionState, useState } from "react";
import { alterarSenha } from "@/lib/actions/perfil";
import { CampoSenha } from "@/components/auth/CampoSenha";
import { MedidorForcaSenha } from "@/components/auth/MedidorForcaSenha";
import { BOTAO_SECUNDARIO } from "@/lib/estilos";

export default function TrocarSenha() {
  const [estado, formAction, pendente] = useActionState(alterarSenha, undefined);
  const [senha, setSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const naoConferem = confirmar.length > 0 && senha !== confirmar;

  return (
    <form action={formAction} className="flex max-w-sm flex-col gap-4">
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
          value={confirmar}
          onChange={setConfirmar}
        />
        {naoConferem && (
          <p className="text-xs text-alerta">As senhas não coincidem.</p>
        )}
      </div>

      {estado && "erro" in estado && (
        <p className="text-sm text-alerta" role="alert">
          {estado.erro}
        </p>
      )}
      {estado && "sucesso" in estado && (
        <p className="text-sm text-green-700 dark:text-green-400">
          Senha alterada.
        </p>
      )}

      <button
        type="submit"
        disabled={pendente || naoConferem || senha.length < 6}
        className={`self-start text-sm ${BOTAO_SECUNDARIO}`}
      >
        {pendente ? "Salvando..." : "Trocar senha"}
      </button>
    </form>
  );
}
