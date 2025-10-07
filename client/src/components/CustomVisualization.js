

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BeatLoader } from 'react-spinners';
const CustomVisualization = ({ inputFileContent, visualizationType, onDataUpdate }) => {
  const [customPrompt, setCustomPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const GROQ_API_KEY = process.env.REACT_APP_GROQ_API_KEY;

  useEffect(() => {
    if (!GROQ_API_KEY) {
      setError('API key is not configured. Please follow these steps:\n\n1. Create a .env file in the client/ directory\n2. Add this line: REACT_APP_GROQ_API_KEY=your_api_key_here\n3. Get your API key from: https://console.groq.com/keys\n4. Restart the development server');
    } else {
      setError(''); // Clear error if API key is present
    }
    console.log('Component mounted - GROQ_API_KEY:', !!GROQ_API_KEY, 'visualizationType:', visualizationType, 'inputFileContent:', !!inputFileContent);
  }, [GROQ_API_KEY, visualizationType, inputFileContent]);

  const sendToLLM = async () => {
    console.log('sendToLLM triggered - visualizationType:', visualizationType, 'customPrompt:', customPrompt, 'inputFileContent:', inputFileContent);
    if (!visualizationType) {
      setError('No visualization type selected. Please choose a type in Step 2.');
      return;
    }

    if (!GROQ_API_KEY) {
      setError('API key is missing. Please:\n1. Create a .env file in the client/ folder\n2. Add: REACT_APP_GROQ_API_KEY=your_api_key\n3. Get API key from https://console.groq.com/keys\n4. Restart the server');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await axios.post(
        'https://api.groq.com/openai/v1/chat/completions',
        {
          model: 'llama3-70b-8192',
          messages: [
            {
              role: 'user',
              content: `You are a data processing assistant. You are given the following data: ${inputFileContent}\nThe data is in a format where each line represents a record (e.g., a CSV with headers or a similar structure). Your task is to process this data based on the following:\nSelected Visualization Type: ${visualizationType}\nAdditional Prompt: ${customPrompt}\nTransform the data into a CSV string with exactly two columns: "x,y". The "x" column should represent labels (e.g., gene names), and the "y" column should represent numerical values (e.g., expression levels). For example:\nx,y\nGeneA,10\nGeneB,20\nReturn only the CSV string, with no additional text, explanations, or comments. Ensure the first line is the header "x,y", and each subsequent line has exactly two values separated by a comma.`,
            },
          ],
          max_tokens: 4096,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${GROQ_API_KEY}`,
          },
        }
      );

      const csvData = response.data.choices[0].message.content.trim();
      console.log('Raw LLM response:', csvData);

      const lines = csvData.split('\n').filter(line => line.trim());
      if (lines.length < 2) {
        throw new Error('Invalid CSV data received from LLM. Expected at least a header and one row.');
      }

      const headers = lines[0].split(',').map(header => header.trim());
      if (headers.length !== 2 || headers[0] !== 'x' || headers[1] !== 'y') {
        throw new Error('Invalid CSV format. Expected header to be exactly "x,y".');
      }

      const xValues = [];
      const yValues = [];
      for (let i = 1; i < lines.length; i++) {
        const row = lines[i].split(',').map(cell => cell.trim());
        if (row.length !== 2) {
          console.warn(`Skipping invalid row ${i}: ${lines[i]}`);
          continue;
        }
        xValues.push(row[0]);
        const yValue = parseFloat(row[1]);
        yValues.push(isNaN(yValue) ? 0 : yValue);
      }

      if (xValues.length === 0 || yValues.length === 0) {
        throw new Error('No valid data parsed from LLM response.');
      }

      const adjustedData = { x: xValues, y: yValues };
      console.log('Adjusted data:', adjustedData);
      onDataUpdate(adjustedData);
      setCustomPrompt(''); // Clear the textarea after successful generation
    } catch (err) {
      console.error('Error calling LLM API:', err.response ? err.response.data : err.message);
      setError(`Failed to generate custom visualization. ${err.response?.data?.error?.message || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="custom-visualization">
      <h3>Customize the Visualization</h3>
      <p>Selected Visualization Type: {visualizationType || 'Not selected'}</p>
      <textarea
        value={customPrompt}
        onChange={(e) => setCustomPrompt(e.target.value)}
        placeholder="Enter additional details for the visualization (e.g., 'filter genes with expression above 15')"
        rows="4"
        style={{ width: '100%', marginBottom: '10px', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
      />
      <button
        onClick={sendToLLM}
        disabled={loading || !GROQ_API_KEY || !visualizationType}
        style={{
          padding: '8px 16px',
          backgroundColor: '#4CAF50',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: loading || !GROQ_API_KEY || !visualizationType ? 'not-allowed' : 'pointer',
        }}
      >
        {loading ? 'Generating...' : 'Generate Visualization'}
      </button>
      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100px' }}>
          <BeatLoader color="#4CAF50" size={15} />
        </div>
      )}
      {error && <div className="error-message" style={{ color: '#e74c3c', marginTop: '10px', padding: '15px', backgroundColor: '#fadbd8', borderRadius: '8px', border: '1px solid #e74c3c', whiteSpace: 'pre-line', fontSize: '14px', lineHeight: '1.6' }}>{error}</div>}
    </div>
  );
};

export default CustomVisualization;