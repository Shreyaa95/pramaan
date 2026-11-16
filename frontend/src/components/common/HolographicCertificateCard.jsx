import React, { useRef, useState } from 'react';
import {
  Award,
  Eye,
  Download,
  ShieldCheck,
  Sparkles,
  ExternalLink,
  CheckCircle2
} from 'lucide-react';
import { Badge } from './Badge';
import { Button } from './Button';

export function HolographicCertificateCard({
  certificate,
  onPreview,
  onVerify
}) {
  const cardRef = useRef(null);
  const [rotX, setRotX] = useState(0);
  const [rotY, setRotY] = useState(0);
  const [glarePos, setGlarePos] = useState({ x: 50, y: 50, opacity: 0 });

  const handleMouseMove = (e) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateX = ((y - centerY) / centerY) * -12;
    const rotateY = ((x - centerX) / centerX) * 12;

    setRotX(rotateX);
    setRotY(rotateY);
    setGlarePos({
      x: (x / rect.width) * 100,
      y: (y / rect.height) * 100,
      opacity: 0.35
    });
  };

  const handleMouseLeave = () => {
    setRotX(0);
    setRotY(0);
    setGlarePos(prev => ({ ...prev, opacity: 0 }));
  };

  const isSent = certificate.status === 'sent';

  return (
    <div
      style={{ perspective: '1000px' }}
      className="group relative select-none"
    >
      <div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          transform: `rotateX(${rotX}deg) rotateY(${rotY}deg) translateZ(0)`,
          transition: rotX === 0 ? 'transform 0.5s ease-out' : 'none'
        }}
        className="relative rounded-2xl bg-gradient-to-br from-[#15151a] via-[#121216] to-[#0c0c0e] border border-[#27272a] hover:border-[#ca0019]/60 p-5 shadow-xl transition-colors duration-300 overflow-hidden"
      >
        {/* Holographic dynamic glare overlay */}
        <div
          style={{
            background: `radial-gradient(circle at ${glarePos.x}% ${glarePos.y}%, rgba(202, 0, 25, ${glarePos.opacity}) 0%, rgba(255, 255, 255, ${glarePos.opacity * 0.7}) 25%, transparent 60%)`,
            pointerEvents: 'none'
          }}
          className="absolute inset-0 z-20 mix-blend-color-dodge transition-opacity duration-300"
        />

        {/* Ambient Top Glow Line */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#ca0019] to-transparent opacity-80" />

        {/* Card Header */}
        <div className="flex items-center justify-between mb-3 relative z-10">
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-xs font-bold text-[#ef4444] tracking-wider">
              {certificate.certificateId}
            </span>
          </div>

          <Badge variant={isSent ? 'success' : 'info'} dot size="xs">
            {isSent ? 'Dispatched' : 'Ready'}
          </Badge>
        </div>

        {/* Simulated Certificate Canvas Viewport */}
        <div className="aspect-[842/595] rounded-xl overflow-hidden bg-black/50 border border-white/5 mb-3 flex flex-col items-center justify-center relative group/preview p-3">
          <div className="absolute inset-0 bg-radial from-[#ca0019]/10 via-transparent to-transparent pointer-events-none" />

          {/* Mini Certificate Emulation */}
          <div className="text-center space-y-1 relative z-0">
            <Award className="w-8 h-8 text-[#ca0019] mx-auto filter drop-shadow-[0_0_8px_rgba(202,0,25,0.6)]" />
            <div className="text-[10px] uppercase font-bold tracking-widest text-gray-500 font-display">
              Official Credential
            </div>
            <div className="text-xs font-extrabold text-white max-w-[180px] truncate mx-auto font-display">
              {certificate.recipientName}
            </div>
          </div>

          {/* Hover Overlay with Instant Actions */}
          <div className="absolute inset-0 bg-black/80 backdrop-blur-xs opacity-0 group-hover/preview:opacity-100 transition-opacity flex items-center justify-center gap-2 z-30">
            <Button
              size="xs"
              variant="primary"
              onClick={() => onPreview(certificate.pdfUrl)}
              icon={Eye}
            >
              Preview
            </Button>
            <Button
              size="xs"
              variant="secondary"
              onClick={() => window.open(certificate.pdfUrl, '_blank')}
              icon={Download}
            >
              PDF
            </Button>
          </div>
        </div>

        {/* Recipient Metadata */}
        <div className="relative z-10 space-y-1">
          <h3 className="text-sm font-extrabold text-white truncate font-display group-hover:text-[#ef4444] transition-colors">
            {certificate.recipientName}
          </h3>
          <p className="text-xs text-gray-400 font-mono truncate">
            {certificate.recipientEmail}
          </p>
        </div>

        {/* Footer & Direct Verification Link */}
        <div className="pt-3 mt-3 border-t border-white/5 flex items-center justify-between text-[11px] relative z-10">
          <span className="text-gray-500 font-mono">
            {new Date(certificate.createdAt || Date.now()).toLocaleDateString()}
          </span>

          <a
            href={`/view-certificate/${certificate.certificateId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-gray-400 hover:text-[#ef4444] font-semibold transition-colors"
          >
            <span>Public Verify</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
}
