'use client';

import PageLayout from "./components/PageLayout";
import UploadArea from "./components/UploadArea";
import AnimatedHeading from "./components/AnimatedHeading";

export default function Home() {
  return (
    <PageLayout>
      <AnimatedHeading as="h1" className="text-4xl sm:text-5xl font-bold text-center">
        nightcore.me
      </AnimatedHeading>
      <AnimatedHeading 
        as="h3" 
        delay={0.1} 
        className="text-xl font-medium text-foreground/60 text-center pt-4"
      >
        nightcore any song with a click of a button.
      </AnimatedHeading>
      <UploadArea />
    </PageLayout>
  );
}
