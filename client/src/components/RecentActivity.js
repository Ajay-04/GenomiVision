import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ref, query, orderByChild, equalTo, onValue } from 'firebase/database';
import { database } from '../index.js';
import Navbar from './Navbar';
import '../styles/RecentActivity.css';

const RecentActivity = () => {
  const navigate = useNavigate();
  const [userEmail, setUserEmail] = useState(null);
  const [recentFiles, setRecentFiles] = useState([]);
  const [recentVisualizations, setRecentVisualizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('files');

  // Mock recent files data (in a real app, this would come from your backend)
  const mockRecentFiles = [
    {
      id: 1,
      name: 'depmap_ds3_sample_stats.csv',
      type: 'CSV',
      size: '2.4 MB',
      uploadDate: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      columns: 4,
      rows: 200,
      status: 'processed'
    },
    {
      id: 2,
      name: 'depmap_ds2_sample_metadata.csv',
      type: 'CSV',
      size: '1.8 MB',
      uploadDate: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5 hours ago
      columns: 4,
      rows: 200,
      status: 'processed'
    },
    {
      id: 3,
      name: 'gene_expression_data.gtf',
      type: 'GTF',
      size: '5.2 MB',
      uploadDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
      columns: 9,
      rows: 1500,
      status: 'processed'
    },
    {
      id: 4,
      name: 'variant_calls.vcf',
      type: 'VCF',
      size: '12.1 MB',
      uploadDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      columns: 10,
      rows: 3200,
      status: 'processed'
    },
    {
      id: 5,
      name: 'genomic_regions.bed',
      type: 'BED',
      size: '890 KB',
      uploadDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      columns: 6,
      rows: 850,
      status: 'processed'
    }
  ];

  useEffect(() => {
    const fetchUserEmail = async () => {
      try {
        const res = await axios.get('http://localhost:5000/api/users/me', {
          withCredentials: true,
        });
        setUserEmail(res.data.email);
        setRecentFiles(mockRecentFiles); // Set mock data
      } catch (err) {
        console.error('Error fetching user email:', err);
        setError('Failed to fetch user data. Please ensure you are logged in.');
        setLoading(false);
      }
    };

    fetchUserEmail();
  }, []);

  useEffect(() => {
    if (!userEmail) return;

    // Fetch visualizations from Firebase
    const uploadsRef = ref(database, 'uploads');
    const emailQuery = query(uploadsRef, orderByChild('email'), equalTo(userEmail));

    const unsubscribe = onValue(emailQuery, (snapshot) => {
      const items = [];
      snapshot.forEach((child) => {
        const data = child.val();
        items.push({
          id: child.key,
          ...data,
        });
      });
      setRecentVisualizations(items.reverse().slice(0, 10)); // Get latest 10
      setLoading(false);
    }, (err) => {
      console.error('Error fetching visualizations:', err);
      setError('Failed to fetch visualization history.');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userEmail]);

  const getTimeAgo = (timestamp) => {
    const now = new Date();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 60) {
      return `${minutes}m ago`;
    } else if (hours < 24) {
      return `${hours}h ago`;
    } else {
      return `${days}d ago`;
    }
  };

  const getFileIcon = (type) => {
    switch (type.toLowerCase()) {
      case 'csv':
        return 'fas fa-file-csv';
      case 'vcf':
        return 'fas fa-dna';
      case 'bed':
        return 'fas fa-bed';
      case 'gtf':
        return 'fas fa-file-code';
      case 'fasta':
        return 'fas fa-file-alt';
      default:
        return 'fas fa-file';
    }
  };

  const handleFileReuse = (file) => {
    // In a real app, you would pass the file data to the visualization tool
    navigate('/visualization', { state: { reuseFile: file } });
  };

  const handleVisualizationView = (visualization) => {
    // In a real app, you might recreate the visualization or show a preview
    navigate('/history');
  };

  if (loading) {
    return (
      <div id="main-wrapper">
        <Navbar />
        <div className="recent-activity-container">
          <div className="loading-spinner">
            <div className="spinner"></div>
            <p>Loading recent activity...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div id="main-wrapper">
      <Navbar />
      <div className="recent-activity-container">
        <div className="activity-header">
          <div className="header-content">
            <div className="header-icon">
              <i className="fas fa-clock"></i>
            </div>
            <div className="header-text">
              <h1>Recent Activity</h1>
              <p>Track your uploaded files and created visualizations</p>
            </div>
          </div>
        </div>

        {error && (
          <div className="error-alert">
            <i className="fas fa-exclamation-triangle"></i>
            <span>{error}</span>
          </div>
        )}

        <div className="activity-tabs">
          <button 
            className={`tab-button ${activeTab === 'files' ? 'active' : ''}`}
            onClick={() => setActiveTab('files')}
          >
            <i className="fas fa-file-upload"></i>
            Recent Files ({recentFiles.length})
          </button>
          <button 
            className={`tab-button ${activeTab === 'visualizations' ? 'active' : ''}`}
            onClick={() => setActiveTab('visualizations')}
          >
            <i className="fas fa-chart-bar"></i>
            Recent Visualizations ({recentVisualizations.length})
          </button>
        </div>

        <div className="activity-content">
          {activeTab === 'files' && (
            <div className="files-section">
              {recentFiles.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">
                    <i className="fas fa-file-upload"></i>
                  </div>
                  <h3>No recent files</h3>
                  <p>Upload some genomic data files to see them here</p>
                  <button 
                    className="btn btn-primary"
                    onClick={() => navigate('/visualization')}
                  >
                    <i className="fas fa-plus"></i>
                    Upload Files
                  </button>
                </div>
              ) : (
                <div className="files-grid">
                  {recentFiles.map((file) => (
                    <div key={file.id} className="file-card">
                      <div className="file-header">
                        <div className="file-icon">
                          <i className={getFileIcon(file.type)}></i>
                        </div>
                        <div className="file-status">
                          <span className={`status-badge ${file.status}`}>
                            {file.status}
                          </span>
                        </div>
                      </div>
                      
                      <div className="file-content">
                        <h3 className="file-name" title={file.name}>
                          {file.name}
                        </h3>
                        <div className="file-meta">
                          <div className="meta-item">
                            <i className="fas fa-file"></i>
                            <span>{file.type}</span>
                          </div>
                          <div className="meta-item">
                            <i className="fas fa-weight-hanging"></i>
                            <span>{file.size}</span>
                          </div>
                          <div className="meta-item">
                            <i className="fas fa-table"></i>
                            <span>{file.rows} rows, {file.columns} cols</span>
                          </div>
                          <div className="meta-item">
                            <i className="fas fa-clock"></i>
                            <span>{getTimeAgo(file.uploadDate)}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="file-actions">
                        <button 
                          className="btn btn-primary btn-sm"
                          onClick={() => handleFileReuse(file)}
                          title="Use this file for new visualization"
                        >
                          <i className="fas fa-chart-line"></i>
                          Visualize
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'visualizations' && (
            <div className="visualizations-section">
              {recentVisualizations.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">
                    <i className="fas fa-chart-bar"></i>
                  </div>
                  <h3>No recent visualizations</h3>
                  <p>Create some visualizations to see them here</p>
                  <button 
                    className="btn btn-primary"
                    onClick={() => navigate('/visualization')}
                  >
                    <i className="fas fa-plus"></i>
                    Create Visualization
                  </button>
                </div>
              ) : (
                <div className="visualizations-grid">
                  {recentVisualizations.map((viz) => (
                    <div key={viz.id} className="visualization-card">
                      <div className="viz-preview">
                        <img
                          src={`data:image/png;base64,${viz.image}`}                        
                          className="viz-image"
                        />
                        <div className="viz-overlay">
                          <button 
                            className="btn btn-primary btn-sm"
                            onClick={() => handleVisualizationView(viz)}
                          >
                            <i className="fas fa-eye"></i>
                            View
                          </button>
                        </div>
                      </div>
                      
                      <div className="viz-content">
                        <div className="viz-meta">
                          <div className="meta-item">
                            <i className="fas fa-calendar"></i>
                            <span>{new Date(viz.timestamp).toLocaleDateString()}</span>
                          </div>
                          <div className="meta-item">
                            <i className="fas fa-clock"></i>
                            <span>{getTimeAgo(new Date(viz.timestamp))}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="activity-footer">
          <div className="footer-actions">
            <button 
              className="btn btn-outline"
              onClick={() => navigate('/history')}
            >
              <i className="fas fa-history"></i>
              View Full History
            </button>
            <button 
              className="btn btn-primary"
              onClick={() => navigate('/visualization')}
            >
              <i className="fas fa-plus"></i>
              Create New Visualization
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecentActivity;
