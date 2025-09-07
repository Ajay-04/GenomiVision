import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Plotly from 'plotly.js';

const WizardStep4 = ({ onBack, plotRef, onExport }) => {
  const [userEmail, setUserEmail] = useState(null);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const formats = [
    { id: 'PNG', name: 'PNG', icon: '🖼️' },
    { id: 'JSON', name: 'JSON', icon: '🧾' },
    { id: 'HTML', name: 'HTML', icon: '🌐' },
    { id: 'Python', name: 'Python', icon: '🐍' },
    { id: 'R', name: 'R', icon: '📘' },
  ];

  useEffect(() => {
    const fetchUserEmail = async () => {
      try {
        const res = await axios.get('http://localhost:5000/api/users/me', {
          withCredentials: true,
        });
        setUserEmail(res.data.email);
      } catch (err) {
        console.error('Error fetching user email:', err);
        setError('Failed to fetch user email. Please ensure you are logged in.');
      }
    };

    fetchUserEmail();
  }, []);

  const handleSaveToHistory = async () => {
    if (!userEmail) {
      setError('User email not available. Please ensure you are logged in.');
      return;
    }

    if (!plotRef.current || !document.getElementById('plot')) {
      setError('Visualization not ready. Please ensure a plot is rendered.');
      return;
    }

    setIsSaving(true);
    setError('');
    setSuccessMessage('');

    try {
      const plotDiv = document.getElementById('plot');
      const imageDataUrl = await Plotly.toImage(plotDiv, {
        format: 'png',
        width: 800,
        height: 600,
      });

      const base64Image = imageDataUrl.split(',')[1];

      await axios.post(
        'http://localhost:5000/api/uploads',
        {
          image: base64Image,
          format: 'PNG',
        },
        { withCredentials: true }
      );

      console.log(`Saved visualization to history for ${userEmail}`);
      setSuccessMessage('Saved to History!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.error('Error saving to history:', err);
      setError('Failed to save visualization to history. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="wizard-step">
      <h3>Step 4: Save Visualization</h3>
      {error && <div className="error-message" style={{ color: 'red' }}>{error}</div>}
      {successMessage && (
        <div className="success-message" style={{ color: 'green', textAlign: 'center' }}>
          {successMessage}
        </div>
      )}

      <div className="export-options">
        {formats.map((format) => (
          <div key={format.id} className="export-option" onClick={() => onExport(format.id)}>
            <div style={{ fontSize: '28px' }}>{format.icon}</div>
            <span>{format.name}</span>
          </div>
        ))}
      </div>

      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: '10px',
        marginTop: '20px',
        marginBottom: '20px'
      }}>
        <button
          onClick={handleSaveToHistory}
          disabled={isSaving}
          style={{
            padding: '10px 20px',
            backgroundColor: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: isSaving ? 'not-allowed' : 'pointer',
          }}
        >
          {isSaving ? 'Saving...' : 'Save to History'}
        </button>
        <button
          onClick={onBack}
          style={{
            padding: '10px 20px',
            backgroundColor: '#f44336',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
          }}
        >
          Back
        </button>
      </div>
    </div>
  );
};

export default WizardStep4;