import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import Navbar from '../components/Navbar';
import ReactMarkdown from 'react-markdown';
import Plotly from 'plotly.js';
import '../styles/chat.css';

const CustomVisualizationPage = () => {
  const { state } = useLocation();
  const { inputFileContent } = state || {};
  const [chatHistory, setChatHistory] = useState([
    { role: 'assistant', content: '🤖 **GenomiVisual AI Assistant**\n\nI can help you:\n• Analyze your data patterns\n• Create visualizations\n• Explore data relationships\n• Generate insights\n\nAsk me anything about your uploaded file!' },
  ]);
  const [userInput, setUserInput] = useState('');
  const [streamingText, setStreamingText] = useState('');
  const [visualizationData, setVisualizationData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const chatContainerRef = useRef(null);
  const plotRef = useRef(null);

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

    console.log('🚀 Sending message:', userInput);
    console.log('📁 File content preview:', inputFileContent?.substring(0, 200) + '...');

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
              content: `You are a helpful genomics data analysis assistant. Use the following file data to answer questions: ${inputFileContent || 'No file data available'}. Include chat history in your context. When asked to visualize data (e.g., 'visualize in bar graph'), provide a response with a JSON object like { "type": "bar", "x": ["x1", "x2", "x3"], "y": [1, 2, 3] } describing the visualization, followed by a text explanation. Always provide helpful analysis even without visualization requests.` 
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
        <circle cx="12" cy="12" r="10" stroke="#4CAF50" strokeWidth="2" />
        <path d="M9 10h6v2H9z" fill="#4CAF50" />
        <circle cx="9" cy="14" r="1" fill="#4CAF50" />
        <circle cx="15" cy="14" r="1" fill="#4CAF50" />
      </svg>
    </div>
  );

  const UserLogo = () => (
    <div className="user-logo">
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="8" r="4" stroke="#2196F3" strokeWidth="2" />
        <path d="M6 20c0-3 3-5 6-5s6 2 6 5" stroke="#2196F3" strokeWidth="2" />
      </svg>
    </div>
  );

  const SendIcon = () => (
    <div className="send-icon" onClick={sendMessage}>
      <svg viewBox="0 0 24.00 24.00" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="#546dd4">
        <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
        <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round" stroke="#CCCCCC" strokeWidth="0.144">
          <path d="M11.5003 12H5.41872M5.24634 12.7972L4.24158 15.7986C3.69128 17.4424 3.41613 18.2643 3.61359 18.7704C3.78506 19.21 4.15335 19.5432 4.6078 19.6701C5.13111 19.8161 5.92151 19.4604 7.50231 18.7491L17.6367 14.1886C19.1797 13.4942 19.9512 13.1471 20.1896 12.6648C20.3968 12.2458 20.3968 11.7541 20.1896 11.3351C19.9512 10.8529 19.1797 10.5057 17.6367 9.81135L7.48483 5.24303C5.90879 4.53382 5.12078 4.17921 4.59799 4.32468C4.14397 4.45101 3.77572 4.78336 3.60365 5.22209C3.40551 5.72728 3.67772 6.54741 4.22215 8.18767L5.24829 11.2793C5.34179 11.561 5.38855 11.7019 5.407 11.8459C5.42338 11.9738 5.42321 12.1032 5.40651 12.231C5.38768 12.375 5.34057 12.5157 5.24634 12.7972Z" stroke="#3d84e1" strokeWidth="1.416" strokeLinecap="round" strokeLinejoin="round"></path>
        </g>
        <g id="SVGRepo_iconCarrier">
          <path d="M11.5003 12H5.41872M5.24634 12.7972L4.24158 15.7986C3.69128 17.4424 3.41613 18.2643 3.61359 18.7704C3.78506 19.21 4.15335 19.5432 4.6078 19.6701C5.13111 19.8161 5.92151 19.4604 7.50231 18.7491L17.6367 14.1886C19.1797 13.4942 19.9512 13.1471 20.1896 12.6648C3.96968 12.2458 20.3968 11.7541 20.1896 11.3351C19.9512 10.8529 19.1797 10.5057 17.6367 9.81135L7.48483 5.24303C5.90879 4.53382 5.12078 4.17921 4.59799 4.32468C4.14397 4.45101 3.77572 4.78336 3.60365 5.22209C3.40551 5.72728 3.67772 6.54741 4.22215 8.18767L5.24829 11.2793C5.34179 11.561 5.38855 11.7019 5.407 11.8459C5.42338 11.9738 5.42321 12.1032 5.40651 12.231C5.38768 12.375 5.34057 12.5157 5.24634 12.7972Z" stroke="#3d84e1" strokeWidth="1.416" strokeLinecap="round" strokeLinejoin="round"></path>
        </g>
      </svg>
    </div>
  );

  return (
    <div id="main-wrapper">
      <Navbar />
      <div className="custom-visualization-page">
        <h2 style={{ marginTop: '1rem' }}>Custom Visualization Chat</h2>
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
            />
            <SendIcon />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomVisualizationPage;
