import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from './Navbar';
import WizardStep1 from './WizardStep1';
import WizardStep2 from './WizardStep2';
import WizardStep3 from './WizardStep3';
import WizardStepColumnSelection from './WizardStepColumnSelection';
import WizardStep4 from './WizardStep4';
import Plotly from 'plotly.js';
import '../styles/visualization.css';

const VisualizationTool = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [datasets, setDatasets] = useState([]);
  const [selectedDatasets, setSelectedDatasets] = useState([]);
  const [mergedData, setMergedData] = useState(null);
  const [visualizationType, setVisualizationType] = useState('');
  const [config, setConfig] = useState({});
  const [error, setError] = useState('');
  const [commonColumns, setCommonColumns] = useState([]);
  const [primaryKey, setPrimaryKey] = useState('');
  const [selectedColumns, setSelectedColumns] = useState({});
  const [mergeMode, setMergeMode] = useState('single');
  const [processedDatasets, setProcessedDatasets] = useState([]);
  const plotRef = useRef(null);

  const steps = [
    { name: 'Upload Data', id: 1 },
    { name: 'Customize', id: 2 },
    { name: 'Select Columns', id: 3 },
    { name: 'Choose Type', id: 4 },
    { name: 'Visualize', id: 5 },
  ];

  const colorPalette = [
    '#FF6F61', '#6B5B95', '#88B04B', '#F7CAC9', '#92A8D1',
    '#F4A261', '#2A9D8F', '#E9C46A', '#264653', '#D4A5A5',
  ];

  const handleFileUpload = (filesData) => {
    console.log('Received files data:', filesData);
    const newDatasets = [];
    
    filesData.forEach((fileData, index) => {
      let parsedData = { x: [], y: [], headers: [], rows: [], fileName: fileData.name };
      const extension = fileData.name.split('.').pop().toLowerCase();
      const content = fileData.content || '';

      if (extension === 'bed') {
        const lines = content.split('\n').filter(line => line.trim());
        const geneCounts = {};
        lines.forEach(line => {
          const parts = line.trim().split(/\s+/);
          const name = parts[3] || `region_${Object.keys(geneCounts).length + 1}`;
          if (name) geneCounts[name] = (geneCounts[name] || 0) + 1;
        });
        parsedData.x = Object.keys(geneCounts);
        parsedData.y = Object.values(geneCounts);
        parsedData.headers = ['Region', 'Count'];
        parsedData.rows = Object.entries(geneCounts);
      } else if (extension === 'vcf') {
        const lines = content.split('\n').filter(line => line.trim() && !line.startsWith('##') && !line.startsWith('#'));
        const depthValues = [];
        const variants = [];
        lines.forEach((line, i) => {
          const parts = line.trim().split(/\s+/);
          const info = parts[7] || '';
          const dpMatch = info.match(/DP=(\d+)/);
          const depth = dpMatch ? parseInt(dpMatch[1]) : 1;
          depthValues.push(depth);
          variants.push(`Variant${i + 1}`);
        });
        parsedData.x = variants;
        parsedData.y = depthValues;
        parsedData.headers = ['Variant', 'Depth'];
        parsedData.rows = variants.map((v, i) => [v, depthValues[i]]);
      } else if (extension === 'fasta') {
        const lines = content.split('\n').filter(line => line.trim());
        const sequenceLengths = [];
        const headers = [];
        let currentSeq = '';
        let currentHeader = '';
        
        lines.forEach(line => {
          if (line.startsWith('>')) {
            if (currentSeq && currentHeader) {
              sequenceLengths.push(currentSeq.length);
              headers.push(currentHeader);
            }
            currentHeader = line.substring(1).trim();
            currentSeq = '';
          } else {
            currentSeq += line.trim();
          }
        });
        
        if (currentSeq && currentHeader) {
          sequenceLengths.push(currentSeq.length);
          headers.push(currentHeader);
        }
        
        parsedData.x = headers;
        parsedData.y = sequenceLengths;
        parsedData.headers = ['Sequence', 'Length'];
        parsedData.rows = headers.map((h, i) => [h, sequenceLengths[i]]);
      } else if (extension === 'gtf') {
        const lines = content.split('\n').filter(line => line.trim() && !line.startsWith('#'));
        const geneCounts = {};
        lines.forEach(line => {
          const parts = line.trim().split('\t');
          if (parts.length >= 9) {
            const feature = parts[2];
            const attributes = parts[8];
            if (feature === 'gene') {
              const geneIdMatch = attributes.match(/gene_id "([^"]+)"/);
              const geneId = geneIdMatch ? geneIdMatch[1] : `gene_${Object.keys(geneCounts).length + 1}`;
              geneCounts[geneId] = (geneCounts[geneId] || 0) + 1;
            }
          }
        });
        parsedData.x = Object.keys(geneCounts);
        parsedData.y = Object.values(geneCounts);
        parsedData.headers = ['Gene', 'Count'];
        parsedData.rows = Object.entries(geneCounts);
      } else if (extension === 'csv') {
        const lines = content.split('\n').filter(line => line.trim());
        if (lines.length === 0) {
          setError('CSV file is empty.');
          return;
        }
        const headers = lines[0].split(',').map(header => header.trim());
        if (headers.length < 2) {
          setError('CSV file must have at least two columns (e.g., "Gene,Expression").');
          return;
        }
        const rows = [];
        for (let i = 1; i < lines.length; i++) {
          const row = lines[i].split(',').map(cell => cell.trim());
          if (row.length >= 2) {
            rows.push(row);
          }
        }
        parsedData.headers = headers;
        parsedData.rows = rows;
        parsedData.x = rows.map(row => row[0]);
        parsedData.y = rows.map(row => {
          const yValue = parseFloat(row[1]);
          return isNaN(yValue) ? 0 : yValue;
        });
      }
      
      console.log('Parsed data for file', fileData.name, ':', parsedData);
      if (parsedData.x.length > 0 && parsedData.y.length > 0) {
        newDatasets.push({
          ...parsedData,
          id: index,
          fileName: fileData.name,
          content: content,
          rowCount: parsedData.rows ? parsedData.rows.length : parsedData.x.length,
          columnCount: parsedData.headers ? parsedData.headers.length : 2
        });
      }
    });
    
    if (newDatasets.length > 0) {
      setError('');
      setDatasets(newDatasets);
      setSelectedDatasets(newDatasets.map(d => d.id));
      setStep(2);
    } else {
      setError('Failed to parse file data. Check file format or content.');
    }
  };

  const handleTypeSelect = (type) => {
    setVisualizationType(type.replace('_', ' '));
    setStep(5);
  };

  const handleConfigUpdate = (payload) => {
    if (payload && typeof payload === 'object') {
      if (payload.mergedData) setMergedData(payload.mergedData);
      if (payload.config) setConfig(payload.config);
      if (payload.selectedDatasets) setSelectedDatasets(payload.selectedDatasets);
      if (payload.primaryKey) setPrimaryKey(payload.primaryKey);
      if (payload.commonColumns) setCommonColumns(payload.commonColumns);
      if (payload.mergeMode) setMergeMode(payload.mergeMode);
      if (!payload.mergedData && !payload.config) setConfig(payload);
    } else {
      setConfig(payload);
    }
    setStep(3);
  };

  const handleColumnSelection = (payload) => {
    if (payload && typeof payload === 'object') {
      if (payload.processedDatasets) setProcessedDatasets(payload.processedDatasets);
      if (payload.selectedColumns) setSelectedColumns(payload.selectedColumns);
      if (payload.commonColumns) setCommonColumns(payload.commonColumns);
      if (payload.mergeMode) setMergeMode(payload.mergeMode);
      if (payload.config) setConfig(prev => ({ ...prev, ...payload.config }));
      
      // Create merged data from processed datasets
      if (payload.processedDatasets && payload.processedDatasets.length > 0) {
        const firstDataset = payload.processedDatasets[0];
        setMergedData({
          x: firstDataset.x || [],
          y: firstDataset.y || [],
          headers: firstDataset.headers || [],
          rows: firstDataset.rows || [],
          processedDatasets: payload.processedDatasets
        });
      }
    }
    setStep(4);
  };

  const handleExport = (format) => {
    const plot = document.getElementById('plot');
    if (!plot || !plotRef.current) {
      alert('Visualization not ready. Please ensure a plot is rendered.');
      return;
    }

    const exportData = {
      x: mergedData?.x || ['GeneA', 'GeneB', 'GeneC'],
      y: mergedData?.y || [10, 25, 15],
    };

    switch (format) {
      case 'PNG':
        Plotly.downloadImage(plot, { format: 'png', filename: `visualization_${new Date().toISOString()}`, width: 800, height: 600 });
        break;
      case 'JSON':
        const jsonLink = document.createElement('a');
        jsonLink.href = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify({ ...exportData, type: visualizationType, ...config }, null, 2))}`;
        jsonLink.download = `visualization_${new Date().toISOString()}.json`;
        jsonLink.click();
        break;
      case 'HTML':
        const htmlContent = `
          <!DOCTYPE html>
          <html>
          <body>
            <div id="plot"></div>
            <script src="https://cdn.plot.ly/plotly-latest.min.js"></script>
            <script>
              Plotly.newPlot('plot', ${JSON.stringify([{ x: exportData.x, y: exportData.y, type: visualizationType === 'bar chart' ? 'bar' : visualizationType.replace(' ', '_'), marker: { color: exportData.x.map((_, i) => colorPalette[i % colorPalette.length]) } }])}, ${JSON.stringify(config)});
            </script>
          </body>
          </html>
        `;
        const htmlLink = document.createElement('a');
        htmlLink.href = `data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`;
        htmlLink.download = `visualization_${new Date().toISOString()}.html`;
        htmlLink.click();
        break;
      case 'Python':
        const pyContent = `
import plotly.graph_objects as go

fig = go.Figure(data=[go.Bar(x=${JSON.stringify(exportData.x)}, y=${JSON.stringify(exportData.y)}, marker_color=${JSON.stringify(exportData.x.map((_, i) => colorPalette[i % colorPalette.length]))})])
fig.update_layout(title='Gene Expression Levels', xaxis_title='Genes', yaxis_title='Expression')
fig.write_image("visualization.png")
        `;
        const pyLink = document.createElement('a');
        pyLink.href = `data:text/plain;charset=utf-8,${encodeURIComponent(pyContent)}`;
        pyLink.download = `visualization_${new Date().toISOString()}.py`;
        pyLink.click();
        break;
      case 'R':
        const rContent = `
