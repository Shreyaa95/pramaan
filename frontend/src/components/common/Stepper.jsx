import React from 'react';
import { Check, Sparkles } from 'lucide-react';

export function Stepper({ steps, currentStep, onStepClick }) {
  return (
    <div className="w-full py-4 mb-8">
      {/* Mobile Current Step Headline */}
      <div className="sm:hidden mb-4 p-3.5 rounded-2xl bg-[#121215] border border-[#27272a] flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-2.5">
          <span className="w-7 h-7 rounded-full bg-[#ca0019] text-white text-xs font-bold flex items-center justify-center font-display shadow-glow-crimson">
            {currentStep + 1}
          </span>
          <div>
            <span className="text-xs font-bold text-white block font-display">
              {steps[currentStep]?.title}
            </span>
            <span className="text-[10px] text-gray-400">
              {steps[currentStep]?.subtitle}
            </span>
          </div>
        </div>
        <span className="text-[10px] font-mono text-gray-400 font-bold bg-[#18181b] px-2 py-1 rounded-lg border border-white/5">
          Step {currentStep + 1} of {steps.length}
        </span>
      </div>

      <div className="flex items-center justify-between relative px-4">
        {/* Continuous connector line behind steps */}
        <div className="absolute top-1/2 left-6 right-6 h-1 bg-[#18181b] -translate-y-1/2 z-0 rounded-full border border-white/5" />
        <div
          className="absolute top-1/2 left-6 h-1 bg-gradient-to-r from-[#ca0019] via-[#e0283c] to-[#ef4444] -translate-y-1/2 z-0 transition-all duration-500 ease-out shadow-glow-crimson rounded-full"
          style={{
            width: `${Math.min(100, Math.max(0, (currentStep / (steps.length - 1)) * 100))}%`
          }}
        />

        {steps.map((step, idx) => {
          const isCompleted = idx < currentStep;
          const isCurrent = idx === currentStep;

          return (
            <div
              key={step.id || idx}
              onClick={() => onStepClick && onStepClick(idx)}
              className={`relative z-10 flex flex-col items-center group ${onStepClick ? 'cursor-pointer' : ''}`}
            >
              <div
                className={`
                  w-9 h-9 sm:w-11 sm:h-11 rounded-full flex items-center justify-center font-bold text-xs sm:text-sm transition-all duration-300 font-display select-none
                  ${isCompleted
                    ? 'bg-[#ca0019] text-white shadow-lg shadow-[#ca0019]/40 ring-4 ring-[#09090b] hover:brightness-110'
                    : isCurrent
                    ? 'bg-white text-black shadow-glow-crimson ring-4 ring-[#ca0019]/50 scale-110 font-extrabold'
                    : 'bg-[#121215] text-gray-400 border border-[#27272a] ring-4 ring-[#09090b] group-hover:border-[#3f3f46] group-hover:text-gray-200'
                  }
                `}
              >
                {isCompleted ? <Check className="w-4 h-4 sm:w-5 sm:h-5 stroke-[3]" /> : idx + 1}
              </div>

              {/* Step title label */}
              <div className="absolute top-12 sm:top-14 flex flex-col items-center whitespace-nowrap hidden sm:flex">
                <span
                  className={`text-[11px] sm:text-xs font-bold tracking-tight transition-colors font-display ${
                    isCurrent ? 'text-white' : isCompleted ? 'text-gray-300' : 'text-gray-500'
                  }`}
                >
                  {step.title}
                </span>
                {step.subtitle && (
                  <span className="text-[10px] text-gray-500 hidden md:block mt-0.5 font-sans">
                    {step.subtitle}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
