"use client";

import { useEffect, useRef, useState } from "react";
import { animate, useMotionValue, useMotionValueEvent } from "framer-motion";

interface AnimatedNumberProps {
  value: number;
  duration?: number;
  formatter?: (value: number) => string;
  className?: string;
}

export function AnimatedNumber({
  value,
  duration = 0.9,
  formatter = (v) => Math.round(v).toLocaleString(),
  className,
}: AnimatedNumberProps) {
  const motionValue = useMotionValue(0);
  const [display, setDisplay] = useState("0");
  const hasAnimated = useRef(false);

  useMotionValueEvent(motionValue, "change", (latest) => {
    setDisplay(formatter(latest));
  });

  useEffect(() => {
    const controls = animate(motionValue, value, {
      duration: hasAnimated.current ? duration * 0.6 : duration,
      ease: "easeOut",
    });
    hasAnimated.current = true;
    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return <span className={className}>{display}</span>;
}
