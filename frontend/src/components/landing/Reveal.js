import React from "react";
import { useInView } from "../../utilities/useScrollAnimation";

const DIRECTIONS = {
  up: "translateY(24px)",
  down: "translateY(-24px)",
  left: "translateX(24px)",
  right: "translateX(-24px)",
  none: "none",
};

// Generic fade+translate reveal for text/content blocks - fires once when the
// element scrolls into view (or immediately, unanimated, under reduced motion).
const Reveal = ({ as: Tag = "div", direction = "up", delay = 0, duration = 700, className = "", children, ...rest }) => {
  const [ref, inView] = useInView();
  return (
    <Tag
      ref={ref}
      className={`transition-all ease-out ${inView ? "opacity-100" : "opacity-0"} ${className}`}
      style={{
        transitionDuration: `${duration}ms`,
        transitionDelay: inView ? `${delay}ms` : "0ms",
        transform: inView ? "none" : DIRECTIONS[direction],
      }}
      {...rest}
    >
      {children}
    </Tag>
  );
};

export default Reveal;
