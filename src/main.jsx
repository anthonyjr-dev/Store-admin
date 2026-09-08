import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

try {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} catch (e) {
  document.body.innerHTML = '<pre style="color:#ff4d4f;padding:20px;font-size:14px;">BOOT_ERROR\n' + (e && e.stack ? e.stack : String(e)) + '</pre>';
  console.error(e);
}
