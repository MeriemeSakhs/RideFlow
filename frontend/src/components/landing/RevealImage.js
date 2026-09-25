import React from "react";
import { useInView, useScrollProgress } from "../../utilities/useScrollAnimation";

const VARIANTS = {
  fade: { hidden: "translateY(28px)" },
  scale: { hidden: "scale(0.96)" },
  clip: { hidden: "none", hiddenClip: "inset(0 0 0 14% round 1.5rem)" },
};

// Photography wrapper: rounded corners + subtle shadow/border (the "premium
// image treatment" from the design brief), a one-time scroll-triggered
// entrance (fade / scale / soft clip-reveal), and an optional continuous
// parallax drift while the section is on screen. Everything collapses to a
// plain static image under prefers-reduced-motion.
const RevealImage = ({ src, alt = "", className = "", variant = "fade", parallax, parallaxStrength = 22 }) => {
  const [viewRef, inView] = useInView();
  const [progressRef, progress] = useScrollProgress();

  const setRefs = (el) => {
    viewRef.current = el;
    progressRef.current = el;
  };

  const cfg = VARIANTS[variant] || VARIANTS.fade;
  const parallaxOffset = parallax ? (progress - 0.5) * parallaxStrength : 0;
  const parallaxTransform =
    parallax === "y" ? `translateY(${parallaxOffset}px)` : parallax === "x" ? `translateX(${parallaxOffset}px)` : "";

  const transform = inView ? parallaxTransform || "none" : `${cfg.hidden} ${parallaxTransform}`.trim();
  const clipPath = variant === "clip" ? (inView ? "inset(0 0 0 0% round 1.5rem)" : cfg.hiddenClip) : undefined;

  return (
    <div
      ref={setRefs}
      className={`relative overflow-hidden rounded-3xl shadow-2xl shadow-black/30 border border-white/10 transition-all duration-[900ms] ease-out ${
        inView ? "opacity-100" : "opacity-0"
      } ${className}`}
      style={{ transform, clipPath }}
    >
      <img src={src} alt={alt} className="w-full h-full object-cover" />
    </div>
  );
};

export default RevealImage;
