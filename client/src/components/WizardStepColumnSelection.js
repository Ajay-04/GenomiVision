import React, { useState, useEffect, useMemo } from 'react';

const WizardStepColumnSelection = ({ 
  onUpdate, 
  onBack, 
  datasets = [], 
  selectedDatasets = [], 
  commonColumns = [], 
  mergeMode = 'single' 
}) => {
  const [selectedColumns, setSelectedColumns] = useState({});
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Get the datasets that are actually selected for processing
  const activeDatasets = useMemo(() => {
    return datasets.filter(dataset => selectedDatasets.includes(dataset.id));
  }, [datasets, selectedDatasets]);

  // Detect common columns across all active datasets
  const detectedCommonColumns = useMemo(() => {
    if (activeDatasets.length <= 1) return [];
    
    const allHeaders = activeDatasets.map(dataset => dataset.headers || []);
    if (allHeaders.length === 0) return [];
    
    // Find columns that exist in ALL datasets
    return allHeaders[0].filter(column => 
      allHeaders.every(headers => headers.includes(column))
    );
  }, [activeDatasets]);

  // Initialize selected columns when datasets change
  useEffect(() => {
    const initialSelection = {};
    
    activeDatasets.forEach(dataset => {
      if (!selectedColumns[dataset.id]) {
        // For single dataset, select all columns by default
        if (activeDatasets.length === 1) {
          initialSelection[dataset.id] = [...(dataset.headers || [])];
        } else {
          // For multiple datasets, select common columns + first few unique columns
          const commonCols = detectedCommonColumns;
          const uniqueCols = (dataset.headers || []).filter(col => !commonCols.includes(col));
          initialSelection[dataset.id] = [
            ...commonCols,
            ...uniqueCols.slice(0, 3) // Select first 3 unique columns
          ];
        }
      }
    });
    
    if (Object.keys(initialSelection).length > 0) {
      setSelectedColumns(prev => ({ ...prev, ...initialSelection }));
    }
  }, [activeDatasets, detectedCommonColumns]);

  const handleColumnToggle = (datasetId, column) => {
    setSelectedColumns(prev => {
      const currentSelection = prev[datasetId] || [];
      const isSelected = currentSelection.includes(column);
      
      let newSelection;
      if (isSelected) {
        newSelection = currentSelection.filter(col => col !== column);
      } else {
        newSelection = [...currentSelection, column];
      }
      
      return {
        ...prev,
        [datasetId]: newSelection
      };
    });
  };

  const handleSelectAll = (datasetId) => {
    const dataset = activeDatasets.find(d => d.id === datasetId);
    if (dataset) {
      setSelectedColumns(prev => ({
        ...prev,
        [datasetId]: [...(dataset.headers || [])]
      }));
    }
  };

  const handleSelectNone = (datasetId) => {
    setSelectedColumns(prev => ({
      ...prev,
      [datasetId]: []
    }));
  };

  const handleSelectCommon = (datasetId) => {
    setSelectedColumns(prev => ({
      ...prev,
      [datasetId]: [...detectedCommonColumns]
    }));
  };

  const validateSelection = () => {
    // Check if at least one column is selected for each dataset
    for (const dataset of activeDatasets) {
      const selection = selectedColumns[dataset.id] || [];
      if (selection.length === 0) {
        return `Please select at least one column from ${dataset.fileName}`;
      }
    }

    // For multiple datasets, ensure at least one common column is selected if merge mode
    if (activeDatasets.length > 1 && mergeMode === 'merge') {
      const hasCommonColumn = detectedCommonColumns.some(commonCol => 
        activeDatasets.every(dataset => 
          (selectedColumns[dataset.id] || []).includes(commonCol)
        )
      );
      
      if (!hasCommonColumn) {
        return 'For merged visualization, please select at least one common column from all datasets';
      }
    }

    return null;
  };

  const handleContinue = () => {
    setError('');
    const validationError = validateSelection();
    
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsProcessing(true);

    try {
      // Prepare the data with selected columns
      const processedDatasets = activeDatasets.map(dataset => {
        const selectedCols = selectedColumns[dataset.id] || [];
        const columnIndices = selectedCols.map(col => dataset.headers.indexOf(col));
        
        // Filter headers and rows to only include selected columns
        const filteredHeaders = selectedCols;
        const filteredRows = (dataset.rows || []).map(row => 
          columnIndices.map(index => row[index] || '')
        );

        return {
          ...dataset,
          headers: filteredHeaders,
          rows: filteredRows,
          selectedColumns: selectedCols,
          x: filteredRows.map(row => row[0] || ''), // First selected column as x
          y: filteredRows.map(row => {
            const val = parseFloat(row[1]);
            return isNaN(val) ? 0 : val;
          }) // Second selected column as y (if numeric)
        };
      });

      const payload = {
        processedDatasets,
        selectedColumns,
        commonColumns: detectedCommonColumns,
        mergeMode,
        config: {
          selectedDatasets,
          selectedColumns,
          commonColumns: detectedCommonColumns,
          mergeMode
        }
      };

      console.log('[WizardStepColumnSelection] Sending payload:', payload);
      onUpdate(payload);

    } catch (err) {
      console.error('Error processing column selection:', err);
      setError(`Error processing selection: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const getColumnStats = (dataset, column) => {
    const columnIndex = dataset.headers.indexOf(column);
    if (columnIndex === -1 || !dataset.rows) return null;

    const values = dataset.rows.map(row => row[columnIndex]).filter(val => val !== null && val !== undefined && val !== '');
    const numericValues = values.filter(val => !isNaN(parseFloat(val)));
    
    return {
      totalValues: values.length,
      numericValues: numericValues.length,
      isNumeric: numericValues.length > values.length * 0.8, // 80% numeric threshold
      uniqueValues: new Set(values).size
    };
  };

  if (activeDatasets.length === 0) {
    return (
      <div className="wizard-step">
        <div className="empty-state">
          <div className="empty-icon">📊</div>
          <h4>No Datasets Selected</h4>
          <p>Please go back and select datasets to continue.</p>
          <button onClick={onBack} className="btn-secondary">← Back to Customize</button>
        </div>
      </div>
    );
  }

  return (
    <div className="wizard-step">
      <div className="step-header">
        <div className="step-icon">🎯</div>
        <div className="step-title">
          <h3>Select Columns for Visualization</h3>
          <p className="step-subtitle">Choose which columns to include from each dataset</p>
        </div>
      </div>

      {/* Summary Information */}
      <div className="selection-summary">
        <div className="summary-cards">
          <div className="summary-card">
            <div className="summary-icon">📁</div>
            <div className="summary-content">
              <span className="summary-number">{activeDatasets.length}</span>
              <span className="summary-label">Dataset{activeDatasets.length !== 1 ? 's' : ''}</span>
            </div>
          </div>
          
          {detectedCommonColumns.length > 0 && (
            <div className="summary-card">
              <div className="summary-icon">🔗</div>
              <div className="summary-content">
                <span className="summary-number">{detectedCommonColumns.length}</span>
                <span className="summary-label">Common Column{detectedCommonColumns.length !== 1 ? 's' : ''}</span>
              </div>
            </div>
          )}
          
          <div className="summary-card">
            <div className="summary-icon">🎨</div>
            <div className="summary-content">
              <span className="summary-text">{mergeMode === 'merge' ? 'Merged' : mergeMode === 'single' ? 'Single' : 'Separate'}</span>
              <span className="summary-label">Mode</span>
            </div>
          </div>
        </div>
      </div>

      {/* Common Columns Highlight */}
      {detectedCommonColumns.length > 0 && (
        <div className="common-columns-info">
          <div className="info-header">
            <div className="info-icon">🔗</div>
            <h4>Common Columns Detected</h4>
          </div>
          <div className="common-columns-list">
            {detectedCommonColumns.map(column => (
              <span key={column} className="common-column-tag">{column}</span>
            ))}
          </div>
          <p className="info-note">
            These columns appear in all selected datasets and can be used for merging or comparison.
          </p>
        </div>
      )}

      {/* Column Selection for Each Dataset */}
      <div className="column-selection-container">
        {activeDatasets.map(dataset => {
          const datasetSelection = selectedColumns[dataset.id] || [];
          const availableColumns = dataset.headers || [];
          
          return (
            <div key={dataset.id} className="dataset-column-selection">
              <div className="dataset-header">
                <div className="dataset-info">
                  <div className="dataset-icon">📊</div>
                  <div className="dataset-details">
                    <h4 className="dataset-name">{dataset.fileName}</h4>
                    <div className="dataset-meta">
                      <span className="meta-item">{dataset.rowCount} rows</span>
                      <span className="meta-item">{availableColumns.length} columns</span>
                      <span className="meta-item">{datasetSelection.length} selected</span>
                    </div>
                  </div>
                </div>
                
                <div className="selection-controls">
                  <button 
                    onClick={() => handleSelectAll(dataset.id)}
                    className="control-btn"
                    title="Select all columns"
                  >
                    Select All
                  </button>
                  {detectedCommonColumns.length > 0 && (
                    <button 
                      onClick={() => handleSelectCommon(dataset.id)}
                      className="control-btn"
                      title="Select only common columns"
                    >
                      Common Only
                    </button>
                  )}
                  <button 
                    onClick={() => handleSelectNone(dataset.id)}
                    className="control-btn"
                    title="Deselect all columns"
                  >
                    Clear
                  </button>
                </div>
              </div>

              <div className="columns-grid">
                {availableColumns.map(column => {
                  const isSelected = datasetSelection.includes(column);
                  const isCommon = detectedCommonColumns.includes(column);
                  const stats = getColumnStats(dataset, column);
                  
                  return (
                    <div 
                      key={column}
                      className={`column-card ${isSelected ? 'selected' : ''} ${isCommon ? 'common' : ''}`}
                      onClick={() => handleColumnToggle(dataset.id, column)}
                    >
                      <div className="column-header">
                        <div className="column-checkbox">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleColumnToggle(dataset.id, column)}
                          />
                          <div className="checkbox-custom"></div>
                        </div>
                        <div className="column-name">{column}</div>
                        {isCommon && (
                          <div className="common-indicator" title="Common column">🔗</div>
                        )}
                      </div>
                      
                      {stats && (
                        <div className="column-stats">
                          <div className="stat-row">
                            <span className="stat-label">Values:</span>
                            <span className="stat-value">{stats.totalValues}</span>
                          </div>
                          <div className="stat-row">
                            <span className="stat-label">Unique:</span>
                            <span className="stat-value">{stats.uniqueValues}</span>
                          </div>
                          <div className="stat-row">
                            <span className="stat-label">Type:</span>
                            <span className={`stat-value ${stats.isNumeric ? 'numeric' : 'text'}`}>
                              {stats.isNumeric ? 'Numeric' : 'Text'}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {error && (
        <div className="error-alert">
          <div className="error-icon">❌</div>
          <div className="error-content">
            <h5>Selection Error</h5>
            <p>{error}</p>
          </div>
        </div>
      )}

      <div className="action-bar">
        <button onClick={onBack} className="btn-secondary">
          <span className="btn-icon">←</span>
          Back to Customize
        </button>
        
        <div className="action-info">
          <div className="selection-summary">
            <span className="summary-text">
              {Object.values(selectedColumns).reduce((total, cols) => total + cols.length, 0)} columns selected
            </span>
            {activeDatasets.length > 1 && detectedCommonColumns.length > 0 && (
              <span className="merge-indicator">• {detectedCommonColumns.length} common</span>
            )}
          </div>
        </div>
        
        <button 
          onClick={handleContinue} 
          className={`btn-primary ${isProcessing ? 'loading' : ''}`}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <>
              <div className="spinner"></div>
              Processing...
            </>
          ) : (
            <>
              Continue to Visualization Types
              <span className="btn-icon">→</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default WizardStepColumnSelection;
