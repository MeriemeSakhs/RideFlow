import React from "react";
import { Check } from "lucide-react";
import opsTight from "../../assets/brand/photos/ops-tight.jpg";
import phoneSms from "../../assets/brand/photos/phone-sms.jpg";
import heroVan from "../../assets/brand/photos/hero-van.jpg";
import laptopDash from "../../assets/brand/photos/laptop-dash.jpg";
import Reveal from "./Reveal";
import RevealImage from "./RevealImage";

const ROWS = [
  {
    title: "Smart Dispatch",
    text: "Dispatchers see incoming ride requests and available drivers side by side, and choose who gets assigned.",
    bullets: ["View pending and active ride requests", "See which drivers are currently available", "Assign a driver manually - never automatic"],
    image: opsTight,
    alt: "Dispatcher reviewing ride requests on the RideFlow platform",
    variant: "fade",
    aspect: "aspect-[5/4]",
  },
  {
    title: "Driver Communication",
    text: "Once a ride is assigned, RideFlow notifies the driver by SMS with the details they need to get moving.",
    bullets: ["Assignment sent by SMS automatically", "No app download required for drivers", "Pickup, passenger, and vehicle details included"],
    image: phoneSms,
    alt: "Driver's phone showing a RideFlow ride assignment notification",
    variant: "scale",
    aspect: "aspect-[4/5]",
  },
  {
    title: "Real-Time Tracking",
    text: "See ride statuses and driver availability at a glance, so dispatchers know what's in progress and what needs attention.",
    bullets: ["Live view of active and pending rides", "Driver availability at a glance", "Status updates as rides progress"],
    image: heroVan,
    alt: "RideFlow vehicle on the road",
    variant: "fade",
    parallax: "x",
    aspect: "aspect-[5/4]",
  },
  {
    title: "Reporting & Analytics",
    text: "Turn ride and driver activity into reports that show completed rides, driver performance, and operational trends.",
    bullets: ["Completed ride and revenue summaries", "Driver performance by ride volume", "Operational trends over time"],
    image: laptopDash,
    alt: "Laptop showing the RideFlow operations dashboard",
    variant: "clip",
    aspect: "aspect-[5/4]",
  },
];

const FeatureShowcase = () => (
  <section id="about" className="bg-rideflow-navy py-28 lg:py-36 overflow-x-hidden">
    <div className="max-w-7xl mx-auto px-6 space-y-28 lg:space-y-36">
      {ROWS.map((row, i) => {
        const reverse = i % 2 === 1;
        return (
          <div key={row.title} className="grid lg:grid-cols-2 gap-16 items-center">
            <div className={`min-w-0 ${reverse ? "lg:order-2" : ""}`}>
              <Reveal as="h3" direction={reverse ? "right" : "left"} className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight">
                {row.title}
              </Reveal>
              <Reveal as="p" delay={100} direction={reverse ? "right" : "left"} className="mt-4 text-white/65 leading-relaxed max-w-lg">
                {row.text}
              </Reveal>
              <ul className="mt-6 space-y-2.5">
                {row.bullets.map((bullet, bi) => (
                  <Reveal key={bullet} as="li" delay={200 + bi * 90} className="flex items-start gap-2.5">
                    <span className="w-[18px] h-[18px] mt-0.5 rounded-full bg-rideflow-orange/15 text-rideflow-orange flex items-center justify-center shrink-0">
                      <Check size={10} strokeWidth={3.5} />
                    </span>
                    <span className="text-sm text-white/75">{bullet}</span>
                  </Reveal>
                ))}
              </ul>
            </div>
            <div className={`min-w-0 ${reverse ? "lg:order-1" : ""}`}>
              <div className="max-w-md mx-auto lg:mx-0">
                <RevealImage src={row.image} alt={row.alt} variant={row.variant} parallax={row.parallax} className={row.aspect} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  </section>
);

export default FeatureShowcase;
