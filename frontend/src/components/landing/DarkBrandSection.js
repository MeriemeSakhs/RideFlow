import React from "react";
import { PhoneOff, Eye, MessageSquare } from "lucide-react";
import Reveal from "./Reveal";

// Deliberately minimal: large typography, no card grid. Features.js and
// FeatureShowcase.js already cover what RideFlow does - this section is a
// short, high-contrast statement of why it matters, transitioning into the CTA.
const POINTS = [
  { icon: PhoneOff, text: "Less manual coordination" },
  { icon: Eye, text: "Better operational visibility" },
  { icon: MessageSquare, text: "Faster driver communication" },
];

const DarkBrandSection = () => (
  <section className="bg-rideflow-navy py-28 lg:py-36">
    <div className="max-w-4xl mx-auto px-6 text-center">
      <Reveal as="p" className="text-sm font-bold text-rideflow-orange uppercase tracking-wider mb-5">Why RideFlow</Reveal>
      <Reveal as="h2" delay={100} className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-tight">
        Centralized Operations, Not Scattered Tools
      </Reveal>
      <Reveal as="p" delay={220} className="mt-6 text-lg text-white/55 leading-relaxed max-w-2xl mx-auto">
        RideFlow brings dispatching, drivers, pricing, and reporting into one platform - so your team spends less
        time coordinating and more time moving.
      </Reveal>

      <Reveal delay={340} className="mt-12 flex flex-wrap items-center justify-center gap-x-10 gap-y-5">
        {POINTS.map((point) => (
          <div key={point.text} className="flex items-center gap-2.5">
            <point.icon size={16} className="text-rideflow-orange" />
            <span className="text-sm font-semibold text-white/80">{point.text}</span>
          </div>
        ))}
      </Reveal>
    </div>
  </section>
);

export default DarkBrandSection;
