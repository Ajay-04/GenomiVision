import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../index.js'; // Adjust the path to your firebase.js file
import '../styles/auth.css';

const Auth = () => {
  const [isSignup, setIsSignup] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // No localStorage check; rely on backend session
  }, [navigate]);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    console.log('Login attempt with:', { email, password });

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const idToken = await userCredential.user.getIdToken();

      const res = await axios.post('http://localhost:5000/api/users/login', { idToken }, {
        withCredentials: true,
      });
      const { name, email: userEmail } = res.data.user;
      navigate('/dashboard');
    } catch (err) {
      const errorMessage = err.message || 'Login failed. Please try again.';
      console.error('Login error details:', err);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignupSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    console.log('Signup attempt with:', { name, email, password });

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const idToken = await userCredential.user.getIdToken();

      const res = await axios.post('http://localhost:5000/api/users/register', { name, email, idToken }, {
        withCredentials: true,
      });
      const { name: userName, email: userEmail } = res.data.user;
      navigate('/dashboard');
    } catch (err) {
      const errorMessage = err.message || 'Signup failed. Please try again.';
      console.error('Signup error details:', err);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = () => {
    console.log('Forgot password clicked');
  };

  const handleSignUpClick = () => {
    setIsSignup(true);
    requestAnimationFrame(() => {
      const container = document.getElementById('auth-box');
      if (container) {
        container.classList.add('active-panel');
        console.log('Added active-panel class');
      } else {
        console.error('Auth box element not found');
      }
    });
  };

  return (
    <div className="auth-wrapper">
      <div className={`auth-box ${isSignup ? 'active-panel' : ''}`} id="auth-box">
        <div className="form-box register-box">
          <form onSubmit={handleSignupSubmit}>
            <h1 className="create-account">Create Account</h1>
            <div className="social-links">
              <a href="#" className="social-icon"><i className="fab fa-facebook-f"></i></a>
              <a href="#" className="social-icon"><i className="fab fa-google-plus-g"></i></a>
              <a href="#" className="social-icon"><i className="fab fa-linkedin-in"></i></a>
            </div>
            <span>or use your email for registration</span>
            {error && isSignup && <p className="error">{error}</p>}
            <input
              type="text"
              placeholder="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <input
              type="password"
              placeholder="Confirm Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
            <button type="submit" disabled={isLoading}>
              {isLoading ? 'Signing Up...' : 'Sign Up'}
            </button>
          </form>
        </div>
        <div className="form-box login-box">
          <form onSubmit={handleLoginSubmit}>
            <h1>Sign in</h1>
            <div className="social-links">
              <a href="#" className="social-icon"><i className="fab fa-facebook-f"></i></a>
              <a href="#" className="social-icon"><i className="fab fa-google-plus-g"></i></a>
              <a href="#" className="social-icon"><i className="fab fa-linkedin-in"></i></a>
            </div>
            <span>or use your account</span>
            {error && !isSignup && <p className="error">{error}</p>}
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <a href="/reset-password" onClick={handleForgotPassword}>Forgot your password?</a>
            <button type="submit" disabled={isLoading}>
              {isLoading ? 'Signing In...' : 'Sign In'}
            </button>
          </form>
        </div>
        <div className="overlay-section">
          <div className="overlay-layer">
            <div className="overlay-panel left-panel">
              <h1>Welcome Back!</h1>
              <p>To keep connected with us please login with your personal info</p>
              <button className="transparent-btn" id="loginBtn" onClick={() => setIsSignup(false)}>
                Sign In
              </button>
            </div>
            <div className="overlay-panel right-panel">
              <h1>Hello, Friend!</h1>
              <p>Enter your personal details and start journey with us</p>
              <button className="transparent-btn" id="registerBtn" onClick={handleSignUpClick}>
                Sign Up
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};


export default Auth;