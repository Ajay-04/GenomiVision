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
    { role: 'assistant', content: 'I am a custom visualization chat bot, ask questions for the given file.' },
  ]);
  const [userInput, setUserInput] = useState('');
  const [streamingText, setStreamingText] = useState('');
  const [visualizationData, setVisualizationData] = useState(null); // Store visualization data from LLM
  const chatContainerRef = useRef(null);
  const plotRef = useRef(null);

  const GROQ_API_KEY = process.env.REACT_APP_GROQ_API_KEY;

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatHistory, streamingText, userInput, visualizationData]);

  const sendMessage = async () => {
    if (!userInput.trim()) return;

    const newHistory = [
      ...chatHistory,
      { role: 'user', content: userInput },
    ];
    setChatHistory(newHistory);
    setUserInput('');
    setStreamingText('');
    setVisualizationData(null); // Reset visualization data

    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: `You are a helpful assistant. Use the following file data to answer questions: ${inputFileContent}. Include chat history in your context. When asked to visualize data (e.g., 'visualize in bar graph'), provide a response with a JSON object like { type: 'bar', x: [x1, x2, ...], y: [y1, y2, ...] } describing the visualization, followed by a text explanation. Do not generate images directly.` },
            ...newHistory,
          ],
          temperature: 0.5,
          max_tokens: 1024,
          top_p: 1,
          stream: true,
        }),
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullResponse = '';
      let potentialVisualization = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(line => line.trim());
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.replace('data: ', '');
            if (data === '[DONE]') continue;
            try {
              const parsed = JSON.parse(data);
              const delta = parsed.choices[0]?.delta?.content || '';
              if (delta) {
                fullResponse += delta;
                setStreamingText((prev) => prev + delta);

                // Attempt to parse visualization data from the response
                const vizMatch = delta.match(/\{.*type.*x.*y.*\}/);
                if (vizMatch) {
                  try {
                    potentialVisualization = JSON.parse(vizMatch[0]);
                  } catch (e) {
                    console.error('Failed to parse visualization data:', e);
                  }
                }
              }
            } catch (error) {
              console.error('Error parsing chunk:', error, 'Chunk:', data);
            }
          }
        }
      }

      setChatHistory([...newHistory, { role: 'assistant', content: fullResponse }]);
      setStreamingText('');
      if (potentialVisualization && potentialVisualization.type) {
        setVisualizationData(potentialVisualization);
        // Ask for confirmation to generate the visualization
        if (window.confirm(`Would you like to generate a ${potentialVisualization.type} visualization based on the data?`)) {
          renderVisualization(potentialVisualization);
        }
      }
    } catch (err) {
      console.error('Error streaming response:', err);
      setStreamingText('Error fetching response. Please try again.');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      sendMessage();
    }
  };

  const renderVisualization = (vizData) => {
    if (!plotRef.current || !vizData || !vizData.type || !vizData.x || !vizData.y) return;

    const plotData = [{
      x: vizData.x,
      y: vizData.y,
      type: vizData.type === 'bar' ? 'bar' : vizData.type,
      marker: { color: ['#FF6F61', '#6B5B95', '#88B04B', '#F7CAC9', '#92A8D1'].slice(0, vizData.x.length) },
    }];

    Plotly.newPlot(plotRef.current, plotData, {
      title: `Visualization: ${vizData.type}`,
      xaxis: { title: 'X Axis' },
      yaxis: { title: 'Y Axis' },
      plot_bgcolor: '#f9f9f9',
      paper_bgcolor: '#fff',
      font: { size: 12, color: '#2A3547' },
      width: 600,
      height: 400,
      showlegend: false,
    }, { displayModeBar: true, responsive: true });
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
        <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
        <g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round" stroke="#CCCCCC" stroke-width="0.144">
          <path d="M11.5003 12H5.41872M5.24634 12.7972L4.24158 15.7986C3.69128 17.4424 3.41613 18.2643 3.61359 18.7704C3.78506 19.21 4.15335 19.5432 4.6078 19.6701C5.13111 19.8161 5.92151 19.4604 7.50231 18.7491L17.6367 14.1886C19.1797 13.4942 19.9512 13.1471 20.1896 12.6648C20.3968 12.2458 20.3968 11.7541 20.1896 11.3351C19.9512 10.8529 19.1797 10.5057 17.6367 9.81135L7.48483 5.24303C5.90879 4.53382 5.12078 4.17921 4.59799 4.32468C4.14397 4.45101 3.77572 4.78336 3.60365 5.22209C3.40551 5.72728 3.67772 6.54741 4.22215 8.18767L5.24829 11.2793C5.34179 11.561 5.38855 11.7019 5.407 11.8459C5.42338 11.9738 5.42321 12.1032 5.40651 12.231C5.38768 12.375 5.34057 12.5157 5.24634 12.7972Z" stroke="#3d84e1" stroke-width="1.416" stroke-linecap="round" stroke-linejoin="round"></path>
        </g>
        <g id="SVGRepo_iconCarrier">
          <path d="M11.5003 12H5.41872M5.24634 12.7972L4.24158 15.7986C3.69128 17.4424 3.41613 18.2643 3.61359 18.7704C3.78506 19.21 4.15335 19.5432 4.6078 19.6701C5.13111 19.8161 5.92151 19.4604 7.50231 18.7491L17.6367 14.1886C19.1797 13.4942 19.9512 13.1471 20.1896 12.6648C20.3968 12.2458 20.3968 11.7541 20.1896 11.3351C19.9512 10.8529 19.1797 10.5057 17.6367 9.81135L7.48483 5.24303C5.90879 4.53382 5.12078 4.17921 4.59799 4.32468C4.14397 4.45101 3.77572 4.78336 3.60365 5.22209C3.40551 5.72728 3.67772 6.54741 4.22215 8.18767L5.24829 11.2793C5.34179 11.561 5.38855 11.7019 5.407 11.8459C5.42338 11.9738 5.42321 12.1032 5.40651 12.231C5.38768 12.375 5.34057 12.5157 5.24634 12.7972Z" stroke="#3d84e1" stroke-width="1.416" stroke-linecap="round" stroke-linejoin="round"></path>
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
          </div>
          <div className="input-area">
            <input
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your question..."
            />
            <SendIcon />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomVisualizationPage;



// import React, { useState, useEffect, useRef } from 'react';
// import { useLocation } from 'react-router-dom';
// import Navbar from '../components/Navbar';
// import ReactMarkdown from 'react-markdown';
// import Plotly from 'plotly.js';
// import '../styles/chat.css';

// const CustomVisualizationPage = () => {
//   const { state } = useLocation();
//   const { inputFileContent } = state || {};
//   const [chatHistory, setChatHistory] = useState([
//     { role: 'assistant', content: 'I am a custom visualization chat bot, ask questions for the given file.' },
//   ]);
//   const [userInput, setUserInput] = useState('');
//   const [streamingText, setStreamingText] = useState('');
//   const chatContainerRef = useRef(null);

//   const GROQ_API_KEY = process.env.REACT_APP_GROQ_API_KEY;

//   useEffect(() => {
//     if (chatContainerRef.current) {
//       chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
//     }
//   }, [chatHistory, streamingText, userInput]);

//   const sendMessage = async () => {
//     if (!userInput.trim()) return;

//     const newHistory = [
//       ...chatHistory,
//       { role: 'user', content: userInput },
//     ];
//     setChatHistory(newHistory);
//     setUserInput('');
//     setStreamingText('');

//     try {
//       const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//           'Authorization': `Bearer ${GROQ_API_KEY}`,
//         },
//         body: JSON.stringify({
//           model: 'llama-3.3-70b-versatile',
//           messages: [
//             { role: 'system', content: `You are a helpful assistant. Use the following file data to answer questions: ${inputFileContent}. Include chat history in your context. When asked to visualize data (e.g., 'visualize in bar graph'), provide a JSON object like { "type": "bar", "x": [x1, x2, ...], "y": [y1, y2, ...] } describing the visualization, followed by a text explanation. Ensure the JSON is properly formatted and enclosed in curly braces. Do not generate images directly.` },
//             ...newHistory,
//           ],
//           temperature: 0.5,
//           max_tokens: 1024,
//           top_p: 1,
//           stream: true,
//         }),
//       });

//       const reader = response.body.getReader();
//       const decoder = new TextDecoder();
//       let fullResponse = '';
//       let potentialVisualization = null;

//       while (true) {
//         const { done, value } = await reader.read();
//         if (done) break;

//         const chunk = decoder.decode(value);
//         const lines = chunk.split('\n').filter(line => line.trim());
//         for (const line of lines) {
//           if (line.startsWith('data: ')) {
//             const data = line.replace('data: ', '');
//             if (data === '[DONE]') continue;
//             try {
//               const parsed = JSON.parse(data);
//               const delta = parsed.choices[0]?.delta?.content || '';
//               if (delta) {
//                 fullResponse += delta;
//                 setStreamingText((prev) => prev + delta);

//                 // Attempt to parse visualization data from the full response
//                 const vizMatch = fullResponse.match(/\{.*?"type":.*?"x":.*?,"y":.*?\}/);
//                 if (vizMatch) {
//                   try {
//                     potentialVisualization = JSON.parse(vizMatch[0]);
//                   } catch (e) {
//                     console.error('Failed to parse visualization data:', e, 'Match:', vizMatch[0]);
//                   }
//                 }
//               }
//             } catch (error) {
//               console.error('Error parsing chunk:', error, 'Chunk:', data);
//             }
//           }
//         }
//       }

//       const assistantMessage = { role: 'assistant', content: fullResponse, visualization: potentialVisualization };
//       setChatHistory([...newHistory, assistantMessage]);
//       setStreamingText('');
//       if (potentialVisualization && potentialVisualization.type && potentialVisualization.x && potentialVisualization.y) {
//         renderVisualization(potentialVisualization, newHistory.length); // Use newHistory.length for the assistant's index
//       }
//     } catch (err) {
//       console.error('Error streaming response:', err);
//       setStreamingText('Error fetching response. Please try again.');
//     }
//   };

//   const handleKeyPress = (e) => {
//     if (e.key === 'Enter') {
//       sendMessage();
//     }
//   };

//   const renderVisualization = (vizData, index) => {
//     const plotContainer = document.getElementById(`plot-${index}`);
//     if (!plotContainer || !vizData || !vizData.type || !vizData.x || !vizData.y) {
//       console.error('Cannot render visualization:', { plotContainer, vizData });
//       return;
//     }

//     const plotData = [{
//       x: vizData.x,
//       y: vizData.y,
//       type: vizData.type === 'bar' ? 'bar' : vizData.type,
//       marker: { color: ['#FF6F61', '#6B5B95', '#88B04B', '#F7CAC9', '#92A8D1'].slice(0, vizData.x.length) },
//     }];

//     Plotly.newPlot(plotContainer, plotData, {
//       title: `Visualization: ${vizData.type}`,
//       xaxis: { title: 'Chromosome' },
//       yaxis: { title: 'Average Depth (DP)' },
//       plot_bgcolor: '#f9f9f9',
//       paper_bgcolor: '#fff',
//       font: { size: 12, color: '#2A3547' },
//       width: 600,
//       height: 400,
//       showlegend: false,
//     }, { displayModeBar: true, responsive: true });
//   };

//   const BotLogo = () => (
//     <div className="bot-logo">
//       <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
//         <circle cx="12" cy="12" r="10" stroke="#4CAF50" strokeWidth="2" />
//         <path d="M9 10h6v2H9z" fill="#4CAF50" />
//         <circle cx="9" cy="14" r="1" fill="#4CAF50" />
//         <circle cx="15" cy="14" r="1" fill="#4CAF50" />
//       </svg>
//     </div>
//   );

//   const UserLogo = () => (
//     <div className="user-logo">
//       <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
//         <circle cx="12" cy="8" r="4" stroke="#2196F3" strokeWidth="2" />
//         <path d="M6 20c0-3 3-5 6-5s6 2 6 5" stroke="#2196F3" strokeWidth="2" />
//       </svg>
//     </div>
//   );

//   const SendIcon = () => (
//     <div className="send-icon" onClick={sendMessage}>
//       <svg viewBox="0 0 24.00 24.00" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="#546dd4">
//         <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
//         <g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round" stroke="#CCCCCC" stroke-width="0.144">
//           <path d="M11.5003 12H5.41872M5.24634 12.7972L4.24158 15.7986C3.69128 17.4424 3.41613 18.2643 3.61359 18.7704C3.78506 19.21 4.15335 19.5432 4.6078 19.6701C5.13111 19.8161 5.92151 19.4604 7.50231 18.7491L17.6367 14.1886C19.1797 13.4942 19.9512 13.1471 20.1896 12.6648C20.3968 12.2458 20.3968 11.7541 20.1896 11.3351C19.9512 10.8529 19.1797 10.5057 17.6367 9.81135L7.48483 5.24303C5.90879 4.53382 5.12078 4.17921 4.59799 4.32468C4.14397 4.45101 3.77572 4.78336 3.60365 5.22209C3.40551 5.72728 3.67772 6.54741 4.22215 8.18767L5.24829 11.2793C5.34179 11.561 5.38855 11.7019 5.407 11.8459C5.42338 11.9738 5.42321 12.1032 5.40651 12.231C5.38768 12.375 5.34057 12.5157 5.24634 12.7972Z" stroke="#3d84e1" stroke-width="1.416" stroke-linecap="round" stroke-linejoin="round"></path>
//         </g>
//         <g id="SVGRepo_iconCarrier">
//           <path d="M11.5003 12H5.41872M5.24634 12.7972L4.24158 15.7986C3.69128 17.4424 3.41613 18.2643 3.61359 18.7704C3.78506 19.21 4.15335 19.5432 4.6078 19.6701C5.13111 19.8161 5.92151 19.4604 7.50231 18.7491L17.6367 14.1886C19.1797 13.4942 19.9512 13.1471 20.1896 12.6648C20.3968 12.2458 20.3968 11.7541 20.1896 11.3351C19.9512 10.8529 19.1797 10.5057 17.6367 9.81135L7.48483 5.24303C5.90879 4.53382 5.12078 4.17921 4.59799 4.32468C4.14397 4.45101 3.77572 4.78336 3.60365 5.22209C3.40551 5.72728 3.67772 6.54741 4.22215 8.18767L5.24829 11.2793C5.34179 11.561 5.38855 11.7019 5.407 11.8459C5.42338 11.9738 5.42321 12.1032 5.40651 12.231C5.38768 12.375 5.34057 12.5157 5.24634 12.7972Z" stroke="#3d84e1" stroke-width="1.416" stroke-linecap="round" stroke-linejoin="round"></path>
//         </g>
//       </svg>
//     </div>
//   );

//   return (
//     <div id="main-wrapper">
//       <Navbar />
//       <div className="custom-visualization-page">
//         <h2 style={{ marginTop: '1rem' }}>Custom Visualization Chat</h2>
//         <div ref={chatContainerRef} className="chat-container">
//           <div>
//             {chatHistory.map((message, index) => (
//               <div key={index} className={`message-wrapper ${message.role === 'user' ? 'user' : ''}`}>
//                 {message.role === 'user' ? (
//                   <>
//                     <div className="message user">{message.content}</div>
//                     <UserLogo />
//                   </>
//                 ) : (
//                   <>
//                     <BotLogo />
//                     <div className="message bot">
//                       <ReactMarkdown>{message.content}</ReactMarkdown>
//                       {message.visualization && (
//                         <div style={{ marginTop: '1rem' }}>
//                           <div id={`plot-${index}`} style={{ width: '600px', height: '400px' }}></div>
//                         </div>
//                       )}
//                     </div>
//                   </>
//                 )}
//               </div>
//             ))}
//             {streamingText && (
//               <div className="streaming-message">
//                 <BotLogo />
//                 <div className="message bot">
//                   <ReactMarkdown>{streamingText}</ReactMarkdown>
//                 </div>
//               </div>
//             )}
//           </div>
//           <div className="input-area">
//             <input
//               type="text"
//               value={userInput}
//               onChange={(e) => setUserInput(e.target.value)}
//               onKeyPress={handleKeyPress}
//               placeholder="Type your question..."
//             />
//             <SendIcon />
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default CustomVisualizationPage;