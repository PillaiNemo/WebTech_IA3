// main.jsx: the entry point. Loads the styles, then renders the React app
// inside a router. (Scripts are loaded by src/lib/jquery.js and src/lib/civicui.js.)

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

// Bootstrap first, then our design system (shared with /static), then app styles.
import 'bootstrap/dist/css/bootstrap.min.css';
import '../../static/css/civicfix.css';
import './styles/app.css';

import App from './App.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
);
