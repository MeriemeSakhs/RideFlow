import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, PlayCircle, Check } from "lucide-react";
import heroVan from "../../assets/brand/photos/hero-van.jpg";
import Reveal from "./Reveal";
import { useScrollProgress, prefersReducedMotion } from "../../utilities/useScrollAnimation";

const SUPPORTING_POINTS = ["Manual driver assignment", "Driver SMS notifications", "Operational reporting"];

const Hero = () => {
  const [parallaxRef, progress] = useScrollProgress();
  const offset = prefersReducedMotion() ? 0 : (progress - 0.5) * 50;

  return (
    <section id="home" className="relative overflow-hidden bg-rideflow-navy">
      <div ref={parallaxRef} className="absolute inset-0" style={{ transform: `translate3d(0, ${offset}px, 0) scale(1.08)` }}>
        <img src={heroVan} alt="RideFlow vehicle at airport departures" className="w-full h-full object-cover" />
      </div>
      <div className="absolute inset-0 bg-gradient-to-r from-rideflow-navy from-10% via-rideflow-navy/85 via-45% to-rideflow-navy/20" />
      <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-rideflow-navy to-transparent" />

      <div className="relative max-w-7xl mx-auto px-6 pt-32 pb-40 lg:pt-44 lg:pb-52">
        <div className="max-w-2xl">
          <Reveal as="h1" className="text-4xl sm:text-5xl lg:text-[3.75rem] font-extrabold text-white leading-[1.05] tracking-tight">
            Move Every Ride Forward <span className="text-rideflow-orange">With RideFlow</span>
          </Reveal>
          <Reveal
            as="p"
            delay={150}
            className="mt-7 text-lg text-white/70 leading-relaxed max-w-xl"
          >
            A smarter way for transportation companies to manage rides, drivers, pricing, and daily operations — all in one platform.
          </Reveal>
          <Reveal delay={300} className="mt-10 flex flex-wrap items-center gap-4">
            <Link
              to="/signup"
              className="inline-flex items-center gap-2 bg-rideflow-orange hover:bg-rideflow-orange-hover text-white font-semibold px-7 py-3.5 rounded-lg shadow-lg shadow-rideflow-orange/25 transition-colors"
            >
              Get Started <ArrowRight size={18} />
            </Link>
            <a
              href="#how-it-works"
              className="inline-flex items-center gap-2 text-white font-semibold px-6 py-3.5 rounded-lg border border-white/25 hover:bg-white/10 transition-colors backdrop-blur-sm"
            >
              <PlayCircle size={18} /> See How It Works
            </a>
          </Reveal>

          <Reveal delay={450} className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-2.5 pt-7 border-t border-white/15">
            {SUPPORTING_POINTS.map((point) => (
              <div key={point} className="flex items-center gap-2">
                <Check size={14} strokeWidth={3} className="text-rideflow-orange shrink-0" />
                <span className="text-sm font-medium text-white/75">{point}</span>
              </div>
            ))}
          </Reveal>
        </div>
      </div>
    </section>
  );
};

export default Hero;
