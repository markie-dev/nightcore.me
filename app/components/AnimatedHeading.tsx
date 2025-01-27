'use client';

import { motion, TargetAndTransition, VariantLabels } from "framer-motion";

interface AnimatedHeadingProps {
  children: React.ReactNode;
  as?: 'h1' | 'h2' | 'h3';
  delay?: number;
  className?: string;
  exit?: TargetAndTransition | VariantLabels;
  skipAnimation?: boolean;
}

export default function AnimatedHeading({ 
  children, 
  as = 'h1', 
  delay = 0,
  className = "",
  exit,
  skipAnimation = false
}: AnimatedHeadingProps) {
  const Component = motion[as];
  
  return (
    <Component
      initial={skipAnimation ? false : { opacity: 0, scale: 0.98 }}
      animate={skipAnimation ? false : { opacity: 1, scale: 1 }}
      exit={skipAnimation ? undefined : exit}
      transition={{ duration: 0.3, delay, ease: "easeOut" }}
      className={className}
    >
      {children}
    </Component>
  );
} 