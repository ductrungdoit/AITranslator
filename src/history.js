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
    
    const snippet = item.source.length > 80 ? item.source.substring(0, 80) + '...' : item.source;
    const date = new Date(item.date).toLocaleString();

    let detailsHtml = '';
    if (item.translations) {
      for (const [lang, text] of Object.entries(item.translations)) {
        detailsHtml += `
          <div class="result-card glass-card" style="margin-bottom: 12px; animation: none;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 8px;">
              <h4>${lang}</h4>
              <button class="copy-btn history-copy" data-text="${encodeURIComponent(text)}"><i class="fa-regular fa-copy"></i> Copy</button>
            </div>
            <p>${text}</p>
          </div>
        `;
      }
    }

    div.innerHTML = `
      <div class="history-toggle" style="cursor: pointer; display: flex; flex-direction: column; gap: 8px;">
        <div class="history-header" style="justify-content: space-between; align-items: center;">
          <div>
            <span style="margin-right: 12px;"><i class="fa-solid fa-calendar"></i> ${date}</span>
            <span style="color:var(--primary-color);font-weight:600;">Mood: ${item.mood || 'N/A'}</span>
          </div>
          <i class="fa-solid fa-chevron-down" style="color:var(--text-muted);"></i>
        </div>
        <div class="history-source">
          ${snippet}
        </div>
      </div>
      <div class="history-details" style="display: none; margin-top: 16px; flex-direction: column; gap: 8px; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 16px;">
        ${detailsHtml}
      </div>
    `;

    const toggleBtn = div.querySelector('.history-toggle');
    const details = div.querySelector('.history-details');
    const icon = toggleBtn.querySelector('.fa-chevron-down');
    
    toggleBtn.addEventListener('click', () => {
      const isHidden = details.style.display === 'none';
      details.style.display = isHidden ? 'flex' : 'none';
      icon.style.transform = isHidden ? 'rotate(180deg)' : 'rotate(0deg)';
      icon.style.transition = 'transform 0.2s';
      if (isHidden) {
        div.style.background = 'rgba(255,255,255,0.04)';
      } else {
        div.style.background = '';
      }
    });

    const copyBtns = div.querySelectorAll('.history-copy');
    copyBtns.forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation(); // prevent toggle
        try {
          const textToCopy = decodeURIComponent(btn.getAttribute('data-text'));
          await navigator.clipboard.writeText(textToCopy);
          btn.innerHTML = '<i class="fa-solid fa-check"></i>';
          setTimeout(() => btn.innerHTML = '<i class="fa-regular fa-copy"></i> Copy', 2000);
        } catch (err) {
          console.error(err);
        }
      });
    });

    container.appendChild(div);
  });
}
