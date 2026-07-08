import type { Metadata } from "next";
import { Newsreader, Public_Sans, IBM_Plex_Mono } from "next/font/google";
import Link from "next/link";
import Image from "next/image";
import "./globals.css";
import { getUsuarioAtual } from "@/lib/supabase/profile";
import { logout } from "@/lib/actions/auth";

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

  // Navegação principal (abas horizontais), por papel.
  const navPrincipal: { href: string; rotulo: string }[] = [
    { href: "/", rotulo: "Notícias" },
  ];
  if (usuario?.papel === "bolsista") {
    navPrincipal.push(
      { href: "/testes", rotulo: "Protocolos" },
      { href: "/projetos", rotulo: "Projetos" },
      { href: "/bolsista", rotulo: "Minha área" }
    );
  } else if (usuario?.papel === "orientador") {
    navPrincipal.push(
      { href: "/orientador", rotulo: "Painel" },
      { href: "/projetos", rotulo: "Projetos" },
      { href: "/testes", rotulo: "Protocolos" }
    );
  }

  return (
    <html
      lang="pt-BR"
      className={`${newsreader.variable} ${publicSans.variable} ${plexMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-paper font-sans text-ink">
        <header className="sticky top-0 z-50 bg-paper-raised shadow-[0_1px_0_var(--color-rule)]">
          {/* Barra utilitária */}
          <div className="border-b border-rule bg-ink text-paper">
            <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-1.5 sm:px-6">
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-paper/70">
                Universidade Regional de Blumenau · FURB
              </span>
              <div className="flex items-center gap-4 text-xs">
                {!usuario && (
                  <>
                    <Link href="/login" className="text-paper/80 hover:text-paper">
                      Entrar
                    </Link>
                    <Link
                      href="/cadastro"
                      className="rounded-sm bg-signal px-2.5 py-1 font-medium text-paper hover:brightness-110"
                    >
                      Cadastro de bolsista
                    </Link>
                  </>
                )}
                {usuario && (
                  <>
                    <Link href="/perfil" className="text-paper/80 hover:text-paper">
                      {usuario.nome}
                    </Link>
                    <form action={logout}>
                      <button
                        type="submit"
                        className="text-paper/80 hover:text-paper"
                      >
                        Sair
                      </button>
                    </form>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Cabeçalho principal com logo + wordmark */}
          <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3 sm:px-6">
            <Link href="/" className="flex items-center gap-3">
              <Image
                src="/logo-lanc.jpg"
                alt="Logo do LANC"
                width={52}
                height={52}
                className="h-12 w-12 shrink-0 rounded-full border border-rule object-cover sm:h-14 sm:w-14"
                priority
              />
              <span className="leading-none">
                <span className="block font-display text-2xl font-medium tracking-tight text-ink sm:text-3xl">
                  LANC
                </span>
                <span className="mt-0.5 block font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft sm:text-[11px]">
                  Laboratório de Neurociências e Comportamento
                </span>
              </span>
            </Link>
          </div>

          {/* Barra de navegação */}
          <nav className="border-t border-rule">
            <div className="mx-auto flex max-w-6xl items-center gap-1 overflow-x-auto px-4 sm:px-6">
              {navPrincipal.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="border-b-2 border-transparent px-3 py-2.5 font-mono text-[11px] uppercase tracking-[0.1em] text-ink-soft transition-colors hover:border-signal hover:text-ink"
                >
                  {item.rotulo}
                </Link>
              ))}
            </div>
          </nav>
        </header>

        <div className="flex-1">{children}</div>

        <footer className="mt-16 border-t-2 border-ink bg-paper-raised">
          <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              <div className="lg:col-span-1">
                <div className="flex items-center gap-2">
                  <Image
                    src="/logo-lanc.jpg"
                    alt=""
                    width={36}
                    height={36}
                    className="h-9 w-9 rounded-full border border-rule object-cover"
                  />
                  <span className="font-display text-lg text-ink">LANC</span>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-ink-soft">
                  Laboratório de Neurociências e Comportamento, sediado na
                  Universidade Regional de Blumenau (FURB). Pesquisa em
                  estresse oxidativo aplicada a modelos de depressão,
                  diabetes e neurotoxicidade.
                </p>
              </div>
              <div>
                <p className="font-mono text-xs uppercase tracking-wider text-signal">
                  Coordenação
                </p>
                <p className="mt-2 text-sm text-ink">
                  Profa. Dra. Débora Delwing Dal Magro
                </p>
              </div>
              <div>
                <p className="font-mono text-xs uppercase tracking-wider text-signal">
                  Contato
                </p>
                <ul className="mt-2 flex flex-col gap-1 text-sm">
                  <li>
                    <a
                      href="https://www.instagram.com/lancfurb/"
                      target="_blank"
                      rel="noreferrer"
                      className="text-ink hover:text-signal"
                    >
                      @lancfurb
                    </a>
                  </li>
                </ul>
              </div>
              <div>
                <p className="font-mono text-xs uppercase tracking-wider text-signal">
                  Acesso
                </p>
                <ul className="mt-2 flex flex-col gap-1 text-sm">
                  <li>
                    <Link href="/login" className="text-ink hover:text-signal">
                      Entrar
                    </Link>
                  </li>
                  <li>
                    <Link href="/cadastro" className="text-ink hover:text-signal">
                      Cadastro de bolsista
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
            <p className="mt-10 font-mono text-[11px] text-ink-soft/70">
              © {new Date().getFullYear()} LANC / FURB. Todos os direitos
              reservados.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
