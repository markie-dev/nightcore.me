'use client';

import { motion } from "framer-motion";

export default function AnimatedBackground() {
  return (
    <div className="circle-container">
      <motion.div
        className="circle-animation circle-blue"
        initial={false}
        animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
        transition={{
          duration: 10,
          repeat: Infinity,
          repeatType: "reverse"
        }}
      />
      <motion.div
        className="circle-animation circle-pink"
        initial={false}
        animate={{ scale: [1.2, 1, 1.2], opacity: [0.5, 0.8, 0.5] }}
        transition={{
          duration: 12,
          repeat: Infinity,
          repeatType: "reverse"
        }}
      />
      <motion.div
        className="circle-animation circle-purple"
        initial={false}
        animate={{ scale: [1.1, 1.3, 1.1], opacity: [0.5, 0.8, 0.5] }}
        transition={{
          duration: 8,
          repeat: Infinity,
          repeatType: "reverse"
        }}
      />
    </div>
  );
}