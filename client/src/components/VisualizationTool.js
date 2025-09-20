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
    
    // Enhanced data processing for selected columns
    let x, y, xAxisTitle, yAxisTitle;
    
    if (dataToRender.processedDatasets && dataToRender.processedDatasets.length > 0) {
      // Use processed datasets with selected columns
      const primaryDataset = dataToRender.processedDatasets[0];
      x = primaryDataset.x || [];
      y = primaryDataset.y || [];
      xAxisTitle = primaryDataset.headers?.[0] || 'X-axis';
      yAxisTitle = primaryDataset.headers?.[1] || 'Y-axis';
      
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
      xaxis: { title: xAxisTitle, tickfont: { size: 14 } },
      yaxis: { title: yAxisTitle, tickfont: { size: 14 } },
      plot_bgcolor: '#f9f9f9',
      paper_bgcolor: '#fff',
      font: { size: 14, color: '#2A3547' },
      width: 800,
      height: 500,
      showlegend: plotData.length > 1, // Show legend for multiple datasets
    };

    // Only create plotData if it hasn't been populated for multiple datasets
    if (plotData.length === 0) {
      switch (visualizationType) {
        case 'bar chart':
          plotData = [{
            x: x,
            y: y,
            type: 'bar',
            marker: {
              color: x.map((_, i) => colorPalette[i % colorPalette.length]),
              line: { width: 2, color: '#000' },
            },
            text: y.map(val => val.toString()),
            textposition: 'auto',
          }];
          break;

      case 'line chart':
        plotData = [{
          x: x,
          y: y,
          type: 'scatter',
          mode: 'lines+markers',
          marker: { color: colorPalette[0], size: 8 },
          line: { color: colorPalette[0], width: 3 }
        }];
        break;

      case 'scatter plot':
        plotData = [{
          x: x,
          y: y,
          type: 'scatter',
          mode: 'markers',
          marker: {
            color: x.map((_, i) => colorPalette[i % colorPalette.length]),
            size: 10,
            line: { width: 1, color: '#000' }
          }
        }];
        break;

      case 'heatmap':
        plotData = [{
          z: [y],
          x: x,
          type: 'heatmap',
          colorscale: 'Viridis',
          showscale: true,
        }];
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
        plotData = [{
          x: x,
          y: y,
          type: 'scatter',
          mode: 'lines',
          fill: 'tonexty',
          fillcolor: 'rgba(74, 144, 226, 0.3)',
          line: { color: colorPalette[0], width: 2 }
        }];
        layout.yaxis.title = 'Coverage Depth';
        layout.xaxis.title = 'Genomic Position';
        break;

      case 'box plot':
        plotData = x.map((label, i) => ({
          y: [y[i]],
          type: 'box',
          name: label,
          marker: { color: colorPalette[i % colorPalette.length] }
        }));
        break;

      case 'violin plot':
        plotData = x.map((label, i) => ({
          y: [y[i]],
          type: 'violin',
          name: label,
          marker: { color: colorPalette[i % colorPalette.length] }
        }));
        break;

      case 'histogram':
        plotData = [{
          x: y,
          type: 'histogram',
          marker: { color: colorPalette[0] },
          nbinsx: 20
        }];
        layout.xaxis.title = 'Value';
        layout.yaxis.title = 'Frequency';
        break;

      case 'genome browser':
        plotData = [{
          x: x,
          y: y,
          type: 'scatter',
          mode: 'lines+markers',
          marker: {
            color: x.map((_, i) => colorPalette[i % colorPalette.length]),
            size: 8,
          },
        }];
        break;

      case 'pca plot':
        // Simulate PCA data
        const pc1 = y.map((val, i) => val + Math.random() * 2 - 1);
        const pc2 = y.map((val, i) => val * 0.5 + Math.random() * 2 - 1);
        plotData = [{
          x: pc1,
          y: pc2,
          type: 'scatter',
          mode: 'markers+text',
          text: x,
          textposition: 'top center',
          marker: {
            color: x.map((_, i) => colorPalette[i % colorPalette.length]),
            size: 12
          }
        }];
        layout.xaxis.title = 'PC1';
        layout.yaxis.title = 'PC2';
        break;

      case 'tsne plot':
        // Simulate t-SNE data
        const tsne1 = y.map(() => Math.random() * 20 - 10);
        const tsne2 = y.map(() => Math.random() * 20 - 10);
        plotData = [{
          x: tsne1,
          y: tsne2,
          type: 'scatter',
          mode: 'markers+text',
          text: x,
          textposition: 'top center',
          marker: {
            color: x.map((_, i) => colorPalette[i % colorPalette.length]),
            size: 10
          }
        }];
        layout.xaxis.title = 't-SNE 1';
        layout.yaxis.title = 't-SNE 2';
        break;

      case 'variant heatmap':
        // Create a matrix for variant data
        const matrix = [];
        const samples = ['Sample1', 'Sample2', 'Sample3', 'Sample4'];
        for (let i = 0; i < Math.min(x.length, 20); i++) {
          matrix.push(samples.map(() => Math.random() > 0.7 ? 1 : 0));
        }
        plotData = [{
          z: matrix,
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
        // Simple dendrogram representation
        plotData = [{
          x: x,
          y: y,
          type: 'scatter',
          mode: 'markers+lines',
          marker: {
            color: x.map((_, i) => colorPalette[i % colorPalette.length]),
            size: 12
          },
          line: { color: 'gray', width: 2 }
        }];
        layout.xaxis.title = 'Species/Samples';
        layout.yaxis.title = 'Evolutionary Distance';
        break;

      case 'time series':
        plotData = [{
          x: x.map((_, i) => `Time ${i + 1}`),
          y: y,
          type: 'scatter',
          mode: 'lines+markers',
          marker: { color: colorPalette[0], size: 8 },
          line: { color: colorPalette[0], width: 3 }
        }];
        layout.xaxis.title = 'Time Points';
        layout.yaxis.title = 'Expression Level';
        break;

      case 'stacked area chart':
        // Create multiple series for stacking
        const series1 = y.map(val => val * 0.6);
        const series2 = y.map(val => val * 0.4);
        plotData = [
          {
            x: x,
            y: series1,
            type: 'scatter',
            mode: 'lines',
            fill: 'tonexty',
            fillcolor: 'rgba(255, 111, 97, 0.7)',
            line: { color: colorPalette[0] },
            name: 'Series 1'
          },
          {
            x: x,
            y: series2,
            type: 'scatter',
            mode: 'lines',
            fill: 'tonexty',
            fillcolor: 'rgba(107, 91, 149, 0.7)',
            line: { color: colorPalette[1] },
            name: 'Series 2'
          }
        ];
        layout.showlegend = true;
        break;

      case 'geographic map':
        // Simple scatter geo plot
        const lats = y.map(() => Math.random() * 180 - 90);
        const lons = y.map(() => Math.random() * 360 - 180);
        plotData = [{
          lat: lats,
          lon: lons,
          text: x,
          type: 'scattergeo',
          mode: 'markers',
          marker: {
            size: y.map(val => Math.max(val / Math.max(...y) * 20, 5)),
            color: x.map((_, i) => colorPalette[i % colorPalette.length])
          }
        }];
        layout.geo = { projection: { type: 'natural earth' } };
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

    await Plotly.newPlot(plotDiv, plotData, layout, { displayModeBar: true, responsive: true });
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
    if (datasets.length > 0 && visualizationType) {
      navigate('/custom-visualization', { state: { datasets, visualizationType, mergedData } });
    } else {
      alert('Please upload files and select a visualization type first.');
    }
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
            <WizardStep4 onExport={handleExport} onBack={handleBack} plotRef={plotRef} />
            <h3>Total Visualization</h3>
            <div id="plot" ref={plotRef}></div>
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