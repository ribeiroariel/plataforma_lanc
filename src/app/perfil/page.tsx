import { redirect } from "next/navigation";
import { getUsuarioAtual } from "@/lib/supabase/profile";
import PerfilForm from "./PerfilForm";

export default async function PaginaPerfil() {
  const usuario = await getUsuarioAtual();

  if (!usuario) redirect("/login");

  return (
    <main className="mx-auto max-w-lg px-4 py-10 sm:px-6">
      <p className="font-mono text-xs uppercase tracking-[0.14em] text-ink-soft">
        Perfil
      </p>
      <h1 className="mt-1 font-display text-3xl leading-tight text-ink">
        Meu perfil
      </h1>
      <p className="mt-2 mb-8 text-sm leading-relaxed text-ink-soft">
        Foto e apresentação aparecem no carrossel público &quot;Quem
        somos&quot; da página inicial
        {!usuario.aprovado && " assim que seu cadastro for aprovado"}.
      </p>

      <PerfilForm usuario={usuario} />
    </main>
  );
}
