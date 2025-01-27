'use client';

interface PageLayoutProps {
  children: React.ReactNode;
  mobilePadding?: string;
  desktopPadding?: string;
}

export default function PageLayout({ 
  children, 
  mobilePadding = "justify-start pt-[10vh] md:justify-start md:py-48"
}: PageLayoutProps) {
  
  return (
    <div className={`container mx-auto min-h-dvh flex flex-col items-center ${mobilePadding} px-4`}>
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