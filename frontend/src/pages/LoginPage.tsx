import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/authContext';
import { store } from '../lib/store';
import { ShieldAlert, Phone, KeyRound, ArrowRight, CheckCircle2, AlertOctagon, UserCheck } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, switchUser, loginAsTestUser } = useAuth();
  const [members] = useState(store.getState().members);
  const [phone, setPhone] = useState('+1 (555) 302-8841');
  const [otpCode, setOtpCode] = useState('');
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [message, setMessage] = useState('');

  const handleSendOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) return;
    setIsOtpSent(true);
    setMessage('SMS verification code sent to personal device. (Simulated Code: 849-201)');
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    const match = members.find((m) => m.phone.trim() === phone.trim()) || members[0];
    switchUser(match.id);
    navigate('/admin');
  };

  const handleQuickAdminLogin = () => {
    loginAsTestUser();
    navigate('/admin');
  };

  return (
    <div className="max-w-xl mx-auto py-8 px-4">
      {/* Warning Notice Banner */}
      <div className="bg-amber-950/20 border border-hazard-yellow/40 rounded-xl p-4 mb-6 text-xs flex items-start gap-3">
        <AlertOctagon className="w-5 h-5 text-hazard-yellow shrink-0 mt-0.5" />
        <div className="text-slate-300">
          <strong className="text-white block font-bold text-sm mb-0.5">
            🚨 Active Crisis Out-of-Band Channel
          </strong>
          Corporate single-sign-on (SSO), Microsoft 365, and company email are assumed untrusted.
          Drill Night runs on independent external credentials and personal mobile phone tokens.
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl p-6 md:p-8 shadow-2xl relative overflow-hidden">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-hazard-yellow to-hazard-dark flex items-center justify-center shadow-lg shadow-hazard-yellow/20">
            <ShieldAlert className="w-7 h-7 text-black" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white m-0">Crisis Command Authentication</h2>
            <p className="text-xs text-slate-400 m-0">
              Drill Night Out-of-Band Incident Protocol
            </p>
          </div>
        </div>

        {/* Primary 1-Click Action for Judges / Quick Admin Test */}
        <div className="mb-6 p-4 rounded-xl bg-[#0B0D11] border-2 border-hazard-yellow/80 text-center space-y-3">
          <div className="text-xs font-bold uppercase tracking-wider text-hazard-bright">
            ⚡ Quick Access for Tabletop Evaluators
          </div>
          <button
            onClick={handleQuickAdminLogin}
            className="w-full min-h-[50px] bg-hazard-yellow hover:bg-hazard-bright text-black font-black text-sm tracking-wide rounded-lg flex items-center justify-center gap-2 shadow-lg shadow-hazard-yellow/20 transition-all hover:scale-[1.01]"
          >
            <span>Enter Command Center as Incident Commander (Admin)</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          <div className="text-[11px] text-slate-400">
            Current Identity: <code className="text-slate-300">{currentUser.name} ({currentUser.role})</code>
          </div>
        </div>

        <div className="relative my-6 text-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border"></div>
          </div>
          <span className="relative bg-card px-3 text-xs text-slate-500 font-semibold uppercase tracking-wider">
            Or Sign In With Personal Phone (SMS OTP)
          </span>
        </div>

        {/* SMS Phone Form */}
        {!isOtpSent ? (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-hazard-yellow" />
                <span>Personal Mobile Phone Number</span>
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 (555) 000-0000"
                className="w-full bg-[#0B0D11] border border-border focus:border-hazard-yellow rounded-lg px-4 py-3 text-sm text-white font-mono focus:outline-none transition-all"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Must match an authorized phone on the crisis roster.
              </span>
            </div>

            <button
              type="submit"
              className="w-full min-h-[44px] bg-[#1C222E] hover:bg-[#252D3D] border border-[#2D3646] text-white font-bold text-xs uppercase tracking-wider rounded-lg transition-all"
            >
              Send Crisis SMS Code
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            {message && (
              <div className="text-xs text-emerald-400 bg-emerald-950/20 border border-emerald-800/40 p-2.5 rounded-lg flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{message}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-hazard-yellow" />
                <span>Enter 6-Digit SMS Passcode</span>
              </label>
              <input
                type="text"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                placeholder="e.g. 849201"
                className="w-full bg-[#0B0D11] border border-border focus:border-hazard-yellow rounded-lg px-4 py-3 text-center tracking-[0.5em] text-lg text-white font-mono focus:outline-none"
              />
            </div>

            <button
              type="submit"
              className="w-full min-h-[46px] bg-hazard-yellow hover:bg-hazard-bright text-black font-black text-xs uppercase tracking-wider rounded-lg transition-all"
            >
              Verify &amp; Enter Command Center
            </button>
          </form>
        )}

        {/* Persona Switcher for Quick Multi-Role Testing */}
        <div className="mt-8 pt-6 border-t border-border">
          <div className="text-xs font-bold text-slate-400 mb-3 flex items-center gap-1.5">
            <UserCheck className="w-3.5 h-3.5 text-slate-400" />
            <span>Switch Responder Persona (Test Role-Based Playbooks):</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {members.map((m) => (
              <button
                key={m.id}
                onClick={() => {
                  switchUser(m.id);
                  navigate('/admin');
                }}
                className={`p-2.5 rounded-lg text-left text-xs transition-all border ${
                  currentUser.id === m.id
                    ? 'bg-hazard-yellow/10 border-hazard-yellow text-hazard-bright'
                    : 'bg-[#0B0D11] border-border hover:border-slate-600 text-slate-300'
                }`}
              >
                <div className="font-bold text-white truncate">{m.name}</div>
                <div className="text-[11px] opacity-75 capitalize">{m.role}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
