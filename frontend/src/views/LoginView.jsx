import React, { useState } from 'react';
import { Lock, Mail, ArrowRight, Sparkles, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { Button } from '../components/common/Button';
import { BrandLogo } from '../components/common/BrandLogo';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export function LoginView() {
  const { login } = useAuth();
  const { showToast } = useToast();

  const [email, setEmail] = useState('admin@smartcert.io');
  const [password, setPassword] = useState('admin123');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      showToast('Please enter both email and password.', 'error');
      return;
    }

    try {
      setLoading(true);
      await login(email, password);
      showToast('Welcome back, Administrator!', 'success');
    } catch (err) {
      showToast(err.message || 'Invalid email or password.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-[#ca0019]/12 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-red-600/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Header Logo */}
        <div className="flex flex-col items-center mb-8 space-y-3 text-center">
          <BrandLogo size="lg" showTagline={true} />

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#ca0019]/15 border border-[#ca0019]/35 text-[10px] uppercase font-extrabold tracking-wider text-[#ef4444] mt-2">
            <Sparkles className="w-3 h-3" />
            The Uniques Ecosystem &bull; Enterprise Console
          </div>
        </div>

        {/* Login Box */}
        <div className="p-8 rounded-3xl bg-[#121215]/95 backdrop-blur-2xl border border-[#27272a] shadow-2xl space-y-6 animate-scaleIn glowing-border">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-gray-300 block mb-1.5">
                Administrator Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder="admin@smartcert.io"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#18181b] border border-[#27272a] text-white placeholder-gray-500 text-xs focus:outline-none focus:border-[#ca0019]"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-300 block mb-1.5">
                Master Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-[#18181b] border border-[#27272a] text-white placeholder-gray-500 text-xs focus:outline-none focus:border-[#ca0019]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              variant="accent"
              size="lg"
              className="w-full mt-2"
              loading={loading}
              icon={ArrowRight}
            >
              Sign In to PRAMAAN Console
            </Button>
          </form>

          {/* Seed demo credentials helper */}
          <div className="p-4 rounded-xl bg-[#18181b] border border-[#27272a] text-[11px] text-gray-400 space-y-1.5">
            <div className="font-bold text-gray-200 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Default Administrator Credentials:
            </div>
            <div className="flex justify-between font-mono text-[10px]">
              <span>User: <strong className="text-white">admin@smartcert.io</strong></span>
              <span>Pass: <strong className="text-white">admin123</strong></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
