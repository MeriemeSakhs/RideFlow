import React from "react";
import markLight from "../../assets/brand/rideflow-mark-light.png";
import markDark from "../../assets/brand/rideflow-mark-dark.png";

// The real RideFlow mark, extracted from the brand guide (navy + orange
// ribbon "R"). variant="dark" is the white + orange version for navy
// backgrounds; variant="light" (default) is navy + orange for light
// backgrounds.
const RideFlowMark = ({ variant = "light", className = "" }) => (
  <img src={variant === "dark" ? markDark : markLight} alt="" aria-hidden="true" className={`object-contain ${className}`} />
);

const RideFlowLogo = ({ variant = "light", showTagline = false, size = "md", className = "" }) => {
  const textColor = variant === "dark" ? "text-white" : "text-rideflow-navy";
  const sizes = {
    sm: { icon: "w-7 h-6", text: "text-lg" },
    md: { icon: "w-9 h-8", text: "text-2xl" },
    lg: { icon: "w-11 h-10", text: "text-3xl" },
  };
  const { icon, text } = sizes[size] || sizes.md;
  const taglineColor = variant === "dark" ? "text-white/60" : "text-rideflow-navy/50";

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <RideFlowMark variant={variant} className={icon} />
      <div>
        <span className={`font-extrabold tracking-tight ${text} ${textColor}`}>
          Ride<span className="text-rideflow-orange">Flow</span>
        </span>
        {showTagline && (
          <p className={`text-[10px] font-semibold tracking-[0.2em] uppercase -mt-0.5 ${taglineColor}`}>
            Operations in Motion
          </p>
        )}
      </div>
    </div>
  );
};

export default RideFlowLogo;
export { RideFlowMark };
