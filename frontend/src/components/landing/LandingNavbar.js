import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Menu, X } from "lucide-react";
import RideFlowLogo from "../branding/RideFlowLogo";

const NAV_LINKS = [
  { label: "Home", href: "#home" },
  { label: "Features", href: "#features" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Solutions", href: "#solutions" },
  { label: "About", href: "#about" },
];

const LandingNavbar = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-40 backdrop-blur border-b transition-colors duration-200 ${
        scrolled ? "bg-rideflow-navy/95 border-white/10 shadow-sm" : "bg-rideflow-navy/80 border-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-8 h-[4.5rem] flex items-center justify-between">
        <a href="#home"><RideFlowLogo variant="dark" /></a>

        <nav className="hidden lg:flex items-center gap-9">
          {NAV_LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-sm font-semibold text-white/60 hover:text-white transition-colors"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden lg:flex items-center gap-2">
          <Link
            to="/login"
            className="text-sm font-semibold text-white px-4 py-2.5 rounded-lg hover:bg-white/10 transition-colors"
          >
            Log In
          </Link>
          <Link to="/signup" className="text-sm font-semibold text-white bg-rideflow-orange hover:bg-rideflow-orange-hover px-5 py-2.5 rounded-lg shadow-sm shadow-rideflow-orange/20 transition-colors ml-1">
            Get Started
          </Link>
        </div>

        <div className="flex items-center gap-1 lg:hidden">
          <button type="button" onClick={() => setMenuOpen((v) => !v)} className="text-white p-2" aria-label="Toggle menu">
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="lg:hidden border-t border-white/10 bg-rideflow-navy px-6 py-4 space-y-1">
          {NAV_LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className="block py-2 text-sm font-medium text-white/70 hover:text-white"
            >
              {link.label}
            </a>
          ))}
          <div className="flex flex-col gap-2 pt-3 border-t border-white/10 mt-2">
            <Link
              to="/login"
              className="text-center text-sm font-semibold text-white px-4 py-2.5 rounded-lg border border-white/20"
            >
              Log In
            </Link>
            <Link to="/signup" className="text-center text-sm font-semibold text-white bg-rideflow-orange px-4 py-2.5 rounded-lg">
              Get Started
            </Link>
          </div>
        </div>
      )}
    </header>
  );
};

export default LandingNavbar;
