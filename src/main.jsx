import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './AppMarketplace';
import './styles.css';
import './mobile-fixes.css';
import './auth-google.css';
import './auth-3d-fixes.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
