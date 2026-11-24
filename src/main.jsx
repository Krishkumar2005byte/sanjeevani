/**
 * main.jsx - React Entry Point
 * Owner: Shared Setup (All Devs)
 * 
 * Simple explanation:
 * Mounts the Sanjeevani React application into the DOM index root.
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
