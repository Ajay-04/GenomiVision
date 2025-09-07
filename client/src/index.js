import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { initializeApp } from 'firebase/app';
import { getAnalytics } from 'firebase/analytics';
import { getAuth } from 'firebase/auth';
import { getDatabase } from 'firebase/database';
import './index.css'; 

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyB028-Rk4N6oo_5Hkew0q911nKye-QALmM",
  authDomain: "genomivisual.firebaseapp.com",
  databaseURL: "https://genomivisual-default-rtdb.firebaseio.com",
  projectId: "genomivisual",
  storageBucket: "genomivisual.firebasestorage.app",
  messagingSenderId: "629043355953",
  appId: "1:629043355953:web:9855cbb4c2d3ca821b1010",
  measurementId: "G-F333VK1Y6W"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const database = getDatabase(app);

export { auth,database };


// Create the root element and render the app
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);