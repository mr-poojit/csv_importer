'use client';

const steps = [
  { num: 1, label: 'Upload CSV' },
  { num: 2, label: 'Preview Data' },
  { num: 3, label: 'AI Import' },
  { num: 4, label: 'Results' },
];

export default function StepIndicator({ currentStep }) {
  return (
    <div className="step-indicator" id="step-indicator">
      {steps.map((step, i) => (
        <div key={step.num} style={{ display: 'flex', alignItems: 'center' }}>
          <div className="step-item">
            <div
              className={`step-circle ${
                currentStep === step.num
                  ? 'active'
                  : currentStep > step.num
                  ? 'completed'
                  : ''
              }`}
            >
              {currentStep > step.num ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                step.num
              )}
            </div>
            <span
              className={`step-label ${
                currentStep === step.num
                  ? 'active'
                  : currentStep > step.num
                  ? 'completed'
                  : ''
              }`}
            >
              {step.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div
              className={`step-connector ${
                currentStep > step.num ? 'completed' : ''
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}
