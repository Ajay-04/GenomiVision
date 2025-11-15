import React, { useEffect, useMemo, useState } from 'react';

// Utility functions for data processing
function isNumericLike(value) {
  if (value === null || value === undefined) return false;
  const v = String(value).trim();
  if (v === '') return false;
  const n = Number(v);
  return Number.isFinite(n);
}

const WizardStep3 = ({ onUpdate, onBack, datasets = [], selectedDatasets = [], commonColumns = [], primaryKey = '' }) => {
  const [selectedDatasetIds, setSelectedDatasetIds] = useState(selectedDatasets);
  const [detectedCommonColumns, setDetectedCommonColumns] = useState([]);
  const [selectedPrimaryKey, setSelectedPrimaryKey] = useState('');
  const [mergeMode, setMergeMode] = useState('single'); // 'single', 'merge', 'separate'
  const [columnMappings, setColumnMappings] = useState({});
  const [error, setError] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [datasetStats, setDatasetStats] = useState({});


  // Analyze datasets for common columns and statistics
  const analyzeDatasets = useMemo(() => {
    if (!datasets || datasets.length === 0) return { commonCols: [], stats: {} };
    
    const stats = {};
    const allColumns = [];
    
    datasets.forEach(dataset => {
      stats[dataset.id] = {
        fileName: dataset.fileName,
        rows: dataset.rowCount || 0,
        columns: dataset.columnCount || 0,
        headers: dataset.headers || []
      };
      
      if (dataset.headers && dataset.headers.length > 0) {
        allColumns.push(dataset.headers);
      }
    });
    
    // Find common columns across all datasets
    let commonCols = [];
    if (allColumns.length > 1) {
      commonCols = allColumns[0].filter(col => 
        allColumns.every(headers => headers.includes(col))
      );
    }
    
    return { commonCols, stats };
  }, [datasets]);

  // Update state when datasets change
  useEffect(() => {
    if (!datasets || datasets.length === 0) return;
    
    const { commonCols, stats } = analyzeDatasets;
    setDetectedCommonColumns(commonCols);
    setDatasetStats(stats);
    
    // Only update selected datasets if they haven't been set yet
    if (selectedDatasetIds.length === 0) {
      setSelectedDatasetIds(datasets.map(d => d.id));
    }
    
    // Auto-select first common column as primary key if available
    if (commonCols.length > 0 && !selectedPrimaryKey) {
      setSelectedPrimaryKey(commonCols[0]);
    }
    
    // Set merge mode based on number of datasets and common columns
    if (datasets.length === 1) {
      setMergeMode('single');
    } else if (commonCols.length > 0) {
      setMergeMode('merge');
    } else {
      setMergeMode('separate');
    }
  }, [datasets.length, datasets]); // Remove analyzeDatasets from dependencies to prevent infinite loop

  // Merge datasets based on primary key
  const mergeDatasets = () => {
    if (selectedDatasetIds.length === 0) {
      return null;
    }
    
    const selectedDatasetObjects = datasets.filter(d => selectedDatasetIds.includes(d.id));
    
    if (selectedDatasetObjects.length === 1) {
      // Single dataset - return as is with proper data extraction
      const dataset = selectedDatasetObjects[0];
      
      // Ensure we have proper x and y data for visualization
      let x = dataset.x || [];
      let y = dataset.y || [];
      
      // If x or y are empty, try to extract from headers/rows
      if (x.length === 0 && dataset.rows && dataset.rows.length > 0) {
        // Use first column as x values
        x = dataset.rows.map((row, index) => row[0] || `Row ${index + 1}`);
      }
      
      if (y.length === 0 && dataset.rows && dataset.rows.length > 0) {
        // Use second column as y values, or generate sample data
        y = dataset.rows.map(row => {
          if (row.length > 1) {
            const val = parseFloat(row[1]);
            return isNaN(val) ? Math.random() * 100 : val;
          }
          return Math.random() * 100; // Generate sample data if no numeric column
        });
      }
      
      // Ensure we have at least some data
      if (x.length === 0) {
        x = ['Sample 1', 'Sample 2', 'Sample 3'];
        y = [10, 20, 15];
      }
      
      return {
        x: x,
        y: y,
        headers: dataset.headers || [],
        rows: dataset.rows || [],
        mergedFrom: [dataset.fileName]
      };
    }
    
    // For multiple datasets, we need a primary key
    if (!selectedPrimaryKey) {
      return null;
    }
    
    if (mergeMode === 'separate' || !selectedPrimaryKey) {
      // Cannot merge - no common columns
      return null;
    }
    
    // Merge datasets on primary key
    const mergedData = { x: [], y: [], headers: [], rows: [], mergedFrom: [] };
    const primaryKeyIndex = {};
    
    selectedDatasetObjects.forEach((dataset, datasetIndex) => {
      const pkIndex = dataset.headers.indexOf(selectedPrimaryKey);
      if (pkIndex === -1) return;
      
      dataset.rows.forEach(row => {
        const pkValue = row[pkIndex];
        if (!primaryKeyIndex[pkValue]) {
          primaryKeyIndex[pkValue] = mergedData.rows.length;
          mergedData.rows.push([pkValue]);
          mergedData.x.push(pkValue);
        }
        
        const targetRowIndex = primaryKeyIndex[pkValue];
        // Add other columns from this dataset
        dataset.headers.forEach((header, colIndex) => {
          if (header !== selectedPrimaryKey) {
            const newHeader = `${header}_${dataset.fileName.split('.')[0]}`;
            if (!mergedData.headers.includes(newHeader)) {
              mergedData.headers.push(newHeader);
            }
            const headerIndex = mergedData.headers.indexOf(newHeader);
            while (mergedData.rows[targetRowIndex].length <= headerIndex) {
              mergedData.rows[targetRowIndex].push('');
            }
            mergedData.rows[targetRowIndex][headerIndex] = row[colIndex] || '';
          }
        });
      });
      
      mergedData.mergedFrom.push(dataset.fileName);
    });
    
    // Set primary key as first header
    mergedData.headers = [selectedPrimaryKey, ...mergedData.headers];
    
    // Extract y values (assuming second column for now)
    mergedData.y = mergedData.rows.map(row => {
      const val = parseFloat(row[1]);
      return isNaN(val) ? 0 : val;
    });
    
    return mergedData;
  };

  const handleDatasetToggle = (datasetId) => {
    setSelectedDatasetIds(prev => {
      if (prev.includes(datasetId)) {
        return prev.filter(id => id !== datasetId);
      } else {
        return [...prev, datasetId];
      }
    });
  };

  const canMerge = detectedCommonColumns.length > 0 && selectedDatasetIds.length > 1;
  const selectedDatasetObjects = datasets.filter(d => selectedDatasetIds.includes(d.id));

  const handleApply = (e) => {
    e.preventDefault();
    setError('');
    setIsAnalyzing(true);
    
    if (selectedDatasetIds.length === 0) {
      setError('Please select at least one dataset.');
      setIsAnalyzing(false);
      return;
    }
    
    if (selectedDatasetIds.length > 1 && !canMerge && mergeMode !== 'separate') {
      setError('Selected datasets have no common columns. Cannot merge for visualization.');
      setIsAnalyzing(false);
      return;
    }
    
    try {
      const mergedData = mergeDatasets();
      
      if (!mergedData) {
        setError('Failed to process datasets. Please check your selections.');
        setIsAnalyzing(false);
        return;
      }
      
      const payload = {
        mergedData,
        config: {
          selectedDatasets: selectedDatasetIds,
          primaryKey: selectedPrimaryKey,
          mergeMode,
          datasetStats,
          commonColumns: detectedCommonColumns
        },
        selectedDatasets: selectedDatasetIds,
        primaryKey: selectedPrimaryKey,
        commonColumns: detectedCommonColumns,
        mergeMode
      };
      
      console.log('[WizardStep3] Sending payload:', payload);
      onUpdate(payload);
      
    } catch (err) {
      console.error('Error processing datasets:', err);
      setError(`Error processing datasets: ${err.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="wizard-step">
      <div className="step-header">
        <div className="step-icon">🎛️</div>
        <div className="step-title">
          <h3>Customize Data Selection</h3>
          <p className="step-subtitle">Configure your datasets for optimal visualization</p>
        </div>
      </div>
      
      {datasets.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">📊</div>
          <h4>No Datasets Available</h4>
          <p>Please go back and upload your data files to continue.</p>
          <button onClick={onBack} className="btn-secondary">← Upload Files</button>
        </div>
      )}
      
      {datasets.length > 0 && (
        <>
          {/* Dataset Statistics */}
          <div className="dataset-stats">
            <div className="section-header">
              <div className="section-icon">📈</div>
              <h4>Dataset Overview</h4>
            </div>
            <div className="stats-grid">
              {Object.values(datasetStats).map((stat, index) => (
                <div key={index} className="stat-card">
                  <div className="stat-header">
                    <div className="file-icon">📄</div>
                    <strong className="file-name">{stat.fileName}</strong>
                  </div>
                  <div className="stat-metrics">
                    <div className="metric">
                      <span className="metric-value">{stat.rows.toLocaleString()}</span>
                      <span className="metric-label">rows</span>
                    </div>
                    <div className="metric">
                      <span className="metric-value">{stat.columns}</span>
                      <span className="metric-label">columns</span>
                    </div>
                  </div>
                  {stat.headers.length > 0 && (
                    <div className="column-preview">
                      <div className="column-tags">
                        {stat.headers.slice(0, 6).map((header, i) => (
                          <span key={i} className="column-tag">{header}</span>
                        ))}
                        {stat.headers.length > 6 && (
                          <span className="column-tag more">+{stat.headers.length - 6} more</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
          
          {/* Dataset Selection */}
          <div className="dataset-selection">
            <div className="section-header">
              <div className="section-icon">✅</div>
              <h4>Select Datasets</h4>
              <p className="section-subtitle">Choose which datasets to include in your visualization</p>
            </div>
            <div className="dataset-grid">
              {datasets.map(dataset => (
                <div 
                  key={dataset.id} 
                  className={`dataset-card ${selectedDatasetIds.includes(dataset.id) ? 'selected' : ''}`}
                  onClick={() => handleDatasetToggle(dataset.id)}
                >
                  <div className="dataset-checkbox">
                    <input
                      type="checkbox"
                      id={`dataset-${dataset.id}`}
                      checked={selectedDatasetIds.includes(dataset.id)}
                      onChange={() => handleDatasetToggle(dataset.id)}
                    />
                    <div className="checkbox-custom"></div>
                  </div>
                  <div className="dataset-content">
                    <div className="dataset-header">
                      <div className="file-icon">📊</div>
                      <strong className="dataset-name">{dataset.fileName}</strong>
                    </div>
                    <div className="dataset-metrics">
                      <div className="metric-badge">
                        <span className="metric-number">{dataset.rowCount?.toLocaleString()}</span>
                        <span className="metric-text">rows</span>
                      </div>
                      <div className="metric-badge">
                        <span className="metric-number">{dataset.columnCount}</span>
                        <span className="metric-text">cols</span>
                      </div>
                    </div>
                  </div>
                  <div className="selection-indicator">
                    {selectedDatasetIds.includes(dataset.id) && <span className="checkmark">✓</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Common Columns Analysis */}
          {selectedDatasetIds.length > 1 && (
            <div className="relationship-analysis">
              <div className="section-header">
                <div className="section-icon">🔗</div>
                <h4>Dataset Relationships</h4>
                <p className="section-subtitle">Analysis of common columns for data merging</p>
              </div>
              
              {detectedCommonColumns.length > 0 ? (
                <div className="analysis-success">
                  <div className="success-banner">
                    <div className="success-icon">🎉</div>
                    <div className="success-content">
                      <h5>Compatible Datasets Found!</h5>
                      <p>Discovered {detectedCommonColumns.length} common column{detectedCommonColumns.length > 1 ? 's' : ''} for merging</p>
                    </div>
                  </div>
                  
                  <div className="common-columns-display">
                    <h6>Common Columns:</h6>
                    <div className="column-chips">
                      {detectedCommonColumns.map(col => (
                        <span key={col} className="column-chip">{col}</span>
                      ))}
                    </div>
                  </div>
                  
                  <div className="primary-key-selection">
                    <label className="form-label">
                      <span className="label-text">
                        <span className="label-icon">🔑</span>
                        Primary Key for Merging
                      </span>
                      <div className="select-wrapper">
                        <select 
                          value={selectedPrimaryKey} 
                          onChange={(e) => setSelectedPrimaryKey(e.target.value)}
                          className="form-select"
                        >
                          <option value="">Choose a primary key...</option>
                          {detectedCommonColumns.map(col => (
                            <option key={col} value={col}>{col}</option>
                          ))}
                        </select>
                        <div className="select-arrow">▼</div>
                      </div>
                    </label>
                  </div>
                </div>
              ) : (
                <div className="analysis-warning">
                  <div className="warning-banner">
                    <div className="warning-icon">⚠️</div>
                    <div className="warning-content">
                      <h5>No Common Columns Detected</h5>
                      <p>Selected datasets cannot be merged. They will be visualized separately.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Merge Mode Selection */}
          {selectedDatasetIds.length > 0 && (
            <div className="visualization-mode">
              <div className="section-header">
                <div className="section-icon">🎨</div>
                <h4>Visualization Strategy</h4>
                <p className="section-subtitle">Choose how to handle your selected datasets</p>
              </div>
              
              <div className="mode-cards">
                <div 
                  className={`mode-card ${mergeMode === 'single' ? 'selected' : ''} ${selectedDatasetIds.length > 1 ? 'disabled' : ''}`}
                  onClick={() => selectedDatasetIds.length === 1 && setMergeMode('single')}
                >
                  <div className="mode-icon">📊</div>
                  <div className="mode-content">
                    <h5>Single Dataset</h5>
                    <p>Visualize one dataset independently</p>
                  </div>
                  <input
                    type="radio"
                    name="mergeMode"
                    value="single"
                    checked={mergeMode === 'single'}
                    onChange={(e) => setMergeMode(e.target.value)}
                    disabled={selectedDatasetIds.length > 1}
                  />
                </div>
                
                <div 
                  className={`mode-card ${mergeMode === 'merge' ? 'selected' : ''} ${!canMerge ? 'disabled' : ''}`}
                  onClick={() => canMerge && setMergeMode('merge')}
                >
                  <div className="mode-icon">🔗</div>
                  <div className="mode-content">
                    <h5>Merge Datasets</h5>
                    <p>Combine datasets using common columns</p>
                    {!canMerge && <span className="mode-requirement">Requires common columns</span>}
                  </div>
                  <input
                    type="radio"
                    name="mergeMode"
                    value="merge"
                    checked={mergeMode === 'merge'}
                    onChange={(e) => setMergeMode(e.target.value)}
                    disabled={!canMerge}
                  />
                </div>
                
                <div 
                  className={`mode-card ${mergeMode === 'separate' ? 'selected' : ''}`}
                  onClick={() => setMergeMode('separate')}
                >
                  <div className="mode-icon">📈</div>
                  <div className="mode-content">
                    <h5>Separate Visualization</h5>
                    <p>Create individual visualizations for each dataset</p>
                  </div>
                  <input
                    type="radio"
                    name="mergeMode"
                    value="separate"
                    checked={mergeMode === 'separate'}
                    onChange={(e) => setMergeMode(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}
          
          {/* Preview of selected datasets */}
          {selectedDatasetObjects.length > 0 && (
            <div className="dataset-preview">
              <div className="section-header">
                <div className="section-icon">👁️</div>
                <h4>Data Preview</h4>
                <p className="section-subtitle">Sample data from your selected datasets</p>
              </div>
              
              <div className="preview-tabs">
                {selectedDatasetObjects.map((dataset, index) => (
                  <div key={dataset.id} className="preview-tab">
                    <div className="tab-header">
                      <div className="tab-icon">📋</div>
                      <span className="tab-title">{dataset.fileName}</span>
                      <span className="tab-badge">{dataset.rowCount} rows</span>
                    </div>
                    
                    {dataset.headers && dataset.headers.length > 0 && (
                      <div className="preview-content">
                        <div className="table-container" style={{ overflowX: 'auto', maxWidth: '100%' }}>
                          <table className="preview-table">
                            <thead>
                              <tr>
                                {dataset.headers.map((h, i) => (
                                  <th key={i}>
                                    <span className="header-text">{h}</span>
                                    {detectedCommonColumns.includes(h) && (
                                      <span className="common-indicator" title="Common column">🔗</span>
                                    )}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {dataset.rows && dataset.rows.slice(0, 5).map((row, idx) => (
                                <tr key={idx}>
                                  {row.map((cell, ci) => (
                                    <td key={ci}>
                                      <span className="cell-content">{cell || '—'}</span>
                                    </td>
                                  ))}
                                </tr>
                              ))}
                              {(!dataset.rows || dataset.rows.length === 0) && (
                                <tr>
                                  <td colSpan={dataset.headers.length} className="no-data">
                                    No data available
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
      
      {error && (
        <div className="error-alert">
          <div className="error-icon">❌</div>
          <div className="error-content">
            <h5>Configuration Error</h5>
            <p>{error}</p>
          </div>
        </div>
      )}
      
      <div className="action-bar">
        <button onClick={onBack} className="btn-secondary">
          <span className="btn-icon">←</span>
          Back to Upload
        </button>
        
        <div className="action-info">
          <div className="selection-summary">
            <span className="summary-text">
              {selectedDatasetIds.length} dataset{selectedDatasetIds.length !== 1 ? 's' : ''} selected
            </span>
            {selectedDatasetIds.length > 1 && canMerge && (
              <span className="merge-indicator">• Merge ready</span>
            )}
          </div>
        </div>
        
        <button 
          onClick={handleApply} 
          className={`btn-primary ${isAnalyzing ? 'loading' : ''}`}
          disabled={isAnalyzing || selectedDatasetIds.length === 0}
        >
          {isAnalyzing ? (
            <>
              <div className="spinner"></div>
              Processing...
            </>
          ) : (
            <>
              Configure & Continue
              <span className="btn-icon">→</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default WizardStep3;