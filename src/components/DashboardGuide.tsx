import { useState, useEffect } from 'react';
import { X, ChevronRight, ChevronLeft, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';

interface GuideStep {
  title: string;
  description: string;
  icon?: React.ReactNode;
}

interface DashboardGuideProps {
  steps: GuideStep[];
  storageKey: string;
  dashboardName: string;
}

export function DashboardGuide({ steps, storageKey, dashboardName }: DashboardGuideProps) {
  const [showGuide, setShowGuide] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [hasSeenGuide, setHasSeenGuide] = useState(true);

  useEffect(() => {
    const seen = localStorage.getItem(storageKey);
    if (!seen) {
      setHasSeenGuide(false);
      setShowGuide(true);
    }
  }, [storageKey]);

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

      {/* Guide Modal */}
      <AnimatePresence>
        {showGuide && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleClose}
              className="fixed inset-0 bg-background/90 backdrop-blur-sm z-50"
            />

            {/* Guide Content */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
              className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 max-w-lg mx-auto"
            >
              <div className="bg-card border border-border p-8 relative">
                {/* Close button */}
                <button
                  onClick={handleClose}
                  className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>

                {/* Header */}
                <div className="mb-6">
                  <span className="text-xs text-muted-foreground tracking-widest">
                    {dashboardName.toUpperCase()} GUIDE
                  </span>
                  <h2 className="text-2xl font-bold mt-1 tracking-tight">
                    {steps[currentStep].title}
                  </h2>
                </div>

                {/* Step Content */}
                <motion.div
                  key={currentStep}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="mb-8"
                >
                  {steps[currentStep].icon && (
                    <div className="mb-4 p-4 bg-secondary inline-block">
                      {steps[currentStep].icon}
                    </div>
                  )}
                  <p className="text-muted-foreground leading-relaxed">
                    {steps[currentStep].description}
                  </p>
                </motion.div>

                {/* Progress dots */}
                <div className="flex items-center justify-center gap-2 mb-6">
                  {steps.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentStep(index)}
                      className={`w-2 h-2 transition-all duration-300 ${
                        index === currentStep
                          ? 'bg-foreground w-6'
                          : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
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
                    className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    PREV
                  </Button>

                  <span className="text-xs text-muted-foreground tracking-wider">
                    {currentStep + 1} / {steps.length}
                  </span>

                  <Button
                    variant="ghost"
                    onClick={handleNext}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    {currentStep === steps.length - 1 ? 'FINISH' : 'NEXT'}
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
