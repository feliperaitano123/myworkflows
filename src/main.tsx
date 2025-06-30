import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import './styles/chat.css'

// Stagewise Toolbar
import { initToolbar } from '@stagewise/toolbar'

const stagewiseConfig = {
  plugins: [],
};

function setupStagewise() {
  if (import.meta.env.MODE === 'development') {
    initToolbar(stagewiseConfig);
  }
}

setupStagewise();

createRoot(document.getElementById("root")!).render(<App />);
