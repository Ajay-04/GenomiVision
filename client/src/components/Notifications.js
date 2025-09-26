import React, { useState, useEffect } from 'react';
import '../styles/Notifications.css';

const Notifications = ({ isOpen, onClose }) => {
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      type: 'success',
      title: 'Welcome to GenomiVision!',
      message: 'Your account has been successfully created. Start exploring genomic visualizations.',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      read: false
    },
    {
      id: 2,
      type: 'info',
      title: 'New Visualization Types Available',
      message: 'We\'ve added new visualization types including Manhattan plots and Volcano plots.',
      timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
      read: false
    },
    {
      id: 3,
      type: 'warning',
      title: 'File Upload Limit',
      message: 'Remember that you can upload up to 3 files simultaneously for analysis.',
      timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      read: true
    },
    {
      id: 4,
      type: 'info',
      title: 'System Maintenance',
      message: 'Scheduled maintenance will occur this weekend. Service may be briefly interrupted.',
      timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 1 week ago
      read: true
    }
  ]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = (id) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === id 
          ? { ...notification, read: true }
          : notification
      )
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(notification => ({ ...notification, read: true }))
    );
  };

  const deleteNotification = (id) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  };

  const clearAll = () => {
    setNotifications([]);
  };

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

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'success':
        return 'fas fa-check-circle';
      case 'warning':
        return 'fas fa-exclamation-triangle';
      case 'error':
        return 'fas fa-times-circle';
      case 'info':
      default:
        return 'fas fa-info-circle';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="notifications-overlay" onClick={onClose}>
      <div className="notifications-panel" onClick={(e) => e.stopPropagation()}>
        <div className="notifications-header">
          <div className="notifications-title">
            <h3>Notifications</h3>
            {unreadCount > 0 && (
              <span className="unread-badge">{unreadCount}</span>
            )}
          </div>
          <div className="notifications-actions">
            {unreadCount > 0 && (
              <button 
                className="action-btn"
                onClick={markAllAsRead}
                title="Mark all as read"
              >
                <i className="fas fa-check-double"></i>
              </button>
            )}
            {notifications.length > 0 && (
              <button 
                className="action-btn"
                onClick={clearAll}
                title="Clear all"
              >
                <i className="fas fa-trash"></i>
              </button>
            )}
            <button 
              className="action-btn close-btn"
              onClick={onClose}
              title="Close"
            >
              <i className="fas fa-times"></i>
            </button>
          </div>
        </div>

        <div className="notifications-content">
          {notifications.length === 0 ? (
            <div className="empty-notifications">
              <div className="empty-icon">
                <i className="fas fa-bell-slash"></i>
              </div>
              <h4>No notifications</h4>
              <p>You're all caught up! Check back later for updates.</p>
            </div>
          ) : (
            <div className="notifications-list">
              {notifications.map((notification) => (
                <div 
                  key={notification.id}
                  className={`notification-item ${notification.read ? 'read' : 'unread'} ${notification.type}`}
                >
                  <div className="notification-icon">
                    <i className={getNotificationIcon(notification.type)}></i>
                  </div>
                  <div className="notification-content">
                    <div className="notification-header">
                      <h4 className="notification-title">{notification.title}</h4>
                      <span className="notification-time">{getTimeAgo(notification.timestamp)}</span>
                    </div>
                    <p className="notification-message">{notification.message}</p>
                  </div>
                  <div className="notification-actions">
                    {!notification.read && (
                      <button 
                        className="mark-read-btn"
                        onClick={() => markAsRead(notification.id)}
                        title="Mark as read"
                      >
                        <i className="fas fa-check"></i>
                      </button>
                    )}
                    <button 
                      className="delete-btn"
                      onClick={() => deleteNotification(notification.id)}
                      title="Delete"
                    >
                      <i className="fas fa-times"></i>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Notifications;
