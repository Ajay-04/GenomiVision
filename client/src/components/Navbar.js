import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../styles/Navbar.css';
import logo from '../assets/logo.jpg';

const Navbar = () => {
  const navigate = useNavigate();
  const [sidenavOpen, setSidenavOpen] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const fetchUserEmail = async () => {
      try {
        const res = await axios.get('http://localhost:5000/api/users/me', { withCredentials: true });
        setUser(res.data);
      } catch (err) {
        console.error('Error fetching user details:', err);
        setUser(null);
      }
    };

    fetchUserEmail();
  }, []);

  const handleLogout = () => {
    axios.post('http://localhost:5000/api/users/logout', {}, { withCredentials: true })
      .then(() => {
        setUser(null);
        navigate('/auth');
      })
      .catch((err) => {
        console.error('Logout error:', err);
      });
  };

  const toggleSidenav = () => {
    setSidenavOpen(!sidenavOpen);
  };

  return (
    <header className="main-header">
      <div className={`sidenav ${sidenavOpen ? 'sidenav-open' : ''}`}>
        <div className="sidenav-logo">
          <a href="/dashboard" className="logo-link">
            <img
              src="https://demos.adminmart.com/free/bootstrap/freedash-lite/src/assets/images/freedashDark.svg"
              alt="GenomiVision"
              className="logo-img"
            />
          </a>
        </div>
        <div className="sidenav-menu">
          <ul className="sidenav-list">
            <li className="sidenav-item">
              <a
                className="sidenav-link active"
                href="/dashboard"
                onClick={() => navigate('/dashboard')}
              >
                <i className="fas fa-home"></i>
                <span>Home</span>
              </a>
            </li>
            <hr />
            <li className="sidenav-item">
              <a
                className="sidenav-link"
                href="/visualization"
                onClick={() => navigate('/visualization')}
              >
                <i className="fas fa-chart-bar"></i>
                <span>Visualizations</span>
              </a>
            </li>
            <li className="sidenav-item">
              <a
                className="sidenav-link"
                href="/history"
                onClick={() => navigate('/history')}
              >
                <i className="fas fa-history"></i>
                <span>History</span>
              </a>
            </li>
            <li className="sidenav-item">
              <a className="sidenav-link" href="#" onClick={() => alert('Stats coming soon!')}>
                <i className="fas fa-chart-pie"></i>
                <span>Statistics</span>
              </a>
            </li>
            <li className="sidenav-item">
              <a className="sidenav-link" href="#" onClick={() => alert('Reports coming soon!')}>
                <i className="fas fa-file-alt"></i>
                <span>Reports</span>
              </a>
            </li>
            <li className="sidenav-item">
              <a className="sidenav-link" href="#" onClick={() => alert('Projects coming soon!')}>
                <i className="fas fa-folder"></i>
                <span>Projects</span>
              </a>
            </li>
          </ul>
          <hr />
          <ul className="sidenav-list">
            <li className="sidenav-item">
              <a className="sidenav-link" href="#" onClick={() => alert('Settings coming soon!')}>
                <i className="fas fa-cog"></i>
                <span>Settings</span>
              </a>
            </li>
            <li className="sidenav-item">
              <a className="sidenav-link" href="#" onClick={() => alert('Help coming soon!')}>
                <i className="fas fa-question-circle"></i>
                <span>Help</span>
              </a>
            </li>
          </ul>
        </div>
      </div>

      <nav className="top-navbar">
        <div className="navbar-container">
          <h1 className="navbar-logo">GenomiVision</h1>
          <button className="sidenav-toggle" onClick={toggleSidenav}>
            <i className="fas fa-bars"></i>
          </button>
          <form className="search-form">
            <input type="search" className="search-input" placeholder="Search datasets..." />
            <span className="search-icon">
              <i className="fas fa-search"></i>
            </span>
          </form>
          <ul className="navbar-links">
            <li className="navbar-item">
              <a
                className="navbar-link"
                href="#"
                title="Create Visualization"
                onClick={() => alert('Apps coming soon!')}
              >
                <i className="fas fa-video"></i>
              </a>
            </li>
            <li className="navbar-item">
              <a className="navbar-link" href="#" title="Apps" onClick={() => alert('Apps coming soon!')}>
                <i className="fas fa-th"></i>
              </a>
            </li>
            <li className="navbar-item">
              <a
                className="navbar-link"
                href="#"
                title="Notifications"
                onClick={() => alert('Notifications coming soon!')}
              >
                <i className="fas fa-bell"></i>
              </a>
            </li>
            <li className="navbar-item dropdown">
              <a
                className="navbar-link dropdown-toggle"
                href="#"
                onClick={(e) => e.preventDefault()}
                onMouseEnter={() => setSidenavOpen(false)}
              >
                <img src={logo} className="avatar" alt="User" />
              </a>
              <ul className="dropdown-menu" onMouseLeave={() => setSidenavOpen(false)}>
                {user ? (
                  <>
                    <li className="dropdown-header">
                      <img src={logo} className="avatar-large" alt="User" />
                      <div>
                        <h6 className="username-profile">{user.name || 'Guest'}</h6>
                        <p className="useremail-profile">{user.email || ''}</p>
                      </div>
                    </li>
                    <li>
                      <a className="dropdown-item" href="#" onClick={() => alert('Profile coming soon!')}>
                        <i className="fas fa-user-circle"></i> Profile
                      </a>
                    </li>
                    <li>
                      <a className="dropdown-item" href="#" onClick={handleLogout}>
                        <i className="fas fa-sign-out-alt"></i> Sign out
                      </a>
                    </li>
                    <li>
                      <a className="dropdown-item" href="#" onClick={() => alert('Settings coming soon!')}>
                        <i className="fas fa-cog"></i> Settings
                      </a>
                    </li>
                    <li>
                      <a className="dropdown-item" href="#" onClick={() => alert('Help coming soon!')}>
                        <i className="fas fa-question-circle"></i> Help
                      </a>
                    </li>
                  </>
                ) : (
                  <li>
                    <a className="dropdown-item" href="/auth" onClick={() => navigate('/auth')}>
                      <i className="fas fa-sign-in-alt"></i> Login
                    </a>
                  </li>
                )}
              </ul>
            </li>
          </ul>
        </div>
      </nav>
    </header>
  );
};

export default Navbar;