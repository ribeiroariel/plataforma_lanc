// Reduz uma imagem no navegador antes de enviar: foto de celular costuma ter
// 3–8 MB e 4000 px, e o site só precisa de ~800 px (perfil) ou ~1600 px
// (notícia). Sai sempre como JPEG — o que também converte HEIC do iPhone nos
// navegadores que conseguem abri-lo (Safari). Só roda no cliente.

export async function reduzirImagem(
  arquivo: File,
  { lado = 1600, qualidade = 0.85, quadrado = false }: { lado?: number; qualidade?: number; quadrado?: boolean } = {}
): Promise<File> {
  if (!arquivo.type.startsWith("image/") && !/\.(heic|heif)$/i.test(arquivo.name)) {
    throw new Error("O arquivo escolhido não é uma imagem.");
  }

  const url = URL.createObjectURL(arquivo);
  try {
    const img = await new Promise<HTMLImageElement>((ok, falha) => {
      const i = new Image();
      i.onload = () => ok(i);
      i.onerror = () =>
        falha(new Error("Não consegui abrir essa imagem. Tente uma foto em JPEG ou PNG."));
      i.src = url;
    });

    // Recorte quadrado central (foto de perfil é mostrada em círculo).
    let sx = 0;
    let sy = 0;
    let sw = img.naturalWidth;
    let sh = img.naturalHeight;
    if (quadrado) {
      const m = Math.min(sw, sh);
      sx = (sw - m) / 2;
      sy = (sh - m) / 2;
      sw = sh = m;
    }
    const escala = Math.min(1, lado / Math.max(sw, sh));
    const w = Math.round(sw * escala);
    const h = Math.round(sh * escala);

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return arquivo;
    ctx.fillStyle = "#fff"; // PNG transparente não vira fundo preto no JPEG
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);

    const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, "image/jpeg", qualidade));
    if (!blob) return arquivo;
    const nome = arquivo.name.replace(/\.[^.]+$/, "") + ".jpg";
    return new File([blob], nome, { type: "image/jpeg" });
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Troca o arquivo de um <input type="file"> (para o form enviar o reduzido). */
export function trocarArquivoDoInput(input: HTMLInputElement, arquivo: File) {
  const dt = new DataTransfer();
  dt.items.add(arquivo);
  input.files = dt.files;
}
