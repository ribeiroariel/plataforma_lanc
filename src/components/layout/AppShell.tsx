import type { Profile } from "@/lib/supabase/profile";
import { podeAprovarCadastros } from "@/lib/supabase/profile";
import { Sidebar, type GrupoNav } from "./Sidebar";
import {
  IconeCaixa,
  IconeCarrinho,
  IconeFrasco,
  IconeFuncoes,
  IconeInicio,
  IconeJornal,
  IconeLabirinto,
  IconeLivro,
  IconePainel,
  IconePasta,
  IconePessoas,
  IconeRato,
  IconeRelogio,
  IconeTubo,
} from "./icones";

// Itens agrupados pelo tipo de tarefa — o bolsista acha o que precisa pelo que
// está fazendo (bancada, pesquisa, consulta), não por uma fila de 10 abas.
function gruposDe(usuario: Profile): { grupos: GrupoNav[]; abas: string[] } {
  const pesquisa: GrupoNav = {
    titulo: "Pesquisa",
    itens: [
      { href: "/projetos", rotulo: "Projetos", icone: IconePasta },
      { href: "/bioterio", rotulo: "Biotério", icone: IconeRato },
      { href: "/comportamental", rotulo: "Comportamental", icone: IconeLabirinto },
    ],
  };
  const consulta: GrupoNav = {
    titulo: "Consulta",
    itens: [
      { href: "/testes", rotulo: "Protocolos", icone: IconeLivro },
      { href: "/reagentes", rotulo: "Reagentes", icone: IconeFrasco },
      { href: "/estoque", rotulo: "Estoque", icone: IconeCaixa },
    ],
  };
  const gestao: GrupoNav | null = podeAprovarCadastros(usuario)
    ? {
        titulo: "Gestão",
        itens: [
          { href: "/pedidos", rotulo: "Pedidos", icone: IconeCarrinho },
          { href: "/cadastros", rotulo: "Cadastros", icone: IconePessoas },
        ],
      }
    : null;
  const site: GrupoNav = {
    titulo: "Site",
    itens: [{ href: "/", rotulo: "Notícias", icone: IconeJornal, exato: true, tambem: ["/noticias"] }],
  };

  if (usuario.papel === "orientador") {
    const grupos: GrupoNav[] = [
      { itens: [{ href: "/orientador", rotulo: "Painel", icone: IconePainel }] },
      pesquisa,
      consulta,
      ...(gestao ? [gestao] : []),
      site,
    ];
    return { grupos, abas: ["/orientador", "/projetos", "/bioterio", "/testes"] };
  }

  const grupos: GrupoNav[] = [
    { itens: [{ href: "/bolsista", rotulo: "Início", icone: IconeInicio }] },
    {
      titulo: "Bancada",
      itens: [
        { href: "/meus-testes", rotulo: "Meus testes", icone: IconeTubo },
        { href: "/minhas-funcoes", rotulo: "Minhas funções", icone: IconeFuncoes },
        { href: "/laboratorio", rotulo: "Horas no lab", icone: IconeRelogio },
      ],
    },
    pesquisa,
    consulta,
    ...(gestao ? [gestao] : []),
    site,
  ];
  return { grupos, abas: ["/bolsista", "/meus-testes", "/projetos", "/testes"] };
}

export function AppShell({
  usuario,
  children,
}: {
  usuario: Profile;
  children: React.ReactNode;
}) {
  const { grupos, abas } = gruposDe(usuario);
  return (
    <div className="flex min-h-full flex-1 flex-col md:flex-row">
      <Sidebar
        grupos={grupos}
        abasCelular={abas}
        nome={usuario.nome}
        papelRotulo={usuario.papel === "orientador" ? "Orientadora" : "Bolsista"}
        fotoUrl={usuario.foto_url ?? null}
      />
      <div className="flex min-w-0 flex-1 flex-col pb-[calc(3.75rem+env(safe-area-inset-bottom))] md:pb-0">
        {children}
      </div>
    </div>
  );
}
