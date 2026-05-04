import { saveToHistory } from './history.js';
import { getSettings } from './settings.js';
import { translateText } from './api.js';

const langs = [
  "English", "Spanish", "French", "German", "Japanese", "Japanese (Romaji)", "Korean", "Italian", "Portuguese", "Russian", "Arabic", "Vietnamese"
];

let currentImageBase64 = null;
let currentImageMimeType = null;

export function setupUI() {
  // Navigation
  const navItems = document.querySelectorAll('.nav-links li');
  const views = document.querySelectorAll('.view');

  navItems.forEach(item => {
    item.addEventListener('click', () => {
      navItems.forEach(n => n.classList.remove('active'));
      views.forEach(v => v.classList.remove('active'));
      
      item.classList.add('active');
      const targetView = item.getAttribute('data-view');
      document.getElementById(`view-${targetView}`).classList.add('active');
    });
  });
  function syncPrimaryLang() {
    const primary = document.getElementById('primary-lang').value;
    const items = document.querySelectorAll('.check-item');
    items.forEach(item => {
      const cb = item.querySelector('input');
      if (cb && cb.value === primary) {
        item.classList.add('disabled');
        if (cb.checked) {
          cb.checked = false;
          item.classList.remove('selected');
        }
      } else if (cb) {
        item.classList.remove('disabled');
      }
    });
  }

  const savedPrimary = localStorage.getItem('agentranslator_primary_lang');
  const primarySelect = document.getElementById('primary-lang');
  if (primarySelect) {
    if (savedPrimary) primarySelect.value = savedPrimary;
    primarySelect.addEventListener('change', (e) => {
      localStorage.setItem('agentranslator_primary_lang', e.target.value);
      syncPrimaryLang();
    });
  }

  let savedAdditional = [];
  try {
    savedAdditional = JSON.parse(localStorage.getItem('agentranslator_additional_langs') || '[]');
  } catch (e) {
    savedAdditional = [];
  }

  // Populate additional languages
  const additionalContainer = document.getElementById('additional-langs');
  if (additionalContainer) {
    langs.forEach(lang => {
      const div = document.createElement('div');
      div.className = 'check-item';
      const isChecked = savedAdditional.includes(lang);
      const displayLang = lang === "Japanese (Romaji)" ? "Romaji" : lang;
      div.innerHTML = `<input type="checkbox" value="${lang}" id="lang-${lang}" ${isChecked ? 'checked' : ''}><label style="margin:0;cursor:pointer;" for="lang-${lang}">${displayLang}</label>`;
      if (isChecked) div.classList.add('selected');

      const cb = div.querySelector('input');
      cb.addEventListener('change', () => {
        div.classList.toggle('selected', cb.checked);
        const additionalInputs = Array.from(document.querySelectorAll('#additional-langs input:checked')).map(i => i.value);
        localStorage.setItem('agentranslator_additional_langs', JSON.stringify(additionalInputs));
      });
      
      div.addEventListener('click', (e) => {
        if (e.target !== cb && e.target.tagName !== 'LABEL') {
          cb.checked = !cb.checked;
          cb.dispatchEvent(new Event('change'));
        }
      });
      additionalContainer.appendChild(div);
    });
    // Trigger initial sync to disable the primary default
    setTimeout(syncPrimaryLang, 0);
  }

  const imageInput = document.getElementById('source-image');
  const previewContainer = document.getElementById('image-preview-container');
  const previewImage = document.getElementById('image-preview');
  const removeBtn = document.getElementById('btn-remove-image');

  if (imageInput) {
    imageInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target.result;
        previewImage.src = dataUrl;
        previewContainer.style.display = 'flex';
        
        const [meta, base64] = dataUrl.split(',');
        currentImageMimeType = meta.split(':')[1].split(';')[0];
        currentImageBase64 = base64;
      };
      reader.readAsDataURL(file);
    });
  }

  if (removeBtn) {
    removeBtn.addEventListener('click', () => {
      currentImageBase64 = null;
      currentImageMimeType = null;
      previewContainer.style.display = 'none';
      previewImage.src = '';
      imageInput.value = '';
    });
  }

  // Translation CTA
  const btnTranslate = document.getElementById('btn-translate');
  if (btnTranslate) {
    btnTranslate.addEventListener('click', handleTranslate);
  }
}

async function handleTranslate() {
  const sourceText = document.getElementById('source-text').value.trim();
  if (!sourceText && !currentImageBase64) return showToast('Please enter source text or upload an image.');

  const primaryLang = document.getElementById('primary-lang').value;
  const additionalInputs = document.querySelectorAll('#additional-langs input:checked');
  const targetLangs = [primaryLang];
  additionalInputs.forEach(input => {
    if (!targetLangs.includes(input.value)) {
      targetLangs.push(input.value);
    }
  });

  const settings = getSettings();
  if (!settings.apiKey) {
    showToast('Please configure your API token in Settings.');
    return;
  }

  const btnTranslate = document.getElementById('btn-translate');
  btnTranslate.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Translating...';
  btnTranslate.disabled = true;

  try {
    const imageObj = currentImageBase64 ? { base64: currentImageBase64, mimeType: currentImageMimeType } : null;
    const result = await translateText(sourceText, targetLangs, settings, imageObj);
    renderResults(result, sourceText);
  } catch (error) {
    console.error(error);
    showToast(`Error: ${error.message || 'Translation failed'}`);
  } finally {
    btnTranslate.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> Translate';
    btnTranslate.disabled = false;
  }
}

function renderResults(result, sourceText) {
  // result = { mood: string, translations: { lang: text } }
  document.getElementById('mood-text').innerText = result.mood || "Neutral";
  
  const resultsContainer = document.getElementById('translation-results');
  resultsContainer.innerHTML = '';
  
  if (result.translations) {
    for (const [lang, text] of Object.entries(result.translations)) {
      const card = document.createElement('div');
      card.className = 'result-card glass-card';
      
      const header = document.createElement('div');
      header.style.display = 'flex';
      header.style.justifyContent = 'space-between';
      header.style.alignItems = 'center';
      header.style.marginBottom = '8px';
      
      header.innerHTML = `<h4>${lang}</h4><button class="copy-btn"><i class="fa-regular fa-copy"></i> Copy</button>`;
      
      const copyBtn = header.querySelector('button');
      copyBtn.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(text);
          copyBtn.innerHTML = '<i class="fa-solid fa-check"></i>';
          setTimeout(() => copyBtn.innerHTML = '<i class="fa-regular fa-copy"></i> Copy', 2000);
        } catch (err) {
          showToast('Failed to copy text');
        }
      });
      
      card.appendChild(header);
      const p = document.createElement('p');
      p.innerText = text;
      card.appendChild(p);

      resultsContainer.appendChild(card);
    }
  }

  saveToHistory({
    source: sourceText,
    mood: result.mood,
    translations: result.translations,
    date: new Date().toISOString()
  });
}

export function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.innerText = msg;
  toast.classList.remove('hidden');
  toast.classList.add('show');
  
  setTimeout(() => {
    toast.classList.remove('show');
    toast.classList.add('hidden');
  }, 3000);
}
