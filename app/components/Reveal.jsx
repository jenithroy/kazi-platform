"use client";

import { forwardRef, useEffect, useRef, useState } from "react";

export const Reveal = forwardRef(function Reveal(
  { as: Tag = "div", className = "", delay = 0, style, ...props },
  forwardedRef,
) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      ref={(el) => {
        ref.current = el;
        if (typeof forwardedRef === "function") forwardedRef(el);
        else if (forwardedRef) forwardedRef.current = el;
      }}
      className={`reveal ${className}`}
      data-revealed={visible ? "" : undefined}
      style={{ transitionDelay: `${delay}ms`, ...style }}
      {...props}
    />
  );
});
