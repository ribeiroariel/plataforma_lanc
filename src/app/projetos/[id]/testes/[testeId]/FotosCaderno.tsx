"use client";

import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import {
  subirFotoCaderno,
  removerFotoCaderno,
  type FotoCaderno,
} from "@/lib/actions/fotos-caderno";

type Props = {
  projetoId: string;
  projetoTesteId: string;
  fotos: FotoCaderno[];
  podeAnexar: boolean;
};

export default function FotosCaderno({
  projetoId,
  projetoTesteId,
  fotos,
  podeAnexar,
}: Props) {
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, iniciar] = useTransition();
  const [removendo, setRemovendo] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function aoEscolher(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setErro(null);
    const formData = new FormData();
    formData.set("foto", file);
    iniciar(async () => {
      const r = await subirFotoCaderno(projetoId, projetoTesteId, formData);
      if ("erro" in r) setErro(r.erro);
      if (inputRef.current) inputRef.current.value = "";
    });
  }

  function remover(fotoId: string) {
    setErro(null);
    setRemovendo(fotoId);
    iniciar(async () => {
      const r = await removerFotoCaderno(projetoId, projetoTesteId, fotoId);
      if ("erro" in r) setErro(r.erro);
      setRemovendo(null);
    });
  }

  // Quem só lê (coautor/orientadora) e não há nenhuma foto: não mostra nada.
  if (!podeAnexar && fotos.length === 0) return null;

  return (
    <section className="mt-10">
      <p className="mb-1 font-mono text-xs uppercase tracking-[0.12em] text-ink-soft">
        Fotos do caderno (transparência)
      </p>
      <p className="mb-3 max-w-2xl text-xs leading-relaxed text-ink-soft">
        Registro fotográfico da tabela feita à mão no caderno de bancada.
        Opcional — serve só como fonte auditável; as absorbâncias válidas são as
        digitadas acima. Visível para a equipe do projeto e a orientadora.
      </p>

      {fotos.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {fotos.map((foto) => (
            <figure
              key={foto.id}
              className="group relative overflow-hidden rounded border border-rule bg-paper-raised"
            >
              <a href={foto.url} target="_blank" rel="noopener noreferrer">
                <Image
                  src={foto.url}
                  alt="Foto do caderno de bancada"
                  width={300}
                  height={300}
                  unoptimized
                  className="h-40 w-full object-cover transition group-hover:opacity-90"
                />
              </a>
              <figcaption className="flex items-center justify-between gap-2 px-2 py-1 text-[11px] text-ink-soft">
                <span className="truncate">
                  {foto.autor ?? "—"} ·{" "}
                  {new Date(foto.criadaEm).toLocaleDateString("pt-BR")}
                </span>
                {podeAnexar && (
                  <button
                    type="button"
                    onClick={() => remover(foto.id)}
                    disabled={enviando}
                    className="shrink-0 text-alerta underline-offset-2 hover:underline disabled:opacity-50"
                  >
                    {removendo === foto.id ? "..." : "remover"}
                  </button>
                )}
              </figcaption>
            </figure>
          ))}
        </div>
      )}

      {podeAnexar && (
        <div className="mt-3">
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={aoEscolher}
            disabled={enviando}
            className="block w-full text-xs text-ink-soft file:mr-3 file:rounded file:border file:border-rule file:bg-paper file:px-3 file:py-1.5 file:text-xs file:text-ink hover:file:border-signal disabled:opacity-50"
          />
          {enviando && removendo === null && (
            <p className="mt-2 text-xs text-ink-soft">Enviando…</p>
          )}
          <p className="mt-1 text-[11px] text-ink-soft">
            JPEG, PNG ou WebP, até 10 MB.
          </p>
        </div>
      )}

      {erro && <p className="mt-2 text-sm text-alerta">{erro}</p>}
    </section>
  );
}
