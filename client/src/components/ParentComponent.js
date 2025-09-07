import React, { useState } from 'react';
import WizardStep4 from './WizardStep4';

const ParentComponent = () => {
  const [step, setStep] = useState(4);

  const handleBack = () => {
    setStep(step - 1);
  };

  return (
    <div>
      <div id="visualization" style={{ width: '400px', height: '300px', background: '#f0f0f0', padding: '20px' }}>
        Sample Visualization Content (Replace with your chart/canvas)
      </div>
      {step === 4 && <WizardStep4 onBack={handleBack} />}
    </div>
  );
};

export default ParentComponent;