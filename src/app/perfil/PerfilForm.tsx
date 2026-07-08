"use client";

import { useActionState, useState } from "react";
import Image from "next/image";
import type { Profile } from "@/lib/supabase/profile";
import { atualizarPerfil } from "@/lib/actions/perfil";

export default function PerfilForm({ usuario }: { usuario: Profile }) {
  const [estado, formAction, pendente] = useActionState(
    atualizarPerfil,
    undefined
  );
  const [preview, setPreview] = useState<string | null>(usuario.foto_url);

  function aoEscolherFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    if (arquivo) setPreview(URL.createObjectURL(arquivo));
  }

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div className="flex items-center gap-4">
        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
          {preview && (
            <Image
              src={preview}
              alt="Prévia da foto"
              width={80}
              height={80}
              unoptimized
              className="h-full w-full object-cover"
            />
          )}
        </div>
        <label className="flex flex-col gap-1 text-sm">
          Foto (JPEG, PNG ou WebP, até 5 MB)
          <input
            type="file"
            name="foto"
            accept="image/jpeg,image/png,image/webp"
            onChange={aoEscolherFoto}
            className="text-sm"
          />
        </label>
      </div>

      <label className="flex flex-col gap-1 text-sm">
        Apresentação breve
        <textarea
          name="apresentacao"
          rows={4}
          maxLength={300}
          defaultValue={usuario.apresentacao ?? ""}
          placeholder="Ex.: bolsista de iniciação científica, atua com estresse oxidativo em modelos de diabetes experimental."
          className="rounded border border-black/15 px-3 py-2 dark:border-white/20"
        />
      </label>

      {estado && "erro" in estado && (
        <p className="text-sm text-red-600" role="alert">
          {estado.erro}
        </p>
      )}
      {estado && "sucesso" in estado && (
        <p className="text-sm text-green-700 dark:text-green-400">
          Perfil atualizado.
        </p>
      )}

      <button
        type="submit"
        disabled={pendente}
        className="self-start rounded bg-black px-4 py-2 text-sm text-white disabled:opacity-50 dark:bg-white dark:text-black"
      >
        {pendente ? "Salvando..." : "Salvar"}
      </button>
    </form>
  );
}
