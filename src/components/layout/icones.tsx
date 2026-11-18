// Ícones de traço da navegação (24×24, stroke = currentColor). Desenhados à
// mão para o LANC — sem biblioteca de ícones, mesmo espírito da paleta.

function Icone({ children }: { children: React.ReactNode }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {children}
    </svg>
  );
}

export const IconeInicio = (
  <Icone>
    <path d="M4 11.5 12 5l8 6.5" />
    <path d="M6 10v9h12v-9" />
    <path d="M10 19v-5h4v5" />
  </Icone>
);

export const IconeTubo = (
  <Icone>
    <path d="M9 3h6" />
    <path d="M10 3v12.5a2 2 0 0 0 4 0V3" />
    <path d="M10 10h4" />
  </Icone>
);

export const IconeFuncoes = (
  <Icone>
    <rect x="4" y="4" width="16" height="16" rx="2" />
    <path d="m8 12 2.5 2.5L16 9" />
  </Icone>
);

export const IconeRelogio = (
  <Icone>
    <circle cx="12" cy="12" r="8" />
    <path d="M12 8v4l2.5 2" />
  </Icone>
);

export const IconePasta = (
  <Icone>
    <path d="M3.5 7.5a2 2 0 0 1 2-2h4l2 2h7a2 2 0 0 1 2 2v7.5a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z" />
  </Icone>
);

export const IconeRato = (
  <Icone>
    <path d="M4 15c0-4 3.5-7 8-7 3 0 5.5 1.5 6.5 4l2 .5-1.5 2H18c-1 2-3.5 3.5-6 3.5H7" />
    <circle cx="8.5" cy="9" r="1.6" />
    <path d="M7 18.5c-2 0-3-1-3-3.5" />
  </Icone>
);

export const IconeLabirinto = (
  <Icone>
    <rect x="4" y="4" width="16" height="16" rx="1.5" />
    <path d="M8 4v8h4M16 8v8h-8M12 16v4" />
  </Icone>
);

export const IconeLivro = (
  <Icone>
    <path d="M5 4.5h10a3 3 0 0 1 3 3V20H8a3 3 0 0 1-3-3z" />
    <path d="M5 17a3 3 0 0 1 3-3h10" />
  </Icone>
);

export const IconeFrasco = (
  <Icone>
    <path d="M9.5 3h5" />
    <path d="M10 3v5.5L5 18a1.6 1.6 0 0 0 1.4 2.4h11.2A1.6 1.6 0 0 0 19 18l-5-9.5V3" />
    <path d="M7.5 14h9" />
  </Icone>
);

export const IconeCaixa = (
  <Icone>
    <path d="M4 8 12 4l8 4v8l-8 4-8-4z" />
    <path d="M4 8l8 4 8-4M12 12v8" />
  </Icone>
);

export const IconeCarrinho = (
  <Icone>
    <path d="M4 5h2l2 10h10l2-7H7.2" />
    <circle cx="10" cy="19" r="1.2" />
    <circle cx="17" cy="19" r="1.2" />
  </Icone>
);

export const IconePessoas = (
  <Icone>
    <circle cx="9" cy="9" r="3" />
    <path d="M3.5 19a5.5 5.5 0 0 1 11 0" />
    <path d="M15.5 6.5a3 3 0 0 1 0 5.5M17 14.5a5 5 0 0 1 3.5 4.5" />
  </Icone>
);

export const IconePainel = (
  <Icone>
    <rect x="4" y="4" width="7" height="9" rx="1.5" />
    <rect x="13" y="4" width="7" height="5" rx="1.5" />
    <rect x="13" y="11" width="7" height="9" rx="1.5" />
    <rect x="4" y="15" width="7" height="5" rx="1.5" />
  </Icone>
);

export const IconeJornal = (
  <Icone>
    <path d="M5 5h11v14H7a2 2 0 0 1-2-2z" />
    <path d="M16 9h3v8a2 2 0 0 1-2 2" />
    <path d="M8 9h5M8 12.5h5M8 16h3" />
  </Icone>
);

export const IconeMais = (
  <Icone>
    <circle cx="6" cy="12" r="1.2" />
    <circle cx="12" cy="12" r="1.2" />
    <circle cx="18" cy="12" r="1.2" />
  </Icone>
);

export const IconeSair = (
  <Icone>
    <path d="M14 5h4a1.5 1.5 0 0 1 1.5 1.5v11A1.5 1.5 0 0 1 18 19h-4" />
    <path d="M10 16l-4-4 4-4M6 12h9" />
  </Icone>
);

export const IconeFechar = (
  <Icone>
    <path d="M6 6l12 12M18 6 6 18" />
  </Icone>
);
