import React from 'react';

const WizardStep2 = ({ onSelect, onBack }) => {
  const iconMap = {
    genome_browser: '🧬',
    circular_map: '⭕',
    heatmap: '🔥',
    bar_chart: '📊',
  };
  const types = [
    { id: 'genome_browser', name: 'Genome Browser' },
    { id: 'circular_map', name: 'Circular Map' },
    { id: 'heatmap', name: 'Heatmap' },
    { id: 'bar_chart', name: 'Bar Chart' },
  ];

  return (
    <div className="wizard-step">
      <h3>Step 2: Choose Visualization Type</h3>
      <div className="type-options">
        {types.map((type) => (
          <div key={type.id} className="type-option" onClick={() => onSelect(type.id)}>
            <div style={{ fontSize: '32px' }}>{iconMap[type.id] || '📈'}</div>
            <span className='box-text'>{type.name}</span>
          </div>
        ))}
      </div>
      <div className="nav-buttons">
        <button onClick={onBack}>Back</button>
      </div>
    </div>
  );
};

export default WizardStep2;
