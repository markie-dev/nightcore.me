'use client';

interface PageLayoutProps {
  children: React.ReactNode;
}

export default function PageLayout({ children }: PageLayoutProps) {
  return (
    <div className="container h-full flex flex-col items-center justify-center py-8">
      {/* animated circles */}
      <div className="fixed inset-0 -z-10">
        <div className="circle-animation circle-blue" />
        <div className="circle-animation circle-pink" />
        <div className="circle-animation circle-purple" />
      </div>
      
      {/* blur overlay */}
      <div className="fixed inset-0 -z-10 backdrop-blur-3xl" />
      
      {/* content */}
      <div className="container relative z-10 px-4 sm:pt-48 pt-24 mx-auto max-w-screen-xl">
        {children}
      </div>
    </div>
  );
} 