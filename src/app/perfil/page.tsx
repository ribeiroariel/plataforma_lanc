import { redirect } from "next/navigation";
import { getUsuarioAtual } from "@/lib/supabase/profile";
import { createClient } from "@/lib/supabase/server";
import { carregarVinculo } from "@/lib/vinculo";
import PerfilForm from "./PerfilForm";
import TrocarSenha from "./TrocarSenha";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionTitle } from "@/components/ui/SectionTitle";

export default async function PaginaPerfil() {
  const usuario = await getUsuarioAtual();

  if (!usuario) redirect("/login");
  const vinculo = await carregarVinculo(await createClient(), usuario.id);

  return (
    <main className="mx-auto max-w-lg px-4 py-10 sm:px-6">
      <PageHeader
        eyebrow="Perfil"
        titulo="Meu perfil"
        descricao={
          <>
            Foto, vínculo e apresentação aparecem na página pública &quot;Quem
            somos&quot; e na página de notícias
            {!usuario.aprovado && " assim que seu cadastro for aprovado"}.
          </>
        }
      />

      <div className="mt-8">
        <PerfilForm usuario={usuario} vinculo={vinculo} />
      </div>

      <section className="mt-12 border-t border-rule pt-8">
        <SectionTitle className="mb-4">Segurança</SectionTitle>
        <TrocarSenha />
      </section>
    </main>
  );
}
