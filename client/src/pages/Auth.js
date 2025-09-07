import React, { useState } from 'react';
import Login from '../components/Login';
import Signup from '../components/Signup';
import '../styles/auth.css';

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);

  return (
    <div className="container">
      <div className="screen">
        <div className="screen__content">
          <div className={`auth-card ${isLogin ? 'show-login' : 'show-signup'}`}>
            <div className="auth-form login-form">
              <Login flipToSignup={() => setIsLogin(false)} />
            </div>
            <div className="auth-form signup-form">
              <Signup flipToLogin={() => setIsLogin(true)} />
            </div>
          </div>
        </div>
        <div className="screen__background">
          <span className="screen__background__shape screen__background__shape4"></span>
          <span className="screen__background__shape screen__background__shape3"></span>
          <span className="screen__background__shape screen__background__shape2"></span>
          <span className="screen__background__shape screen__background__shape1"></span>
        </div>
      </div>
    </div>
  );
};

export default Auth;