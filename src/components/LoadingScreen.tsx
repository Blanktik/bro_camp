export function LoadingScreen() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center animate-fade-in">
      <div className="text-center space-y-8">
        {/* BROCAMP Branding */}
        <h1 className="text-4xl md:text-6xl font-bold tracking-tighter animate-fade-in-up">
          <span className="bg-white text-black px-3 inline-block animate-pulse">BRO</span>CAMP
        </h1>
        
        {/* Warning Message */}
        <div className="space-y-4 animate-fade-in-up animate-delay-200">
          <div className="border border-gray-850 px-6 py-3 inline-block">
            <p className="text-xs tracking-[0.3em] text-gray-400">WARNING</p>
          </div>
          <p className="text-2xl md:text-3xl font-light tracking-tight text-white animate-pulse">
            A BRIGHT FUTURE IS LOADING
          </p>
        </div>
        
        {/* Loading Animation */}
        <div className="flex justify-center gap-2 animate-fade-in-up animate-delay-300">
          <div className="w-2 h-2 bg-white animate-pulse" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 bg-white animate-pulse" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 bg-white animate-pulse" style={{ animationDelay: '300ms' }} />
          <div className="w-2 h-2 bg-white animate-pulse" style={{ animationDelay: '450ms' }} />
        </div>
        
        {/* Progress Bar */}
        <div className="w-64 h-px bg-gray-850 mx-auto overflow-hidden animate-fade-in-up animate-delay-400">
          <div className="h-full bg-white w-full animate-slide-in-right" style={{ animationDuration: '1.5s', animationIterationCount: 'infinite' }} />
        </div>
      </div>
    </div>
  );
}
