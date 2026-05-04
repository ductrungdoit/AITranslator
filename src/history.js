export function initHistory() {
  renderHistory();
}

export function saveToHistory(item) {
  let history = getHistory();
  history.unshift(item);
  if (history.length > 5) {
    history = history.slice(0, 5);
  }
  localStorage.setItem('agentranslator_history', JSON.stringify(history));
  renderHistory();
}

function getHistory() {
  const raw = localStorage.getItem('agentranslator_history');
  return raw ? JSON.parse(raw) : [];
}

function renderHistory() {
  const container = document.getElementById('history-container');
  if (!container) return;
  const history = getHistory();
  
  container.innerHTML = '';
  
  if (history.length === 0) {
    container.innerHTML = '<div class="empty-state">No translations yet.</div>';
    return;
  }
  
  history.forEach(item => {
    const div = document.createElement('div');
    div.className = 'history-item';
    
    // Snippet source
    const snippet = item.source.length > 60 ? item.source.substring(0, 60) + '...' : item.source;
    
    const primaryLang = Object.keys(item.translations || {})[0] || 'Unknown';
    const transSnippet = item.translations ? 
      (item.translations[primaryLang].length > 60 ? item.translations[primaryLang].substring(0, 60) + '...' : item.translations[primaryLang]) 
      : 'No trans';

    const date = new Date(item.date).toLocaleString();

    div.innerHTML = `
      <div class="history-header">
        <span><i class="fa-solid fa-calendar"></i> ${date}</span>
        <span style="color:var(--primary-color);font-weight:600;">Mood: ${item.mood}</span>
      </div>
      <div class="history-source">
        ${snippet}
      </div>
      <div class="history-trans">
        ${primaryLang}: ${transSnippet}
      </div>
    `;
    container.appendChild(div);
  });
}
