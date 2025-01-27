'use client';

interface PageLayoutProps {
  children: React.ReactNode;
  mobilePadding?: string;
  desktopPadding?: string;
}

export default function PageLayout({ 
  children, 
  mobilePadding = "py-24",  // default for home page
  desktopPadding = "py-48"  // default for all pages
}: PageLayoutProps) {
  return (
    <div className={`container mx-auto min-h-dvh flex flex-col items-center justify-start ${mobilePadding} sm:${desktopPadding} px-4`}>
      {/* animated circles */}
      <div className="fixed inset-0 -z-10">
        <div className="circle-animation circle-blue" />
        <div className="circle-animation circle-pink" />
        <div className="circle-animation circle-purple" />
      </div>
      
      {/* blur overlay */}
      <div className="fixed inset-0 -z-10 backdrop-blur-3xl" />
      
      {/* content */}
      <div className="w-full max-w-4xl mx-auto">
        {children}
      </div>
    </div>
  );
} 