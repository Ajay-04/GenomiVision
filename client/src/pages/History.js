import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ref, query, orderByChild, equalTo, onValue, remove } from 'firebase/database';
import { database } from '../index.js';
import Navbar from '../components/Navbar';
import '../styles/History.css';
import { BeatLoader } from 'react-spinners';

const History = () => {
  const [userEmail, setUserEmail] = useState(null);
  const [historyItems, setHistoryItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchUserEmail = async () => {
      try {
        const res = await axios.get('http://localhost:5000/api/users/me', {
          withCredentials: true,
        });
        setUserEmail(res.data.email);
      } catch (err) {
        console.error('Error fetching user email:', err);
        setError('Failed to fetch user email. Please ensure you are logged in.');
        setLoading(false);
      }
    };

    fetchUserEmail();
  }, []);

  useEffect(() => {
    if (!userEmail) return;

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
      setHistoryItems(items.reverse());
      setLoading(false);
    }, (err) => {
      console.error('Error fetching history:', err);
      setError('Failed to fetch history. Please try again.');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userEmail]);

  const handleDelete = (id) => {
    const itemRef = ref(database, `uploads/${id}`);
    remove(itemRef)
      .then(() => {
        setHistoryItems(historyItems.filter(item => item.id !== id));
      })
      .catch((err) => {
        console.error('Error deleting item:', err);
        setError('Failed to delete item. Please try again.');
      });
  };

  const handleImageHover = (e) => {
    e.target.style.transform = 'scale(1.76)';
    e.target.style.transition = 'transform 0.3s ease';
  };

  const handleImageLeave = (e) => {
    e.target.style.transform = 'scale(1)';
  };

  if (loading) {
    return (
      <div id="main-wrapper">
        <Navbar />
        <div className="content-wrapper">
          <div className="flex-container heading-container">
            <div className="text-center">
              <h2 className="text-dark mb-3 mt-4">Your Visualization History</h2>
            </div>
          </div>
          <section className="spacer bg-light">
            <div className="container">
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
                <BeatLoader color="#4CAF50" size={15} />
              </div>
            </div>
          </section>
          <footer className="footer">
            All Rights Reserved by Genomics Visualization Team.
          </footer>
        </div>
      </div>
    );
  }

  return (
    <div id="main-wrapper">
      <Navbar />
      <div className="content-wrapper">
        <div className="flex-container heading-container">
          <div className="text-center">
            <h2 className="text-dark mb-3 mt-4">Your Visualization History</h2>
            {error && <p className="error-message">{error}</p>}
          </div>
        </div>

        <section className="spacer bg-light">
          <div className="container">
            {historyItems.length === 0 ? (
              <p className="text-center text-muted">No visualizations found in your history.</p>
            ) : (
              <div className="card-container">
                {historyItems.map((item) => (
                  <div key={item.id} className="card-item">
                    <div className="card">
                      <div className="card-body">
                        <div className="text-center">
                          <h3 className="text-dark font-weight-medium">{item.format} Visualization</h3>
                        </div>
                        <div className="image-box text-center">
                          <img
                            src={`data:image/png;base64,${item.image}`}
                            alt={`${item.format} Visualization`}
                            className="img-fluid"
                            onMouseEnter={handleImageHover}
                            onMouseLeave={handleImageLeave}
                          />
                        </div>
                        <p className="text-muted text-center">
                          Saved on: {new Date(item.timestamp).toLocaleString()}
                        </p>
                        <div className="text-center">
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="button button-outline-primary"
                            style={{ backgroundColor: '#ff4444', color: 'white', border: 'none' }}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <footer className="footer">
          All Rights Reserved by Genomics Visualization Team.
        </footer>
      </div>
    </div>
  );
};

export default History;