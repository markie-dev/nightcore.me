'use client';

interface PageLayoutProps {
  children: React.ReactNode;
}

export default function PageLayout({ children }: PageLayoutProps) {
  return (
    <div className="container mx-auto h-full flex flex-col items-center justify-center py-8 px-4 pt-36">
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