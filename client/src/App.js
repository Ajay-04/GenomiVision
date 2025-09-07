import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import VisualizationTool from './components/VisualizationTool';
import ResetPassword from './components/ResetPassword';
import History from './pages/History';
import CustomVisualizationPage from './pages/CustomVisualizationPage';
import Navbar from './components/Navbar'; // Add Navbar

const ProtectedRoute = ({ children }) => {
  // This is a placeholder; session check should be handled by backend
  // For now, we'll assume the backend redirects if not authenticated
  return children; // Backend will handle auth via session
};

function App() {
  return (
    <Router>
      {/* <Navbar />  */}
      <Routes>
        <Route path="/auth" element={<Auth />} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/visualization" element={<ProtectedRoute><VisualizationTool /></ProtectedRoute>} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/history" element={<History />} />
        <Route path="/custom-visualization" element={<CustomVisualizationPage />} />
        <Route path="/" element={<Navigate to="/auth" />} />
        <Route path="*" element={<div>404: Page Not Found</div>} />
      </Routes>
    </Router>
  );
}

export default App;