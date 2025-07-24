import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

// Disable StrictMode in development to avoid double-mounting issues with WaveSurfer
// You can re-enable it for production builds
const isDevelopment = process.env.NODE_ENV === 'development';

root.render(
  isDevelopment ? (
    <App />
  ) : (
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )
);
