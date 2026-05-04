import { showToast } from './ui.js';

export function loadSettings() {
  const provider = localStorage.getItem('agentranslator_provider') || 'openai';
  const apiKey = localStorage.getItem('agentranslator_key') || '';
  const endpoint = localStorage.getItem('agentranslator_endpoint') || '';

  const providerSelect = document.getElementById('ai-provider');
  const keyInput = document.getElementById('api-key');
  const endpointInput = document.getElementById('api-endpoint');

  if (providerSelect) providerSelect.value = provider;
  if (keyInput) keyInput.value = apiKey;
  if (endpointInput) endpointInput.value = endpoint;

  const btnSave = document.getElementById('btn-save-settings');
  if (btnSave) {
    btnSave.addEventListener('click', () => {
      localStorage.setItem('agentranslator_provider', providerSelect.value);
      localStorage.setItem('agentranslator_key', keyInput.value.trim());
      localStorage.setItem('agentranslator_endpoint', endpointInput.value.trim());
      showToast('Settings saved successfully!');
    });
  }
}

export function getSettings() {
  return {
    provider: localStorage.getItem('agentranslator_provider') || 'openai',
    apiKey: localStorage.getItem('agentranslator_key') || '',
    endpoint: localStorage.getItem('agentranslator_endpoint') || ''
  };
}
