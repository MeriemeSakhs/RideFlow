import React from "react";
import LandingNavbar from "../landing/LandingNavbar";
import Hero from "../landing/Hero";
import Features from "../landing/Features";
import WorkflowStory from "../landing/WorkflowStory";
import ProductOverview from "../landing/ProductOverview";
import FeatureShowcase from "../landing/FeatureShowcase";
import DarkBrandSection from "../landing/DarkBrandSection";
import FinalCta from "../landing/FinalCta";
import LandingFooter from "../landing/LandingFooter";

// The landing page is always dark-themed (navy background, light text) -
// this is a fixed brand choice, not a user-toggleable setting. Section order
// mirrors the navbar links (Home, Features, How It Works, Solutions, About)
// so each anchor scrolls to the section that immediately matches it in flow.
const LandingPage = () => (
  <div className="font-sans">
    <LandingNavbar />
    <Hero />
    <Features />
    <WorkflowStory />
    <ProductOverview />
    <FeatureShowcase />
    <DarkBrandSection />
    <FinalCta />
    <LandingFooter />
  </div>
);

export default LandingPage;
