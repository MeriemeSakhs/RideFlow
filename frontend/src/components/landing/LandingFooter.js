import React from "react";
import RideFlowLogo from "../branding/RideFlowLogo";

const COLUMNS = [
  { title: "Product", links: [{ label: "Overview", href: "#home" }, { label: "Features", href: "#features" }, { label: "How It Works", href: "#how-it-works" }] },
  { title: "Company", links: [{ label: "About", href: "#about" }, { label: "Contact", href: "#home" }] },
  { title: "Support", links: [{ label: "Help", href: "#home" }, { label: "Documentation", href: "#home" }] },
  { title: "Legal", links: [{ label: "Privacy Policy", href: "#home" }, { label: "Terms of Service", href: "#home" }] },
];

const LandingFooter = () => (
  <footer className="bg-rideflow-navy border-t border-white/10 pt-20 pb-10">
    <div className="max-w-7xl mx-auto px-6 lg:px-8">
      <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-12">
        <div className="lg:col-span-1">
          <RideFlowLogo variant="dark" />
          <p className="mt-5 text-sm text-white/45 leading-relaxed max-w-xs">
            Transportation dispatch and operations management, built for modern fleets.
          </p>
        </div>
        {COLUMNS.map((col) => (
          <div key={col.title}>
            <p className="text-xs font-bold text-white uppercase tracking-wider mb-5">{col.title}</p>
            <ul className="space-y-3">
              {col.links.map((link) => (
                <li key={link.label}>
                  <a href={link.href} className="text-sm text-white/50 hover:text-white transition-colors">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="mt-16 pt-7 border-t border-white/10 text-sm text-white/40">
        &copy; 2026 RideFlow. All rights reserved.
      </div>
    </div>
  </footer>
);

export default LandingFooter;
