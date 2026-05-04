import './style.css';
import { setupUI } from './src/ui.js';
import { loadSettings } from './src/settings.js';
import { initHistory } from './src/history.js';

document.addEventListener('DOMContentLoaded', () => {
  setupUI();
  loadSettings();
  initHistory();
});
