import type { Metadata } from "next";
import { Newsreader, Public_Sans, IBM_Plex_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { getUsuarioAtual } from "@/lib/supabase/profile";
import { logout } from "@/lib/actions/auth";
import { ReguaEspectral } from "@/components/ReguaEspectral";
import { SeloLANC } from "@/components/SeloLANC";

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

const publicSans = Public_Sans({
  variable: "--font-public-sans",
  subsets: ["latin"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "LANC — Laboratório de Neurociências e Comportamento",
  description:
    "Divulgação de pesquisas e portal de bolsistas do LANC (FURB), sob orientação da Profa. Dra. Débora Delwing Dal Magro.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let usuario = null;
  try {
    usuario = await getUsuarioAtual();
  } catch {
    // Supabase ainda sem configurar (.env.local) — segue como visitante.
  }

  return (
    <html
      lang="pt-BR"
      className={`${newsreader.variable} ${publicSans.variable} ${plexMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-paper font-sans text-ink">
        <header className="border-b border-rule">
          <div className="mx-auto flex max-w-6xl items-end justify-between px-4 pt-6 pb-3 sm:px-6">
            <Link href="/" className="group flex items-center gap-3">
              <SeloLANC className="h-10 w-10 shrink-0 text-absorbance sm:h-11 sm:w-11" />
              <span>
                <span className="block font-display text-3xl font-medium tracking-tight text-ink sm:text-4xl">
                  LANC
                </span>
                <span className="mt-1 block font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft">
                  Laboratório de Neurociências e Comportamento — FURB
                </span>
              </span>
            </Link>

            <nav className="flex items-center gap-5 pb-1 text-sm">
              {!usuario && (
                <>
                  <Link href="/login" className="text-ink-soft hover:text-ink">
                    Entrar
                  </Link>
                  <Link
                    href="/cadastro"
                    className="border-b border-absorbance text-absorbance hover:border-ink hover:text-ink"
                  >
                    Cadastro de bolsista
                  </Link>
                </>
              )}
              {usuario?.papel === "bolsista" && (
                <Link href="/bolsista" className="text-ink-soft hover:text-ink">
                  Minha área
                </Link>
              )}
              {usuario?.papel === "orientador" && (
                <>
                  <Link href="/orientador" className="text-ink-soft hover:text-ink">
                    Painel da orientadora
                  </Link>
                  <Link href="/testes" className="text-ink-soft hover:text-ink">
                    Protocolos
                  </Link>
                </>
              )}
              {usuario && (
                <Link href="/perfil" className="text-ink-soft hover:text-ink">
                  Meu perfil
                </Link>
              )}
              {usuario && (
                <form action={logout}>
                  <button
                    type="submit"
                    className="text-ink-soft underline decoration-rule underline-offset-4 hover:text-ink"
                  >
                    Sair
                  </button>
                </form>
              )}
            </nav>
          </div>
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <ReguaEspectral />
          </div>
        </header>

        <div className="flex-1">{children}</div>

        <footer className="mt-16 border-t border-rule">
          <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="font-display text-lg text-ink">LANC</p>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                  Laboratório de Neurociências e Comportamento, sediado na
                  Universidade Regional de Blumenau (FURB). Pesquisa em
                  estresse oxidativo aplicada a modelos de depressão,
                  diabetes e neurotoxicidade.
                </p>
              </div>
              <div>
                <p className="font-mono text-xs uppercase tracking-wider text-ink-soft">
                  Coordenação
                </p>
                <p className="mt-2 text-sm text-ink">
                  Profa. Dra. Débora Delwing Dal Magro
                </p>
              </div>
              <div>
                <p className="font-mono text-xs uppercase tracking-wider text-ink-soft">
                  Contato
                </p>
                <ul className="mt-2 flex flex-col gap-1 text-sm">
                  <li>
                    <a
                      href="https://www.instagram.com/lancfurb/"
                      target="_blank"
                      rel="noreferrer"
                      className="text-absorbance hover:text-ink"
                    >
                      @lancfurb
                    </a>
                  </li>
                </ul>
              </div>
              <div>
                <p className="font-mono text-xs uppercase tracking-wider text-ink-soft">
                  Acesso
                </p>
                <ul className="mt-2 flex flex-col gap-1 text-sm">
                  <li>
                    <Link href="/login" className="text-absorbance hover:text-ink">
                      Entrar
                    </Link>
                  </li>
                  <li>
                    <Link href="/cadastro" className="text-absorbance hover:text-ink">
                      Cadastro de bolsista
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
            <p className="mt-10 font-mono text-[11px] text-ink-soft/70">
              © {new Date().getFullYear()} LANC / FURB.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
