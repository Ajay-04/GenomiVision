import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import Navbar from '../components/Navbar';
import ReactMarkdown from 'react-markdown';
import Plotly from 'plotly.js';
import '../styles/chat.css';

const CustomVisualizationPage = () => {
  const { state } = useLocation();
  const { inputFileContent, uploadedFiles, fromWizard, wizardFiles } = state || {};
  const [chatHistory, setChatHistory] = useState([
    { role: 'assistant', content: fromWizard ? 
      '🤖 **GenomiVisual AI Assistant**\n\nWelcome to Custom Visualization! I can see you\'ve uploaded files through the wizard. I\'ll load your files automatically and help you create custom visualizations. What would you like to explore?' :
      '🤖 **GenomiVisual AI Assistant**\n\nHi! I am GenomiVisual AI assistant! I can help you analyze your uploaded files and create visualizations. What would you like to explore?' },
  ]);
  const [userInput, setUserInput] = useState('');
  const [streamingText, setStreamingText] = useState('');
  const [visualizationData, setVisualizationData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [files, setFiles] = useState([]);
  const chatContainerRef = useRef(null);
  const plotRef = useRef(null);
  const filesLoadedRef = useRef(false);

  // Debug and error handling
  useEffect(() => {
    console.log('🔍 Debug Info:');
    console.log('Calling GROQ API directly');
    console.log('Input file content length:', inputFileContent?.length || 0);
    
    setError('');
  }, [inputFileContent]);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatHistory, streamingText, userInput, visualizationData]);

  // Load files based on source (wizard session or database)
  useEffect(() => {
    const loadFiles = async () => {
      if (fromWizard && wizardFiles && wizardFiles.length > 0) {
        // Use wizard session files
        const wizardFilesFormatted = wizardFiles.map(dataset => ({
          name: dataset.fileName,
          type: getFileType(dataset.fileName),
          size: dataset.content ? dataset.content.length : 0,
          content: dataset.content,
          uploadTime: new Date().toLocaleString(),
          id: dataset.id
        }));
        
        setFiles(wizardFilesFormatted);
        
        if (wizardFilesFormatted.length > 0 && !filesLoadedRef.current) {
          filesLoadedRef.current = true;
          setChatHistory(prev => [...prev, 
            { role: 'assistant', content: `📂 **Wizard Files Loaded**\n\nI've loaded ${wizardFilesFormatted.length} file${wizardFilesFormatted.length !== 1 ? 's' : ''} from your current wizard session:\n\n${wizardFilesFormatted.map(f => `• ${f.name} (${(f.size / 1024).toFixed(1)} KB)`).join('\n')}\n\nThese files are ready for analysis! Ask me anything about your data.` }
          ]);
        }
      } else {
        // Fallback to database files or legacy props
        try {
          const response = await fetch('http://localhost:5000/api/users/files', {
            credentials: 'include'
          });
          
          if (response.ok) {
            const data = await response.json();
            const filesWithContent = [];
            
            // Fetch content for each file
            for (const file of data.files) {
              try {
                const contentResponse = await fetch(`http://localhost:5000/api/users/files/${file.id}/content`, {
                  credentials: 'include'
                });
                
                if (contentResponse.ok) {
                  const contentData = await contentResponse.json();
                  filesWithContent.push({
                    name: file.filename,
                    type: getFileType(file.filename),
                    size: file.size,
                    content: contentData.content,
                    uploadTime: new Date(file.uploadDate).toLocaleString(),
                    id: file.id
                  });
                }
              } catch (err) {
                console.warn(`Failed to fetch content for ${file.filename}:`, err);
              }
            }
            
            setFiles(filesWithContent);
            
            if (filesWithContent.length > 0 && !filesLoadedRef.current) {
              filesLoadedRef.current = true;
              setChatHistory(prev => [...prev, 
                { role: 'assistant', content: `📂 **Files Loaded**\n\nI've loaded ${filesWithContent.length} file${filesWithContent.length !== 1 ? 's' : ''} from your previous uploads:\n\n${filesWithContent.map(f => `• ${f.name} (${(f.size / 1024).toFixed(1)} KB)`).join('\n')}\n\nThese files are ready for analysis! Ask me anything about your data.` }
              ]);
            }
          }
        } catch (err) {
          console.error('Failed to fetch uploaded files:', err);
          // Final fallback to legacy props
          if (uploadedFiles && uploadedFiles.length > 0) {
            setFiles(uploadedFiles);
          } else if (inputFileContent) {
            setFiles([{
              name: 'uploaded_data.csv',
              type: 'text/csv',
              size: inputFileContent.length,
              content: inputFileContent,
              uploadTime: new Date().toLocaleString()
            }]);
          }
        }
      }
    };
    
    loadFiles();
  }, [fromWizard, wizardFiles]);
  
  const getFileType = (filename) => {
    const ext = filename.split('.').pop().toLowerCase();
    switch (ext) {
      case 'csv': return 'text/csv';
      case 'vcf': return 'text/vcf';
      case 'bed': return 'text/bed';
      case 'gtf': return 'text/gtf';
      case 'fasta': return 'text/fasta';
      default: return 'text/plain';
    }
  };


  const removeFile = (index) => {
    const removedFile = files[index];
    setFiles(prev => prev.filter((_, i) => i !== index));
    
    setChatHistory(prev => [...prev, 
      { role: 'assistant', content: `🗑️ **File Removed**\n\nRemoved: ${removedFile.name}\n\nNote: This file is still available in your uploads. To permanently delete files, please use the main dashboard.` }
    ]);
  };

  const sendMessage = async () => {
    if (!userInput.trim()) return;
    
    // Get API key from environment variables
    const GROQ_API_KEY = process.env.REACT_APP_GROQ_API_KEY;
    
    if (!GROQ_API_KEY) {
      setError('❌ **Error**: GROQ API key not found. Please set REACT_APP_GROQ_API_KEY in your .env file.');
      setIsLoading(false);
      return;
    }

    const newHistory = [
      ...chatHistory,
      { role: 'user', content: userInput },
    ];
    setChatHistory(newHistory);
    setUserInput('');
    setStreamingText('');
    setVisualizationData(null);
    setIsLoading(true);
    setError('');

    // Prepare file content for the system prompt
    const allFileContents = files.map(file => 
      `**File: ${file.name}**\n${file.content}\n\n`
    ).join('');
    
    const fileContentToUse = allFileContents || inputFileContent || 'No file data available';

    console.log('🚀 Sending message:', userInput);
    console.log('📁 Files available:', files.length);
    console.log('📁 File content preview:', fileContentToUse.substring(0, 200) + '...');

    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'meta-llama/llama-4-scout-17b-16e-instruct',
          messages: [
            { 
              role: 'system', 
              content: `You are a helpful genomics data analysis assistant. You have access to the following uploaded files and their contents:

${fileContentToUse}

Use this data to answer questions and provide insights.` 
            },
            ...newHistory,
          ],
          temperature: 0.7,
          max_tokens: 1024,
          top_p: 1,
        }),
      });
      
      console.log('📡 Response status:', response.status);
      console.log('📡 Response ok:', response.ok);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ API Error Response:', errorText);
        throw new Error(`API request failed: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      const content = data?.choices?.[0]?.message?.content || '';
      let fullResponse = content;
      let potentialVisualization = null;
      const vizMatch = content.match(/\{[\s\S]*?\"type\"[\s\S]*?\"x\"[\s\S]*?\"y\"[\s\S]*?\}/);
      if (vizMatch) {
        try { potentialVisualization = JSON.parse(vizMatch[0]); } catch {}
      }

      setChatHistory([...newHistory, { role: 'assistant', content: fullResponse }]);
      setStreamingText('');
      setIsLoading(false);
      
      if (potentialVisualization && potentialVisualization.type) {
        setVisualizationData(potentialVisualization);
        // Ask for confirmation to generate the visualization
        if (window.confirm(`Would you like to generate a ${potentialVisualization.type} visualization based on the data?`)) {
          renderVisualization(potentialVisualization);
        }
      }
    } catch (err) {
      console.error('❌ Error streaming response:', err);
      setIsLoading(false);
      setStreamingText('');
      
      const errorMessage = `❌ **Error**: ${err.message}\n\n**Possible solutions:**\n- Check your internet connection\n- Verify your GROQ API key is correct\n- Try again in a few moments\n\n**Debug info:** ${err.toString()}`;
      
      setChatHistory([...newHistory, { role: 'assistant', content: errorMessage }]);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      sendMessage();
    }
  };

  const renderVisualization = (vizData) => {
    if (!plotRef.current || !vizData || !vizData.type || !vizData.x || !vizData.y) return;

    const colorPalette = ['#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe', '#00f2fe', '#43e97b', '#38f9d7'];

    const plotData = [{
      x: vizData.x,
      y: vizData.y,
      type: vizData.type === 'bar' ? 'bar' : vizData.type,
      marker: { 
        color: colorPalette.slice(0, vizData.x.length),
        line: { width: 2, color: '#fff' }
      },
      hovertemplate: '<b>%{x}</b><br>Value: %{y}<extra></extra>'
    }];

    Plotly.newPlot(plotRef.current, plotData, {
      title: {
        text: `AI Generated Visualization: ${vizData.type.charAt(0).toUpperCase() + vizData.type.slice(1)}`,
        font: { size: 18, color: '#2c3e50', family: 'Arial, sans-serif' }
      },
      xaxis: { 
        title: 'Categories',
        titlefont: { size: 14, color: '#2c3e50' },
        tickfont: { size: 12, color: '#2c3e50' },
        showticklabels: false
      },
      yaxis: { 
        title: 'Values',
        titlefont: { size: 14, color: '#2c3e50' },
        tickfont: { size: 12, color: '#2c3e50' }
      },
      plot_bgcolor: 'rgba(255, 255, 255, 0.95)',
      paper_bgcolor: 'rgba(255, 255, 255, 0.95)',
      font: { size: 12, color: '#2c3e50', family: 'Arial, sans-serif' },
      showlegend: false,
      margin: { l: 60, r: 40, t: 60, b: 60 }
    }, { 
      displayModeBar: true, 
      responsive: true,
      modeBarButtonsToRemove: ['pan2d', 'lasso2d', 'select2d', 'autoScale2d'],
      displaylogo: false
    });
  };

  const BotLogo = () => (
    <div className="bot-logo">
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="6" y="6" width="12" height="12" rx="3" fill="white"/>
        <circle cx="9" cy="10" r="1.5" fill="#64748b"/>
        <circle cx="15" cy="10" r="1.5" fill="#64748b"/>
        <rect x="10" y="13" width="4" height="1.5" rx="0.75" fill="#64748b"/>
        <rect x="11" y="3" width="2" height="3" rx="1" fill="white"/>
      </svg>
    </div>
  );

  const UserLogo = () => (
    <div className="user-logo">
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="8" r="3" fill="white"/>
        <path d="M6 18c0-3.31 2.69-6 6-6s6 2.69 6 6" stroke="white" strokeWidth="2" fill="none"/>
      </svg>
    </div>
  );


  const SendIcon = () => (
    <div className="send-icon" onClick={sendMessage}>
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M22 2L11 13M22 2L15 22L11 13M22 2L2 9L11 13" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </div>
  );

  return (
    <div id="main-wrapper">
      <Navbar />
      <div className="custom-visualization-page">
        <h2 style={{ marginTop: '1rem' }}>Custom Visualization Chat</h2>
        
        <div className="chat-layout">
          <div ref={chatContainerRef} className="chat-container">
          <div>
            {chatHistory.map((message, index) => (
              <div key={index} className={`message-wrapper ${message.role === 'user' ? 'user' : ''}`}>
                {message.role === 'user' ? (
                  <>
                    <div className="message user">{message.content}</div>
                    <UserLogo />
                  </>
                ) : (
                  <>
                    <BotLogo />
                    <div className="message bot">
                      <ReactMarkdown>{message.content}</ReactMarkdown>
                      {visualizationData && (
                        <div ref={plotRef} style={{ marginTop: '1rem' }}></div>
                      )}
                    </div>
                  </>
                )}
              </div>
            ))}
            {streamingText && (
              <div className="streaming-message">
                <BotLogo />
                <div className="message bot">
                  <ReactMarkdown>{streamingText}</ReactMarkdown>
                </div>
              </div>
            )}
            {isLoading && !streamingText && (
              <div className="streaming-message">
                <BotLogo />
                <div className="message bot">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div className="loading-dots">
                      <span>.</span><span>.</span><span>.</span>
                    </div>
                    <span>Thinking...</span>
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="input-area">
            <input
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me about your data or request a visualization..."
              className="text-input"
            />
            <SendIcon />
          </div>
          </div>

          {/* Files Sidebar */}
          {files.length > 0 && (
            <div className="files-sidebar">
              <div className="available-files">
                <h4>📂 Available Files ({files.length})</h4>
                <p className="files-description">Ready for analysis</p>
                <div className="file-list">
                  {files.map((file, index) => (
                    <div key={index} className="file-item">
                      <div className="file-icon">
                        {file.name.endsWith('.csv') && '📊'}
                        {file.name.endsWith('.vcf') && '🧬'}
                        {file.name.endsWith('.bed') && '📍'}
                        {file.name.endsWith('.gtf') && '📋'}
                        {file.name.endsWith('.fasta') && '🔤'}
                        {(!file.name.includes('.')) && '📄'}
                      </div>
                      <div className="file-info-item">
                        <span className="file-name">{file.name}</span>
                        <span className="file-details">
                          {(file.size / 1024).toFixed(1)} KB
                        </span>
                      </div>
                      <div className="file-actions">
                        <span className="status-ready">✓</span>
                        <button 
                          className="remove-file-btn"
                          onClick={() => removeFile(index)}
                          title="Remove file"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomVisualizationPage;
