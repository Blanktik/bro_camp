import { useState, useEffect, useRef } from 'react';
import { X, ChevronRight, ChevronLeft, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';

interface GuideStep {
  title: string;
  description: string;
  icon?: React.ReactNode;
  selector?: string; // CSS selector for the element to highlight
}

interface DashboardGuideProps {
  steps: GuideStep[];
  storageKey: string;
  dashboardName: string;
  onGuideStateChange?: (isShowing: boolean, currentStep: number) => void;
}

export function DashboardGuide({ steps, storageKey, dashboardName, onGuideStateChange }: DashboardGuideProps) {
  const [showGuide, setShowGuide] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [hasSeenGuide, setHasSeenGuide] = useState(true);
  const [highlightRect, setHighlightRect] = useState<DOMRect | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ top: number; left: number; placement: 'top' | 'bottom' | 'left' | 'right' }>({ top: 0, left: 0, placement: 'bottom' });

  useEffect(() => {
    const seen = localStorage.getItem(storageKey);
    if (!seen) {
      setHasSeenGuide(false);
      // Small delay to let the page render
      setTimeout(() => setShowGuide(true), 500);
    }
  }, [storageKey]);

  // Notify parent of guide state changes
  useEffect(() => {
    onGuideStateChange?.(showGuide, currentStep);
  }, [showGuide, currentStep, onGuideStateChange]);

  useEffect(() => {
    if (!showGuide) return;

    const currentSelector = steps[currentStep]?.selector;
    if (currentSelector) {
      const element = document.querySelector(currentSelector);
      if (element) {
        const rect = element.getBoundingClientRect();
        setHighlightRect(rect);
        
        // Calculate tooltip position
        const windowHeight = window.innerHeight;
        const windowWidth = window.innerWidth;
        const tooltipWidth = 400;
        const tooltipHeight = 280; // Increased to account for actual content height
        const padding = 20;

        let top = 0;
        let left = 0;
        let placement: 'top' | 'bottom' | 'left' | 'right' = 'bottom';

        // Try bottom first
        if (rect.bottom + tooltipHeight + padding < windowHeight) {
          top = rect.bottom + padding;
          left = rect.left + rect.width / 2 - tooltipWidth / 2;
          placement = 'bottom';
        }
        // Try top
        else if (rect.top - tooltipHeight - padding > 0) {
          top = rect.top - tooltipHeight - padding;
          left = rect.left + rect.width / 2 - tooltipWidth / 2;
          placement = 'top';
        }
        // Try right
        else if (rect.right + tooltipWidth + padding < windowWidth) {
          top = rect.top + rect.height / 2 - tooltipHeight / 2;
          left = rect.right + padding;
          placement = 'right';
        }
        // Try left
        else {
          top = rect.top + rect.height / 2 - tooltipHeight / 2;
          left = rect.left - tooltipWidth - padding;
          placement = 'left';
        }

        // Keep tooltip within bounds
        left = Math.max(padding, Math.min(left, windowWidth - tooltipWidth - padding));
        top = Math.max(padding, Math.min(top, windowHeight - tooltipHeight - padding));

        setTooltipPosition({ top, left, placement });
      } else {
        setHighlightRect(null);
      }
    } else {
      setHighlightRect(null);
    }
  }, [showGuide, currentStep, steps]);

  // Handle window resize
  useEffect(() => {
    if (!showGuide) return;

    const handleResize = () => {
      const currentSelector = steps[currentStep]?.selector;
      if (currentSelector) {
        const element = document.querySelector(currentSelector);
        if (element) {
          setHighlightRect(element.getBoundingClientRect());
        }
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [showGuide, currentStep, steps]);

  const handleClose = () => {
    setShowGuide(false);
    localStorage.setItem(storageKey, 'true');
    setHasSeenGuide(true);
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleClose();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleReset = () => {
    setCurrentStep(0);
    setShowGuide(true);
  };

  const handleSkip = () => {
    handleClose();
  };

  return (
    <>
      {/* Help button to reopen guide */}
      {hasSeenGuide && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          onClick={handleReset}
          className="fixed bottom-6 left-6 z-40 w-12 h-12 bg-secondary border border-border hover:border-foreground transition-colors flex items-center justify-center group"
          title="View Guide"
        >
          <HelpCircle className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
        </motion.button>
      )}

      {/* Guide Overlay */}
      <AnimatePresence>
        {showGuide && (
          <>
            {/* Full screen blur overlay with spotlight cutout */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 pointer-events-none"
              style={{
                background: highlightRect
                  ? `radial-gradient(ellipse ${highlightRect.width + 40}px ${highlightRect.height + 40}px at ${highlightRect.left + highlightRect.width / 2}px ${highlightRect.top + highlightRect.height / 2}px, transparent 0%, rgba(0, 0, 0, 0.9) 100%)`
                  : 'rgba(0, 0, 0, 0.9)',
              }}
            />

            {/* Backdrop blur layer */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 backdrop-blur-sm pointer-events-auto"
              onClick={handleSkip}
              style={{
                background: 'transparent',
                maskImage: highlightRect
                  ? `radial-gradient(ellipse ${highlightRect.width + 40}px ${highlightRect.height + 40}px at ${highlightRect.left + highlightRect.width / 2}px ${highlightRect.top + highlightRect.height / 2}px, transparent 60%, black 100%)`
                  : 'none',
                WebkitMaskImage: highlightRect
                  ? `radial-gradient(ellipse ${highlightRect.width + 40}px ${highlightRect.height + 40}px at ${highlightRect.left + highlightRect.width / 2}px ${highlightRect.top + highlightRect.height / 2}px, transparent 60%, black 100%)`
                  : 'none',
              }}
            />

            {/* Highlight border around element */}
            {highlightRect && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="fixed z-50 pointer-events-none border-2 border-foreground"
                style={{
                  top: highlightRect.top - 8,
                  left: highlightRect.left - 8,
                  width: highlightRect.width + 16,
                  height: highlightRect.height + 16,
                  boxShadow: '0 0 0 4000px rgba(0, 0, 0, 0.85), 0 0 30px rgba(255, 255, 255, 0.3)',
                }}
              />
            )}

            {/* Tooltip/Guide Content */}
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
              className="fixed z-50 w-[400px] max-w-[calc(100vw-40px)]"
              style={highlightRect ? {
                top: tooltipPosition.top,
                left: tooltipPosition.left,
              } : {
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
              }}
            >
              <div className="bg-card border border-border p-6 relative shadow-2xl">
                {/* Skip button */}
                <button
                  onClick={handleSkip}
                  className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors text-xs tracking-wider"
                >
                  SKIP
                </button>

                {/* Header */}
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs text-muted-foreground tracking-widest">
                      {dashboardName.toUpperCase()} • STEP {currentStep + 1}/{steps.length}
                    </span>
                  </div>
                  <h2 className="text-xl font-bold tracking-tight">
                    {steps[currentStep].title}
                  </h2>
                </div>

                {/* Step Content */}
                <div className="mb-6">
                  {steps[currentStep].icon && (
                    <div className="mb-3 p-3 bg-secondary inline-block">
                      {steps[currentStep].icon}
                    </div>
                  )}
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {steps[currentStep].description}
                  </p>
                </div>

                {/* Progress dots */}
                <div className="flex items-center justify-center gap-2 mb-4">
                  {steps.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentStep(index)}
                      className={`h-1.5 transition-all duration-300 ${
                        index === currentStep
                          ? 'bg-foreground w-6'
                          : index < currentStep
                          ? 'bg-foreground/50 w-1.5'
                          : 'bg-muted-foreground/30 w-1.5 hover:bg-muted-foreground/50'
                      }`}
                    />
                  ))}
                </div>

                {/* Navigation */}
                <div className="flex items-center justify-between">
                  <Button
                    variant="ghost"
                    onClick={handlePrev}
                    disabled={currentStep === 0}
                    className="text-muted-foreground hover:text-foreground disabled:opacity-30 text-xs tracking-wider"
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    BACK
                  </Button>

                  <Button
                    variant="outline"
                    onClick={handleNext}
                    className="border-foreground text-foreground hover:bg-foreground hover:text-background text-xs tracking-wider"
                  >
                    {currentStep === steps.length - 1 ? 'GET STARTED' : 'NEXT'}
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
