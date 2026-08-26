import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { TripExplorer } from './TripExplorer';
import './styles/global.css';

// No client router in this app -- Explore opens a plain new tab at /explore,
// so a simple pathname check is enough to hand it a different top-level page.
const isExplore = window.location.pathname.startsWith('/explore');

createRoot(document.getElementById('root')!).render(
  <StrictMode>{isExplore ? <TripExplorer /> : <App />}</StrictMode>,
);
