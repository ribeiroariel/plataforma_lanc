// Canais oficiais do LANC: um lugar só, usado no rodapé e na página de notícias.
export const EMAIL_LANC = "lancfurb@outlook.com";
export const INSTAGRAM_LANC = { usuario: "@lancfurb", url: "https://www.instagram.com/lancfurb/" };

function IconeEmail() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3.5" y="5.5" width="17" height="13" rx="2" />
      <path d="m4 7 8 6 8-6" />
    </svg>
  );
}

function IconeInstagram() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.2" cy="6.8" r="0.6" fill="currentColor" />
    </svg>
  );
}

export function LinksContato({ className = "" }: { className?: string }) {
  return (
    <ul className={`flex flex-col gap-2 text-sm ${className}`}>
      <li>
        <a href={`mailto:${EMAIL_LANC}`} className="flex items-center gap-2 text-ink hover:text-signal">
          <span className="text-ink-soft">
            <IconeEmail />
          </span>
          {EMAIL_LANC}
        </a>
      </li>
      <li>
        <a
          href={INSTAGRAM_LANC.url}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 text-ink hover:text-signal"
        >
          <span className="text-ink-soft">
            <IconeInstagram />
          </span>
          {INSTAGRAM_LANC.usuario} no Instagram
        </a>
      </li>
    </ul>
  );
}

/** Rodapé discreto da área logada. */
export function RodapeInterno() {
  return (
    <footer data-noprint className="mt-16 border-t border-rule">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-5 text-xs text-ink-soft sm:px-6">
        <span>LANC · Laboratório de Neurociências e Comportamento · FURB</span>
        <span className="flex items-center gap-4">
          <a href={`mailto:${EMAIL_LANC}`} className="hover:text-signal">
            {EMAIL_LANC}
          </a>
          <a href={INSTAGRAM_LANC.url} target="_blank" rel="noreferrer" className="hover:text-signal">
            Instagram {INSTAGRAM_LANC.usuario}
          </a>
        </span>
      </div>
    </footer>
  );
}
