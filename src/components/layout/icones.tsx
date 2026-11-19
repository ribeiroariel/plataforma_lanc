// Ícones da navegação, desenhados para o LANC: traço de 1,5 numa grade de
// 24 px, cantos arredondados, sem preenchimento — cada um remete a um objeto
// real da bancada (estante de tubos, erlenmeyer, gaiola...).

function Icone({ children }: { children: React.ReactNode }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {children}
    </svg>
  );
}

// Início — bancada com dois frascos.
export const IconeInicio = (
  <Icone>
    <path d="M3 19.5h18" />
    <path d="M7 19.5v-6.5a2 2 0 0 1 4 0v6.5" />
    <path d="M14.5 19.5 16 9.5h1.5l1.5 10" />
    <path d="M15.6 12.5h2.3" />
  </Icone>
);

// Meus testes — estante com três tubos.
export const IconeTubo = (
  <Icone>
    <path d="M3.5 13h17" />
    <path d="M5 13v7M19 13v7" />
    <path d="M7.5 4v11.5a1.5 1.5 0 0 0 3 0V4" />
    <path d="M13.5 4v11.5a1.5 1.5 0 0 0 3 0V4" />
    <path d="M6.5 4h5M12.5 4h5" />
    <path d="M7.5 10h3" />
  </Icone>
);

// Minhas funções — prancheta com lista.
export const IconeFuncoes = (
  <Icone>
    <rect x="5" y="4.5" width="14" height="16" rx="2" />
    <path d="M9 4.5V3.5h6v1" />
    <path d="M8.5 10.5l1.2 1.2 2-2.2" />
    <path d="M13.5 11h2.5" />
    <path d="M8.5 15.5l1.2 1.2 2-2.2" />
    <path d="M13.5 16h2.5" />
  </Icone>
);

// Horas no lab — relógio de parede.
export const IconeRelogio = (
  <Icone>
    <circle cx="12" cy="12.5" r="8" />
    <path d="M12 8.5v4l2.8 1.7" />
    <path d="M9.5 3h5" />
  </Icone>
);

// Agenda — calendário com um horário marcado.
export const IconeAgenda = (
  <Icone>
    <rect x="3.5" y="5" width="17" height="15" rx="2" />
    <path d="M3.5 9.5h17" />
    <path d="M8 3v4M16 3v4" />
    <rect x="7" y="12.5" width="4" height="3.5" rx="0.6" />
  </Icone>
);

// Projetos — pasta com etiqueta.
export const IconePasta = (
  <Icone>
    <path d="M3.5 7a1.5 1.5 0 0 1 1.5-1.5h4.2l2 2.2H19a1.5 1.5 0 0 1 1.5 1.5v8.3A1.5 1.5 0 0 1 19 19H5a1.5 1.5 0 0 1-1.5-1.5z" />
    <path d="M8 13h5" />
  </Icone>
);

// Biotério — gaiola com bebedouro.
export const IconeRato = (
  <Icone>
    <path d="M3.5 9.5h17v9a1.5 1.5 0 0 1-1.5 1.5H5a1.5 1.5 0 0 1-1.5-1.5z" />
    <path d="M3.5 9.5 6 6h12l2.5 3.5" />
    <path d="M8 9.5V20M12 9.5V20M16 9.5V20" />
    <path d="M15 3.5v2.5" />
  </Icone>
);

// Comportamental — labirinto em cruz elevado.
export const IconeLabirinto = (
  <Icone>
    <path d="M9.5 3.5h5v6h6v5h-6v6h-5v-6h-6v-5h6z" />
    <circle cx="12" cy="12" r="1" />
  </Icone>
);

// Protocolos — manual aberto.
export const IconeLivro = (
  <Icone>
    <path d="M12 6.5c-1.6-1.2-4-1.8-8-1.8v13c4 0 6.4.6 8 1.8 1.6-1.2 4-1.8 8-1.8v-13c-4 0-6.4.6-8 1.8z" />
    <path d="M12 6.5v13" />
  </Icone>
);

// Reagentes — erlenmeyer com nível de líquido.
export const IconeFrasco = (
  <Icone>
    <path d="M9.5 3.5h5" />
    <path d="M10.2 3.5v5.3L5 18.4a1.4 1.4 0 0 0 1.2 2.1h11.6a1.4 1.4 0 0 0 1.2-2.1l-5.2-9.6V3.5" />
    <path d="M7.4 14.5h9.2" />
  </Icone>
);

// Estoque — prateleira com frascos.
export const IconeCaixa = (
  <Icone>
    <path d="M3.5 20.5h17M3.5 12.5h17" />
    <path d="M5 12.5V20.5M19 12.5v8" />
    <rect x="6.5" y="6.5" width="3.5" height="6" rx="0.8" />
    <path d="M13 12.5V9a1.5 1.5 0 0 1 3 0v3.5" />
    <path d="M7 15.5h3.5v5H7zM13 17h3.5" />
  </Icone>
);

// Pedidos — nota de pedido.
export const IconeCarrinho = (
  <Icone>
    <path d="M6 3.5h9l3 3v14H6z" />
    <path d="M15 3.5v3h3" />
    <path d="M9 11h6M9 14h6M9 17h3.5" />
  </Icone>
);

// Cadastros — pessoa com marca de aprovado.
export const IconePessoas = (
  <Icone>
    <circle cx="10" cy="8" r="3.5" />
    <path d="M3.5 20a6.5 6.5 0 0 1 11.2-4.5" />
    <path d="m15.5 18 1.8 1.8 3.2-3.6" />
  </Icone>
);

// Painel da orientadora — gráfico de colunas.
export const IconePainel = (
  <Icone>
    <path d="M3.5 20.5h17" />
    <path d="M6.5 20.5v-6M11 20.5V8M15.5 20.5v-9M20 20.5V5" />
  </Icone>
);

// Notícias — jornal dobrado.
export const IconeJornal = (
  <Icone>
    <path d="M4.5 5h12v13.5a2 2 0 0 0 2 2H6.5a2 2 0 0 1-2-2z" />
    <path d="M16.5 9h3v9.5a2 2 0 0 1-2 2" />
    <path d="M7.5 8.5h6M7.5 12h6M7.5 15.5h3.5" />
  </Icone>
);

export const IconeMais = (
  <Icone>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </Icone>
);

export const IconeSair = (
  <Icone>
    <path d="M14 4.5h3.5A1.5 1.5 0 0 1 19 6v12a1.5 1.5 0 0 1-1.5 1.5H14" />
    <path d="M10 16l-4-4 4-4M6 12h9" />
  </Icone>
);

export const IconeFechar = (
  <Icone>
    <path d="M6 6l12 12M18 6 6 18" />
  </Icone>
);
