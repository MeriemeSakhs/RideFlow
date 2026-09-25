import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import opsWide from "../../assets/brand/photos/ops-wide.jpg";
import Reveal from "./Reveal";
import { useScrollProgress, prefersReducedMotion } from "../../utilities/useScrollAnimation";

const FinalCta = () => {
  const [parallaxRef, progress] = useScrollProgress();
  const offset = prefersReducedMotion() ? 0 : (progress - 0.5) * 30;

  return (
    <section className="relative bg-rideflow-navy border-t border-white/10 py-32 lg:py-40 overflow-hidden">
      <div
        ref={parallaxRef}
        className="absolute inset-0 opacity-[0.12]"
        style={{ transform: `translate3d(0, ${offset}px, 0) scale(1.1)` }}
      >
        <img src={opsWide} alt="" className="w-full h-full object-cover" />
      </div>
      <div className="absolute inset-0 bg-rideflow-navy/80" />
      <svg className="absolute inset-0 w-full h-full opacity-[0.07]" preserveAspectRatio="none" viewBox="0 0 1000 400">
        <path d="M0 320 Q250 200 500 260 T1000 180" stroke="#FFA313" strokeWidth="3" fill="none" />
        <path d="M0 200 Q250 340 500 120 T1000 300" stroke="#FFFFFF" strokeWidth="2" fill="none" />
      </svg>

      <div className="relative max-w-3xl mx-auto px-6 text-center">
        <Reveal as="h2" className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-tight">
          Take Control of Every Ride.
        </Reveal>
        <Reveal as="p" delay={120} className="mt-6 text-white/65 text-lg">
          Bring dispatch, drivers, and operations together in one platform.
        </Reveal>
        <Reveal delay={240} className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link
            to="/signup"
            className="inline-flex items-center gap-2 bg-rideflow-orange hover:bg-rideflow-orange-hover text-white font-semibold px-8 py-4 rounded-lg shadow-lg shadow-rideflow-orange/25 transition-colors"
          >
            Get Started <ArrowRight size={18} />
          </Link>
          <a
            href="#home"
            className="inline-flex items-center gap-2 text-white font-semibold px-8 py-4 rounded-lg border border-white/25 hover:bg-white/5 transition-colors"
          >
            Contact Us
          </a>
        </Reveal>
      </div>
    </section>
  );
};

export default FinalCta;
