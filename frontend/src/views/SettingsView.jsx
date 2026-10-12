import React, { useState, useEffect } from 'react';
import {
  Settings,
  Mail,
  Database,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Save,
  Zap,
  Lock,
  Eye,
  EyeOff,
  Layers
} from 'lucide-react';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';

export function SettingsView() {
  const { showToast } = useToast();

  // SMTP State
  const [smtpConfig, setSmtpConfig] = useState({
    host: '',
    port: 587,
    secure: false,
    user: '',
    pass: '',
    senderEmail: '',
    senderName: 'PRAMAAN Platform'
  });
  const [loadingSmtp, setLoadingSmtp] = useState(true);
  const [savingSmtp, setSavingSmtp] = useState(false);
  const [verifyingSmtp, setVerifyingSmtp] = useState(false);
  const [smtpTestResult, setSmtpTestResult] = useState(null);
  const [showSmtpPass, setShowSmtpPass] = useState(false);

  // MongoDB Test State
  const [mongoTestResult, setMongoTestResult] = useState(null);
  const [testingMongo, setTestingMongo] = useState(false);
  const [externalMongoConfigured, setExternalMongoConfigured] = useState(false);

  useEffect(() => {
    loadSettings();
    api.getRestSourceConfig().then(config => setExternalMongoConfigured(Boolean(config.externalMongoConfigured))).catch(() => {});
  }, []);

  const loadSettings = async () => {
    try {
      setLoadingSmtp(true);
      const res = await api.getSmtpSettings();
      if (res.success && res.settings) {
        setSmtpConfig(res.settings);
      }
    } catch (err) {
      console.error('Failed to load SMTP settings:', err);
    } finally {
      setLoadingSmtp(false);
    }
  };

  const handleSaveSmtp = async (e) => {
    e.preventDefault();
    setSmtpTestResult(null);
    try {
      setSavingSmtp(true);
      const res = await api.updateSmtpSettings(smtpConfig);
      if (res.success) {
        setSmtpTestResult({
          success: true,
          message: 'SMTP configuration saved successfully! Active for all certificate dispatches.'
        });
        showToast('SMTP configuration saved successfully!', 'success');
        loadSettings();
      }
    } catch (err) {
      setSmtpTestResult({
        success: false,
        message: err.message
      });
      showToast(err.message, 'error');
    } finally {
      setSavingSmtp(false);
    }
  };

  const handleVerifySmtp = async () => {
    setSmtpTestResult(null);
    try {
      setVerifyingSmtp(true);
      const res = await api.verifySmtp(smtpConfig);
      if (res.success) {
        setSmtpTestResult({
          success: true,
          message: 'SMTP handshake and authentication succeeded! The mail server is ready to deliver certificates.'
        });
        showToast('SMTP connection verified successfully!', 'success');
      }
    } catch (err) {
      setSmtpTestResult({
        success: false,
        message: err.message
      });
      showToast(`Verification failed: ${err.message}`, 'error');
    } finally {
      setVerifyingSmtp(false);
    }
  };

  const handleResetSmtp = async () => {
    try {
      setSavingSmtp(true);
      setSmtpTestResult(null);
      const res = await api.resetSmtpSettings();
      if (res.success) {
        setSmtpConfig({
          host: '',
          port: 587,
          secure: false,
          user: '',
          pass: '',
          senderEmail: '',
          senderName: 'PRAMAAN Platform'
        });
        showToast('Reset to Ethereal sandbox test mode.', 'info');
        loadSettings();
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSavingSmtp(false);
    }
  };

  const handleTestMongo = async (e) => {
    e.preventDefault();
    if (!externalMongoConfigured) {
      setMongoTestResult({ success: false, message: 'Configure EXTERNAL_MONGODB_URI in the PRAMAAN backend environment. Database credentials are not entered in this screen.' });
      return;
    }

    try {
      setTestingMongo(true);
      setMongoTestResult(null);
      const res = await api.testMongoConnection();
      if (res.success) {
        setMongoTestResult({
          success: true,
          message: `Connected successfully! Available databases: ${res.databases?.join(', ')}`
        });
        showToast('MongoDB connection established!', 'success');
      }
    } catch (err) {
      setMongoTestResult({
        success: false,
        message: err.message
      });
      showToast(`MongoDB connection failed: ${err.message}`, 'error');
    } finally {
      setTestingMongo(false);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12 animate-fadeIn">
      {/* Top Header */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-[#121215] via-[#151518] to-[#121215] border border-[#27272a] shadow-xl glowing-border">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#ca0019]/15 text-[#ef4444] text-[10px] uppercase font-extrabold tracking-wider border border-[#ca0019]/30 mb-1.5">
          <Settings className="w-3 h-3" />
          Infrastructure & Protocol
        </div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2 font-display">
          System & Credentials Configuration
        </h1>
        <p className="text-xs text-gray-400 mt-1">
          Configure backend transport protocols and external database integrations securely. Credentials are never logged or leaked.
        </p>
      </div>

      {/* SECTION 1: SMTP SETTINGS */}
      <Card glowingTop className="space-y-6 border-[#27272a] bg-[#121215]">
        <div className="flex items-center justify-between border-b border-[#27272a] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#ca0019]/20 border border-[#ca0019]/30 flex items-center justify-center text-[#ef4444]">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white font-display">Nodemailer SMTP Mail Server</h2>
              <p className="text-xs text-gray-400">
                Primary SMTP relay used to deliver certificates to recipients. If unconfigured, test mode (Ethereal) is automatically engaged.
              </p>
            </div>
          </div>
          <Badge variant={smtpConfig.host ? 'success' : 'warning'}>
            {smtpConfig.host ? 'Live Server Configured' : 'Test Sandbox Active'}
          </Badge>
        </div>

        {/* Gmail App Password Alert Banner */}
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-xs text-amber-200 space-y-2">
          <div className="flex items-center gap-2 font-bold text-amber-300">
            <span>⚠️ Important for Gmail Users (535-5.7.8 Authentication Error):</span>
          </div>
          <p className="opacity-95 leading-relaxed font-sans">
            Google rejects standard Gmail passwords with <code>535-5.7.8 Username and Password not accepted</code>. You <strong>must use a 16-character Google App Password</strong>, created with 2-Step Verification enabled on your Google Account:
          </p>
          <a
            href="https://myaccount.google.com/apppasswords"
            target="_blank"
            rel="noreferrer"
            className="inline-block font-mono text-[11px] bg-amber-400/20 px-3 py-1.5 rounded-lg text-amber-100 hover:text-white underline font-bold"
          >
            Generate Google App Password at https://myaccount.google.com/apppasswords &rarr;
          </a>
        </div>

        {/* Quick Presets */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-gray-400 font-bold uppercase text-[10px]">Quick Presets:</span>
          <button
            type="button"
            onClick={() => setSmtpConfig(prev => ({ ...prev, host: 'smtp.gmail.com', port: 465, secure: true }))}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              smtpConfig.host === 'smtp.gmail.com' && smtpConfig.port === 465
                ? 'bg-[#ca0019] text-white shadow-md shadow-[#ca0019]/40'
                : 'bg-[#18181b] hover:bg-[#27272a] text-white border border-[#27272a]'
            }`}
          >
            Gmail SSL (465 - Recommended)
          </button>
          <button
            type="button"
            onClick={() => setSmtpConfig(prev => ({ ...prev, host: 'smtp.gmail.com', port: 587, secure: false }))}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              smtpConfig.host === 'smtp.gmail.com' && smtpConfig.port === 587
                ? 'bg-[#ca0019] text-white shadow-md shadow-[#ca0019]/40'
                : 'bg-[#18181b] hover:bg-[#27272a] text-white border border-[#27272a]'
            }`}
          >
            Gmail TLS (587)
          </button>
          <button
            type="button"
            onClick={() => setSmtpConfig(prev => ({ ...prev, host: 'smtp-mail.outlook.com', port: 587, secure: false }))}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              smtpConfig.host === 'smtp-mail.outlook.com'
                ? 'bg-[#ca0019] text-white shadow-md shadow-[#ca0019]/40'
                : 'bg-[#18181b] hover:bg-[#27272a] text-white border border-[#27272a]'
            }`}
          >
            Outlook (587)
          </button>
        </div>

        {smtpTestResult && (
          <div className={`p-4 rounded-2xl text-xs border leading-relaxed break-words whitespace-pre-wrap ${
            smtpTestResult.success
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
              : 'bg-red-950/40 border-red-500/40 text-red-200'
          }`}>
            <strong className="block mb-1 font-bold text-sm">
              {smtpTestResult.success ? '✅ SMTP Connection Verified' : '❌ SMTP Verification Failed'}
            </strong>
            {smtpTestResult.message}
          </div>
        )}

        <form onSubmit={handleSaveSmtp} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="text-xs font-bold text-gray-300 block mb-1">
                SMTP Host <span className="text-[#ca0019]">*</span>
              </label>
              <input
                type="text"
                placeholder="smtp.gmail.com"
                value={smtpConfig.host || ''}
                onChange={(e) => setSmtpConfig({ ...smtpConfig, host: e.target.value.trim() })}
                className="w-full px-3.5 py-2.5 text-xs bg-[#18181b] border border-[#27272a] rounded-xl text-white font-mono focus:outline-none focus:border-[#ca0019]"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-300 block mb-1">
                SMTP Port
              </label>
              <input
                type="number"
                placeholder="465 or 587"
                value={smtpConfig.port || 587}
                onChange={(e) => {
                  const port = Number(e.target.value);
                  setSmtpConfig({
                    ...smtpConfig,
                    port,
                    secure: port === 465
                  });
                }}
                className="w-full px-3.5 py-2.5 text-xs bg-[#18181b] border border-[#27272a] rounded-xl text-white font-mono focus:outline-none focus:border-[#ca0019]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-gray-300 block mb-1">
                Username / Email <span className="text-[#ca0019]">*</span>
              </label>
              <input
                type="text"
                placeholder="yourname@gmail.com"
                value={smtpConfig.user || ''}
                onChange={(e) => setSmtpConfig({ ...smtpConfig, user: e.target.value.trim() })}
                className="w-full px-3.5 py-2.5 text-xs bg-[#18181b] border border-[#27272a] rounded-xl text-white font-mono focus:outline-none focus:border-[#ca0019]"
              />
              <span className="text-[10px] text-gray-400 mt-1 block">Must be your full Gmail address.</span>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-300 block mb-1">
                Password / 16-char App Password
              </label>
              <div className="relative">
                <input
                  type={showSmtpPass ? "text" : "password"}
                  placeholder="••••••••••••"
                  value={smtpConfig.pass || ''}
                  onChange={(e) => setSmtpConfig({ ...smtpConfig, pass: e.target.value.replace(/\s+/g, '') })}
                  className="w-full pl-3.5 pr-10 py-2.5 text-xs bg-[#18181b] border border-[#27272a] rounded-xl text-white font-mono focus:outline-none focus:border-[#ca0019]"
                />
                <button
                  type="button"
                  onClick={() => setShowSmtpPass(!showSmtpPass)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors cursor-pointer"
                >
                  {showSmtpPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <span className="text-[10px] text-gray-400 mt-1 block">Google App Passwords only (spaces auto-stripped).</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-gray-300 block mb-1">
                Sender Display Name
              </label>
              <input
                type="text"
                placeholder="PRAMAAN Platform"
                value={smtpConfig.senderName || ''}
                onChange={(e) => setSmtpConfig({ ...smtpConfig, senderName: e.target.value })}
                className="w-full px-3.5 py-2.5 text-xs bg-[#18181b] border border-[#27272a] rounded-xl text-white focus:outline-none focus:border-[#ca0019]"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-300 block mb-1">
                Sender Reply-To Email
              </label>
              <input
                type="email"
                placeholder="yourname@gmail.com"
                value={smtpConfig.senderEmail || ''}
                onChange={(e) => setSmtpConfig({ ...smtpConfig, senderEmail: e.target.value.trim() })}
                className="w-full px-3.5 py-2.5 text-xs bg-[#18181b] border border-[#27272a] rounded-xl text-white focus:outline-none focus:border-[#ca0019]"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="smtpSecure"
              checked={!!smtpConfig.secure}
              onChange={(e) => setSmtpConfig({ ...smtpConfig, secure: e.target.checked })}
              className="accent-[#ca0019] rounded w-4 h-4 cursor-pointer"
            />
            <label htmlFor="smtpSecure" className="text-xs text-gray-300 cursor-pointer font-medium">
              Enable SSL/TLS Direct Encryption (Required for Port 465, uncheck for Port 587 STARTTLS)
            </label>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-[#27272a] flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={handleVerifySmtp}
                loading={verifyingSmtp}
                disabled={!smtpConfig.host || !smtpConfig.user}
              >
                Verify Connection
              </Button>
              {smtpConfig.host && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleResetSmtp}
                  loading={savingSmtp}
                  title="Clear live credentials and revert to sandbox test emails"
                >
                  Reset to Sandbox Mode
                </Button>
              )}
            </div>

            <Button
              type="submit"
              variant="primary"
              loading={savingSmtp}
              icon={Save}
            >
              Save SMTP Configuration
            </Button>
          </div>
        </form>
      </Card>

      {/* SECTION 2: BACKEND-CONFIGURED MONGODB CONNECTION TESTER */}
      <Card glowingTop className="space-y-6 border-[#27272a] bg-[#121215]">
        <div className="flex items-center justify-between border-b border-[#27272a] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white font-display">Backend-Configured MongoDB Data Source Inspector</h2>
              <p className="text-xs text-gray-400">
                Validate connectivity to external recipient databases and discover collections.
              </p>
            </div>
          </div>
          <Badge variant="info">Secure Inspector</Badge>
        </div>

        <form onSubmit={handleTestMongo} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-gray-300 block mb-1">
              External database profile
            </label>
            <div className="rounded-xl border border-white/10 bg-[#18181b] p-3 text-xs text-gray-300">
              {externalMongoConfigured ? 'External MongoDB profile is configured on the backend.' : 'No external MongoDB profile is configured. Set EXTERNAL_MONGODB_URI in backend/.env and restart PRAMAAN.'}
            </div>
            <p className="text-[11px] text-gray-400 mt-1 flex items-center gap-1 font-sans">
              <Lock className="w-3.5 h-3.5 text-emerald-400" />
              Connection credentials remain in backend environment configuration and are never sent by this browser.
            </p>
          </div>

          <div className="flex justify-end">
            <Button
              type="submit"
              variant="secondary"
              loading={testingMongo}
              icon={Zap}
              disabled={!externalMongoConfigured}
            >
              Test MongoDB Bridge
            </Button>
          </div>

          {mongoTestResult && (
            <div className={`p-4 rounded-2xl text-xs border ${
              mongoTestResult.success
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                : 'bg-red-950/30 border-red-500/30 text-red-200'
            }`}>
              {mongoTestResult.message}
            </div>
          )}
        </form>
      </Card>
    </div>
  );
}
