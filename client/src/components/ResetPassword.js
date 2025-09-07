import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const ResetPassword = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    console.log('Password reset requested for:', { email });

    setTimeout(() => {
      try {
        console.log('Reset link sent successfully');
        navigate('/auth');
      } catch (err) {
        const errorMessage = 'Failed to send reset link. Please try again.';
        console.error('Reset error details:', err.message);
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    }, 1000);
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-box">
        <div className="form-box reset-box">
          <form onSubmit={handleSubmit}>
            <h1>Reset Password</h1>
            <span>Enter your email to receive a password reset link</span>
            {error && <p className="error">{error}</p>}
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <div className="buttons-div">
            <button type="submit" disabled={isLoading}>
              {isLoading ? 'Sending...' : 'Send Reset Link'}
            </button>
            <button
              type="button"
              
              onClick={() => navigate('/auth')}
              disabled={isLoading}
            >
              Back to Login
            </button>
            </div>
          </form>
        </div>
      </div>

      <style jsx>{`
        @import url('https://fonts.googleapis.com/css?family=Montserrat:400,800');

        .auth-wrapper {
          box-sizing: border-box;
          background: #f6f5f7;
          display: flex;
          justify-content: center;
          align-items: center;
          flex-direction: column;
          font-family: 'Montserrat', sans-serif;
          min-height: 100vh;
          margin: -20px 0 50px;
        }

        .auth-wrapper * {
          box-sizing: border-box;
        }

        .auth-wrapper h1 {
          font-weight: bold;
          margin: 0;
        }

        .auth-wrapper span {
          font-size: 12px;
        }

        .auth-wrapper button {
          border-radius: 20px;
          border: 1px solid #FF4B2B;
          background-color: #FF4B2B;
          color: #FFFFFF;
          font-size: 12px;
          font-weight: bold;
          padding: 12px 45px;
          letter-spacing: 1px;
          text-transform: uppercase;
          transition: transform 80ms ease-in;
          cursor: pointer;
          margin: 5px 0;
        }

        .auth-wrapper button:active {
          transform: scale(0.95);
        }

        .auth-wrapper button:focus {
          outline: none;
        }

        .auth-wrapper button.ghost {
          background-color: transparent;
          border-color: #FF4B2B;
          margin-top: 10px;
        }

        .auth-wrapper button:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .auth-wrapper form {
          background-color: #FFFFFF;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;
          padding: 0 50px;
          height: 100%;
          text-align: center;
          width: 100%; /* Ensure form uses full space */
        }

        .auth-wrapper input {
          background-color: #eee;
          border: none;
          padding: 12px 15px;
          margin: 8px 0;
          width: 100%;
        }

        .auth-wrapper .auth-box {
          background-color: #fff;
          border-radius: 10px;
          box-shadow: 0 14px 28px rgba(0,0,0,0.25), 0 10px 10px rgba(0,0,0,0.22);
          position: relative;
          overflow: hidden;
          width: 768px;
          max-width: 100%;
          min-height: 480px;
          transition: all 0.6s ease-in-out;
        }

        .auth-wrapper .form-box {
          position: absolute;
          top: 0;
          height: 100%;
          transition: all 0.6s ease-in-out;
          width: 100%; /* Full width of auth-box */
        }

        .auth-wrapper .reset-box {
          width: 100%; /* Use full card width */
          left: 0; /* No offset, start from left */
          z-index: 2;
          opacity: 1;
          display: flex;
          justify-content: center;
          align-items: center;
        }

        .auth-wrapper .error {
          color: #ff4d4f;
          text-align: center;
          margin-bottom: 20px;
        }
        .buttons-div{
          display: flex;
          justify-content: space-evenly;
          margin-top: 20px;
          width: 100%;
        }
        .buttons-div button {
          width: 34%; /* Adjust width to fit two buttons side by side */
        }  
        .buttons-div button:hover{

          background-color: #FFFFFF ;
          color: #FF4B2B;
        }
      `}</style>
    </div>
  );
};

export default ResetPassword;