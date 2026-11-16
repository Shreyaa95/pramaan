// PRAMAAN Direct Email & Certificate Extension Controller
document.addEventListener('DOMContentLoaded', () => {
  const DEFAULT_API_BASE = 'http://localhost:5000/api';

  // Header Elements
  const statusBadge = document.getElementById('backendStatus');
  const statusText = document.getElementById('statusText');
  const openWebBtn = document.getElementById('openWebBtn');
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabPanes = document.querySelectorAll('.tab-pane');

  // Tab 1: Instant Email Dispatch Elements
  const mailDispatchForm = document.getElementById('mailDispatchForm');
  const mailEventSelect = document.getElementById('mailEventSelect');
  const mailRecipientName = document.getElementById('mailRecipientName');
  const mailRecipientEmail = document.getElementById('mailRecipientEmail');
  const mailRole = document.getElementById('mailRole');
  const toggleCustomMsg = document.getElementById('toggleCustomMsg');
  const customMsgBox = document.getElementById('customMsgBox');
  const mailCustomSubject = document.getElementById('mailCustomSubject');
  const mailCustomBody = document.getElementById('mailCustomBody');
  const mailSubmitBtn = document.getElementById('mailSubmitBtn');
  const mailLoading = document.getElementById('mailLoading');
  const mailProgressStep = document.getElementById('mailProgressStep');
  const mailError = document.getElementById('mailError');
  const mailErrorMsg = document.getElementById('mailErrorMsg');
  const mailSuccessCard = document.getElementById('mailSuccessCard');
  const mailResultCertId = document.getElementById('mailResultCertId');
  const mailResultEmail = document.getElementById('mailResultEmail');
  const mailResultName = document.getElementById('mailResultName');
  const mailResultEvent = document.getElementById('mailResultEvent');
  const mailPreviewEmailBtn = document.getElementById('mailPreviewEmailBtn');
  const mailViewPdfBtn = document.getElementById('mailViewPdfBtn');

  // Tab 2: Batch Dispatch Elements
  const batchEventSelect = document.getElementById('batchEventSelect');
  const batchTotalRecipients = document.getElementById('batchTotalRecipients');
  const batchSentCount = document.getElementById('batchSentCount');
  const batchFailedCount = document.getElementById('batchFailedCount');
  const batchDispatchBtn = document.getElementById('batchDispatchBtn');
  const batchRetryBtn = document.getElementById('batchRetryBtn');
  const batchLoading = document.getElementById('batchLoading');
  const batchProgressText = document.getElementById('batchProgressText');
  const batchResultAlert = document.getElementById('batchResultAlert');
  const batchResultMsg = document.getElementById('batchResultMsg');

  // Tab 3: Verify Elements
  const verifyInput = document.getElementById('verifyInput');
  const verifyBtn = document.getElementById('verifyBtn');
  const verifyLoading = document.getElementById('verifyLoading');
  const verifyError = document.getElementById('verifyError');
  const verifyErrorMsg = document.getElementById('verifyErrorMsg');
  const verifyResult = document.getElementById('verifyResult');
  const resCertId = document.getElementById('resCertId');
  const resName = document.getElementById('resName');
  const resEvent = document.getElementById('resEvent');
  const resDate = document.getElementById('resDate');
  const viewPdfBtn = document.getElementById('viewPdfBtn');
  const copyLinkBtn = document.getElementById('copyLinkBtn');

  // Tab 4: Config Elements
  const cfgApiBase = document.getElementById('cfgApiBase');
  const cfgTestBtn = document.getElementById('cfgTestBtn');
  const cfgSaveBtn = document.getElementById('cfgSaveBtn');
  const cfgFeedback = document.getElementById('cfgFeedback');

  let currentApiBase = DEFAULT_API_BASE;
  let latestSentPdfUrl = null;
  let latestSentPreviewUrl = null;
  let latestVerifiedPdfUrl = null;
  let latestVerifiedCertId = null;

  // Initialize
  init();

  async function init() {
    // 1. Read storage
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(['pramaanApiBase', 'prefillEmail', 'prefillName', 'lastVerifiedId'], (res) => {
        if (res.pramaanApiBase) {
          currentApiBase = res.pramaanApiBase;
          cfgApiBase.value = currentApiBase;
        } else {
          cfgApiBase.value = DEFAULT_API_BASE;
        }

        if (res.prefillEmail) {
          mailRecipientEmail.value = res.prefillEmail;
          chrome.storage.local.remove('prefillEmail');
        }
        if (res.prefillName) {
          mailRecipientName.value = res.prefillName;
          chrome.storage.local.remove('prefillName');
        }
        if (res.lastVerifiedId) {
          verifyInput.value = res.lastVerifiedId;
        }

        checkBackendHealth();
        loadActiveEvents();
      });
    } else {
      cfgApiBase.value = DEFAULT_API_BASE;
      checkBackendHealth();
      loadActiveEvents();
    }

    // 2. Tab Navigation
    tabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        tabButtons.forEach(b => b.classList.remove('active'));
        tabPanes.forEach(p => p.classList.remove('active'));

        btn.classList.add('active');
        const targetId = btn.getAttribute('data-tab');
        const targetPane = document.getElementById(targetId);
        if (targetPane) targetPane.classList.add('active');

        if (targetId === 'tab-batch') {
          loadBatchStats(batchEventSelect.value);
        }
      });
    });

    // 3. Open Web Dashboard button
    openWebBtn.addEventListener('click', () => {
      const webUrl = currentApiBase.replace(/\/api\/?$/, '');
      if (typeof chrome !== 'undefined' && chrome.tabs) {
        chrome.tabs.create({ url: webUrl });
      } else {
        window.open(webUrl, '_blank');
      }
    });

    // 4. Custom Message Toggle
    toggleCustomMsg.addEventListener('click', () => {
      customMsgBox.classList.toggle('hidden');
    });

    // 5. Send Certificate via Email Form
    mailDispatchForm.addEventListener('submit', handleInstantDispatch);

    mailPreviewEmailBtn.addEventListener('click', () => {
      if (latestSentPreviewUrl) {
        openUrl(latestSentPreviewUrl);
      }
    });

    mailViewPdfBtn.addEventListener('click', () => {
      if (latestSentPdfUrl) {
        openUrl(latestSentPdfUrl);
      }
    });

    // 6. Batch Dispatch & Retry
    batchEventSelect.addEventListener('change', () => {
      loadBatchStats(batchEventSelect.value);
    });
    batchDispatchBtn.addEventListener('click', handleBatchDispatch);
    batchRetryBtn.addEventListener('click', handleBatchRetry);

    // 7. Verify Certificate Action
    verifyBtn.addEventListener('click', handleVerify);
    verifyInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleVerify();
    });

    viewPdfBtn.addEventListener('click', () => {
      if (latestVerifiedPdfUrl) openUrl(latestVerifiedPdfUrl);
    });

    copyLinkBtn.addEventListener('click', () => {
      if (latestVerifiedCertId) {
        const webBase = currentApiBase.replace(/\/api\/?$/, '');
        const shareUrl = `${webBase}/view-certificate/${latestVerifiedCertId}`;
        navigator.clipboard.writeText(shareUrl).then(() => {
          copyLinkBtn.textContent = 'Copied!';
          setTimeout(() => { copyLinkBtn.textContent = 'Copy Link'; }, 2000);
        });
      }
    });

    // 8. Config Actions
    cfgTestBtn.addEventListener('click', testApiConnection);
    cfgSaveBtn.addEventListener('click', saveApiConfig);
  }

  function openUrl(url) {
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.create({ url });
    } else {
      window.open(url, '_blank');
    }
  }

  // Check Backend Health
  async function checkBackendHealth() {
    try {
      statusBadge.className = 'status-badge status-checking';
      statusText.textContent = 'Checking...';

      const res = await fetch(`${currentApiBase}/health`);
      if (res.ok) {
        statusBadge.className = 'status-badge status-online';
        statusText.textContent = 'ONLINE';
      } else {
        throw new Error('Health check non-200');
      }
    } catch (e) {
      statusBadge.className = 'status-badge status-offline';
      statusText.textContent = 'OFFLINE';
    }
  }

  // Load Active Events for Selects
  async function loadActiveEvents() {
    try {
      const res = await fetch(`${currentApiBase}/events`);
      const data = await res.json();
      if (data.success && data.events && data.events.length > 0) {
        const optionsHtml = data.events.map(ev => 
          `<option value="${ev._id}">${ev.name} (${ev.organizationName || 'PRAMAAN'})</option>`
        ).join('');

        mailEventSelect.innerHTML = optionsHtml;
        batchEventSelect.innerHTML = optionsHtml;

        loadBatchStats(data.events[0]._id);
      } else {
        mailEventSelect.innerHTML = '<option value="">No active batches found</option>';
        batchEventSelect.innerHTML = '<option value="">No active batches found</option>';
      }
    } catch (e) {
      mailEventSelect.innerHTML = '<option value="">Failed to connect to backend</option>';
    }
  }

  // Load Batch Statistics for Tab 2
  async function loadBatchStats(eventId) {
    if (!eventId) return;
    try {
      const res = await fetch(`${currentApiBase}/dashboard`);
      const data = await res.json();
      if (data.success && data.stats) {
        batchTotalRecipients.textContent = data.stats.totalRecipients || 0;
        batchSentCount.textContent = data.stats.emailsSent || 0;
        batchFailedCount.textContent = data.stats.emailsFailed || 0;
      }
    } catch (e) {
      console.warn('Could not load batch stats:', e);
    }
  }

  // TAB 1: Handle Instant Single Certificate Email Dispatch
  async function handleInstantDispatch(e) {
    e.preventDefault();

    const eventId = mailEventSelect.value;
    const name = mailRecipientName.value.trim();
    const email = mailRecipientEmail.value.trim();
    const role = mailRole.value.trim();
    const subject = mailCustomSubject.value.trim();
    const message = mailCustomBody.value.trim();

    if (!name || !email) return;

    mailError.classList.add('hidden');
    mailSuccessCard.classList.add('hidden');
    mailLoading.classList.remove('hidden');
    mailSubmitBtn.disabled = true;

    mailProgressStep.textContent = `Personalizing vector PDF for ${name}...`;

    try {
      const res = await fetch(`${currentApiBase}/email/instant-dispatch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId,
          name,
          email,
          role,
          subject: subject || undefined,
          message: message || undefined
        })
      });

      const data = await res.json();
      mailLoading.classList.add('hidden');
      mailSubmitBtn.disabled = false;

      if (data.success) {
        latestSentPdfUrl = data.pdfUrl;
        latestSentPreviewUrl = data.previewUrl;

        mailResultCertId.textContent = data.certificateId;
        mailResultEmail.textContent = data.recipientEmail;
        mailResultName.textContent = data.recipientName;
        mailResultEvent.textContent = data.eventName || 'Verified Batch';

        if (data.previewUrl) {
          mailPreviewEmailBtn.classList.remove('hidden');
        } else {
          mailPreviewEmailBtn.classList.add('hidden');
        }

        mailSuccessCard.classList.remove('hidden');

        // Reset input fields
        mailRecipientName.value = '';
        mailRecipientEmail.value = '';
        mailRole.value = '';
      } else {
        mailErrorMsg.textContent = data.error || 'Failed to dispatch certificate email.';
        mailError.classList.remove('hidden');
      }
    } catch (err) {
      mailLoading.classList.add('hidden');
      mailSubmitBtn.disabled = false;
      mailErrorMsg.textContent = 'Connection error: ' + err.message;
      mailError.classList.remove('hidden');
    }
  }

  // TAB 2: Handle Bulk Dispatch for Entire Batch
  async function handleBatchDispatch() {
    const eventId = batchEventSelect.value;
    if (!eventId) return;

    if (!confirm('Dispatch certificates via email to all pending recipients in this batch?')) {
      return;
    }

    batchResultAlert.classList.add('hidden');
    batchLoading.classList.remove('hidden');
    batchProgressText.textContent = 'Connecting to Nodemailer & sending batch emails...';
    batchDispatchBtn.disabled = true;

    try {
      const res = await fetch(`${currentApiBase}/email/instant-batch-dispatch/${eventId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();

      batchLoading.classList.add('hidden');
      batchDispatchBtn.disabled = false;

      if (data.success) {
        batchResultMsg.textContent = `Batch Dispatch Complete: ${data.sentCount} emails sent successfully!`;
        batchResultAlert.className = 'alert-box alert-success mt-3';
        batchResultAlert.classList.remove('hidden');
        loadBatchStats(eventId);
      } else {
        batchResultMsg.textContent = data.error || 'Batch delivery failed.';
        batchResultAlert.className = 'alert-box alert-error mt-3';
        batchResultAlert.classList.remove('hidden');
      }
    } catch (err) {
      batchLoading.classList.add('hidden');
      batchDispatchBtn.disabled = false;
      batchResultMsg.textContent = 'Error: ' + err.message;
      batchResultAlert.className = 'alert-box alert-error mt-3';
      batchResultAlert.classList.remove('hidden');
    }
  }

  // TAB 2: Handle Retry Failed
  async function handleBatchRetry() {
    const eventId = batchEventSelect.value;
    if (!eventId) return;

    batchResultAlert.classList.add('hidden');
    batchLoading.classList.remove('hidden');
    batchProgressText.textContent = 'Retrying failed deliveries safely...';
    batchRetryBtn.disabled = true;

    try {
      const res = await fetch(`${currentApiBase}/email/retry-failed/${eventId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();

      batchLoading.classList.add('hidden');
      batchRetryBtn.disabled = false;

      if (data.success) {
        batchResultMsg.textContent = `Retry completed: ${data.totalRetried || 0} emails dispatched.`;
        batchResultAlert.className = 'alert-box alert-success mt-3';
        batchResultAlert.classList.remove('hidden');
        loadBatchStats(eventId);
      } else {
        batchResultMsg.textContent = data.error || 'Retry failed.';
        batchResultAlert.className = 'alert-box alert-error mt-3';
        batchResultAlert.classList.remove('hidden');
      }
    } catch (err) {
      batchLoading.classList.add('hidden');
      batchRetryBtn.disabled = false;
      batchResultMsg.textContent = 'Error: ' + err.message;
      batchResultAlert.className = 'alert-box alert-error mt-3';
      batchResultAlert.classList.remove('hidden');
    }
  }

  // TAB 3: Handle Verify Certificate
  async function handleVerify() {
    const certId = verifyInput.value.trim();
    if (!certId) return;

    verifyError.classList.add('hidden');
    verifyResult.classList.add('hidden');
    verifyLoading.classList.remove('hidden');

    try {
      const res = await fetch(`${currentApiBase}/certificates/public/${encodeURIComponent(certId)}`);
      const data = await res.json();

      verifyLoading.classList.add('hidden');

      if (data.success && data.certificate) {
        const cert = data.certificate;
        const ev = data.event || {};

        latestVerifiedCertId = cert.certificateId;
        latestVerifiedPdfUrl = cert.pdfUrl;

        resCertId.textContent = cert.certificateId;
        resName.textContent = cert.recipientName || 'Unknown Recipient';
        resEvent.textContent = ev.name || cert.eventName || 'Verified Program';
        resDate.textContent = new Date(cert.createdAt || Date.now()).toLocaleDateString();

        verifyResult.classList.remove('hidden');

        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
          chrome.storage.local.set({ lastVerifiedId: cert.certificateId });
        }
      } else {
        verifyErrorMsg.textContent = data.error || 'No matching certificate found in cryptographic records.';
        verifyError.classList.remove('hidden');
      }
    } catch (err) {
      verifyLoading.classList.add('hidden');
      verifyErrorMsg.textContent = 'Failed to connect to PRAMAAN backend. Please ensure the server is running.';
      verifyError.classList.remove('hidden');
    }
  }

  // TAB 4: Test API Connection
  async function testApiConnection() {
    const testUrl = cfgApiBase.value.trim();
    cfgFeedback.classList.remove('hidden');
    cfgFeedback.className = 'feedback-msg alert-box alert-error';
    cfgFeedback.textContent = 'Testing connection...';

    try {
      const res = await fetch(`${testUrl}/health`);
      if (res.ok) {
        cfgFeedback.className = 'feedback-msg alert-box alert-success';
        cfgFeedback.textContent = 'Connection successful! PRAMAAN Core is reachable.';
      } else {
        cfgFeedback.textContent = `Server responded with HTTP ${res.status}`;
      }
    } catch (err) {
      cfgFeedback.textContent = 'Connection failed: ' + err.message;
    }
  }

  // TAB 4: Save Settings
  function saveApiConfig() {
    const newUrl = cfgApiBase.value.trim();
    currentApiBase = newUrl;
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ pramaanApiBase: newUrl }, () => {
        cfgFeedback.classList.remove('hidden');
        cfgFeedback.className = 'feedback-msg alert-box alert-success';
        cfgFeedback.textContent = 'Configuration saved!';
        checkBackendHealth();
        loadActiveEvents();
      });
    } else {
      cfgFeedback.classList.remove('hidden');
      cfgFeedback.className = 'feedback-msg alert-box alert-success';
      cfgFeedback.textContent = 'Configuration saved in session!';
      checkBackendHealth();
      loadActiveEvents();
    }
  }
});
