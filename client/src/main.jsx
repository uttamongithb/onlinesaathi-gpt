import 'regenerator-runtime/runtime';
// Initialize API configuration first (before any API calls)
import './config/apiConfig';
import { createRoot } from 'react-dom/client';
import { I18nextProvider } from 'react-i18next';
import i18n from './locales/i18n';
import App from './App';
import './style.css';
import './mobile.css';
import { ApiErrorBoundaryProvider } from './hooks/ApiErrorBoundaryContext';
import 'katex/dist/katex.min.css';
import 'katex/dist/contrib/copy-tex.js';

const container = document.getElementById('root');
const root = createRoot(container);

root.render(
  <ApiErrorBoundaryProvider>
    <I18nextProvider i18n={i18n}>
      <App />
    </I18nextProvider>
  </ApiErrorBoundaryProvider>,
);