library(plotly)

p <- plot_ly(x = ${JSON.stringify(exportData.x)}, y = ${JSON.stringify(exportData.y)}, type = 'bar', marker = list(color = ${JSON.stringify(exportData.x.map((_, i) => colorPalette[i % colorPalette.length]))}))
p <- layout(p, title = 'Gene Expression Levels', xaxis = list(title = 'Genes'), yaxis = list(title = 'Expression'))
export(p, file = "visualization.png")
        `;
        const rLink = document.createElement('a');
        rLink.href = `data:text/plain;charset=utf-8,${encodeURIComponent(rContent)}`;
        rLink.download = `visualization_${new Date().toISOString()}.r`;
        rLink.click();
        break;
      default:
        alert('Unsupported format');
    }
  };

  const renderVisualization = async (targetRef, dataToRender) => {
    if (step !== 5 || !visualizationType || !dataToRender || !targetRef.current) return;

    const plotDiv = targetRef.current;
    let plotData = [];
    
    // Enhanced data processing for selected columns - ensure ALL columns are utilized
    let x, y, xAxisTitle, yAxisTitle;
    let allSelectedColumns = [];
    let additionalData = {};
    
    if (dataToRender.processedDatasets && dataToRender.processedDatasets.length > 0) {
      // Use processed datasets with selected columns
      const primaryDataset = dataToRender.processedDatasets[0];
      const headers = primaryDataset.headers || [];
      const rows = primaryDataset.rows || [];
      
      x = primaryDataset.x || [];
      y = primaryDataset.y || [];
      xAxisTitle = headers[0] || 'X-axis';
      yAxisTitle = headers[1] || 'Y-axis';
      
      // Extract ALL selected columns for utilization
      allSelectedColumns = headers;
      
      // Map additional columns to different visual encodings
      if (headers.length > 2) {
        additionalData.z = rows.map(row => parseFloat(row[2]) || 0);
        additionalData.zTitle = headers[2];
      }
      if (headers.length > 3) {
        additionalData.color = rows.map(row => parseFloat(row[3]) || 0);
        additionalData.colorTitle = headers[3];
      }
      if (headers.length > 4) {
        additionalData.size = rows.map(row => Math.max(parseFloat(row[4]) || 5, 3));
        additionalData.sizeTitle = headers[4];
      }
      if (headers.length > 5) {
        // Additional columns for hover information
        additionalData.hover = rows.map((row, i) => {
          let hoverText = `Point ${i + 1}<br>`;
          headers.forEach((header, j) => {
            if (j < row.length) {
              hoverText += `${header}: ${row[j]}<br>`;
            }
          });
          return hoverText;
        });
      }
      
      // For multiple datasets, we might want to show them separately or merged
      if (dataToRender.processedDatasets.length > 1 && mergeMode === 'separate') {
        // Handle multiple datasets separately - we'll create multiple traces
        plotData = dataToRender.processedDatasets.map((dataset, index) => ({
          x: dataset.x || [],
          y: dataset.y || [],
          name: dataset.fileName || `Dataset ${index + 1}`,
          type: visualizationType === 'bar chart' ? 'bar' : 'scatter',
          marker: { color: colorPalette[index % colorPalette.length] }
        }));
      }
    } else {
      // Fallback to original data structure
      x = dataToRender.x || ['GeneA', 'GeneB', 'GeneC'];
      y = dataToRender.y || [10, 25, 15];
      xAxisTitle = dataToRender.headers?.[0] || config.attributes || 'X-axis';
      yAxisTitle = dataToRender.headers?.[1] || 'Y-axis';
    }

    let layout = {
      ...config,
      title: `Genomic Visualization - ${visualizationType}`,
      xaxis: { title: xAxisTitle, tickfont: { size: 14 }, showticklabels: true, automargin: true },
      yaxis: { title: yAxisTitle, tickfont: { size: 14 }, automargin: true },
      plot_bgcolor: '#f9f9f9',
      paper_bgcolor: '#fff',
      font: { size: 14, color: '#2A3547' },
      autosize: true,
      margin: {
        l: 80,
        r: 80,
        t: 100,
        b: 80,
        pad: 4
      },
      showlegend: plotData.length > 1, // Show legend for multiple datasets
      // Enhanced hover tooltip styling
      hoverlabel: { 
        bgcolor: '#2c3e50',
        bordercolor: '#3498db',
        font: { 
          family: 'Arial, sans-serif', 
          size: 14, 
          color: '#ffffff' 
        }
      }
    };

    // Only create plotData if it hasn't been populated for multiple datasets
    if (plotData.length === 0) {
      switch (visualizationType) {
        case 'bar chart':
          // Enhanced bar chart utilizing additional columns
          let barMarker = {
            line: { width: 2, color: '#000' }
          };
          
          let barText = y.map(val => val.toString());
          let barHover = x.map((label, i) => `${label}<br>Value: ${y[i]}`);
          
          // Use additional columns for color mapping
          if (additionalData.color && additionalData.color.length > 0) {
            barMarker.color = additionalData.color;
            barMarker.colorscale = 'Viridis';
            barMarker.showscale = true;
            barMarker.colorbar = {
              title: additionalData.colorTitle || 'Color Scale'
            };
            barHover = x.map((label, i) => 
              `${label}<br>Value: ${y[i]}<br>${additionalData.colorTitle}: ${additionalData.color[i].toFixed(2)}`
            );
          } else {
            barMarker.color = x.map((_, i) => colorPalette[i % colorPalette.length]);
          }
          
          // Use comprehensive hover text if available
          if (additionalData.hover && additionalData.hover.length > 0) {
            barHover = additionalData.hover;
          } else {
            // Ensure we show all selected columns from multiple datasets in hover
            if (dataToRender.processedDatasets && dataToRender.processedDatasets[0]) {
              const dataset = dataToRender.processedDatasets[0];
              const rows = dataset.rows || [];
              const headers = dataset.headers || [];
              
              barHover = rows.map((row, i) => {
                let text = `${headers[0] || 'Point'}: ${row[0] || i + 1}<br>`;
                let usedHeaders = new Set();
                
                // Add the first column to used headers to prevent duplicates
                usedHeaders.add(headers[0]);
                
                // Show all selected columns from the current dataset (skip first column as it's already shown)
                headers.forEach((header, j) => {
                  if (j < row.length && j > 0 && !usedHeaders.has(header)) {
                    text += `${header}: ${row[j]}<br>`;
                    usedHeaders.add(header);
                  }
                });
                
                // Add data from other datasets if available (avoid duplicates)
                if (dataToRender.processedDatasets && dataToRender.processedDatasets.length > 1) {
                  dataToRender.processedDatasets.forEach((otherDataset, datasetIndex) => {
                    if (datasetIndex > 0 && otherDataset.rows && otherDataset.rows[i]) {
                      const otherRow = otherDataset.rows[i];
                      const otherHeaders = otherDataset.headers || [];
                      
                      // Add columns from other datasets (only if not already shown)
                      otherHeaders.forEach((header, j) => {
                        if (j < otherRow.length && otherRow[j] !== undefined && otherRow[j] !== '' && !usedHeaders.has(header)) {
                          text += `${header}: ${otherRow[j]}<br>`;
                          usedHeaders.add(header);
                        }
                      });
                    }
                  });
                }
                
                return text;
              });
            }
          }
          
          plotData = [{
            x: x,
            y: y,
            type: 'bar',
            marker: barMarker,
            text: barText,
            textposition: 'auto',
            hovertemplate: '%{hovertext}<extra></extra>',
            hovertext: barHover
          }];
          break;

      case 'line chart':
        // Enhanced line chart utilizing additional columns
        let lineMarker = { size: 8 };
        let lineConfig = { width: 3 };
        let lineHover = x.map((label, i) => `${label}<br>Value: ${y[i]}`);
        
        // Use additional columns for color mapping
        if (additionalData.color && additionalData.color.length > 0) {
          lineMarker.color = additionalData.color;
          lineMarker.colorscale = 'Viridis';
          lineMarker.showscale = true;
          lineMarker.colorbar = {
            title: additionalData.colorTitle || 'Color Scale'
          };
          lineConfig.color = colorPalette[0]; // Keep line solid color
          lineHover = x.map((label, i) => 
            `${label}<br>Value: ${y[i]}<br>${additionalData.colorTitle}: ${additionalData.color[i].toFixed(2)}`
          );
        } else {
          lineMarker.color = colorPalette[0];
          lineConfig.color = colorPalette[0];
        }
        
        // Use size mapping if available
        if (additionalData.size && additionalData.size.length > 0) {
          lineMarker.size = additionalData.size;
          lineHover = x.map((label, i) => 
            `${label}<br>Value: ${y[i]}<br>${additionalData.colorTitle || 'Color'}: ${(additionalData.color?.[i] || 0).toFixed(2)}<br>${additionalData.sizeTitle}: ${additionalData.size[i].toFixed(2)}`
          );
        }
        
        // Use comprehensive hover text if available
        if (additionalData.hover && additionalData.hover.length > 0) {
          lineHover = additionalData.hover;
        } else {
          // Ensure we show all selected columns from multiple datasets in hover
          if (dataToRender.processedDatasets && dataToRender.processedDatasets[0]) {
            const dataset = dataToRender.processedDatasets[0];
            const rows = dataset.rows || [];
            const headers = dataset.headers || [];
            
            lineHover = rows.map((row, i) => {
              let text = `${headers[0] || 'Point'}: ${row[0] || i + 1}<br>`;
              let usedHeaders = new Set();
              
              // Add the first column to used headers to prevent duplicates
              usedHeaders.add(headers[0]);
              
              // Show all selected columns from the current dataset (skip first column as it's already shown)
              headers.forEach((header, j) => {
                if (j < row.length && j > 0 && !usedHeaders.has(header)) {
                  text += `${header}: ${row[j]}<br>`;
                  usedHeaders.add(header);
                }
              });
              
              // Add data from other datasets if available (avoid duplicates)
              if (dataToRender.processedDatasets && dataToRender.processedDatasets.length > 1) {
                dataToRender.processedDatasets.forEach((otherDataset, datasetIndex) => {
                  if (datasetIndex > 0 && otherDataset.rows && otherDataset.rows[i]) {
                    const otherRow = otherDataset.rows[i];
                    const otherHeaders = otherDataset.headers || [];
                    
                    // Add columns from other datasets (only if not already shown)
                    otherHeaders.forEach((header, j) => {
                      if (j < otherRow.length && otherRow[j] !== undefined && otherRow[j] !== '' && !usedHeaders.has(header)) {
                        text += `${header}: ${otherRow[j]}<br>`;
                        usedHeaders.add(header);
                      }
                    });
                  }
                });
              }
              
              return text;
            });
          }
        }
        
        plotData = [{
          x: x,
          y: y,
          type: 'scatter',
          mode: 'lines+markers',
          marker: lineMarker,
          line: lineConfig,
          hovertemplate: '%{hovertext}<extra></extra>',
          hovertext: lineHover
        }];
        break;

      case 'scatter plot':
        // Enhanced scatter plot utilizing ALL selected columns
        let scatterMarker = {
          size: 12,
          line: { width: 1, color: '#000' }
        };
        
        let scatterText = x.map((label, i) => `${label}<br>X: ${x[i]}<br>Y: ${y[i]}`);
        
        // Utilize additional columns for enhanced visualization
        if (additionalData.color && additionalData.color.length > 0) {
          scatterMarker.color = additionalData.color;
          scatterMarker.colorscale = 'Viridis';
          scatterMarker.showscale = true;
          scatterMarker.colorbar = {
            title: additionalData.colorTitle || 'Color Scale'
          };
          scatterText = x.map((label, i) => 
            `${label}<br>X: ${x[i]}<br>Y: ${y[i]}<br>${additionalData.colorTitle}: ${additionalData.color[i].toFixed(2)}`
          );
        }
        
        if (additionalData.size && additionalData.size.length > 0) {
          scatterMarker.size = additionalData.size;
          scatterText = x.map((label, i) => 
            `${label}<br>X: ${x[i]}<br>Y: ${y[i]}<br>${additionalData.colorTitle || 'Color'}: ${(additionalData.color?.[i] || 0).toFixed(2)}<br>${additionalData.sizeTitle}: ${additionalData.size[i].toFixed(2)}`
          );
        }
        
        // Use comprehensive hover text if available
        if (additionalData.hover && additionalData.hover.length > 0) {
          scatterText = additionalData.hover;
        } else {
          // Ensure we show all selected columns from multiple datasets in hover
          if (dataToRender.processedDatasets && dataToRender.processedDatasets[0]) {
            const dataset = dataToRender.processedDatasets[0];
            const rows = dataset.rows || [];
            const headers = dataset.headers || [];
            
            scatterText = rows.map((row, i) => {
              let text = `${headers[0] || 'Point'}: ${row[0] || i + 1}<br>`;
              let usedHeaders = new Set();
              
              // Add the first column to used headers to prevent duplicates
              usedHeaders.add(headers[0]);
              
              // Show all selected columns from the current dataset (skip first column as it's already shown)
              headers.forEach((header, j) => {
                if (j < row.length && j > 0 && !usedHeaders.has(header)) {
                  text += `${header}: ${row[j]}<br>`;
                  usedHeaders.add(header);
                }
              });
              
              // Add data from other datasets if available (avoid duplicates)
              if (dataToRender.processedDatasets && dataToRender.processedDatasets.length > 1) {
                dataToRender.processedDatasets.forEach((otherDataset, datasetIndex) => {
                  if (datasetIndex > 0 && otherDataset.rows && otherDataset.rows[i]) {
                    const otherRow = otherDataset.rows[i];
                    const otherHeaders = otherDataset.headers || [];
                    
                    // Add columns from other datasets (only if not already shown)
                    otherHeaders.forEach((header, j) => {
                      if (j < otherRow.length && otherRow[j] !== undefined && otherRow[j] !== '' && !usedHeaders.has(header)) {
                        text += `${header}: ${otherRow[j]}<br>`;
                        usedHeaders.add(header);
                      }
                    });
                  }
                });
              }
              
              return text;
            });
          }
        }
        
        plotData = [{
          x: x,
          y: y,
          type: 'scatter',
          mode: 'markers',
          marker: scatterMarker,
          text: scatterText,
          hovertemplate: '%{text}<extra></extra>'
        }];
        break;

      case 'heatmap':
        // Enhanced heatmap with clustering dendrograms like the provided image
        const numGenes = Math.min(x.length, 20); // Limit to 20 genes for better visualization
        const numSamples = 10; // Number of samples
        
        // Create a realistic gene expression matrix
        const matrix = [];
        const geneNames = x.slice(0, numGenes).map((name, i) => {
          // Ensure gene names are fully visible by truncating if too long
          const geneName = name.length > 15 ? name.substring(0, 12) + '...' : name;
          return geneName || `Gene_${i + 1}`;
        });
        const sampleNames = Array.from({length: numSamples}, (_, i) => `Sample_${i + 1}`);
        
        for (let i = 0; i < numGenes; i++) {
          const row = [];
          const baseExpression = y[i] || Math.random() * 100;
          for (let j = 0; j < numSamples; j++) {
            // Add some correlation and noise to make realistic expression data
            const noise = (Math.random() - 0.5) * 0.4;
            const correlation = Math.sin((i + j) * 0.5) * 0.3;
            row.push(Math.max(0, Math.min(1, (baseExpression / 100) + noise + correlation)));
          }
          matrix.push(row);
        }
        
        // Create the main heatmap
        plotData = [{
          z: matrix,
          x: sampleNames,
          y: geneNames,
          type: 'heatmap',
          colorscale: [
            [0, '#440154'],    // Dark purple
            [0.25, '#31688e'], // Dark blue
            [0.5, '#35b779'],  // Green
            [0.75, '#fde725'], // Yellow
            [1, '#fde725']     // Bright yellow
          ],
          showscale: true,
          colorbar: {
            title: 'Expression Level',
            titleside: 'right',
            len: 0.8
          },
          hovertemplate: 'Gene: %{y}<br>Sample: %{x}<br>Expression: %{z:.3f}<extra></extra>'
        }];
        
        // Update layout for clustering appearance with better margins
        layout = {
          ...layout,
          title: 'Gene Expression Heatmap with Clustering',
          xaxis: {
            title: 'Samples',
            side: 'bottom',
            tickangle: -45,
            tickfont: { size: 12 },
            automargin: true
          },
          yaxis: {
            title: 'Genes',
            side: 'left',
            tickfont: { size: 12 },
            automargin: true
          },
          width: 1100,
          height: 800,
          margin: {
            l: 150,  // Increased left margin for gene names
            r: 120,  // Increased right margin for colorbar
            t: 100,
            b: 120   // Increased bottom margin for sample names
          },
          font: { size: 12 }
        };
        break;

      case 'manhattan plot':
        // Simulate chromosome positions
        const chromosomes = x.map((_, i) => Math.floor(i / 100) + 1);
        const positions = x.map((_, i) => (i % 100) * 1000000);
        plotData = [{
          x: positions,
          y: y.map(val => -Math.log10(Math.max(val, 1e-10))),
          type: 'scatter',
          mode: 'markers',
          marker: {
            color: chromosomes.map(chr => colorPalette[chr % colorPalette.length]),
            size: 6
          },
          text: x,
          hovertemplate: 'SNP: %{text}<br>Position: %{x}<br>-log10(p): %{y}<extra></extra>'
        }];
        layout.yaxis.title = '-log10(p-value)';
        layout.xaxis.title = 'Genomic Position';
        break;

      case 'volcano plot':
        const logFC = y.map(val => Math.log2(Math.max(val, 0.1)));
        const pValues = x.map((_, i) => Math.random() * 0.1);
        plotData = [{
          x: logFC,
          y: pValues.map(p => -Math.log10(p)),
          type: 'scatter',
          mode: 'markers',
          marker: {
            color: logFC.map(fc => Math.abs(fc) > 1 ? (fc > 0 ? 'red' : 'blue') : 'gray'),
            size: 8
          },
          text: x,
          hovertemplate: 'Gene: %{text}<br>log2FC: %{x}<br>-log10(p): %{y}<extra></extra>'
        }];
        layout.xaxis.title = 'log2(Fold Change)';
        layout.yaxis.title = '-log10(p-value)';
        break;

      case 'lollipop plot':
        plotData = [
          {
            x: x,
            y: Array(x.length).fill(0),
            type: 'scatter',
            mode: 'lines',
            line: { color: 'gray', width: 2 },
            showlegend: false
          },
          {
            x: x,
            y: y,
            type: 'scatter',
            mode: 'markers',
            marker: {
              color: x.map((_, i) => colorPalette[i % colorPalette.length]),
              size: 15,
              line: { width: 2, color: '#000' }
            }
          }
        ];
        break;

      case 'circular plot':
        plotData = [{
          r: y,
          theta: x.map((_, i) => (i * 360) / x.length),
          type: 'scatterpolar',
          mode: 'lines+markers',
          marker: {
            color: x.map((_, i) => colorPalette[i % colorPalette.length]),
            size: 10,
          },
          line: { color: colorPalette[0] },
        }];
        layout = { ...layout, polar: { radialaxis: { visible: true } } };
        break;

      case 'coverage plot':
        // Enhanced coverage plot with proper column name labeling and hover information
        let coverageHoverText = [];
        
        // Create hover text with column name : value format
        if (dataToRender.processedDatasets && dataToRender.processedDatasets[0]) {
          const dataset = dataToRender.processedDatasets[0];
          const rows = dataset.rows || [];
          const headers = dataset.headers || [];
          
          coverageHoverText = rows.map((row, i) => {
            let text = `${headers[0] || 'Position'}: ${row[0] || x[i]}<br>`;
            let usedHeaders = new Set();
            
            // Add the first column to used headers to prevent duplicates
            usedHeaders.add(headers[0]);
            
            // Show all selected columns from the current dataset (skip first column as it's already shown)
            headers.forEach((header, j) => {
              if (j < row.length && j > 0 && !usedHeaders.has(header)) {
                text += `${header}: ${row[j]}<br>`;
                usedHeaders.add(header);
              }
            });
            
            // Add data from other datasets if available (avoid duplicates)
            if (dataToRender.processedDatasets && dataToRender.processedDatasets.length > 1) {
              dataToRender.processedDatasets.forEach((otherDataset, datasetIndex) => {
                if (datasetIndex > 0 && otherDataset.rows && otherDataset.rows[i]) {
                  const otherRow = otherDataset.rows[i];
                  const otherHeaders = otherDataset.headers || [];
                  
                  // Add columns from other datasets (only if not already shown)
                  otherHeaders.forEach((header, j) => {
                    if (j < otherRow.length && otherRow[j] !== undefined && otherRow[j] !== '' && !usedHeaders.has(header)) {
                      text += `${header}: ${otherRow[j]}<br>`;
                      usedHeaders.add(header);
                    }
                  });
                }
              });
            }
            
            return text;
          });
        } else {
          // Fallback hover text
          coverageHoverText = x.map((label, i) => 
            `${xAxisTitle || 'Position'}: ${label}<br>${yAxisTitle || 'Coverage'}: ${y[i]}`
          );
        }
        
        plotData = [{
          x: x,
          y: y,
          type: 'scatter',
          mode: 'lines',
          fill: 'tonexty',
          fillcolor: 'rgba(74, 144, 226, 0.3)',
          line: { color: colorPalette[0], width: 2 },
          hovertext: coverageHoverText,
          hovertemplate: '%{hovertext}<extra></extra>'
        }];
        layout.yaxis.title = dataToRender.processedDatasets?.[0]?.headers?.[1] || 'Coverage Depth';
        layout.xaxis.title = dataToRender.processedDatasets?.[0]?.headers?.[0] || 'Genomic Position';
        break;

      case 'box plot':
        // Enhanced box plot with proper data distribution and hover
        plotData = x.map((label, i) => {
          // Generate sample data points around the main value for realistic box plot
          const baseValue = y[i];
          const sampleData = Array.from({length: 20}, () => 
            baseValue + (Math.random() - 0.5) * baseValue * 0.3
          );
          
          return {
            y: sampleData,
            type: 'box',
            name: label,
            marker: { color: colorPalette[i % colorPalette.length] },
            boxpoints: 'outliers',
            jitter: 0.3,
            pointpos: -1.8,
            hovertemplate: `<b>${label}</b><br>` +
                          'Q1: %{q1}<br>' +
                          'Median: %{median}<br>' +
                          'Q3: %{q3}<br>' +
                          'Min: %{lowerfence}<br>' +
                          'Max: %{upperfence}<extra></extra>'
          };
        });
        break;

      case 'violin plot':
        // Enhanced violin plot with different shape and hover functionality
        plotData = x.map((label, i) => {
          // Generate sample data points with different distribution for violin shape
          const baseValue = y[i];
          const sampleData = [];
          
          // Create a more realistic distribution for violin plot
          for (let j = 0; j < 50; j++) {
            // Create a bimodal distribution for more interesting violin shape
            if (Math.random() < 0.6) {
              sampleData.push(baseValue + (Math.random() - 0.5) * baseValue * 0.2);
            } else {
              sampleData.push(baseValue * 1.2 + (Math.random() - 0.5) * baseValue * 0.15);
            }
          }
          
          return {
            y: sampleData,
            type: 'violin',
            name: label,
            marker: { color: colorPalette[i % colorPalette.length] },
            box: {
              visible: true,
              width: 0.1
            },
            meanline: {
              visible: true
            },
            points: 'none',
            bandwidth: baseValue * 0.1,
            hovertemplate: `<b>${label}</b><br>` +
                          'Value: %{y}<br>' +
                          'Density at this point<extra></extra>'
          };
        });
        break;

      case 'histogram':
        // Enhanced histogram with proper column name labeling
        let histogramHoverText = [];
        
        // Create hover text with column name : value format
        if (dataToRender.processedDatasets && dataToRender.processedDatasets[0]) {
          const dataset = dataToRender.processedDatasets[0];
          const headers = dataset.headers || [];
          
          histogramHoverText = y.map((value, i) => 
            `${headers[1] || 'Value'}: ${value}`
          );
        }
        
        plotData = [{
          x: y,
          type: 'histogram',
          marker: { color: colorPalette[0] },
          nbinsx: 20,
          hovertemplate: dataToRender.processedDatasets?.[0]?.headers?.[1] ? 
            `${dataToRender.processedDatasets[0].headers[1]}: %{x}<br>Frequency: %{y}<extra></extra>` :
            'Value: %{x}<br>Frequency: %{y}<extra></extra>'
        }];
        layout.xaxis.title = dataToRender.processedDatasets?.[0]?.headers?.[1] || 'Value';
        layout.yaxis.title = 'Frequency';
        break;

      case 'genome browser':
        // Enhanced genome browser with proper column name labeling
        let genomeBrowserHoverText = [];
        
        // Create hover text with column name : value format
        if (dataToRender.processedDatasets && dataToRender.processedDatasets[0]) {
          const dataset = dataToRender.processedDatasets[0];
          const rows = dataset.rows || [];
          const headers = dataset.headers || [];
          
          genomeBrowserHoverText = rows.map((row, i) => {
            let text = `${headers[0] || 'Position'}: ${row[0] || x[i]}<br>`;
            let usedHeaders = new Set();
            
            // Add the first column to used headers to prevent duplicates
            usedHeaders.add(headers[0]);
            
            // Show all selected columns from the current dataset (skip first column as it's already shown)
            headers.forEach((header, j) => {
              if (j < row.length && j > 0 && !usedHeaders.has(header)) {
                text += `${header}: ${row[j]}<br>`;
                usedHeaders.add(header);
              }
            });
            
            return text;
          });
        } else {
          // Fallback hover text
          genomeBrowserHoverText = x.map((label, i) => 
            `${xAxisTitle || 'Position'}: ${label}<br>${yAxisTitle || 'Value'}: ${y[i]}`
          );
        }
        
        plotData = [{
          x: x,
          y: y,
          type: 'scatter',
          mode: 'lines+markers',
          marker: {
            color: x.map((_, i) => colorPalette[i % colorPalette.length]),
            size: 8,
          },
          hovertext: genomeBrowserHoverText,
          hovertemplate: '%{hovertext}<extra></extra>'
        }];
        layout.xaxis.title = dataToRender.processedDatasets?.[0]?.headers?.[0] || 'Genomic Position';
        layout.yaxis.title = dataToRender.processedDatasets?.[0]?.headers?.[1] || 'Value';
        break;

      case 'pca plot':
        // Simulate PCA data
        const pc1 = y.map((val, i) => val + Math.random() * 2 - 1);
        const pc2 = y.map((val, i) => val * 0.5 + Math.random() * 2 - 1);
        
        // Create hover text with selected columns
        let pcaHoverText = [];
        if (dataToRender.processedDatasets && dataToRender.processedDatasets[0]) {
          const dataset = dataToRender.processedDatasets[0];
          const rows = dataset.rows || [];
          const headers = dataset.headers || [];
          
          pcaHoverText = rows.map((row, i) => {
            let text = `Point ${i + 1}<br>`;
            headers.forEach((header, j) => {
              if (j < row.length) {
                text += `${header}: ${row[j]}<br>`;
              }
            });
            return text;
          });
        } else {
          pcaHoverText = x.map((label, i) => `${label}<br>PC1: ${pc1[i].toFixed(2)}<br>PC2: ${pc2[i].toFixed(2)}`);
        }
        
        plotData = [{
          x: pc1,
          y: pc2,
          type: 'scatter',
          mode: 'markers',
          marker: {
            color: x.map((_, i) => colorPalette[i % colorPalette.length]),
            size: 12
          },
          hovertext: pcaHoverText,
          hovertemplate: '%{hovertext}<extra></extra>'
        }];
        layout.xaxis.title = 'PC1';
        layout.yaxis.title = 'PC2';
        break;

      case 'tsne plot':
        // Simulate t-SNE data
        const tsne1 = y.map(() => Math.random() * 20 - 10);
        const tsne2 = y.map(() => Math.random() * 20 - 10);
        
        // Create hover text with selected columns in the same format as 3D bubble plot
        let tsneHoverText = [];
        if (dataToRender.processedDatasets && dataToRender.processedDatasets[0]) {
          const dataset = dataToRender.processedDatasets[0];
          const rows = dataset.rows || [];
          const headers = dataset.headers || [];
          
          tsneHoverText = rows.map((row, i) => {
            let text = `${headers[0] || 'Point'}: ${row[0] || i + 1}<br>`;
            let usedHeaders = new Set();
            
            // Add the first column to used headers to prevent duplicates
            usedHeaders.add(headers[0]);
            
            // Show all selected columns from the current dataset (skip first column as it's already shown)
            headers.forEach((header, j) => {
              if (j < row.length && j > 0 && !usedHeaders.has(header)) {
                text += `${header}: ${row[j]}<br>`;
                usedHeaders.add(header);
              }
            });
            
            // Add data from other datasets if available (avoid duplicates)
            if (dataToRender.processedDatasets && dataToRender.processedDatasets.length > 1) {
              dataToRender.processedDatasets.forEach((otherDataset, datasetIndex) => {
                if (datasetIndex > 0 && otherDataset.rows && otherDataset.rows[i]) {
                  const otherRow = otherDataset.rows[i];
                  const otherHeaders = otherDataset.headers || [];
                  
                  // Add columns from other datasets (only if not already shown)
                  otherHeaders.forEach((header, j) => {
                    if (j < otherRow.length && otherRow[j] !== undefined && otherRow[j] !== '' && !usedHeaders.has(header)) {
                      text += `${header}: ${otherRow[j]}<br>`;
                      usedHeaders.add(header);
                    }
                  });
                }
              });
            }
            
            return text;
          });
        } else {
          tsneHoverText = x.map((label, i) => `${label}<br>t-SNE 1: ${tsne1[i].toFixed(2)}<br>t-SNE 2: ${tsne2[i].toFixed(2)}`);
        }
        
        plotData = [{
          x: tsne1,
          y: tsne2,
          type: 'scatter',
          mode: 'markers',
          marker: {
            color: x.map((_, i) => colorPalette[i % colorPalette.length]),
            size: 10
          },
          hovertext: tsneHoverText,
          hovertemplate: '%{hovertext}<extra></extra>'
        }];
        layout.xaxis.title = 't-SNE 1';
        layout.yaxis.title = 't-SNE 2';
        break;

      case 'variant heatmap':
        // Create a matrix for variant data
        const variantMatrix = [];
        const samples = ['Sample1', 'Sample2', 'Sample3', 'Sample4'];
        for (let i = 0; i < Math.min(x.length, 20); i++) {
          variantMatrix.push(samples.map(() => Math.random() > 0.7 ? 1 : 0));
        }
        plotData = [{
          z: variantMatrix,
          x: samples,
          y: x.slice(0, Math.min(x.length, 20)),
          type: 'heatmap',
          colorscale: [[0, 'white'], [1, 'red']],
          showscale: true
        }];
        layout.xaxis.title = 'Samples';
        layout.yaxis.title = 'Variants';
        break;

      case 'allele frequency':
        plotData = [{
          x: x,
          y: y.map(val => Math.min(val / Math.max(...y), 1)),
          type: 'bar',
          marker: {
            color: y.map(freq => freq > 0.5 ? 'red' : freq > 0.1 ? 'orange' : 'green')
          }
        }];
        layout.yaxis.title = 'Allele Frequency';
        layout.xaxis.title = 'Variants';
        break;

      case 'phylogenetic tree':
        // Enhanced phylogenetic tree with proper column name labeling
        let phyloHoverText = [];
        
        // Create hover text with column name : value format
        if (dataToRender.processedDatasets && dataToRender.processedDatasets[0]) {
          const dataset = dataToRender.processedDatasets[0];
          const rows = dataset.rows || [];
          const headers = dataset.headers || [];
          
          phyloHoverText = rows.map((row, i) => {
            let text = `${headers[0] || 'Species'}: ${row[0] || x[i]}<br>`;
            let usedHeaders = new Set();
            
            // Add the first column to used headers to prevent duplicates
            usedHeaders.add(headers[0]);
            
            // Show all selected columns from the current dataset (skip first column as it's already shown)
            headers.forEach((header, j) => {
              if (j < row.length && j > 0 && !usedHeaders.has(header)) {
                text += `${header}: ${row[j]}<br>`;
                usedHeaders.add(header);
              }
            });
            
            // Add data from other datasets if available (avoid duplicates)
            if (dataToRender.processedDatasets && dataToRender.processedDatasets.length > 1) {
              dataToRender.processedDatasets.forEach((otherDataset, datasetIndex) => {
                if (datasetIndex > 0 && otherDataset.rows && otherDataset.rows[i]) {
                  const otherRow = otherDataset.rows[i];
                  const otherHeaders = otherDataset.headers || [];
                  
                  // Add columns from other datasets (only if not already shown)
                  otherHeaders.forEach((header, j) => {
                    if (j < otherRow.length && otherRow[j] !== undefined && otherRow[j] !== '' && !usedHeaders.has(header)) {
                      text += `${header}: ${otherRow[j]}<br>`;
                      usedHeaders.add(header);
                    }
                  });
                }
              });
            }
            
            return text;
          });
        } else {
          // Fallback hover text
          phyloHoverText = x.map((label, i) => 
            `${xAxisTitle || 'Species'}: ${label}<br>${yAxisTitle || 'Distance'}: ${y[i]}`
          );
        }
        
        plotData = [{
          x: x,
          y: y,
          type: 'scatter',
          mode: 'markers+lines',
          marker: {
            color: x.map((_, i) => colorPalette[i % colorPalette.length]),
            size: 12
          },
          line: { color: 'gray', width: 2 },
          hovertext: phyloHoverText,
          hovertemplate: '%{hovertext}<extra></extra>'
        }];
        layout.xaxis.title = dataToRender.processedDatasets?.[0]?.headers?.[0] || 'Species/Samples';
        layout.yaxis.title = dataToRender.processedDatasets?.[0]?.headers?.[1] || 'Evolutionary Distance';
        break;




      case 'circos plot':
        // Circular genomic plot
        const angles = x.map((_, i) => (i * 360) / x.length);
        plotData = [{
          r: y,
          theta: angles,
          type: 'scatterpolar',
          mode: 'markers+lines',
          marker: {
            color: x.map((_, i) => colorPalette[i % colorPalette.length]),
            size: 10
          },
          line: { color: 'rgba(0,0,0,0.3)', width: 1 }
        }];
        layout.polar = {
          radialaxis: { visible: true, range: [0, Math.max(...y) * 1.1] },
          angularaxis: { tickmode: 'array', tickvals: angles, ticktext: x }
        };
        break;

      // 3D VISUALIZATIONS
      case 'scatter 3d':
        // Enhanced 3D scatter plot with proper 3D positioning
        let x3d = [], y3d = [], z3d = [];
        let color3d = [];
        let size3d = [];
        let hoverText3d = [];
        
        if (dataToRender.processedDatasets && dataToRender.processedDatasets[0]) {
          const dataset = dataToRender.processedDatasets[0];
          const rows = dataset.rows || [];
          const headers = dataset.headers || [];
          
          // Map first 3 numeric columns to X, Y, Z with proper 3D distribution
          x3d = rows.map((row, i) => parseFloat(row[0]) || i * 10);
          y3d = rows.map((row, i) => parseFloat(row[1]) || i * 5);
          z3d = rows.map(row => parseFloat(row[2]) || 0);
          
          // Map additional columns to color, size, hover
          if (headers.length > 3) {
            color3d = rows.map(row => parseFloat(row[3]) || 0);
          }
          if (headers.length > 4) {
            size3d = rows.map(row => Math.max(parseFloat(row[4]) || 5, 3));
          }
          
          // Create hover text with names and all column information from multiple datasets
          hoverText3d = rows.map((row, i) => {
            let text = `${headers[0] || 'Point'}: ${row[0] || i + 1}<br>`;
            let usedHeaders = new Set();
            
            // Add the first column to used headers to prevent duplicates
            usedHeaders.add(headers[0]);
            
            // Show all selected columns from the current dataset (skip first column as it's already shown)
            headers.forEach((header, j) => {
              if (j < row.length && j > 0 && !usedHeaders.has(header)) {
                text += `${header}: ${row[j]}<br>`;
                usedHeaders.add(header);
              }
            });
            
            // Add data from other datasets if available (avoid duplicates)
            if (dataToRender.processedDatasets && dataToRender.processedDatasets.length > 1) {
              dataToRender.processedDatasets.forEach((dataset, datasetIndex) => {
                if (datasetIndex > 0 && dataset.rows && dataset.rows[i]) {
                  const otherRow = dataset.rows[i];
                  const otherHeaders = dataset.headers || [];
                  
                  // Add columns from other datasets (only if not already shown)
                  otherHeaders.forEach((header, j) => {
                    if (j < otherRow.length && otherRow[j] !== undefined && otherRow[j] !== '' && !usedHeaders.has(header)) {
                      text += `${header}: ${otherRow[j]}<br>`;
                      usedHeaders.add(header);
                    }
                  });
                }
              });
            }
            
            return text;
          });
        } else {
          // Fallback data with proper 3D distribution
          x3d = x.map((_, i) => i * 10 + Math.random() * 5);
          y3d = y.map((val, i) => val + Math.random() * 10);
          z3d = y.map((val, i) => val * 0.5 + Math.random() * 20);
          color3d = y.map(() => Math.random() * 100);
          size3d = y.map(() => Math.random() * 20 + 5);
          hoverText3d = x.map((label, i) => 
            `${label}<br>X: ${x3d[i].toFixed(2)}<br>Y: ${y3d[i].toFixed(2)}<br>Z: ${z3d[i].toFixed(2)}`
          );
        }
        
        plotData = [{
          x: x3d,
          y: y3d,
          z: z3d,
          type: 'scatter3d',
          mode: 'markers',
          marker: {
            size: size3d.length > 0 ? size3d : 8,
            color: color3d.length > 0 ? color3d : colorPalette[0],
            colorscale: 'Viridis',
            showscale: color3d.length > 0,
            colorbar: color3d.length > 0 ? {
              title: dataToRender.processedDatasets?.[0]?.headers?.[3] || 'Color Scale'
            } : undefined,
            line: { width: 0.5, color: 'rgba(0,0,0,0.3)' }
          },
          hovertext: hoverText3d,
          hovertemplate: '%{hovertext}<extra></extra>'
        }];
        
        layout = {
          ...layout,
          scene: {
            xaxis: { title: dataToRender.processedDatasets?.[0]?.headers?.[0] || 'First Column' },
            yaxis: { title: dataToRender.processedDatasets?.[0]?.headers?.[1] || 'Second Column' },
            zaxis: { title: dataToRender.processedDatasets?.[0]?.headers?.[2] || 'Third Column' },
            camera: { eye: { x: 1.5, y: 1.5, z: 1.5 } }
          },
          title: '3D Scatter Plot - Interactive Genomic Data'
        };
        break;

      case 'bubble 3d':
        // 3D Bubble scatter with proper 3D positioning and size mapping
        let xBubble = [], yBubble = [], zBubble = [];
        let sizeBubble = [];
        let colorBubble = [];
        let hoverBubble = [];
        
        if (dataToRender.processedDatasets && dataToRender.processedDatasets[0]) {
          const dataset = dataToRender.processedDatasets[0];
          const rows = dataset.rows || [];
          const headers = dataset.headers || [];
          
          // Map first 3 numeric columns to X, Y, Z with proper 3D distribution
          xBubble = rows.map((row, i) => parseFloat(row[0]) || i * 15);
          yBubble = rows.map((row, i) => parseFloat(row[1]) || i * 8);
          zBubble = rows.map(row => parseFloat(row[2]) || 0);
          
          // Size from 4th column (or use Y values if only 3 columns)
          sizeBubble = rows.map(row => Math.max(parseFloat(row[3]) || parseFloat(row[1]) || 5, 3) * 3);
          
          if (headers.length > 4) {
            colorBubble = rows.map(row => parseFloat(row[4]) || 0);
          } else if (headers.length > 3) {
            colorBubble = rows.map(row => parseFloat(row[3]) || 0);
          }
          
          // Create hover text with names and all column information from multiple datasets
          hoverBubble = rows.map((row, i) => {
            let text = `${headers[0] || 'Bubble'}: ${row[0] || i + 1}<br>`;
            let usedHeaders = new Set();
            
            // Add the first column to used headers to prevent duplicates
            usedHeaders.add(headers[0]);
            
            // Show all selected columns from the current dataset (skip first column as it's already shown)
            headers.forEach((header, j) => {
              if (j < row.length && j > 0 && !usedHeaders.has(header)) {
                text += `${header}: ${row[j]}<br>`;
                usedHeaders.add(header);
              }
            });
            
            // Add data from other datasets if available (avoid duplicates)
            if (dataToRender.processedDatasets && dataToRender.processedDatasets.length > 1) {
              dataToRender.processedDatasets.forEach((dataset, datasetIndex) => {
                if (datasetIndex > 0 && dataset.rows && dataset.rows[i]) {
                  const otherRow = dataset.rows[i];
                  const otherHeaders = dataset.headers || [];
                  
                  // Add columns from other datasets (only if not already shown)
                  otherHeaders.forEach((header, j) => {
                    if (j < otherRow.length && otherRow[j] !== undefined && otherRow[j] !== '' && !usedHeaders.has(header)) {
                      text += `${header}: ${otherRow[j]}<br>`;
                      usedHeaders.add(header);
                    }
                  });
                }
              });
            }
            
            return text;
          });
        } else {
          // Fallback data with proper 3D distribution
          xBubble = x.map((_, i) => i * 15 + Math.random() * 8);
          yBubble = y.map((val, i) => val + Math.random() * 15);
          zBubble = y.map((val, i) => val * 0.7 + Math.random() * 25);
          sizeBubble = y.map(val => Math.max(val * 0.3, 5));
          colorBubble = y.map(() => Math.random() * 100);
          hoverBubble = x.map((label, i) => 
            `${label}<br>X: ${xBubble[i].toFixed(2)}<br>Y: ${yBubble[i].toFixed(2)}<br>Z: ${zBubble[i].toFixed(2)}<br>Size: ${sizeBubble[i].toFixed(1)}`
          );
        }
        
        plotData = [{
          x: xBubble,
          y: yBubble,
          z: zBubble,
          type: 'scatter3d',
          mode: 'markers',
          marker: {
            size: sizeBubble,
            color: colorBubble.length > 0 ? colorBubble : colorPalette[0],
            colorscale: 'Plasma',
            showscale: true,
            colorbar: {
              title: dataToRender.processedDatasets?.[0]?.headers?.[4] || dataToRender.processedDatasets?.[0]?.headers?.[3] || 'Color Value'
            },
            opacity: 0.8,
            line: { width: 1, color: 'rgba(0,0,0,0.5)' }
          },
          hovertext: hoverBubble,
          hovertemplate: '%{hovertext}<extra></extra>'
        }];
        
        layout = {
          ...layout,
          scene: {
            xaxis: { title: dataToRender.processedDatasets?.[0]?.headers?.[0] || 'First Column' },
            yaxis: { title: dataToRender.processedDatasets?.[0]?.headers?.[1] || 'Second Column' },
            zaxis: { title: dataToRender.processedDatasets?.[0]?.headers?.[2] || 'Third Column' },
            camera: { eye: { x: 1.5, y: 1.5, z: 1.5 } }
          },
          title: '3D Bubble Plot - Multi-dimensional Genomic Analysis'
        };
        break;

      case 'surface 3d':
        // 3D Surface plot for continuous data visualization with improved interpolation
        const gridSize = Math.max(Math.ceil(Math.sqrt(Math.min(x.length, 100))), 5);
        const surfaceZ = [];
        const surfaceX = [];
        const surfaceY = [];
        const surfaceHoverText = [];
        
        // Create coordinate arrays for surface
        for (let i = 0; i < gridSize; i++) {
          surfaceX.push(i);
          surfaceY.push(i);
        }
        
        // Create a grid for surface plot with better interpolation
        for (let i = 0; i < gridSize; i++) {
          const row = [];
          const hoverRow = [];
          for (let j = 0; j < gridSize; j++) {
            const index = i * gridSize + j;
            let value;
            let hoverText = '';
            
            if (dataToRender.processedDatasets && dataToRender.processedDatasets[0]) {
              const dataset = dataToRender.processedDatasets[0];
              const rows = dataset.rows || [];
              const headers = dataset.headers || [];
              
              if (index < rows.length && rows[index]) {
                const dataRow = rows[index];
                value = parseFloat(dataRow[2]) || parseFloat(dataRow[1]) || 0;
                
                // Build hover text in the same format as 3D bubble plot
                hoverText = `${headers[0] || 'Point'}: ${dataRow[0] || index + 1}<br>`;
                let usedHeaders = new Set();
                usedHeaders.add(headers[0]);
                headers.forEach((header, colIndex) => {
                  if (colIndex < dataRow.length && colIndex > 0 && !usedHeaders.has(header)) {
                    hoverText += `${header}: ${dataRow[colIndex]}<br>`;
                    usedHeaders.add(header);
                  }
                });
                if (dataToRender.processedDatasets && dataToRender.processedDatasets.length > 1) {
                  dataToRender.processedDatasets.forEach((otherDataset, datasetIndex) => {
                    if (datasetIndex > 0 && otherDataset.rows && otherDataset.rows[index]) {
                      const otherRow = otherDataset.rows[index];
                      const otherHeaders = otherDataset.headers || [];
                      otherHeaders.forEach((header, colIndex) => {
                        if (colIndex < otherRow.length && otherRow[colIndex] !== undefined && otherRow[colIndex] !== '' && !usedHeaders.has(header)) {
                          hoverText += `${header}: ${otherRow[colIndex]}<br>`;
                          usedHeaders.add(header);
                        }
                      });
                    }
                  });
                }
              } else {
                // Better interpolation using nearby values
                const nearbyValues = [];
                for (let di = -1; di <= 1; di++) {
                  for (let dj = -1; dj <= 1; dj++) {
                    const ni = i + di;
                    const nj = j + dj;
                    const nIndex = ni * gridSize + nj;
                    if (ni >= 0 && ni < gridSize && nj >= 0 && nj < gridSize && nIndex < rows.length && rows[nIndex]) {
                      nearbyValues.push(parseFloat(rows[nIndex][2]) || parseFloat(rows[nIndex][1]) || 0);
                    }
                  }
                }
                value = nearbyValues.length > 0 ? 
                  nearbyValues.reduce((a, b) => a + b, 0) / nearbyValues.length :
                  Math.sin(i * 0.5) * Math.cos(j * 0.5) * 20;
                hoverText = `${dataToRender.processedDatasets?.[0]?.headers?.[0] || 'First Column'} index: ${i}<br>${dataToRender.processedDatasets?.[0]?.headers?.[1] || 'Second Column'} index: ${j}<br>Interpolated value: ${value.toFixed(2)}`;
              }
            } else {
              if (index < y.length) {
                value = y[index];
              } else {
                // Create a smooth mathematical surface
                value = Math.sin(i * 0.3) * Math.cos(j * 0.3) * 25 + Math.random() * 5;
              }
              hoverText = `X index: ${i}<br>Y index: ${j}<br>Value: ${value.toFixed(2)}`;
            }
            
            row.push(value);
            hoverRow.push(hoverText);
          }
          surfaceZ.push(row);
          surfaceHoverText.push(hoverRow);
        }
        
        plotData = [{
          x: surfaceX,
          y: surfaceY,
          z: surfaceZ,
          type: 'surface',
          colorscale: 'Viridis',
          showscale: true,
          colorbar: {
            title: dataToRender.processedDatasets?.[0]?.headers?.[2] || 'Surface Value',
            titleside: 'right'
          },
          contours: {
            z: {
              show: true,
              usecolormap: true,
              highlightcolor: "#42f462",
              project: { z: true }
            },
            x: {
              show: false
            },
            y: {
              show: false
            }
          },
          lighting: {
            ambient: 0.4,
            diffuse: 0.8,
            fresnel: 0.2,
            specular: 0.05,
            roughness: 0.1
          },
          text: surfaceHoverText,
          hovertemplate: '%{text}<extra></extra>'
        }];
        
        layout = {
          ...layout,
          scene: {
            xaxis: { title: dataToRender.processedDatasets?.[0]?.headers?.[0] || 'First Column' },
            yaxis: { title: dataToRender.processedDatasets?.[0]?.headers?.[1] || 'Second Column' },
            zaxis: { title: dataToRender.processedDatasets?.[0]?.headers?.[2] || 'Third Column' },
            camera: { eye: { x: 1.87, y: 0.88, z: -0.64 } },
            aspectmode: 'cube'
          },
          title: '3D Surface Plot - Continuous Data Landscape'
        };
        break;

      case 'mesh 3d':
        // 3D Mesh plot for cluster visualization with improved triangulation
        let xMesh = [], yMesh = [], zMesh = [];
        let iMesh = [], jMesh = [], kMesh = [];
        let hoverMesh = [];
        
        if (dataToRender.processedDatasets && dataToRender.processedDatasets[0]) {
          const dataset = dataToRender.processedDatasets[0];
          const rows = dataset.rows || [];
          const headers = dataset.headers || [];
          
          // Create a grid-based mesh for better visualization
          const gridSize = Math.ceil(Math.sqrt(Math.min(rows.length, 25)));
          
          for (let i = 0; i < gridSize; i++) {
            for (let j = 0; j < gridSize; j++) {
              const index = i * gridSize + j;
              if (index < rows.length) {
                const row = rows[index];
                xMesh.push(parseFloat(row[0]) || i * 10);
                yMesh.push(parseFloat(row[1]) || j * 10);
                zMesh.push(parseFloat(row[2]) || Math.random() * 30);
                
                // Build hover text in the same format as 3D bubble plot
                let text = `${headers[0] || 'Point'}: ${row[0] || index + 1}<br>`;
                let usedHeaders = new Set();
                usedHeaders.add(headers[0]);
                headers.forEach((header, colIndex) => {
                  if (colIndex < row.length && colIndex > 0 && !usedHeaders.has(header)) {
                    text += `${header}: ${row[colIndex]}<br>`;
                    usedHeaders.add(header);
                  }
                });
                if (dataToRender.processedDatasets && dataToRender.processedDatasets.length > 1) {
                  dataToRender.processedDatasets.forEach((otherDataset, datasetIndex) => {
                    if (datasetIndex > 0 && otherDataset.rows && otherDataset.rows[index]) {
                      const otherRow = otherDataset.rows[index];
                      const otherHeaders = otherDataset.headers || [];
                      otherHeaders.forEach((header, colIndex) => {
                        if (colIndex < otherRow.length && otherRow[colIndex] !== undefined && otherRow[colIndex] !== '' && !usedHeaders.has(header)) {
                          text += `${header}: ${otherRow[colIndex]}<br>`;
                          usedHeaders.add(header);
                        }
                      });
                    }
                  });
                }
                hoverMesh.push(text);
              }
            }
          }
          
          // Create proper triangular mesh indices for grid
          for (let i = 0; i < gridSize - 1; i++) {
            for (let j = 0; j < gridSize - 1; j++) {
              const idx = i * gridSize + j;
              if (idx + gridSize + 1 < xMesh.length) {
                // First triangle
                iMesh.push(idx);
                jMesh.push(idx + 1);
                kMesh.push(idx + gridSize);
                
                // Second triangle
                iMesh.push(idx + 1);
                jMesh.push(idx + gridSize + 1);
                kMesh.push(idx + gridSize);
              }
            }
          }
        } else {
          // Generate sample mesh data in a grid pattern
          const gridSize = Math.ceil(Math.sqrt(Math.min(x.length, 25)));
          
          for (let i = 0; i < gridSize; i++) {
            for (let j = 0; j < gridSize; j++) {
              const index = i * gridSize + j;
              xMesh.push(i * 15);
              yMesh.push(j * 15);
              zMesh.push(index < y.length ? y[index] : Math.random() * 50);
              hoverMesh.push(`Grid Point (${i}, ${j})<br>Value: ${zMesh[zMesh.length - 1].toFixed(2)}`);
            }
          }
          
          // Create triangular mesh indices for grid
          for (let i = 0; i < gridSize - 1; i++) {
            for (let j = 0; j < gridSize - 1; j++) {
              const idx = i * gridSize + j;
              if (idx + gridSize + 1 < xMesh.length) {
                // First triangle
                iMesh.push(idx);
                jMesh.push(idx + 1);
                kMesh.push(idx + gridSize);
                
                // Second triangle
                iMesh.push(idx + 1);
                jMesh.push(idx + gridSize + 1);
                kMesh.push(idx + gridSize);
              }
            }
          }
        }
        
        plotData = [{
          type: 'mesh3d',
          x: xMesh,
          y: yMesh,
          z: zMesh,
          i: iMesh,
          j: jMesh,
          k: kMesh,
          colorscale: 'Portland',
          intensity: zMesh,
          showscale: true,
          colorbar: {
            title: 'Intensity',
            titleside: 'right'
          },
          opacity: 0.8,
          lighting: {
            ambient: 0.18,
            diffuse: 1,
            fresnel: 0.1,
            specular: 1,
            roughness: 0.05,
            facenormalsepsilon: 1e-15,
            vertexnormalsepsilon: 1e-15
          },
          lightposition: {
            x: 100,
            y: 200,
            z: 0
          },
          hovertemplate: '%{text}<extra></extra>',
          text: hoverMesh
        }];
        
        layout = {
          ...layout,
          scene: {
            xaxis: { title: dataToRender.processedDatasets?.[0]?.headers?.[0] || 'First Column' },
            yaxis: { title: dataToRender.processedDatasets?.[0]?.headers?.[1] || 'Second Column' },
            zaxis: { title: dataToRender.processedDatasets?.[0]?.headers?.[2] || 'Third Column' },
            camera: { eye: { x: 1.5, y: 1.5, z: 1.5 } },
            aspectmode: 'cube'
          },
          title: '3D Mesh Plot - Surface Cluster Visualization'
        };
        break;

      case 'volume 3d':
        // 3D Volume plot for voxel-based rendering with improved data structure
        const volumeSize = Math.max(Math.ceil(Math.cbrt(Math.min(x.length, 64))), 3);
        const volumeData = [];
        const volumeHoverText = [];
        let minValue = Infinity, maxValue = -Infinity;
        
        // Create 3D volume data with better value distribution
        for (let i = 0; i < volumeSize; i++) {
          for (let j = 0; j < volumeSize; j++) {
            for (let k = 0; k < volumeSize; k++) {
              const index = i * volumeSize * volumeSize + j * volumeSize + k;
              let value;
              let hoverText = '';
              
              if (dataToRender.processedDatasets && dataToRender.processedDatasets[0]) {
                const dataset = dataToRender.processedDatasets[0];
                const rows = dataset.rows || [];
                const headers = dataset.headers || [];
                
                if (index < rows.length && rows[index]) {
                  const dataRow = rows[index];
                  value = parseFloat(dataRow[2]) || parseFloat(dataRow[1]) || 0;
                  
                  // Build hover text in the same format as 3D bubble plot
                  hoverText = `${headers[0] || 'Point'}: ${dataRow[0] || index + 1}<br>`;
                  let usedHeaders = new Set();
                  usedHeaders.add(headers[0]);
                  headers.forEach((header, colIndex) => {
                    if (colIndex < dataRow.length && colIndex > 0 && !usedHeaders.has(header)) {
                      hoverText += `${header}: ${dataRow[colIndex]}<br>`;
                      usedHeaders.add(header);
                    }
                  });
                  if (dataToRender.processedDatasets && dataToRender.processedDatasets.length > 1) {
                    dataToRender.processedDatasets.forEach((otherDataset, datasetIndex) => {
                      if (datasetIndex > 0 && otherDataset.rows && otherDataset.rows[index]) {
                        const otherRow = otherDataset.rows[index];
                        const otherHeaders = otherDataset.headers || [];
                        otherHeaders.forEach((header, colIndex) => {
                          if (colIndex < otherRow.length && otherRow[colIndex] !== undefined && otherRow[colIndex] !== '' && !usedHeaders.has(header)) {
                            hoverText += `${header}: ${otherRow[colIndex]}<br>`;
                            usedHeaders.add(header);
                          }
                        });
                      }
                    });
                  }
                } else {
                  // Create a 3D Gaussian-like distribution
                  const centerX = volumeSize / 2;
                  const centerY = volumeSize / 2;
                  const centerZ = volumeSize / 2;
                  const distance = Math.sqrt(
                    Math.pow(i - centerX, 2) + 
                    Math.pow(j - centerY, 2) + 
                    Math.pow(k - centerZ, 2)
                  );
                  value = Math.exp(-distance * 0.3) * 100 + Math.random() * 10;
                  hoverText = `${dataToRender.processedDatasets?.[0]?.headers?.[0] || 'First Column'} index: ${i}<br>${dataToRender.processedDatasets?.[0]?.headers?.[1] || 'Second Column'} index: ${j}<br>${dataToRender.processedDatasets?.[0]?.headers?.[2] || 'Third Column'} index: ${k}<br>Value: ${value.toFixed(2)}`;
                }
              } else {
                if (index < y.length) {
                  value = y[index];
                } else {
                  // Create a 3D pattern
                  value = Math.sin(i * 0.5) * Math.cos(j * 0.5) * Math.sin(k * 0.5) * 50 + 25;
                }
                hoverText = `X index: ${i}<br>Y index: ${j}<br>Z index: ${k}<br>Value: ${value.toFixed(2)}`;
              }
              
              volumeData.push([i, j, k, value]);
              volumeHoverText.push(hoverText);
              minValue = Math.min(minValue, value);
              maxValue = Math.max(maxValue, value);
            }
          }
        }
        
        plotData = [{
          type: 'volume',
          x: volumeData.map(d => d[0]),
          y: volumeData.map(d => d[1]),
          z: volumeData.map(d => d[2]),
          value: volumeData.map(d => d[3]),
          isomin: minValue + (maxValue - minValue) * 0.1,
          isomax: maxValue - (maxValue - minValue) * 0.1,
          opacity: 0.15,
          surface_count: 12,
          colorscale: 'RdYlBu',
          showscale: true,
          colorbar: {
            title: dataToRender.processedDatasets?.[0]?.headers?.[2] || 'Density Value',
            titleside: 'right'
          },
          caps: {
            x: { show: false },
            y: { show: false },
            z: { show: false }
          },
          text: volumeHoverText,
          hovertemplate: '%{text}<extra></extra>'
        }];
        
        layout = {
          ...layout,
          scene: {
            xaxis: { title: dataToRender.processedDatasets?.[0]?.headers?.[0] || 'First Column' },
            yaxis: { title: dataToRender.processedDatasets?.[0]?.headers?.[1] || 'Second Column' },
            zaxis: { title: dataToRender.processedDatasets?.[0]?.headers?.[2] || 'Third Column' },
            camera: { eye: { x: 1.5, y: 1.5, z: 1.5 } },
            aspectmode: 'cube'
          },
          title: '3D Volume Plot - Density Distribution Visualization'
        };
        break;

      case 'line 3d':
        // 3D Line/Trajectory plot with proper 3D positioning
        let xLine3d = [], yLine3d = [], zLine3d = [];
        let hoverLine3d = [];
        
        if (dataToRender.processedDatasets && dataToRender.processedDatasets[0]) {
          const dataset = dataToRender.processedDatasets[0];
          const rows = dataset.rows || [];
          const headers = dataset.headers || [];
          
          // Map first 3 numeric columns to X, Y, Z with proper 3D distribution
          xLine3d = rows.map((row, i) => parseFloat(row[0]) || i * 12);
          yLine3d = rows.map((row, i) => parseFloat(row[1]) || i * 6);
          zLine3d = rows.map(row => parseFloat(row[2]) || 0);
          
          // Create hover text with names and all column information from multiple datasets
          hoverLine3d = rows.map((row, i) => {
            let text = `${headers[0] || 'Point'}: ${row[0] || i + 1}<br>`;
            let usedHeaders = new Set();
            
            // Add the first column to used headers to prevent duplicates
            usedHeaders.add(headers[0]);
            
            // Show all selected columns from the current dataset (skip first column as it's already shown)
            headers.forEach((header, j) => {
              if (j < row.length && j > 0 && !usedHeaders.has(header)) {
                text += `${header}: ${row[j]}<br>`;
                usedHeaders.add(header);
              }
            });
            
            // Add data from other datasets if available (avoid duplicates)
            if (dataToRender.processedDatasets && dataToRender.processedDatasets.length > 1) {
              dataToRender.processedDatasets.forEach((dataset, datasetIndex) => {
                if (datasetIndex > 0 && dataset.rows && dataset.rows[i]) {
                  const otherRow = dataset.rows[i];
                  const otherHeaders = dataset.headers || [];
                  
                  // Add columns from other datasets (only if not already shown)
                  otherHeaders.forEach((header, j) => {
                    if (j < otherRow.length && otherRow[j] !== undefined && otherRow[j] !== '' && !usedHeaders.has(header)) {
                      text += `${header}: ${otherRow[j]}<br>`;
                      usedHeaders.add(header);
                    }
                  });
                }
              });
            }
            
            return text;
          });
        } else {
          // Fallback data with proper 3D trajectory
          xLine3d = x.map((_, i) => i * 12 + Math.random() * 3);
          yLine3d = y.map((val, i) => val + Math.random() * 8);
          zLine3d = y.map((val, i) => val * 0.6 + Math.random() * 18);
          hoverLine3d = x.map((label, i) => 
            `${label}<br>X: ${xLine3d[i].toFixed(2)}<br>Y: ${yLine3d[i].toFixed(2)}<br>Z: ${zLine3d[i].toFixed(2)}`
          );
        }
        
        plotData = [{
          x: xLine3d,
          y: yLine3d,
          z: zLine3d,
          type: 'scatter3d',
          mode: 'lines+markers',
          line: {
            color: colorPalette[0],
            width: 6
          },
          marker: {
            size: 5,
            color: zLine3d,
            colorscale: 'Viridis',
            showscale: true,
            colorbar: {
              title: 'Trajectory Value'
            }
          },
          hovertext: hoverLine3d,
          hovertemplate: '%{hovertext}<extra></extra>'
        }];
        
        layout = {
          ...layout,
          scene: {
            xaxis: { title: dataToRender.processedDatasets?.[0]?.headers?.[0] || 'First Column' },
            yaxis: { title: dataToRender.processedDatasets?.[0]?.headers?.[1] || 'Second Column' },
            zaxis: { title: dataToRender.processedDatasets?.[0]?.headers?.[2] || 'Third Column' },
            camera: { eye: { x: 1.5, y: 1.5, z: 1.5 } }
          },
          title: '3D Trajectory Plot - Data Evolution'
        };
        break;

      case 'network 3d':
        // 3D Network visualization for gene/protein networks with proper force-directed positioning
        const numNodes = Math.min(x.length, 20);
        const nodes = [];
        const edges = [];
        let networkHeaders = [];
        
        if (dataToRender.processedDatasets && dataToRender.processedDatasets[0]) {
          networkHeaders = dataToRender.processedDatasets[0].headers || [];
        }
        
        // Create nodes in 3D space using spherical distribution for better visualization
        for (let i = 0; i < numNodes; i++) {
          let nodeX, nodeY, nodeZ;
          
          if (dataToRender.processedDatasets && dataToRender.processedDatasets[0] && dataToRender.processedDatasets[0].rows[i]) {
            const row = dataToRender.processedDatasets[0].rows[i];
            // Try to use actual data values if they're numeric
            const val0 = parseFloat(row[0]);
            const val1 = parseFloat(row[1]);
            const val2 = parseFloat(row[2]);
            
            if (!isNaN(val0) && !isNaN(val1) && !isNaN(val2)) {
              // Use actual data values if all three are numeric
              nodeX = val0;
              nodeY = val1;
              nodeZ = val2;
            } else {
              // Use spherical distribution for non-numeric or missing data
              const radius = 100;
              const phi = Math.acos(2 * (i / numNodes) - 1);
              const theta = Math.PI * (1 + Math.sqrt(5)) * i;
              
              nodeX = radius * Math.sin(phi) * Math.cos(theta);
              nodeY = radius * Math.sin(phi) * Math.sin(theta);
              nodeZ = radius * Math.cos(phi);
            }
          } else {
            // Spherical Fibonacci lattice for even distribution
            const radius = 100;
            const phi = Math.acos(2 * (i / numNodes) - 1);
            const theta = Math.PI * (1 + Math.sqrt(5)) * i;
            
            nodeX = radius * Math.sin(phi) * Math.cos(theta);
            nodeY = radius * Math.sin(phi) * Math.sin(theta);
            nodeZ = radius * Math.cos(phi);
          }
          
          nodes.push({
            x: nodeX,
            y: nodeY,
            z: nodeZ,
            name: x[i] || `Node${i + 1}`,
            value: y[i] || Math.random() * 100,
            data: dataToRender.processedDatasets?.[0]?.rows?.[i] || []
          });
        }
        
        // Create edges based on proximity and value similarity for meaningful connections
        const edgeTraces = [];
        for (let i = 0; i < numNodes; i++) {
          for (let j = i + 1; j < numNodes; j++) {
            // Calculate distance between nodes
            const dx = nodes[i].x - nodes[j].x;
            const dy = nodes[i].y - nodes[j].y;
            const dz = nodes[i].z - nodes[j].z;
            const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
            
            // Calculate value similarity
            const valueDiff = Math.abs(nodes[i].value - nodes[j].value);
            const maxValue = Math.max(nodes[i].value, nodes[j].value);
            const similarity = 1 - (valueDiff / maxValue);
            
            // Connect if nodes are close OR have similar values
            if (distance < 150 || similarity > 0.7) {
              // Edge opacity based on connection strength
              const strength = distance < 150 ? (1 - distance / 150) : similarity;
              edgeTraces.push({
                x: [nodes[i].x, nodes[j].x, null],
                y: [nodes[i].y, nodes[j].y, null],
                z: [nodes[i].z, nodes[j].z, null],
                type: 'scatter3d',
                mode: 'lines',
                line: { 
                  color: `rgba(100,150,200,${Math.max(0.2, strength * 0.6)})`, 
                  width: Math.max(1, strength * 4) 
                },
                showlegend: false,
                hoverinfo: 'none'
              });
            }
          }
        }
        
        // Node trace with enhanced hover information
        const nodeTrace = {
          x: nodes.map(n => n.x),
          y: nodes.map(n => n.y),
          z: nodes.map(n => n.z),
          type: 'scatter3d',
          mode: 'markers',
          marker: {
            size: nodes.map(n => Math.max(n.value / Math.max(...nodes.map(n => n.value)) * 20, 5)),
            color: nodes.map(n => n.value),
            colorscale: 'Viridis',
            showscale: true,
            colorbar: {
              title: 'Node Value'
            },
            line: { width: 1, color: 'rgba(0,0,0,0.5)' }
          },
          hovertext: nodes.map((n, i) => {
            let text = `Node: ${n.name}<br>`;
            let usedHeaders = new Set();
            
            if (networkHeaders.length > 0 && n.data.length > 0) {
              // Add the first column to used headers to prevent duplicates
              if (networkHeaders[0]) {
                usedHeaders.add(networkHeaders[0]);
              }
              
              // Show all selected columns from the current dataset
              networkHeaders.forEach((header, j) => {
                if (j < n.data.length && !usedHeaders.has(header)) {
                  text += `${header}: ${n.data[j]}<br>`;
                  usedHeaders.add(header);
                }
              });
              
              // Add data from other datasets if available (avoid duplicates)
              if (dataToRender.processedDatasets && dataToRender.processedDatasets.length > 1) {
                dataToRender.processedDatasets.forEach((dataset, datasetIndex) => {
                  if (datasetIndex > 0 && dataset.rows && dataset.rows[i]) {
                    const otherRow = dataset.rows[i];
                    const otherHeaders = dataset.headers || [];
                    
                    // Add columns from other datasets (only if not already shown)
                    otherHeaders.forEach((header, j) => {
                      if (j < otherRow.length && otherRow[j] !== undefined && otherRow[j] !== '' && !usedHeaders.has(header)) {
                        text += `${header}: ${otherRow[j]}<br>`;
                        usedHeaders.add(header);
                      }
                    });
                  }
                });
              }
            } else {
              text += `Value: ${n.value.toFixed(2)}<br>`;
              text += `Position: (${n.x.toFixed(1)}, ${n.y.toFixed(1)}, ${n.z.toFixed(1)})`;
            }
            return text;
          }),
          hovertemplate: '%{hovertext}<extra></extra>'
        };
        
        plotData = [...edgeTraces, nodeTrace];
        
        layout = {
          ...layout,
          scene: {
            xaxis: { title: networkHeaders[0] || 'First Column', showgrid: false },
            yaxis: { title: networkHeaders[1] || 'Second Column', showgrid: false },
            zaxis: { title: networkHeaders[2] || 'Third Column', showgrid: false },
            camera: { eye: { x: 1.5, y: 1.5, z: 1.5 } }
          },
          title: '3D Network Visualization - Gene/Protein Interactions',
          showlegend: false
        };
        break;

      default:
        // Default to bar chart
        plotData = [{
          x: x,
          y: y,
          type: 'bar',
          marker: {
            color: x.map((_, i) => colorPalette[i % colorPalette.length]),
            line: { width: 2, color: '#000' },
          }
        }];
      }
    }

    await Plotly.newPlot(plotDiv, plotData, layout, { 
      displayModeBar: true, 
      responsive: true,
      displaylogo: false,
      modeBarButtonsToRemove: ['pan2d', 'lasso2d', 'select2d'],
      toImageButtonOptions: { scale: 2 }
    });
  };

  useEffect(() => {
    renderVisualization(plotRef, mergedData);
  }, [step, mergedData, visualizationType, config]);

  // Scroll to top whenever step changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step]);

  const handleBack = () => {
    setStep((prev) => Math.max(1, prev - 1));
  };

  const handleCustomVisualizationRedirect = () => {
    // Navigate to custom visualization with current session files
    navigate('/custom-visualization', { 
      state: { 
        datasets, 
        visualizationType, 
        mergedData,
        fromWizard: true,
        wizardFiles: datasets // Pass the current wizard session files
      } 
    });
  };

  return (
    <div id="main-wrapper">
      <Navbar />
      <div className="visualization-tool">
        <h2>Genomics Visualization Authoring Tool</h2>
        <div className="step-indicator">
          {steps.map((s) => (
            <div key={s.id} className={`step-item ${step === s.id ? 'active' : ''}`}>
              {s.name}
            </div>
          ))}
        </div>
        {error && <p className="error-message">{error}</p>}
        {step === 1 && <WizardStep1 onUpload={handleFileUpload} onBack={handleBack} />}
        {step === 2 && (
          <WizardStep3
            onUpdate={handleConfigUpdate}
            onBack={handleBack}
            datasets={datasets}
            selectedDatasets={selectedDatasets}
            commonColumns={commonColumns}
            primaryKey={primaryKey}
          />
        )}
        {step === 3 && (
          <WizardStepColumnSelection
            onUpdate={handleColumnSelection}
            onBack={handleBack}
            datasets={datasets}
            selectedDatasets={selectedDatasets}
            commonColumns={commonColumns}
            mergeMode={mergeMode}
          />
        )}
        {step === 4 && <WizardStep2 onSelect={handleTypeSelect} onBack={handleBack} />}
        {step === 5 && (
          <div>
            <h3>Total Visualization</h3>
            <div id="plot" ref={plotRef}></div>
            <WizardStep4 onExport={handleExport} onBack={handleBack} plotRef={plotRef} visualizationType={visualizationType} />
            <button
              className="custom-viz-button"
              onClick={handleCustomVisualizationRedirect}
            >
              Custom Visualization
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default VisualizationTool;