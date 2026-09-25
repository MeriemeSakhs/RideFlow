import { useEffect, useRef, useState } from "react";

export const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Tracks whether the element is in the viewport. By default fires once (for
// one-shot entrance reveals); pass `once: false` to keep toggling both ways
// (for scroll-driven "active step" style UI). Reduced-motion users get
// `inView: true` immediately (no observer set up) so content just appears.
export const useInView = ({ once = true, ...observerOptions } = {}) => {
  const ref = useRef(null);
  const [inView, setInView] = useState(() => prefersReducedMotion());

  useEffect(() => {
    if (prefersReducedMotion()) return;
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setInView(entry.isIntersecting);
        if (entry.isIntersecting && once) observer.unobserve(el);
      },
      { threshold: 0.18, rootMargin: "0px 0px -10% 0px", ...observerOptions }
    );
    observer.observe(el);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return [ref, inView];
};

// Continuously tracks how far a section has scrolled through the viewport,
// as a 0-1 progress value (0 = just entering from below, 1 = just left above).
// Used for parallax offsets and scroll-linked effects. No-ops under reduced motion.
export const useScrollProgress = () => {
  const ref = useRef(null);
  const [progress, setProgress] = useState(0);
  const reduced = useRef(prefersReducedMotion());

  useEffect(() => {
    if (reduced.current) return;
    let ticking = false;
    const update = () => {
      const el = ref.current;
      ticking = false;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight || 1;
      const raw = (vh - rect.top) / (vh + rect.height);
      setProgress(Math.min(1, Math.max(0, raw)));
    };
    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return [ref, reduced.current ? 0.5 : progress];
};
