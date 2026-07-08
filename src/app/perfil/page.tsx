import { redirect } from "next/navigation";
import { getUsuarioAtual } from "@/lib/supabase/profile";
import PerfilForm from "./PerfilForm";

export default async function PaginaPerfil() {
  const usuario = await getUsuarioAtual();

  if (!usuario) redirect("/login");

  return (
    <main className="mx-auto max-w-lg px-4 py-10">
      <h1 className="mb-1 text-2xl font-semibold">Meu perfil</h1>
      <p className="mb-6 text-sm text-black/60 dark:text-white/60">
        Foto e apresentação aparecem no carrossel público &quot;Quem
        somos&quot; da página inicial
        {!usuario.aprovado && " assim que seu cadastro for aprovado"}.
      </p>

      <PerfilForm usuario={usuario} />
    </main>
  );
}
