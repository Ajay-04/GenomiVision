
// import React, { useState, useEffect, useRef } from 'react';
// import { useNavigate } from 'react-router-dom';
// import Navbar from './Navbar';
// import WizardStep1 from './WizardStep1';
// import WizardStep2 from './WizardStep2';
// import WizardStep3 from './WizardStep3';
// import WizardStep4 from './WizardStep4';
// import Plotly from 'plotly.js';
// import CustomVisualization from './CustomVisualization';
// import '../styles/visualization.css';

// const VisualizationTool = () => {
//   const navigate = useNavigate();
//   const [step, setStep] = useState(1);
//   const [data, setData] = useState(null);
//   const [customData, setCustomData] = useState(null);
//   const [visualizationType, setVisualizationType] = useState('');
//   const [config, setConfig] = useState({});
//   const [error, setError] = useState('');
//   const [inputFileContent, setInputFileContent] = useState('');
//   const [customImageUrl, setCustomImageUrl] = useState(null);
//   const plotRef = useRef(null);
//   const customPlotRef = useRef(null);

//   const steps = [
//     { name: 'Upload Data', id: 1 },
//     { name: 'Choose Type', id: 2 },
//     { name: 'Customize', id: 3 },
//     { name: 'Export', id: 4 },
//   ];

//   const colorPalette = [
//     '#FF6F61', '#6B5B95', '#88B04B', '#F7CAC9', '#92A8D1',
//     '#F4A261', '#2A9D8F', '#E9C46A', '#264653', '#D4A5A5',
//   ];

//   const handleFileUpload = (fileData) => {
//     console.log('Received file data:', fileData);
//     let parsedData = { x: [], y: [] };
//     const extension = fileData.name.split('.').pop().toLowerCase();
//     const content = fileData.content || '';

//     if (extension === 'bed') {
//       const lines = content.split('\n').filter(line => line.trim());
//       const geneCounts = {};
//       lines.forEach(line => {
//         const [,, , name] = line.trim().split(/\s+/);
//         if (name) geneCounts[name] = (geneCounts[name] || 0) + 1;
//       });
//       parsedData.x = Object.keys(geneCounts);
//       parsedData.y = Object.values(geneCounts);
//     } else if (extension === 'vcf') {
//       const lines = content.split('\n').filter(line => line.trim() && !line.startsWith('##') && !line.startsWith('#'));
//       const depthValues = [];
//       lines.forEach(line => {
//         const [, , , , , , , info] = line.trim().split(/\s+/);
//         const dpMatch = info.match(/DP=(\d+)/);
//         if (dpMatch) depthValues.push(parseInt(dpMatch[1]));
//       });
//       parsedData.x = lines.map((_, i) => `Variant${i + 1}`);
//       parsedData.y = depthValues.length > 0 ? depthValues : new Array(lines.length).fill(1);
//     } else if (extension === 'fasta') {
//       const lines = content.split('\n').filter(line => line.trim());
//       const sequenceLengths = [];
//       let currentSeq = '';
//       let currentHeader = '';
//       lines.forEach(line => {
//         if (line.startsWith('>')) {
//           if (currentSeq) sequenceLengths.push(currentSeq.length);
//           currentHeader = line.substring(1).trim();
//           currentSeq = '';
//         } else {
//           currentSeq += line.trim();
//         }
//       });
//       if (currentSeq) sequenceLengths.push(currentSeq.length);
//       parsedData.x = lines.filter(line => line.startsWith('>')).map(line => line.substring(1).trim());
//       parsedData.y = sequenceLengths;
//     } else if (extension === 'gtf') {
//       const lines = content.split('\n').filter(line => line.trim());
//       const geneCounts = {};
//       lines.forEach(line => {
//         const [, , feature, , , , , , attributes] = line.trim().split(/\s+/);
//         if (feature === 'gene') {
//           const geneIdMatch = attributes.match(/gene_id "([^"]+)"/);
//           if (geneIdMatch) geneCounts[geneIdMatch[1]] = (geneCounts[geneIdMatch[1]] || 0) + 1;
//         }
//       });
//       parsedData.x = Object.keys(geneCounts);
//       parsedData.y = Object.values(geneCounts);
//     } else if (extension === 'csv') {
//       const lines = content.split('\n').filter(line => line.trim());
//       if (lines.length === 0) {
//         setError('CSV file is empty.');
//         return;
//       }
//       const headers = lines[0].split(',').map(header => header.trim());
//       if (headers.length < 2) {
//         setError('CSV file must have at least two columns (e.g., "Gene,Expression").');
//         return;
//       }
//       const xValues = [];
//       const yValues = [];
//       for (let i = 1; i < lines.length; i++) {
//         const row = lines[i].split(',').map(cell => cell.trim());
//         if (row.length >= 2) {
//           xValues.push(row[0]);
//           const yValue = parseFloat(row[1]);
//           yValues.push(isNaN(yValue) ? 0 : yValue);
//         }
//       }
//       parsedData.x = xValues;
//       parsedData.y = yValues;
//     }

