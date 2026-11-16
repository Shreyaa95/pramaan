// PRAMAAN Manifest V3 Background Service Worker

chrome.runtime.onInstalled.addListener(() => {
  // 1. Right-click context menu to Email Certificate to selected text/email
  chrome.contextMenus.create({
    id: 'pramaan-mail-selection',
    title: '✉️ Send Certificate to "%s" via PRAMAAN',
    contexts: ['selection']
  });

  // 2. Right-click to verify ID
  chrome.contextMenus.create({
    id: 'pramaan-verify-selection',
    title: '🛡️ Verify Certificate "%s"',
    contexts: ['selection']
  });

  // 3. Right-click general
  chrome.contextMenus.create({
    id: 'pramaan-open-vault',
    title: 'Open PRAMAAN Web Control Plane',
    contexts: ['all']
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  chrome.storage.local.get(['pramaanApiBase'], (res) => {
    const apiBase = res.pramaanApiBase || 'http://localhost:5000/api';
    const webBase = apiBase.replace(/\/api\/?$/, '');

    if (info.menuItemId === 'pramaan-mail-selection' && info.selectionText) {
      const text = info.selectionText.trim();
      const isEmail = text.includes('@');
      
      const toStore = isEmail ? { prefillEmail: text } : { prefillName: text };
      chrome.storage.local.set(toStore, () => {
        // Open the extension popup window directly
        chrome.windows.create({
          url: chrome.runtime.getURL('popup.html'),
          type: 'popup',
          width: 400,
          height: 600
        });
      });
    } else if (info.menuItemId === 'pramaan-verify-selection' && info.selectionText) {
      const cleaned = info.selectionText.trim();
      const targetUrl = `${webBase}/view-certificate/${encodeURIComponent(cleaned)}`;
      chrome.tabs.create({ url: targetUrl });
    } else if (info.menuItemId === 'pramaan-open-vault') {
      chrome.tabs.create({ url: webBase });
    }
  });
});
