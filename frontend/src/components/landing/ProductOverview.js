import React from "react";
import { Check } from "lucide-react";
import opsWide from "../../assets/brand/photos/ops-wide.jpg";
import Reveal from "./Reveal";
import RevealImage from "./RevealImage";

const CHECKLIST = [
  "Manage ride requests",
  "Select and assign drivers",
  "Monitor active rides",
  "Track vehicle and driver status",
  "Calculate ride pricing",
  "Review operational data",
];

const ProductOverview = () => (
  <section id="solutions" className="bg-rideflow-navy py-28 lg:py-36 overflow-x-hidden">
    <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-16 lg:gap-24 items-center">
      <div className="min-w-0">
        <Reveal as="h2" className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-tight">
          One Platform. Complete Control.
        </Reveal>
        <Reveal as="p" delay={120} className="mt-5 text-white/65 leading-relaxed max-w-md">
          RideFlow brings your transportation operations into one centralized platform — so dispatchers, drivers,
          and managers all work from the same source of truth.
        </Reveal>
        <ul className="mt-8 space-y-3">
          {CHECKLIST.map((item, i) => (
            <Reveal key={item} as="li" delay={200 + i * 60} className="flex items-center gap-3">
              <span className="w-5 h-5 rounded-full bg-rideflow-orange/15 text-rideflow-orange flex items-center justify-center shrink-0">
                <Check size={12} strokeWidth={3} />
              </span>
              <span className="text-sm font-medium text-white">{item}</span>
            </Reveal>
          ))}
        </ul>
      </div>

      <div className="relative min-w-0">
        <div className="absolute -inset-10 bg-rideflow-orange/[0.05] rounded-[3rem] blur-2xl -z-10 hidden lg:block" />
        <RevealImage src={opsWide} alt="Dispatcher using the RideFlow operations platform" variant="scale" className="aspect-[4/3]" />
      </div>
    </div>
  </section>
);

export default ProductOverview;
