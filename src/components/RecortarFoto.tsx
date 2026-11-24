"use client";

import { useEffect, useRef, useState } from "react";

// Janela de recorte da foto de perfil: a pessoa arrasta a foto dentro da
// moldura redonda (como ela aparece no site), aproxima com a barra ou a
// rodinha do mouse e gira se a foto veio deitada. Sai um JPEG quadrado de
// 800 px só com o que ficou dentro da moldura. Sem biblioteca: canvas puro.

const LADO_SAIDA = 800;
const ZOOM_MAX = 4;

type Props = {
  arquivo: File;
  onConfirmar: (recortada: File, previa: string) => void;
  onCancelar: () => void;
};

export default function RecortarFoto({ arquivo, onConfirmar, onCancelar }: Props) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [lado, setLado] = useState(() =>
    typeof window === "undefined" ? 300 : Math.min(320, window.innerWidth - 64)
); // tamanho da moldura na tela
  const [zoom, setZoom] = useState(1);
  const [giro, setGiro] = useState(0); // 0, 90, 180, 270
  const [pos, setPos] = useState({ x: 0, y: 0 }); // deslocamento do centro da foto
  const [gerando, setGerando] = useState(false);
  const arrasto = useRef<{ px: number; py: number; x: number; y: number } | null>(null);
  const caixa = useRef<HTMLDivElement>(null);

  // Abre a imagem escolhida.
  useEffect(() => {
    // "ativo" evita que a carga de uma montagem já descartada (o React monta
    // duas vezes em desenvolvimento) acuse erro depois do endereço revogado.
    let ativo = true;
    const url = URL.createObjectURL(arquivo);
    const i = new Image();
    i.onload = () => ativo && setImg(i);
    i.onerror = () =>
      ativo &&
      setErro("Não consegui abrir essa imagem. Tente uma foto em JPEG ou PNG (no iPhone, exporte como JPEG).");
    i.src = url;
    return () => {
      ativo = false;
      URL.revokeObjectURL(url);
    };
  }, [arquivo]);

  // Moldura cabe na tela do celular.
  useEffect(() => {
    const ajustar = () => setLado(Math.min(320, window.innerWidth - 64));
    window.addEventListener("resize", ajustar);
    return () => window.removeEventListener("resize", ajustar);
  }, []);

  // Fecha com Esc.
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onCancelar();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onCancelar]);

  // Tamanho da foto já girada (largura/altura trocam a 90° e 270°).
  const deitada = giro % 180 !== 0;
  const w = img ? (deitada ? img.naturalHeight : img.naturalWidth) : 1;
  const h = img ? (deitada ? img.naturalWidth : img.naturalHeight) : 1;
  const base = lado / Math.min(w, h); // escala que cobre a moldura no zoom 1
  const escala = base * zoom;
  const larg = w * escala;
  const alt = h * escala;

  // A foto sempre cobre a moldura inteira: não deixa sobrar canto vazio.
  function limitar(p: { x: number; y: number }, l = larg, a = alt) {
    const mx = Math.max(0, (l - lado) / 2);
    const my = Math.max(0, (a - lado) / 2);
    return { x: Math.min(mx, Math.max(-mx, p.x)), y: Math.min(my, Math.max(-my, p.y)) };
  }

  function mudarZoom(z: number) {
    const novo = Math.min(ZOOM_MAX, Math.max(1, z));
    setZoom(novo);
    setPos((p) => limitar(p, w * base * novo, h * base * novo));
  }

  function girar() {
    setGiro((g) => (g + 90) % 360);
    setPos({ x: 0, y: 0 });
  }

  function inicio(e: React.PointerEvent) {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    arrasto.current = { px: e.clientX, py: e.clientY, x: pos.x, y: pos.y };
  }
  function mover(e: React.PointerEvent) {
    const a = arrasto.current;
    if (!a) return;
    setPos(limitar({ x: a.x + e.clientX - a.px, y: a.y + e.clientY - a.py }));
  }
  function fim() {
    arrasto.current = null;
  }

  // Rodinha do mouse aproxima/afasta (sem rolar a página).
  useEffect(() => {
    const el = caixa.current;
    if (!el) return;
    const roda = (e: WheelEvent) => {
      e.preventDefault();
      setZoom((z) => {
        const novo = Math.min(ZOOM_MAX, Math.max(1, z * (e.deltaY < 0 ? 1.08 : 1 / 1.08)));
        setPos((p) => limitar(p, w * base * novo, h * base * novo));
        return novo;
      });
    };
    el.addEventListener("wheel", roda, { passive: false });
    return () => el.removeEventListener("wheel", roda);
  });

  function teclado(e: React.KeyboardEvent) {
    const passo = e.shiftKey ? 20 : 5;
    const d: Record<string, [number, number]> = {
      ArrowLeft: [passo, 0],
      ArrowRight: [-passo, 0],
      ArrowUp: [0, passo],
      ArrowDown: [0, -passo],
    };
    if (d[e.key]) {
      e.preventDefault();
      setPos((p) => limitar({ x: p.x + d[e.key][0], y: p.y + d[e.key][1] }));
    } else if (e.key === "+" || e.key === "=") mudarZoom(zoom * 1.1);
    else if (e.key === "-") mudarZoom(zoom / 1.1);
  }

  async function confirmar() {
    if (!img) return;
    setGerando(true);
    try {
      // Canto superior esquerdo da moldura, em coordenadas da foto girada.
      const sx = (larg / 2 - lado / 2 - pos.x) / escala;
      const sy = (alt / 2 - lado / 2 - pos.y) / escala;
      const sl = lado / escala;
      const saida = Math.min(LADO_SAIDA, Math.round(sl)); // não aumenta foto pequena

      const canvas = document.createElement("canvas");
      canvas.width = saida;
      canvas.height = saida;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Seu navegador não conseguiu recortar a foto.");
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, saida, saida);
      const k = saida / sl;
      ctx.scale(k, k);
      ctx.translate(-sx, -sy);
      // Desenha a foto girada ocupando (0,0)–(w,h).
      ctx.translate(w / 2, h / 2);
      ctx.rotate((giro * Math.PI) / 180);
      ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);

      const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, "image/jpeg", 0.88));
      if (!blob) throw new Error("Não consegui gerar a foto recortada.");
      const nome = arquivo.name.replace(/\.[^.]+$/, "") + "-recorte.jpg";
      onConfirmar(new File([blob], nome, { type: "image/jpeg" }), URL.createObjectURL(blob));
    } catch (e) {
      setErro((e as Error).message);
      setGerando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label="Recortar foto">
      <button type="button" aria-label="Cancelar" onClick={onCancelar} className="anim-fade absolute inset-0 bg-ink/50" />
      <div className="anim-entrada relative w-full max-w-md rounded-t-xl bg-paper p-5 shadow-xl sm:rounded-xl">
        <h2 className="font-display text-xl text-ink">Ajustar a foto</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Arraste para posicionar e use a barra para aproximar. O que fica dentro do
          círculo é o que aparece no site.
        </p>

        {erro ? (
          <p className="mt-4 rounded border border-alerta/40 bg-alerta/5 p-3 text-sm text-alerta">{erro}</p>
        ) : (
          <div className="mt-4 flex justify-center">
            <div
              ref={caixa}
              tabIndex={0}
              onKeyDown={teclado}
              onPointerDown={inicio}
              onPointerMove={mover}
              onPointerUp={fim}
              onPointerCancel={fim}
              aria-label="Área de recorte: arraste ou use as setas do teclado"
              className="relative cursor-grab touch-none overflow-hidden rounded-md bg-ink/80 select-none active:cursor-grabbing"
              style={{ width: lado, height: lado }}
            >
              {img && (
                // eslint-disable-next-line @next/next/no-img-element -- imagem local (blob:) sendo recortada
                <img
                  src={img.src}
                  alt=""
                  draggable={false}
                  className="pointer-events-none absolute top-1/2 left-1/2 max-w-none"
                  style={{
                    width: img.naturalWidth * escala,
                    height: img.naturalHeight * escala,
                    transform: `translate(calc(-50% + ${pos.x}px), calc(-50% + ${pos.y}px)) rotate(${giro}deg)`,
                  }}
                />
              )}
              {/* Máscara: escurece fora do círculo, como a foto aparece no site. */}
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 rounded-full"
                style={{ boxShadow: "0 0 0 9999px rgba(20, 18, 14, 0.55)", outline: "2px solid rgba(255,255,255,0.85)" }}
              />
              {!img && (
                <span className="absolute inset-0 flex items-center justify-center text-sm text-white/80">
                  Abrindo a foto...
                </span>
              )}
            </div>
          </div>
        )}

        {!erro && (
          <div className="mt-4 flex items-center gap-3">
            <button
              type="button"
              onClick={() => mudarZoom(zoom / 1.15)}
              aria-label="Afastar"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-rule text-ink-soft hover:text-ink"
            >
              −
            </button>
            <input
              type="range"
              min={1}
              max={ZOOM_MAX}
              step={0.01}
              value={zoom}
              onChange={(e) => mudarZoom(Number(e.target.value))}
              aria-label="Zoom"
              className="flex-1 accent-[var(--color-signal)]"
            />
            <button
              type="button"
              onClick={() => mudarZoom(zoom * 1.15)}
              aria-label="Aproximar"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-rule text-ink-soft hover:text-ink"
            >
              +
            </button>
            <button
              type="button"
              onClick={girar}
              className="rounded border border-rule px-2.5 py-1.5 text-xs text-ink hover:border-ink-soft"
              title="Girar 90°"
            >
              Girar
            </button>
          </div>
        )}

        <div className="mt-5 flex items-center justify-end gap-3 border-t border-rule pt-4">
          <button type="button" onClick={onCancelar} className="text-sm text-ink-soft hover:text-ink">
            Cancelar
          </button>
          {!erro && (
            <button
              type="button"
              onClick={confirmar}
              disabled={!img || gerando}
              className="inline-flex items-center justify-center rounded bg-signal px-4 py-2 text-sm font-medium text-white transition hover:brightness-110 disabled:opacity-50"
            >
              {gerando ? "Recortando..." : "Usar esta foto"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
