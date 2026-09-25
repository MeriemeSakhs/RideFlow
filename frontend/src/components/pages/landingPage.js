import React from "react";
import LandingNavbar from "../landing/LandingNavbar";
import Hero from "../landing/Hero";
import Features from "../landing/Features";
import ProductOverview from "../landing/ProductOverview";
import WorkflowStory from "../landing/WorkflowStory";
import FeatureShowcase from "../landing/FeatureShowcase";
import DarkBrandSection from "../landing/DarkBrandSection";
import FinalCta from "../landing/FinalCta";
import LandingFooter from "../landing/LandingFooter";

// The landing page is always dark-themed (navy background, light text) -
// this is a fixed brand choice, not a user-toggleable setting. Section
// backgrounds alternate navy -> navy-light -> navy -> navy-light -> navy,
// so no single section blends into its neighbor.
const LandingPage = () => (
  <div className="font-sans">
    <LandingNavbar />
    <Hero />
    <Features />
    <ProductOverview />
    <WorkflowStory />
    <FeatureShowcase />
    <DarkBrandSection />
    <FinalCta />
    <LandingFooter />
  </div>
);

export default LandingPage;