//     console.log('Parsed data:', parsedData);
//     if (parsedData.x.length > 0 && parsedData.y.length > 0) {
//       setError('');
//       setData(parsedData);
//       setInputFileContent(content);
//       setStep(2);
//     } else {
//       setError('Failed to parse file data. Check file format or content.');
//     }
//   };

//   const handleTypeSelect = (type) => {
//     setVisualizationType(type.replace('_', ' '));
//     setStep(3);
//   };

//   const handleConfigUpdate = (newConfig) => {
//     setConfig(newConfig);
//     setStep(4);
//   };

//   const handleExport = (format) => {
//     const plot = document.getElementById('plot');
//     if (!plot || !plotRef.current) {
//       alert('Visualization not ready. Please ensure a plot is rendered.');
//       return;
//     }

//     const exportData = {
//       x: data?.x || ['GeneA', 'GeneB', 'GeneC'],
//       y: data?.y || [10, 25, 15],
//     };

//     switch (format) {
//       case 'PNG':
//         Plotly.downloadImage(plot, { format: 'png', filename: `visualization_${new Date().toISOString()}`, width: 800, height: 600 });
//         break;
//       case 'JSON':
//         const jsonLink = document.createElement('a');
//         jsonLink.href = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify({ ...exportData, type: visualizationType, ...config }, null, 2))}`;
//         jsonLink.download = `visualization_${new Date().toISOString()}.json`;
//         jsonLink.click();
//         break;
//       case 'HTML':
//         const htmlContent = `
//           <!DOCTYPE html>
//           <html>
//           <body>
//             <div id="plot"></div>
//             <script src="https://cdn.plot.ly/plotly-latest.min.js"></script>
//             <script>
//               Plotly.newPlot('plot', ${JSON.stringify([{ x: exportData.x, y: exportData.y, type: visualizationType === 'bar chart' ? 'bar' : visualizationType.replace(' ', '_'), marker: { color: exportData.x.map((_, i) => colorPalette[i % colorPalette.length]) } }])}, ${JSON.stringify(config)});
//             </script>
//           </body>
//           </html>
//         `;
//         const htmlLink = document.createElement('a');
//         htmlLink.href = `data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`;
//         htmlLink.download = `visualization_${new Date().toISOString()}.html`;
//         htmlLink.click();
//         break;
//       case 'Python':
//         const pyContent = `
// import plotly.graph_objects as go

// fig = go.Figure(data=[go.Bar(x=${JSON.stringify(exportData.x)}, y=${JSON.stringify(exportData.y)}, marker_color=${JSON.stringify(exportData.x.map((_, i) => colorPalette[i % colorPalette.length]))})])
// fig.update_layout(title='Gene Expression Levels', xaxis_title='Genes', yaxis_title='Expression')
// fig.write_image("visualization.png")
//         `;
//         const pyLink = document.createElement('a');
//         pyLink.href = `data:text/plain;charset=utf-8,${encodeURIComponent(pyContent)}`;
//         pyLink.download = `visualization_${new Date().toISOString()}.py`;
//         pyLink.click();
//         break;
//       case 'R':
//         const rContent = `
// library(plotly)

