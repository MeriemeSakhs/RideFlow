import React from "react";
import phoneSms from "../../assets/brand/photos/phone-sms.jpg";
import Reveal from "./Reveal";
import { useInView } from "../../utilities/useScrollAnimation";

const STEPS = [
  { num: "01", title: "A Ride Comes In", text: "Every new request appears instantly in the dispatcher's queue." },
  { num: "02", title: "You Choose the Driver", text: "Review available drivers and make the assignment manually." },
  { num: "03", title: "The Driver Gets the Details", text: "Ride information is sent directly to the driver's phone by SMS." },
  { num: "04", title: "The Ride Gets Moving", text: "Follow the ride as its status changes from pickup to drop-off." },
  { num: "05", title: "The Ride Is Complete", text: "Completed trips are automatically recorded in the system." },
  { num: "06", title: "The Data Tells the Story", text: "Turn completed rides into reports and operational insights." },
];

const StepBlock = ({ step }) => {
  const [ref, active] = useInView({ once: false, threshold: 0, rootMargin: "-42% 0px -42% 0px" });
  return (
    <div
      ref={ref}
      className={`flex gap-5 py-7 border-b border-white/10 last:border-b-0 transition-opacity duration-500 ${
        active ? "opacity-100" : "opacity-40"
      }`}
    >
      <div
        className={`shrink-0 w-11 h-11 rounded-full flex items-center justify-center font-extrabold text-sm transition-colors duration-500 ${
          active ? "bg-rideflow-orange text-white" : "bg-white/10 text-white/50"
        }`}
      >
        {step.num}
      </div>
      <div>
        <h3 className={`font-bold text-lg transition-colors duration-500 ${active ? "text-white" : "text-white/60"}`}>
          {step.title}
        </h3>
        <p className={`mt-1.5 text-sm leading-relaxed max-w-sm transition-colors duration-500 ${active ? "text-white/70" : "text-white/35"}`}>
          {step.text}
        </p>
      </div>
    </div>
  );
};

// The one "premium sticky storytelling" section: a step list on the left that
// activates step-by-step as it scrolls past the viewport center, next to a
// single photo on the right that stays pinned (lg:sticky) for the duration.
// On mobile the sticky column isn't practical, so the photo just becomes a
// normal stacked image above the step list instead.
const WorkflowStory = () => (
  <section id="how-it-works" className="bg-rideflow-navy-light py-28 lg:py-36 overflow-x-hidden">
    <div className="max-w-7xl mx-auto px-6">
      <div className="max-w-2xl mb-14 lg:mb-20">
        <Reveal as="p" className="text-sm font-bold text-rideflow-orange uppercase tracking-wider mb-3">
          Workflow
        </Reveal>
        <Reveal as="h2" delay={100} className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight">
          From Request to Completion.
        </Reveal>
      </div>

      <div className="lg:hidden mb-10 rounded-3xl overflow-hidden border border-white/10 shadow-2xl shadow-black/30 aspect-[4/3]">
        <img src={phoneSms} alt="Driver receiving a RideFlow ride assignment by SMS" className="w-full h-full object-cover" />
      </div>

      <div className="grid lg:grid-cols-2 gap-16 items-start">
        <div>
          {STEPS.map((step) => (
            <StepBlock key={step.num} step={step} />
          ))}
        </div>
        <div className="hidden lg:block sticky top-28 rounded-3xl overflow-hidden border border-white/10 shadow-2xl shadow-black/30 aspect-[4/5]">
          <img src={phoneSms} alt="Driver receiving a RideFlow ride assignment by SMS" className="w-full h-full object-cover" />
        </div>
      </div>
    </div>
  </section>
);

export default WorkflowStory;
