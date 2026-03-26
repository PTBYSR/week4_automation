"use client";

import { StepNumber } from "@/lib/types";

interface StepIndicatorProps {
  currentStep: StepNumber;
}

const steps = [
  { number: 1 as StepNumber, label: "Ideation" },
  { number: 2 as StepNumber, label: "Review" },
  { number: 3 as StepNumber, label: "Publish" },
];

export default function StepIndicator({ currentStep }: StepIndicatorProps) {
  return (
    <div className="flex items-center justify-center gap-0 border-b border-gray-200">
      {steps.map((step) => {
        const isActive = step.number === currentStep;
        const isCompleted = step.number < currentStep;

        return (
          <div
            key={step.number}
            className={`relative px-6 py-3 text-sm transition-colors ${
              isActive
                ? "border-b-2 border-black font-medium text-black"
                : isCompleted
                ? "text-gray-500"
                : "text-gray-400"
            }`}
          >
            <span className="mr-1.5 text-xs">
              {isCompleted ? "✓" : `${step.number}.`}
            </span>
            {step.label}
          </div>
        );
      })}
    </div>
  );
}