// p <- plot_ly(x = ${JSON.stringify(exportData.x)}, y = ${JSON.stringify(exportData.y)}, type = 'bar', marker = list(color = ${JSON.stringify(exportData.x.map((_, i) => colorPalette[i % colorPalette.length]))}))
// p <- layout(p, title = 'Gene Expression Levels', xaxis = list(title = 'Genes'), yaxis = list(title = 'Expression'))
// export(p, file = "visualization.png")
//         `;
//         const rLink = document.createElement('a');
//         rLink.href = `data:text/plain;charset=utf-8,${encodeURIComponent(rContent)}`;
//         rLink.download = `visualization_${new Date().toISOString()}.r`;
//         rLink.click();
//         break;
//       default:
//         alert('Unsupported format');
//     }
//   };

//   const renderVisualization = async (targetRef, dataToRender, isCustom = false) => {
//     if (step !== 4 || !visualizationType || !dataToRender || !targetRef.current) return;

//     const plotDiv = targetRef.current;
//     const plotData = [{
//       x: dataToRender.x || ['GeneA', 'GeneB', 'GeneC'],
//       y: dataToRender.y || [10, 25, 15],
//       type: visualizationType === 'bar chart' ? 'bar' : visualizationType.replace(' ', '_'),
//       marker: {
//         color: (dataToRender.x || ['GeneA', 'GeneB', 'GeneC']).map((_, i) => colorPalette[i % colorPalette.length]),
//         line: { width: 2, color: '#000' },
//       },
//       text: (dataToRender.y || [10, 25, 15]).map(y => y.toString()),
//       textposition: 'auto',
//     }];

//     if (visualizationType === 'heatmap') {
//       plotData[0] = {
//         z: [dataToRender.y],
//         x: dataToRender.x,
//         type: 'heatmap',
//         colorscale: 'Viridis',
//         showscale: true,
//       };
//     } else if (visualizationType === 'circular map') {
//       plotData[0] = {
//         r: dataToRender.y,
//         theta: dataToRender.x.map(x => (x.length % 360) || 1),
//         type: 'scatterpolar',
//         mode: 'lines+markers',
//         marker: {
//           color: (dataToRender.x || []).map((_, i) => colorPalette[i % colorPalette.length]),
//           size: 10,
//         },
//         line: { color: '#000' },
//       };
//     } else if (visualizationType === 'genome browser') {
//       plotData[0] = {
//         x: dataToRender.x,
//         y: dataToRender.y,
//         type: 'scatter',
//         mode: 'lines+markers',
//         marker: {
//           color: (dataToRender.x || []).map((_, i) => colorPalette[i % colorPalette.length]),
//           size: 8,
//         },
//       };
//     }

//     await Plotly.newPlot(plotDiv, plotData, {
//       ...config,
//       title: isCustom ? 'Custom Visualization' : 'Total Visualization', // Updated title
//       xaxis: { title: config.attributes || 'Genes', tickfont: { size: 14 } },
//       yaxis: { title: 'Values', tickfont: { size: 14 } },
//       plot_bgcolor: '#f9f9f9',
//       paper_bgcolor: '#fff',
//       font: { size: 14, color: '#2A3547' },
//       width: 800,
//       height: 500,
//       showlegend: false,
//     }, { displayModeBar: true, responsive: true });

//     if (isCustom) {
//       const imageDataUrl = await Plotly.toImage(plotDiv, {
//         format: 'png',
//         width: 800,
//         height: 500,
//       });
//       setCustomImageUrl(imageDataUrl);
//     }
//   };

//   useEffect(() => {
//     renderVisualization(plotRef, data);
//   }, [step, data, visualizationType, config]);

//   useEffect(() => {
//     if (customData) {
//       renderVisualization(customPlotRef, customData, true);
//     }
//   }, [customData, visualizationType, config]);

//   const handleBack = () => {
//     setStep((prev) => Math.max(1, prev - 1));
//   };

//   return (
//     <div id="main-wrapper">
//       <Navbar />
//       <div className="visualization-tool">
//         <h2>Genomics Visualization Authoring Tool</h2>
//         <div className="step-indicator">
//           {steps.map((s) => (
//             <div key={s.id} className={`step-item ${step === s.id ? 'active' : ''}`}>
//               {s.name}
//             </div>
//           ))}
//         </div>
//         {error && <p className="error-message">{error}</p>}
//         {step === 1 && <WizardStep1 onUpload={handleFileUpload} onBack={handleBack} />}
//         {step === 2 && <WizardStep2 onSelect={handleTypeSelect} onBack={handleBack} />}
//         {step === 3 && (
//           <WizardStep3
//             onUpdate={handleConfigUpdate}
//             onBack={handleBack}
//             fileName={fileName}
//             fileContent={inputFileContent}
//           />
//         )}
//         {step === 4 && (
//           <div>
//             <WizardStep4 onExport={handleExport} onBack={handleBack} plotRef={plotRef} />
//             <h3>Total Visualization</h3>
//             <div id="plot" ref={plotRef}></div>
//             <button
//               className="custom-viz-button"
//               onClick={handleCustomVisualizationRedirect}
//             >
//               Custom Visualization
//             </button>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// };

