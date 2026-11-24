"use client";

import { useActionState, useRef, useState } from "react";
import type { Profile } from "@/lib/supabase/profile";
import { atualizarPerfil } from "@/lib/actions/perfil";
import { trocarArquivoDoInput } from "@/lib/reduzirImagem";
import RecortarFoto from "@/components/RecortarFoto";
import { INPUT, BOTAO_PRIMARIO } from "@/lib/estilos";
import { VINCULOS, type Vinculo } from "@/lib/vinculo";

const MAX_APRESENTACAO = 300;

export default function PerfilForm({
  usuario,
  vinculo,
}: {
  usuario: Profile;
  /** null = coluna ainda não existe no banco (migração pendente). */
  vinculo: Vinculo | null;
}) {
  const [estado, formAction, pendente] = useActionState(atualizarPerfil, undefined);
  const [preview, setPreview] = useState<string | null>(usuario.foto_url);
  // Foto escolhida esperando o recorte (abre a janela de ajuste).
  const [paraRecortar, setParaRecortar] = useState<File | null>(null);
  // Original da última foto escolhida, para "ajustar de novo".
  const [original, setOriginal] = useState<File | null>(null);
  const [erroFoto, setErroFoto] = useState<string | null>(null);
  const [removerFoto, setRemoverFoto] = useState(false);
  const [apresentacao, setApresentacao] = useState(usuario.apresentacao ?? "");
  const inputFoto = useRef<HTMLInputElement>(null);

  // Escolheu a foto: abre a janela de recorte. Só o recorte confirmado vai
  // para o formulário (JPEG quadrado de até 800 px, bem abaixo do limite).
  function aoEscolherFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    setErroFoto(null);
    if (!arquivo) return;
    if (!arquivo.type.startsWith("image/") && !/\.(heic|heif)$/i.test(arquivo.name)) {
      setErroFoto("O arquivo escolhido não é uma imagem.");
      e.target.value = "";
      return;
    }
    setOriginal(arquivo);
    setParaRecortar(arquivo);
  }

  function aoRecortar(recortada: File, previa: string) {
    if (inputFoto.current) trocarArquivoDoInput(inputFoto.current, recortada);
    setPreview(previa);
    setRemoverFoto(false);
    setParaRecortar(null);
  }

  function aoCancelarRecorte() {
    setParaRecortar(null);
    // Cancelou na primeira escolha: não fica arquivo "cru" no formulário.
    if (inputFoto.current && !preview?.startsWith("blob:")) {
      inputFoto.current.value = "";
      setOriginal(null);
    }
  }

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {paraRecortar && (
        <RecortarFoto arquivo={paraRecortar} onConfirmar={aoRecortar} onCancelar={aoCancelarRecorte} />
      )}
      <input type="hidden" name="remover_foto" value={removerFoto ? "1" : "0"} />

      <div className="flex items-center gap-5">
        <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full border border-rule bg-paper-raised">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element -- prévia local (blob:) ou URL do Storage
            <img src={preview} alt="Sua foto" className="h-full w-full object-cover" />
          ) : (
            <svg viewBox="0 0 40 40" className="h-full w-full text-ink-soft/45" aria-hidden fill="currentColor">
              <circle cx="20" cy="15" r="7" />
              <path d="M6 38c0-8 6.5-13 14-13s14 5 14 13v2H6v-2Z" />
            </svg>
          )}
        </div>
        <div className="flex flex-col gap-2 text-sm">
          <input
            ref={inputFoto}
            type="file"
            name="foto"
            accept="image/*,.heic,.heif"
            onChange={aoEscolherFoto}
            className="sr-only"
            id="campo-foto"
          />
          <label
            htmlFor="campo-foto"
            className="w-fit cursor-pointer rounded border border-rule px-3 py-1.5 text-ink transition-colors hover:border-signal"
          >
            {preview ? "Trocar foto" : "Escolher foto"}
          </label>
          {original && preview?.startsWith("blob:") && (
            <button
              type="button"
              onClick={() => setParaRecortar(original)}
              className="w-fit text-xs text-absorbance hover:underline"
            >
              Ajustar o recorte
            </button>
          )}
          {preview && (
            <button
              type="button"
              onClick={() => {
                setOriginal(null);
                setPreview(null);
                setRemoverFoto(true);
                if (inputFoto.current) inputFoto.current.value = "";
              }}
              className="w-fit text-xs text-alerta hover:underline"
            >
              Tirar a foto
            </button>
          )}
          <span className="text-xs text-ink-soft">
            Depois de escolher, você ajusta o enquadramento.
          </span>
          {erroFoto && <span className="text-xs text-alerta">{erroFoto}</span>}
        </div>
      </div>

      {usuario.papel === "bolsista" && vinculo !== null && (
        <label className="flex flex-col gap-1.5 text-sm text-ink">
          <span className="font-medium">Vínculo com o laboratório</span>
          <select name="vinculo" defaultValue={vinculo} className={INPUT}>
            {VINCULOS.map((v) => (
              <option key={v.valor} value={v.valor}>
                {v.rotulo}
              </option>
            ))}
          </select>
        </label>
      )}

      <label className="flex flex-col gap-1.5 text-sm text-ink">
        <span className="flex items-baseline justify-between font-medium">
          Apresentação
          <span className={`text-xs font-normal ${apresentacao.length > MAX_APRESENTACAO ? "text-alerta" : "text-ink-soft/70"}`}>
            {apresentacao.length}/{MAX_APRESENTACAO}
          </span>
        </span>
        <span className="text-xs text-ink-soft">
          Duas ou três linhas: curso, desde quando está no LANC e com o que trabalha.
        </span>
        <textarea
          name="apresentacao"
          rows={4}
          maxLength={MAX_APRESENTACAO}
          value={apresentacao}
          onChange={(e) => setApresentacao(e.target.value)}
          placeholder="Ex.: estudante de Biomedicina, bolsista de iniciação científica desde 2025. Trabalha com estresse oxidativo em modelos de diabetes experimental."
          className={INPUT}
        />
      </label>

      {estado && "erro" in estado && (
        <p className="text-sm text-alerta" role="alert">
          {estado.erro}
        </p>
      )}
      {estado && "sucesso" in estado && (
        <p className="text-sm text-sucesso">
          Perfil salvo. Já aparece em &quot;Quem somos&quot;{usuario.aprovado ? "" : " assim que seu cadastro for aprovado"}.
        </p>
      )}

      <button
        type="submit"
        disabled={pendente || !!paraRecortar}
        className={`self-start text-sm ${BOTAO_PRIMARIO}`}
      >
        {pendente ? "Salvando..." : "Salvar"}
      </button>
    </form>
  );
}
