import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import 'leaflet/dist/leaflet.css'; // Bundle Leaflet CSS locally - avoids CDN failures on mobile
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Signal the index.html self-heal watchdog that the app actually mounted. If this never
// runs (stale cached shell pointing at a 404 bundle), the page clears the SW cache and
// reloads once instead of leaving the operator staring at a blank screen.
(window as unknown as { __TG_MOUNTED__?: boolean }).__TG_MOUNTED__ = true;
