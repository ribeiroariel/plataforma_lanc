// Ícones da navegação, desenhados para o LANC (grade de 24 px, traço 1,5,
// cantos arredondados). Cada um mostra o objeto da aba: o rato do biotério,
// a estante de tubos dos testes, o labirinto em cruz do comportamental, o
// erlenmeyer dos reagentes...

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

// Início — casa.
export const IconeInicio = (
  <Icone>
    <path d="M3.5 11 12 4l8.5 7" />
    <path d="M5.5 9.5V19a1 1 0 0 0 1 1H10v-5.5h4V20h3.5a1 1 0 0 0 1-1V9.5" />
  </Icone>
);

// Meus testes — três tubos de ensaio numa estante, com líquido.
export const IconeTubo = (
  <Icone>
    <path d="M3 9.5h18" />
    <path d="M4.5 9.5V21M19.5 9.5V21" />
    <path d="M7 3.5v12.2a1.5 1.5 0 0 0 3 0V3.5" />
    <path d="M14 3.5v12.2a1.5 1.5 0 0 0 3 0V3.5" />
    <path d="M6.2 3.5h4.6M13.2 3.5h4.6" />
    <path d="M7 12.5h3M14 13.5h3" />
  </Icone>
);

// Minhas funções — crachá com cordão (a função de cada um no sacrifício).
export const IconeFuncoes = (
  <Icone>
    <path d="M9 3.5 12 8l3-4.5" />
    <rect x="5.5" y="8" width="13" height="12.5" rx="2" />
    <circle cx="12" cy="12.5" r="2" />
    <path d="M8.5 18c.6-1.5 1.9-2.3 3.5-2.3s2.9.8 3.5 2.3" />
  </Icone>
);

// Horas no lab — cronômetro.
export const IconeRelogio = (
  <Icone>
    <circle cx="12" cy="13.5" r="7" />
    <path d="M12 10v3.5l2.3 1.4" />
    <path d="M10 3.5h4M12 3.5v3" />
    <path d="m18.2 6.8 1.3-1.3" />
  </Icone>
);

// Agenda — calendário com dias marcados.
export const IconeAgenda = (
  <Icone>
    <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
    <path d="M3.5 9.5h17" />
    <path d="M8 3v4M16 3v4" />
    <path d="M7.5 13h2M11 13h2M14.5 13h2M7.5 16.5h2M11 16.5h2" />
  </Icone>
);

// Projetos — caderno de laboratório com espiral.
export const IconePasta = (
  <Icone>
    <rect x="6" y="3.5" width="13" height="17" rx="1.5" />
    <path d="M4 7h3.5M4 11h3.5M4 15h3.5M4 19h3.5" />
    <path d="M10.5 8h5M10.5 11.5h5M10.5 15h3" />
  </Icone>
);

// Biotério — rato de perfil: corpo alongado, focinho fino, orelha, olho,
// patas e rabo.
export const IconeRato = (
  <Icone>
    <path d="M4.5 15.2c0-2.6 2.6-4.7 6.6-4.7 2.6 0 4.6.9 5.9 2.4l3.8 1.6c.5.2.5.9 0 1.1l-3.6 1.2c-1 .8-2.4 1.2-4 1.2H6.6c-1.2 0-2.1-1-2.1-1.8z" />
    <path d="M14.4 11c-.4-1.6.4-2.8 1.6-2.8s1.8 1.3 1.2 2.6" />
    <circle cx="17.4" cy="13.4" r="0.55" fill="currentColor" stroke="none" />
    <path d="M8.5 18v1.3M14 18v1.3" />
    <path d="M4.7 16.2c-1.6.6-2.3 1.8-1.7 2.8.8 1.3 3.1 1 5 .3" />
  </Icone>
);

// Comportamental — labirinto visto de cima, com entrada, saída e o animal
// na entrada.
export const IconeLabirinto = (
  <Icone>
    <path d="M3.5 8.5V3.5h17v8" />
    <path d="M20.5 15.5v5h-17v-8" />
    <path d="M8 3.5v5h4" />
    <path d="M12 8.5v4H8v4h8.5" />
    <path d="M16.5 7.5v5" />
    <circle cx="5.8" cy="10.5" r="1" fill="currentColor" stroke="none" />
  </Icone>
);

// Protocolos — manual de técnicas aberto, com marcador.
export const IconeLivro = (
  <Icone>
    <path d="M12 6.5C10.2 5.2 7.6 4.6 4 4.6v13.2c3.6 0 6.2.6 8 1.9 1.8-1.3 4.4-1.9 8-1.9V4.6c-3.6 0-6.2.6-8 1.9z" />
    <path d="M12 6.5v13.2" />
    <path d="M15.5 5v4.5l1.2-.9 1.2.9V4.8" />
    <path d="M6.5 9h3M6.5 12h3" />
  </Icone>
);

// Reagentes — erlenmeyer com líquido e bolhas.
export const IconeFrasco = (
  <Icone>
    <path d="M9.5 3.5h5" />
    <path d="M10.2 3.5v5.4L4.9 18.3a1.5 1.5 0 0 0 1.3 2.2h11.6a1.5 1.5 0 0 0 1.3-2.2l-5.3-9.4V3.5" />
    <path d="M7.2 14.5h9.6" />
    <circle cx="11" cy="17.4" r="0.7" />
    <circle cx="13.6" cy="16.6" r="0.5" />
  </Icone>
);

// Estoque — prateleira com frascos de reagente.
export const IconeCaixa = (
  <Icone>
    <path d="M3 20.5h18M3 12h18" />
    <path d="M6 12V7.5h3V12" />
    <path d="M6.6 7.5V5.5h1.8v2" />
    <path d="M12 12V8.8a1.8 1.8 0 0 1 3.6 0V12" />
    <path d="M6 20.5v-5h3.5v5" />
    <path d="M13 20.5v-3.2a1.8 1.8 0 0 1 3.6 0v3.2" />
  </Icone>
);

// Pedidos — carrinho de compras (pedido de reagente/material).
export const IconeCarrinho = (
  <Icone>
    <path d="M3.5 4.5h2l2.2 10.5h10l2-7.5H6.5" />
    <circle cx="9.5" cy="19" r="1.4" />
    <circle cx="16.5" cy="19" r="1.4" />
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

// Painel da orientadora — gráfico de colunas com tendência.
export const IconePainel = (
  <Icone>
    <path d="M3.5 20.5h17" />
    <path d="M6.5 20.5V15M11 20.5v-8M15.5 20.5v-6M20 20.5V9" />
    <path d="m5.5 11 5-4.5 4 3 5-5" />
  </Icone>
);

// Notícias — jornal dobrado.
export const IconeJornal = (
  <Icone>
    <path d="M4.5 5h12v13.5a2 2 0 0 0 2 2H6.5a2 2 0 0 1-2-2z" />
    <path d="M16.5 9h3v9.5a2 2 0 0 1-2 2" />
    <rect x="7.5" y="8" width="6" height="3.5" rx="0.5" />
    <path d="M7.5 14.5h6M7.5 17h4" />
  </Icone>
);

// Escrever notícia — caneta sobre a folha.
export const IconeCaneta = (
  <Icone>
    <path d="M14 4.5H6.5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V12" />
    <path d="M17.6 3.6a1.8 1.8 0 0 1 2.6 2.6L12.8 13.6l-3.3.8.8-3.3z" />
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
