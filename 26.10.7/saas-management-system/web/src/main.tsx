import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './styles/app.css';

const container = document.getElementById('root');
if (!container) throw new Error('#root 节点不存在');

createRoot(container).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
);
