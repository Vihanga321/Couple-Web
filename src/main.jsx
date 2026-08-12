import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './AppMarketplaceV2';
import HomeLocationDropdown from './components/HomeLocationDropdown';
import './styles.css';
import './mobile-fixes.css';
import './auth-google.css';
import './auth-3d-fixes.css';
import './guest-stories.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
    <HomeLocationDropdown />
  </React.StrictMode>,
);
