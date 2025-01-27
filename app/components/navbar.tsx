"use client";

import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { motion } from "framer-motion";

export default function Navbar() {
  const { theme, setTheme } = useTheme();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 w-full backdrop-blur-xl">
      <div className="container px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Link href="/" className="text-xl font-bold text-foreground">
                nightcore.me
              </Link>
            </motion.div>
            <div className="flex items-center">
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Link 
                  href="/about" 
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors pr-2"
                >
                  about
                </Link>
              </motion.div>
              <div className="mx-3 h-4 w-px bg-border dark:bg-muted-foreground/30" />
              <motion.div
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                >
                  <Sun className="h-5 w-5 dark:hidden" />
                  <Moon className="h-5 w-5 hidden dark:block" />
                </Button>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
