'use client';

import { motion } from "framer-motion";

export default function AnimatedFooter() {
  return (
    <motion.footer 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, delay: 0.2, ease: "easeOut" }}
      className="p-4 fixed bottom-0 w-full text-center text-sm text-muted-foreground"
    >
      2025 © markle-dev
    </motion.footer>
  );
} 