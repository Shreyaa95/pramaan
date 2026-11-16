import React, { useState } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  X,
  Search,
  ExternalLink,
  Download,
  AlertTriangle,
  Award,
  Calendar,
  Building,
  Mail,
  Sparkles,
  Copy,
  Check
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { api } from '../../services/api';
import { Button } from './Button';
import { Badge } from './Badge';

export function QuickVerifierModal({ isOpen, onClose, initialCertId = '' }) {
  const [certId, setCertId] = useState(initialCertId);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  const handleVerify = async (idToVerify) => {
    const target = (idToVerify || certId).trim();
    if (!target) return;

    try {
      setLoading(true);
      setError(null);
      setResult(null);

      const res = await api.getPublicCertificate(target);
      if (res.success && res.certificate) {
        setResult(res);
        // Fire celebration confetti!
        try {
          confetti({
            particleCount: 60,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#ca0019', '#ef4444', '#ffffff', '#ffd700']
          });
        } catch (e) {}
      } else {
        setError(res.error || 'No matching certificate found in cryptographic records.');
      }
    } catch (err) {
      setError(err.message || 'Verification failed. Please check the Certificate ID.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = () => {
    if (!result?.certificate?.certificateId) return;
    const url = `${window.location.origin}/view-certificate/${result.certificate.certificateId}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  const cert = result?.certificate;
  const event = result?.event;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fadeIn">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/85 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-xl bg-[#111115] border border-[#27272a] hover:border-[#3f3f46] rounded-3xl shadow-2xl overflow-hidden z-10 glowing-border flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#27272a] bg-[#141418]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#ca0019]/15 border border-[#ca0019]/35 flex items-center justify-center text-[#ef4444]">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white font-display">
                Cryptographic Certificate Verifier
              </h2>
              <p className="text-xs text-gray-400">
                Live tamper-proof signature & deterministic recipient lookup
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Input section */}
        <div className="p-6 space-y-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleVerify();
            }}
            className="flex gap-2"
          >
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={certId}
                onChange={(e) => setCertId(e.target.value)}
                placeholder="Enter Certificate ID (e.g. IJ26-2026-0001 or CERT-...)"
                className="w-full pl-10 pr-3.5 py-2.5 text-xs bg-[#18181b] border border-[#27272a] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#ca0019] font-mono"
              />
            </div>
            <Button
              type="submit"
              variant="accent"
              size="sm"
              disabled={loading || !certId.trim()}
              className="px-5 shrink-0"
            >
              {loading ? 'Verifying...' : 'Verify Now'}
            </Button>
          </form>

          {/* Quick chip suggestions if no query */}
          {!result && !error && (
            <div className="text-center py-6 space-y-2">
              <p className="text-xs text-gray-400">
                PRAMAAN generates unique deterministic IDs for every issued credential.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                <span className="text-[11px] text-gray-500">Sample formats:</span>
                <span className="px-2 py-0.5 rounded-md bg-[#18181b] border border-[#27272a] text-[11px] text-gray-400 font-mono">
                  PREFIX-YYYY-XXXX
                </span>
                <span className="px-2 py-0.5 rounded-md bg-[#18181b] border border-[#27272a] text-[11px] text-gray-400 font-mono">
                  CERT-2026-0001
                </span>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-4 rounded-2xl bg-red-950/30 border border-red-500/30 text-red-200 text-xs flex items-start gap-3 animate-fadeIn">
              <AlertTriangle className="w-4 h-4 text-[#ef4444] shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-white mb-0.5">Verification Failed</div>
                <div>{error}</div>
              </div>
            </div>
          )}

          {/* Verification Result Card */}
          {cert && (
            <div className="space-y-4 animate-scaleIn">
              <div className="p-5 rounded-2xl bg-gradient-to-br from-[#16161b] via-[#141418] to-[#0d0d10] border border-emerald-500/30 shadow-xl relative overflow-hidden">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Cryptographically Authenticated Record</span>
                  </div>
                  <Badge variant="success" size="xs">
                    VERIFIED
                  </Badge>
                </div>

                <div className="space-y-3 pt-1">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                      Recipient Name
                    </span>
                    <h3 className="text-lg font-black text-white font-display">
                      {cert.recipientName}
                    </h3>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/5">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-gray-500">
                        Event / Batch
                      </span>
                      <p className="text-xs font-bold text-gray-200 truncate">
                        {event?.name || cert.eventName || 'Official Program'}
                      </p>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-bold text-gray-500">
                        Certificate ID
                      </span>
                      <p className="text-xs font-mono font-bold text-[#ef4444] truncate">
                        {cert.certificateId}
                      </p>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-bold text-gray-500">
                        Issued Date
                      </span>
                      <p className="text-xs font-semibold text-gray-300">
                        {new Date(cert.createdAt || Date.now()).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </p>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-bold text-gray-500">
                        Issuing Org
                      </span>
                      <p className="text-xs font-semibold text-gray-300 truncate">
                        {event?.organizationName || 'PRAMAAN Authority'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-4 mt-4 border-t border-white/5">
                  <Button
                    size="xs"
                    variant="accent"
                    onClick={() => window.open(cert.pdfUrl, '_blank')}
                    icon={Download}
                    className="flex-1"
                  >
                    View Official PDF
                  </Button>

                  <Button
                    size="xs"
                    variant="secondary"
                    onClick={handleCopyLink}
                    icon={copied ? Check : Copy}
                  >
                    {copied ? 'Copied' : 'Share Verification Link'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
