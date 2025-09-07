import React, { useState } from 'react';
import axios from 'axios';

const WizardStep1 = ({ onUpload, onBack }) => {
  const [files, setFiles] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const acceptedTypes = ['.fasta', '.bed', '.vcf', '.gtf', '.csv']; // 

  const validateFile = (file) => {
    if (!file) return false;
    const extension = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
    return acceptedTypes.includes(extension);
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const addFiles = (incoming) => {
    if (!incoming) return;
    const list = Array.from(incoming);
    const valid = [];
    const invalid = [];
    list.forEach((f) => {
      if (validateFile(f)) valid.push(f);
      else invalid.push(f);
    });
    if (invalid.length) {
      setError(
        `Invalid file type for: ${invalid.map((f) => f.name).join(', ')}. Please upload only .fasta, .bed, .vcf, .gtf, or .csv files.`
      );
    } else {
      setError('');
    }
    let merged = [...files];
    valid.forEach((f) => {
      const dup = merged.some(
        (x) => x.name === f.name && x.size === f.size && x.lastModified === f.lastModified
      );
      if (!dup) merged.push(f);
    });
    if (merged.length > 3) {
      setError((prev) =>
        `${prev ? prev + ' ' : ''}You can select up to 3 files. Keeping the first 3.`
      );
      merged = merged.slice(0, 3);
    }
    setFiles(merged);
    if (merged.length && (selectedIndex === null || selectedIndex >= merged.length)) {
      setSelectedIndex(0);
    }
  };

  const handleFileChange = (e) => {
    addFiles(e.target.files);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    addFiles(e.dataTransfer.files);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleClearFile = () => {
    setFiles([]);
    setSelectedIndex(null);
    setError('');
  };

  const handleRemoveFile = (index) => {
    setFiles((prev) => {
      const next = prev.filter((_, i) => i !== index);
      if (selectedIndex !== null) {
        if (index === selectedIndex) {
          setSelectedIndex(next.length ? 0 : null);
        } else if (index < selectedIndex) {
          setSelectedIndex(selectedIndex - 1);
        }
      }
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!files.length || selectedIndex === null) return;
    const file = files[selectedIndex];
    setIsLoading(true);
    setError('');
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await axios.post('http://localhost:5000/api/data/upload', formData, {
        withCredentials: true, 
      });
      console.log('Backend response:', res.data);
      // Even on success, read local file content so downstream steps always
      // receive a consistent shape: { name, content }
      const reader = new FileReader();
      reader.onload = (e) => {
        onUpload({ content: e.target.result, name: file.name });
      };
      reader.onerror = () => {
        setError('Failed to read file content locally.');
      };
      reader.readAsText(file);
    } catch (err) {
      console.error('File upload error:', err);
      let errorMessage = 'File upload failed. Please try again.';
      if (err.response) {
        errorMessage = `Upload failed: ${err.response.data.message || err.response.statusText} (Status: ${err.response.status})`;
      } else if (err.request) {
        errorMessage = 'Server not responding. Please ensure the backend is running at http://localhost:5000.';
      } else {
        errorMessage = `Error: ${err.message}`;
      }
      setError(errorMessage);

      const reader = new FileReader();
      reader.onload = (e) => {
        onUpload({ content: e.target.result, name: file.name });
      };
      reader.onerror = () => {
        setError('Failed to read file content locally.');
      };
      reader.readAsText(file);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="wizard-step">
      <h3>Step 1: Upload Genomics Data</h3>
      <form onSubmit={handleSubmit}>
        <div
          className={`file-upload-area ${isDragging ? 'dragging' : ''}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <input
            type="file"
            accept=".fasta,.bed,.vcf,.gtf,.csv" 
            multiple
            onChange={handleFileChange}
            id="file-input"
            style={{ display: 'none' }}
          />
          <label htmlFor="file-input" className="file-upload-area-label">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="17 8 12 3 7 8"></polyline>
              <line x1="12" y1="3" x2="12" y2="15"></line>
            </svg>
            {files.length ? 'Add/Change Files' : 'Choose up to 3 files or Drag & Drop'}
          </label>
        </div>
        {files.length > 0 && (
          <div className="file-preview">
            <div className="file-list">
              {files.map((f, idx) => (
                <div key={f.name + idx} className="file-item">
                  <input
                    className="file-radio"
                    type="radio"
                    name="selectedFile"
                    id={`file-radio-${idx}`}
                    checked={selectedIndex === idx}
                    onChange={() => setSelectedIndex(idx)}
                    title="Use this file for visualization"
                  />
                  <label htmlFor={`file-radio-${idx}`} className="file-name">{f.name}</label>
                  <span className="chip file-size">{formatFileSize(f.size)}</span>
                  <button type="button" className="remove-btn" onClick={() => handleRemoveFile(idx)}>
                    Remove
                  </button>
                </div>
              ))}
            </div>
            <div className="file-help">
              <em>Select one file above to use for visualization.</em>
            </div>
            <button type="button" className="clear-btn" onClick={handleClearFile}>
              Clear all
            </button>
          </div>
        )}
        <div className="file-types-info">Select up to 3 files. Supported: .fasta, .bed, .vcf, .gtf, .csv</div>
        {error && <div className="error-message">{error}</div>}
        <button type="submit" disabled={!files.length || selectedIndex === null || isLoading} className={isLoading ? 'loading' : ''}>
          {isLoading ? 'Uploading...' : 'Upload'}
          {isLoading && <span />}
        </button>
      </form>
      <div className="nav-buttons">
        <button onClick={onBack} disabled>Back</button>
      </div>
    </div>
  );
};

export default WizardStep1;