'use client';

import { motion } from "framer-motion";

interface AnimatedHeadingProps {
  children: React.ReactNode;
  as?: 'h1' | 'h2' | 'h3';
  delay?: number;
  className?: string;
}

export default function AnimatedHeading({ 
  children, 
  as = 'h1', 
  delay = 0,
  className = "" 
}: AnimatedHeadingProps) {
  const Component = motion[as];
  
  return (
    <Component
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, delay, ease: "easeOut" }}
      className={className}
    >
      {children}
    </Component>
  );
} 