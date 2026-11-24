"use client";

import { useEffect, useRef, useState } from "react";

// Faz o bloco surgir (fade + subida curta) quando entra na tela. Uma vez só.
// Quem pede menos movimento no sistema vê tudo direto (globals.css).
export function Revelar({
  children,
  className = "",
  atraso = 0,
  como: Tag = "div",
}: {
  children: React.ReactNode;
  className?: string;
  atraso?: number;
  como?: "div" | "section" | "li";
}) {
  const ref = useRef<HTMLElement>(null);
  const [visivel, setVisivel] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setVisivel(true);
          obs.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -6% 0px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <Tag
      ref={ref as React.Ref<never>}
      data-visivel={visivel}
      className={`revelar ${className}`}
      style={{ transitionDelay: `${atraso}ms` }}
    >
      {children}
    </Tag>
  );
}
