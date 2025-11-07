import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Plotly from 'plotly.js';

const WizardStep4 = ({ onBack, plotRef, onExport, visualizationType }) => {
  const [userEmail, setUserEmail] = useState(null);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Map chart type IDs to readable names
  const chartTypeNames = {
    'bar_chart': 'Bar Chart',
    'line_chart': 'Line Chart', 
    'scatter_plot': 'Scatter Plot',
    'heatmap': 'Heatmap',
    'genome_browser': 'Genome Browser',
    'manhattan_plot': 'Manhattan Plot',
    'volcano_plot': 'Volcano Plot',
    'lollipop_plot': 'Lollipop Plot',
    'circular_plot': 'Circos Plot',
    'coverage_plot': 'Coverage Plot',
    'box_plot': 'Box Plot',
    'violin_plot': 'Violin Plot',
    'pca_plot': 'PCA Plot',
    'tsne_plot': 't-SNE Plot',
    'variant_heatmap': 'Variant Heatmap',
    'allele_frequency': 'Allele Frequency',
    'phylogenetic_tree': 'Phylogenetic Tree',
    'time_series': 'Time Series',
    'stacked_area': 'Stacked Area Chart',
    'geographic_map': 'Geographic Map',
    'histogram': 'Histogram',
    'density_plot': 'Density Plot',
    'scatter_3d': '3D Scatter Plot',
    'bubble_3d': '3D Bubble Scatter',
    'surface_3d': '3D Surface Plot',
    'mesh_3d': '3D Mesh Plot',
    'volume_3d': '3D Volume Plot',
    'line_3d': '3D Line/Trajectory Plot',
    'network_3d': '3D Network Visualization'
  };

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

      // Get the readable chart type name
      const chartTypeName = chartTypeNames[visualizationType] || visualizationType || 'Unknown Chart';
      
      await axios.post(
        'http://localhost:5000/api/uploads',
        {
          image: base64Image,
          format: 'PNG', // Always PNG for the image
          chartType: chartTypeName,
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
    <>
      {/* Display current visualization type - Professional design */}
      <div style={{
        textAlign: 'center',
        marginBottom: '30px'
      }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '12px',
          padding: '18px 32px',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: '16px',
          fontSize: '22px',
          fontWeight: '600',
          color: '#ffffff',
          boxShadow: '0 8px 32px rgba(102, 126, 234, 0.3)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          backdropFilter: 'blur(10px)',
          transition: 'all 0.3s ease',
          cursor: 'default',
          fontFamily: '"Inter", "Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
          letterSpacing: '0.5px'
        }}>
          <span style={{
            fontSize: '28px',
            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))'
          }}>
            📊
          </span>
          <span style={{
            textShadow: '0 2px 4px rgba(0,0,0,0.2)'
          }}>
            {chartTypeNames[visualizationType] || visualizationType || 'Custom Visualization'}
          </span>
        </div>
      </div>

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
    </>
  );
};

export default WizardStep4;