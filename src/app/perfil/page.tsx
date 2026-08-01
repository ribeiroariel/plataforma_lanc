import { redirect } from "next/navigation";
import { getUsuarioAtual } from "@/lib/supabase/profile";
import PerfilForm from "./PerfilForm";
import TrocarSenha from "./TrocarSenha";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionTitle } from "@/components/ui/SectionTitle";

export default async function PaginaPerfil() {
  const usuario = await getUsuarioAtual();

  if (!usuario) redirect("/login");

  return (
    <main className="mx-auto max-w-lg px-4 py-10 sm:px-6">
      <PageHeader
        eyebrow="Perfil"
        titulo="Meu perfil"
        descricao={
          <>
            Foto e apresentação aparecem no carrossel público &quot;Quem
            somos&quot; da página inicial
            {!usuario.aprovado && " assim que seu cadastro for aprovado"}.
          </>
        }
      />

      <div className="mt-8">
        <PerfilForm usuario={usuario} />
      </div>

      <section className="mt-12 border-t border-rule pt-8">
        <SectionTitle className="mb-4">Segurança</SectionTitle>
        <TrocarSenha />
      </section>
    </main>
  );
}
