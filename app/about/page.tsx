'use client';

import { GithubLogo, Globe } from "@phosphor-icons/react";
import { motion } from "framer-motion";
import Link from "next/link";
import PageLayout from "../components/PageLayout";
import AnimatedHeading from "../components/AnimatedHeading";

export default function About() {
  return (
    <PageLayout>
      <AnimatedHeading className="text-5xl font-bold text-center">
        made by markie-dev
      </AnimatedHeading>
      
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1, ease: "easeOut" }}
        className="mt-8 text-center max-w-2xl mx-auto"
      >
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-lg mb-6"
        >
          all audio processing is done directly in your browser - no server required.
          your files never leave your device, ensuring complete privacy.
        </motion.p>
        
        <motion.div 
          className="flex justify-center gap-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Link 
              href="https://github.com/markie-dev" 
              target="_blank"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-all"
            >
              <motion.div
                whileHover={{ rotate: 360 }}
                transition={{ duration: 0.5 }}
              >
                <GithubLogo size={20} />
              </motion.div>
              GitHub
            </Link>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Link 
              href="https://markie.dev" 
              target="_blank"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-all"
            >
              <motion.div
                whileHover={{ rotate: 360 }}
                transition={{ duration: 0.5 }}
              >
                <Globe size={20} />
              </motion.div>
              Website
            </Link>
          </motion.div>
        </motion.div>
      </motion.div>
    </PageLayout>
  );
} 