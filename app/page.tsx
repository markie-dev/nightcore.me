'use client';

import PageLayout from "./components/PageLayout";
import UploadArea from "./components/UploadArea";
import AnimatedHeading from "./components/AnimatedHeading";
import { useAudio } from '@/app/contexts/AudioContext';
import { AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { usePathname } from 'next/navigation';

export default function Home() {
  const { isUploaded, isFirstMount, setIsFirstMount } = useAudio();
  const [isMobile, setIsMobile] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    // Reset first mount state when returning to home page
    if (pathname === '/') {
      setIsFirstMount(false);
    }
  }, [pathname, setIsFirstMount]);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const shouldHideHeadings = isUploaded && isMobile;

  return (
    <PageLayout>
      <AnimatePresence mode="sync">
        {!shouldHideHeadings && (
          <>
            <AnimatedHeading 
              as="h1" 
              className="text-4xl sm:text-5xl font-bold text-center"
              exit={{ 
                opacity: 0,
                y: -10,
                transition: { duration: 0.15, ease: "easeInOut" }
              }}
              skipAnimation={!isFirstMount}
            >
              nightcore.me
            </AnimatedHeading>
            <AnimatedHeading 
              as="h3" 
              delay={0.05} 
              className="text-xl font-medium text-foreground/60 text-center pt-4"
              exit={{ 
                opacity: 0,
                y: -10,
                transition: { duration: 0.15, delay: 0.05, ease: "easeInOut" }
              }}
              skipAnimation={!isFirstMount}
            >
              nightcore any song with a click of a button.
            </AnimatedHeading>
          </>
        )}
      </AnimatePresence>
      <UploadArea skipAnimation={!isFirstMount} />
    </PageLayout>
  );
}
