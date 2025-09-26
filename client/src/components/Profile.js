import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '../index.js';
import Navbar from './Navbar';
import '../styles/Profile.css';

const Profile = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    bio: '',
    organization: '',
    location: '',
    profilePicture: ''
  });
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/users/me', {
        withCredentials: true,
      });
      setUser(res.data);
      setFormData({
        name: res.data.name || '',
        email: res.data.email || '',
        bio: res.data.bio || '',
        organization: res.data.organization || '',
        location: res.data.location || '',
        profilePicture: res.data.profilePicture || ''
      });
      setLoading(false);
    } catch (err) {
      console.error('Error fetching user profile:', err);
      setError('Failed to fetch user profile. Please ensure you are logged in.');
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file.');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image size should be less than 5MB.');
      return;
    }

    setUploadingImage(true);
    setError('');

    try {
      // Create a unique filename
      const timestamp = Date.now();
      const filename = `profile-pictures/${user.email}_${timestamp}.${file.name.split('.').pop()}`;
      
      // Upload to Firebase Storage
      const imageRef = storageRef(storage, filename);
      await uploadBytes(imageRef, file);
      
      // Get download URL
      const downloadURL = await getDownloadURL(imageRef);
      
      // Update form data
      setFormData(prev => ({
        ...prev,
        profilePicture: downloadURL
      }));

      // If there was a previous profile picture, delete it
      if (user.profilePicture && user.profilePicture.includes('firebase')) {
        try {
          const oldImageRef = storageRef(storage, user.profilePicture);
          await deleteObject(oldImageRef);
        } catch (deleteError) {
          console.log('Old image deletion failed (might not exist):', deleteError);
        }
      }

    } catch (err) {
      console.error('Error uploading image:', err);
      setError('Failed to upload image. Please try again.');
    } finally {
      setUploadingImage(false);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      await axios.put('http://localhost:5000/api/users/profile', formData, {
        withCredentials: true,
      });
      setUser({ ...user, ...formData });
      setIsEditing(false);
      setError('');
    } catch (err) {
      console.error('Error updating profile:', err);
      setError('Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      name: user.name || '',
      email: user.email || '',
      bio: user.bio || '',
      organization: user.organization || '',
      location: user.location || '',
      profilePicture: user.profilePicture || ''
    });
    setIsEditing(false);
    setError('');
  };

  if (loading) {
    return (
      <div id="main-wrapper">
        <Navbar />
        <div className="content-wrapper">
          <div className="profile-container">
            <div className="loading-spinner">
              <div className="spinner"></div>
              <p>Loading profile...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div id="main-wrapper">
      <Navbar />
      <div className="content-wrapper">
        <div className="profile-container">
          <div className="profile-header">
            <div className="profile-avatar">
              <div className="avatar-circle" onClick={triggerFileInput}>
                {formData.profilePicture ? (
                  <img 
                    src={formData.profilePicture} 
                    alt="Profile" 
                    className="profile-image"
                  />
                ) : (
                  <i className="fas fa-user"></i>
                )}
                <div className="avatar-overlay">
                  <i className="fas fa-camera"></i>
                  <span>Change Photo</span>
                </div>
                {uploadingImage && (
                  <div className="upload-spinner">
                    <div className="spinner"></div>
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                style={{ display: 'none' }}
              />
            </div>
            <div className="profile-title">
              <h1>User Profile</h1>
              <p>Manage your account information and preferences</p>
            </div>
          </div>

          {error && (
            <div className="error-alert">
              <i className="fas fa-exclamation-triangle"></i>
              <span>{error}</span>
            </div>
          )}

          <div className="profile-content">
            <div className="profile-card">
              <div className="card-header">
                <h2>Personal Information</h2>
                <button 
                  className={`btn ${isEditing ? 'btn-secondary' : 'btn-primary'}`}
                  onClick={() => isEditing ? handleCancel() : setIsEditing(true)}
                >
                  <i className={`fas ${isEditing ? 'fa-times' : 'fa-edit'}`}></i>
                  {isEditing ? 'Cancel' : 'Edit Profile'}
                </button>
              </div>

              <div className="card-body">
                <div className="form-grid">
                  <div className="form-group">
                    <label htmlFor="name">Full Name</label>
                    {isEditing ? (
                      <input
                        type="text"
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        className="form-input"
                        placeholder="Enter your full name"
                      />
                    ) : (
                      <div className="form-display">{user?.name || 'Not provided'}</div>
                    )}
                  </div>

                  <div className="form-group">
                    <label htmlFor="email">Email Address</label>
                    <div className="form-display email-display">
                      <i className="fas fa-envelope"></i>
                      {user?.email || 'Not provided'}
                    </div>
                    <small className="form-help">Email cannot be changed</small>
                  </div>

                  <div className="form-group">
                    <label htmlFor="organization">Organization</label>
                    {isEditing ? (
                      <input
                        type="text"
                        id="organization"
                        name="organization"
                        value={formData.organization}
                        onChange={handleInputChange}
                        className="form-input"
                        placeholder="Your organization or company"
                      />
                    ) : (
                      <div className="form-display">{user?.organization || 'Not provided'}</div>
                    )}
                  </div>

                  <div className="form-group">
                    <label htmlFor="location">Location</label>
                    {isEditing ? (
                      <input
                        type="text"
                        id="location"
                        name="location"
                        value={formData.location}
                        onChange={handleInputChange}
                        className="form-input"
                        placeholder="Your city, country"
                      />
                    ) : (
                      <div className="form-display">{user?.location || 'Not provided'}</div>
                    )}
                  </div>

                  <div className="form-group full-width">
                    <label htmlFor="bio">Bio</label>
                    {isEditing ? (
                      <textarea
                        id="bio"
                        name="bio"
                        value={formData.bio}
                        onChange={handleInputChange}
                        className="form-textarea"
                        placeholder="Tell us about yourself and your research interests..."
                        rows="4"
                      />
                    ) : (
                      <div className="form-display bio-display">
                        {user?.bio || 'No bio provided'}
                      </div>
                    )}
                  </div>
                </div>

                {isEditing && (
                  <div className="form-actions">
                    <button 
                      className="btn btn-primary"
                      onClick={handleSave}
                      disabled={loading}
                    >
                      <i className="fas fa-save"></i>
                      {loading ? 'Saving...' : 'Save Changes'}
                    </button>
                    <button 
                      className="btn btn-secondary"
                      onClick={handleCancel}
                    >
                      <i className="fas fa-times"></i>
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="profile-stats">
              <div className="stats-card">
                <div className="stat-item">
                  <div className="stat-icon">
                    <i className="fas fa-chart-bar"></i>
                  </div>
                  <div className="stat-content">
                    <h3>0</h3>
                    <p>Visualizations Created</p>
                  </div>
                </div>
                <div className="stat-item">
                  <div className="stat-icon">
                    <i className="fas fa-upload"></i>
                  </div>
                  <div className="stat-content">
                    <h3>0</h3>
                    <p>Files Uploaded</p>
                  </div>
                </div>
                <div className="stat-item">
                  <div className="stat-icon">
                    <i className="fas fa-calendar"></i>
                  </div>
                  <div className="stat-content">
                    <h3>Member Since</h3>
                    <p>{user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Unknown'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
