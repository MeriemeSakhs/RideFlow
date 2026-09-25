import React from "react";
import { ClipboardList, Users, DollarSign, BarChart3 } from "lucide-react";
import Reveal from "./Reveal";

const FEATURES = [
  { icon: ClipboardList, title: "Ride Management", text: "Create, update, assign, and manage ride requests from one centralized system." },
  { icon: Users, title: "Driver Management", text: "Manage driver availability, assignments, statuses, and communication." },
  { icon: DollarSign, title: "Pricing Management", text: "Calculate ride prices based on the pricing rules you configure." },
  { icon: BarChart3, title: "Reporting & Insights", text: "Access operational reports and understand ride and driver performance." },
];

const Features = () => (
  <section id="features" className="bg-rideflow-navy-light py-24 lg:py-28">
    <div className="max-w-7xl mx-auto px-6">
      <div className="max-w-2xl mb-14">
        <Reveal as="p" className="text-sm font-bold text-rideflow-orange uppercase tracking-wider mb-3">Platform</Reveal>
        <Reveal as="h2" delay={100} className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          Everything You Need to Run Your Transportation Operation
        </Reveal>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {FEATURES.map((f, i) => (
          <Reveal
            key={f.title}
            delay={i * 90}
            className="bg-rideflow-navy rounded-2xl border border-white/10 p-7 transition-all duration-200 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/20 hover:border-rideflow-orange/20"
          >
            <div className="w-12 h-12 rounded-xl bg-rideflow-orange/15 flex items-center justify-center mb-6">
              <f.icon size={21} className="text-rideflow-orange" />
            </div>
            <h3 className="font-bold text-white mb-2.5">{f.title}</h3>
            <p className="text-sm text-white/60 leading-relaxed">{f.text}</p>
          </Reveal>
        ))}
      </div>
    </div>
  </section>
);

export default Features;
