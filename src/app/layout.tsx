import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { getUsuarioAtual } from "@/lib/supabase/profile";
import { logout } from "@/lib/actions/auth";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <header className="border-b border-black/10 dark:border-white/10">
          <nav className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
            <Link href="/" className="font-semibold">
              LANC
            </Link>
            <div className="flex items-center gap-4 text-sm">
              {!usuario && (
                <>
                  <Link href="/login">Entrar</Link>
                  <Link href="/cadastro">Cadastro de bolsista</Link>
                </>
              )}
              {usuario?.papel === "bolsista" && (
                <Link href="/bolsista">Minha área</Link>
              )}
              {usuario?.papel === "orientador" && (
                <>
                  <Link href="/orientador">Painel da orientadora</Link>
                  <Link href="/testes">Protocolos</Link>
                </>
              )}
              {usuario && <Link href="/perfil">Meu perfil</Link>}
              {usuario && (
                <form action={logout}>
                  <button type="submit" className="underline">
                    Sair
                  </button>
                </form>
              )}
            </div>
          </nav>
        </header>
        <div className="flex-1">{children}</div>
      </body>
    </html>
  );
}
