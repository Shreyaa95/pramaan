// PRAMAAN Content Script
// Inspects text selection for PRAMAAN Certificate patterns

(() => {
  let badgeEl = null;

  document.addEventListener('mouseup', () => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      removeBadge();
      return;
    }

    const text = selection.toString().trim();
    // Check if text looks like a Certificate ID pattern (e.g. IJ26-2026-0001 or CERT-2026-0001)
    const certPattern = /^[A-Z0-9]{2,8}-\d{4}-\d{3,6}$/i;

    if (certPattern.test(text)) {
      showVerificationBadge(selection, text);
    } else {
      removeBadge();
    }
  });

  document.addEventListener('mousedown', (e) => {
    if (badgeEl && !badgeEl.contains(e.target)) {
      removeBadge();
    }
  });

  function showVerificationBadge(selection, certId) {
    removeBadge();

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    badgeEl = document.createElement('div');
    badgeEl.className = 'pramaan-floating-chip';
    badgeEl.innerHTML = `
      <div class="pramaan-chip-content">
        <span class="pramaan-chip-dot"></span>
        <span class="pramaan-chip-title">Verify PRAMAAN ID: <strong>${certId}</strong></span>
      </div>
    `;

    badgeEl.style.top = `${window.scrollY + rect.bottom + 6}px`;
    badgeEl.style.left = `${window.scrollX + rect.left}px`;

    badgeEl.addEventListener('click', (e) => {
      e.stopPropagation();
      chrome.storage.local.get(['pramaanApiBase'], (res) => {
        const apiBase = res.pramaanApiBase || 'http://localhost:5000/api';
        const webBase = apiBase.replace(/\/api\/?$/, '');
        window.open(`${webBase}/view-certificate/${encodeURIComponent(certId)}`, '_blank');
      });
      removeBadge();
    });

    document.body.appendChild(badgeEl);
  }

  function removeBadge() {
    if (badgeEl && badgeEl.parentNode) {
      badgeEl.parentNode.removeChild(badgeEl);
      badgeEl = null;
    }
  }
})();
