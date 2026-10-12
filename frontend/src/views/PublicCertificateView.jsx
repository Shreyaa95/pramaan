import React, { useState, useEffect } from 'react';
import {
  Award,
  Download,
  CheckCircle2,
  Calendar,
  Building,
  Mail,
  ShieldCheck,
  ExternalLink,
  Sparkles,
  Eye
} from 'lucide-react';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { BrandLogo } from '../components/common/BrandLogo';
import { api } from '../services/api';

export function PublicCertificateView({ certificateId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchCertificate() {
      try {
        setLoading(true);
        const res = await api.getPublicCertificate(certificateId);
        if (res.success) {
          setData(res);
        } else {
          setError(res.error || 'Certificate not found.');
        }
      } catch (err) {
        setError(err.message || 'Failed to load certificate.');
      } finally {
        setLoading(false);
      }
    }
    if (certificateId) {
      fetchCertificate();
    }
  }, [certificateId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#07080b] flex flex-col items-center justify-center text-white p-4">
        <div className="w-10 h-10 border-2 border-[#ca0019] border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-xs font-semibold text-gray-400">Verifying and retrieving official certificate...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#07080b] flex flex-col items-center justify-center text-white p-4">
        <div className="max-w-md w-full p-8 rounded-3xl bg-[#11131b] border border-white/10 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-red-950/40 border border-red-500/30 text-[#ff4d64] flex items-center justify-center mx-auto">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-white">Certificate Verification Failed</h2>
          <p className="text-xs text-gray-400">{error || 'Invalid or revoked certificate identifier.'}</p>
          <a
            href="/"
            className="inline-block px-4 py-2 rounded-xl text-xs font-semibold bg-[#181b26] text-white hover:bg-[#222736] border border-white/10"
          >
            Return to PRAMAAN Home
          </a>
        </div>
      </div>
    );
  }

  const cert = data.certificate;
  const event = data.event || {};

  return (
    <div className="min-h-screen bg-[#07080b] text-gray-100 flex flex-col font-sans">
      {/* Top Verification Header */}
      <header className="border-b border-white/10 bg-[#0c0e14]/90 backdrop-blur-md px-6 py-4 sticky top-0 z-30 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BrandLogo size="sm" showTagline={false} linkHome={true} />
          <div className="hidden sm:block pl-3 border-l border-white/10">
            <span className="text-[11px] font-semibold text-gray-300">Public Verification Portal</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Cryptographically Verified</span>
          </div>
        </div>
      </header>

      {/* Main Recipient Certificate View */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-8 space-y-8">
        {/* Verification Certificate Hero Card */}
        <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-[#12141c] via-[#161824] to-[#12141c] border border-white/10 shadow-2xl relative overflow-hidden">
          <div className="relative z-10 flex flex-wrap items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#ca0019]/20 border border-[#ca0019]/40 text-[#ff4d64] text-xs font-bold">
                <Sparkles className="w-3.5 h-3.5" />
                Certificate of Achievement & Participation
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                {cert.recipientName}
              </h1>

              <div className="flex flex-wrap items-center gap-4 text-xs text-gray-400 pt-1">
                <span className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-gray-500" />
                  Verified Recipient Email: <strong className="text-white font-mono">{cert.recipientEmail}</strong>
                </span>
                <span className="flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-gray-500" />
                  Issuer: <strong className="text-white">{event.organizationName}</strong>
                </span>
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-gray-500" />
                  Date: <strong className="text-white">{event.eventDate}</strong>
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:items-end gap-2">
              <div className="font-mono text-xs text-gray-400">
                Certificate ID: <strong className="text-[#ff4d64] text-sm">{cert.certificateId}</strong>
              </div>
              <a
                href={cert.pdfUrl}
                download={cert.fileName}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm bg-gradient-to-r from-[#ca0019] to-[#ff2a44] text-white shadow-glow-crimson hover:brightness-110 transition-all cursor-pointer"
              >
                <Download className="w-4 h-4" />
                Download Official PDF
              </a>
            </div>
          </div>

          <div className="absolute right-0 top-0 w-80 h-80 bg-[#ca0019]/10 rounded-full blur-3xl pointer-events-none" />
        </div>

        {/* Certificate Viewer Preview Window */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-gray-400 px-2">
            <span className="font-semibold uppercase tracking-wider flex items-center gap-1.5">
              <Eye className="w-4 h-4 text-[#ca0019]" />
              Official Personalized Certificate Preview
            </span>
            <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Recipient View Recorded
            </span>
          </div>

          <div className="aspect-[842/595] w-full rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl bg-black relative">
            <iframe
              src={cert.pdfUrl}
              className="w-full h-full border-0"
              title="Official Certificate PDF Preview"
            />
          </div>
        </div>

        {/* Cryptographic Authenticity Metadata Box */}
        <div className="p-6 rounded-2xl bg-[#12141c] border border-white/10 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div>
            <span className="text-gray-400 block mb-1">Issuing Event</span>
            <strong className="text-white text-sm">{event.name}</strong>
          </div>
          <div>
            <span className="text-gray-400 block mb-1">Recipient Identity</span>
            <strong className="text-white">{cert.recipientName}</strong>
            <span className="text-gray-500 font-mono block text-[11px]">{cert.recipientEmail}</span>
          </div>
          <div>
            <span className="text-gray-400 block mb-1">Status & Verification</span>
            <span className="text-emerald-400 font-bold block flex items-center gap-1">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Valid & Active
            </span>
            <span className="text-gray-500 text-[11px]">Recorded in PRAMAAN Registry</span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 py-6 text-center text-xs text-gray-500">
        Issued via PRAMAAN (प्रमाण) Automated Certificate Platform &bull; The Uniques Community Ecosystem
      </footer>
    </div>
  );
}