// export default VisualizationTool;

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from './Navbar';
import WizardStep1 from './WizardStep1';
import WizardStep2 from './WizardStep2';
import WizardStep3 from './WizardStep3';
import WizardStep4 from './WizardStep4';
import Plotly from 'plotly.js';
import '../styles/visualization.css';

const VisualizationTool = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [data, setData] = useState(null);
  const [visualizationType, setVisualizationType] = useState('');
  const [config, setConfig] = useState({});
  const [error, setError] = useState('');
  const [inputFileContent, setInputFileContent] = useState('');
  const [fileName, setFileName] = useState('');
  const plotRef = useRef(null);

  const steps = [
    { name: 'Upload Data', id: 1 },
    { name: 'Choose Type', id: 2 },
    { name: 'Customize', id: 3 },
    { name: 'Export', id: 4 },
  ];

  const colorPalette = [
    '#FF6F61', '#6B5B95', '#88B04B', '#F7CAC9', '#92A8D1',
    '#F4A261', '#2A9D8F', '#E9C46A', '#264653', '#D4A5A5',
  ];

  const handleFileUpload = (fileData) => {
    console.log('Received file data:', fileData);
    let parsedData = { x: [], y: [] };
    const extension = fileData.name.split('.').pop().toLowerCase();
    const content = fileData.content || '';
    setFileName(fileData.name || '');

    if (extension === 'bed') {
      const lines = content.split('\n').filter(line => line.trim());
      const geneCounts = {};
      lines.forEach(line => {
        const [,, , name] = line.trim().split(/\s+/);
        if (name) geneCounts[name] = (geneCounts[name] || 0) + 1;
      });
      parsedData.x = Object.keys(geneCounts);
      parsedData.y = Object.values(geneCounts);
    } else if (extension === 'vcf') {
      const lines = content.split('\n').filter(line => line.trim() && !line.startsWith('##') && !line.startsWith('#'));
      const depthValues = [];
      lines.forEach(line => {
        const [, , , , , , , info] = line.trim().split(/\s+/);
        const dpMatch = info.match(/DP=(\d+)/);
        if (dpMatch) depthValues.push(parseInt(dpMatch[1]));
      });
      parsedData.x = lines.map((_, i) => `Variant${i + 1}`);
      parsedData.y = depthValues.length > 0 ? depthValues : new Array(lines.length).fill(1);
    } else if (extension === 'fasta') {
      const lines = content.split('\n').filter(line => line.trim());
      const sequenceLengths = [];
      let currentSeq = '';
      let currentHeader = '';
      lines.forEach(line => {
        if (line.startsWith('>')) {
          if (currentSeq) sequenceLengths.push(currentSeq.length);
          currentHeader = line.substring(1).trim();
          currentSeq = '';
        } else {
          currentSeq += line.trim();
        }
      });
      if (currentSeq) sequenceLengths.push(currentSeq.length);
      parsedData.x = lines.filter(line => line.startsWith('>')).map(line => line.substring(1).trim());
      parsedData.y = sequenceLengths;
    } else if (extension === 'gtf') {
      const lines = content.split('\n').filter(line => line.trim());
      const geneCounts = {};
      lines.forEach(line => {
        const [, , feature, , , , , , attributes] = line.trim().split(/\s+/);
        if (feature === 'gene') {
          const geneIdMatch = attributes.match(/gene_id "([^"]+)"/);
          if (geneIdMatch) geneCounts[geneIdMatch[1]] = (geneCounts[geneIdMatch[1]] || 0) + 1;
        }
      });
      parsedData.x = Object.keys(geneCounts);
      parsedData.y = Object.values(geneCounts);
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
      const xValues = [];
      const yValues = [];
      for (let i = 1; i < lines.length; i++) {
        const row = lines[i].split(',').map(cell => cell.trim());
        if (row.length >= 2) {
          xValues.push(row[0]);
          const yValue = parseFloat(row[1]);
          yValues.push(isNaN(yValue) ? 0 : yValue);
        }
      }
      parsedData.x = xValues;
      parsedData.y = yValues;
    }

    console.log('Parsed data:', parsedData);
    if (parsedData.x.length > 0 && parsedData.y.length > 0) {
      setError('');
      setData(parsedData);
      setInputFileContent(content);
      setStep(2);
    } else {
      setError('Failed to parse file data. Check file format or content.');
    }
  };

  const handleTypeSelect = (type) => {
    setVisualizationType(type.replace('_', ' '));
    setStep(3);
  };

  const handleConfigUpdate = (payload) => {
    if (payload && typeof payload === 'object') {
      if (payload.data) setData(payload.data);
      if (payload.config) setConfig(payload.config);
      if (!payload.data && !payload.config) setConfig(payload);
    } else {
      setConfig(payload);
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
      x: data?.x || ['GeneA', 'GeneB', 'GeneC'],
      y: data?.y || [10, 25, 15],
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
    if (step !== 4 || !visualizationType || !dataToRender || !targetRef.current) return;

    const plotDiv = targetRef.current;
    const plotData = [{
      x: dataToRender.x || ['GeneA', 'GeneB', 'GeneC'],
      y: dataToRender.y || [10, 25, 15],
      type: visualizationType === 'bar chart' ? 'bar' : visualizationType.replace(' ', '_'),
      marker: {
        color: (dataToRender.x || ['GeneA', 'GeneB', 'GeneC']).map((_, i) => colorPalette[i % colorPalette.length]),
        line: { width: 2, color: '#000' },
      },
      text: (dataToRender.y || [10, 25, 15]).map(y => y.toString()),
      textposition: 'auto',
    }];

    if (visualizationType === 'heatmap') {
      plotData[0] = {
        z: [dataToRender.y],
        x: dataToRender.x,
        type: 'heatmap',
        colorscale: 'Viridis',
        showscale: true,
      };
    } else if (visualizationType === 'circular map') {
      plotData[0] = {
        r: dataToRender.y,
        theta: dataToRender.x.map(x => (x.length % 360) || 1),
        type: 'scatterpolar',
        mode: 'lines+markers',
        marker: {
          color: (dataToRender.x || []).map((_, i) => colorPalette[i % colorPalette.length]),
          size: 10,
        },
        line: { color: '#000' },
      };
    } else if (visualizationType === 'genome browser') {
      plotData[0] = {
        x: dataToRender.x,
        y: dataToRender.y,
        type: 'scatter',
        mode: 'lines+markers',
        marker: {
          color: (dataToRender.x || []).map((_, i) => colorPalette[i % colorPalette.length]),
          size: 8,
        },
      };
    }

    await Plotly.newPlot(plotDiv, plotData, {
      ...config,
      title: 'Total Visualization',
      xaxis: { title: config.attributes || 'Genes', tickfont: { size: 14 } },
      yaxis: { title: 'Values', tickfont: { size: 14 } },
      plot_bgcolor: '#f9f9f9',
      paper_bgcolor: '#fff',
      font: { size: 14, color: '#2A3547' },
      width: 800,
      height: 500,
      showlegend: false,
    }, { displayModeBar: true, responsive: true });
  };

  useEffect(() => {
    renderVisualization(plotRef, data);
  }, [step, data, visualizationType, config]);

  const handleBack = () => {
    setStep((prev) => Math.max(1, prev - 1));
  };

  const handleCustomVisualizationRedirect = () => {
    if (inputFileContent && visualizationType) {
      navigate('/custom-visualization', { state: { inputFileContent, visualizationType } });
    } else {
      alert('Please upload a file and select a visualization type first.');
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
        {step === 2 && <WizardStep2 onSelect={handleTypeSelect} onBack={handleBack} />}
        {step === 3 && (
          <WizardStep3
            onUpdate={handleConfigUpdate}
            onBack={handleBack}
            fileName={fileName}
            fileContent={inputFileContent}
          />
        )}
        {step === 4 && (
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