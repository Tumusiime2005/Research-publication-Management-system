import React, { useState, useEffect } from 'react';
import { authService } from '../../services/auth';
import { X, Lock, Mail, Building, User, AlertCircle, ShieldCheck } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'register';
  onSuccess: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'login',
  onSuccess,
}) => {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);

  // Common fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Register fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [institution, setInstitution] = useState('');
  const [department, setDepartment] = useState('');

  // Status
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setError(null);
    }
  }, [isOpen, initialMode]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === 'login') {
        const res = authService.login(email, password);
        if (!res.success) {
          setError(res.error || 'Authentication failed');
          setLoading(false);
          return;
        }
      } else if (mode === 'register') {
        if (!firstName.trim() || !lastName.trim()) {
          setError('First name and last name are required.');
          setLoading(false);
          return;
        }
        if (password.length < 6) {
          setError('Password must be at least 6 characters in length.');
          setLoading(false);
          return;
        }
        const res = authService.registerResearcher({
          firstName,
          lastName,
          email,
          password,
          institution: institution.trim() || 'Independent Scholar / Researcher',
          department: department || undefined,
        });
        if (!res.success) {
          setError(res.error || 'Registration failed');
          setLoading(false);
          return;
        }
      }

      setLoading(false);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'An unexpected error occurred');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
      <div className="relative w-full max-w-md bg-white rounded-t-3xl sm:rounded-xl shadow-2xl border border-slate-200 overflow-hidden max-h-[94vh] flex flex-col">
        {/* Mobile grab handle */}
        <div className="w-10 h-1.5 bg-slate-200 rounded-full mx-auto mt-3 mb-1 sm:hidden shrink-0" />

        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-100 bg-slate-50/70 shrink-0">
          <div className="flex items-center gap-3">
            <img
              src="/assets/aistudio/image_c3fb1387_fb406a7b.jpg"
              alt="BRAIN HUB"
              className="h-8 w-auto object-contain rounded"
            />
            <div>
              <h3 className="text-base font-bold text-[#1E1B4B]">
                BRAIN HUB Researcher Portal
              </h3>
              <p className="text-xs text-slate-500">
                Open Access Academic Publication System
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switchers: Sign In vs Create Account */}
        <div className="grid grid-cols-2 border-b border-slate-200 bg-slate-50/50 text-xs font-bold">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError(null);
            }}
            className={`py-3 text-center border-b-2 transition-all cursor-pointer ${
              mode === 'login'
                ? 'border-[#6D28D9] text-[#6D28D9] bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setError(null);
            }}
            className={`py-3 text-center border-b-2 transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              mode === 'register'
                ? 'border-[#6D28D9] text-[#6D28D9] bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <span>Create Account</span>
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 pb-safe space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span className="font-medium leading-relaxed">{error}</span>
            </div>
          )}

          {mode === 'register' && (
            <div className="p-3 bg-purple-50/70 border border-purple-200/80 rounded-lg flex items-start gap-2 text-[11px] text-[#1E1B4B]">
              <ShieldCheck className="w-4 h-4 text-[#6D28D9] shrink-0 mt-0.5" />
              <span className="leading-relaxed">
                Register with any valid email address to immediately upload and publish research papers to the public repository.
              </span>
            </div>
          )}

          {mode !== 'login' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  First Name *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Ada"
                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-[#6D28D9] focus:border-[#6D28D9]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Last Name *
                </label>
                <input
                  type="text"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Lovelace"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-[#6D28D9] focus:border-[#6D28D9]"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Email Address *
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="yourname@gmail.com, university.edu, etc."
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-[#6D28D9] focus:border-[#6D28D9]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Password *
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-[#6D28D9] focus:border-[#6D28D9]"
              />
            </div>
            {mode === 'register' && (
              <p className="text-[11px] text-slate-500 mt-1">
                Minimum 6 characters required.
              </p>
            )}
          </div>

          {mode !== 'login' && (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Affiliation or Institution (Optional)
                </label>
                <div className="relative">
                  <Building className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={institution}
                    onChange={(e) => setInstitution(e.target.value)}
                    placeholder="e.g. University, Research Lab, or Independent"
                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-[#6D28D9] focus:border-[#6D28D9]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Department / Research Focus (Optional)
                </label>
                <input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="e.g. Distributional Systems, Neuroscience"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-[#6D28D9] focus:border-[#6D28D9]"
                />
              </div>
            </>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full min-h-[44px] py-2.5 px-4 text-xs font-bold text-white bg-[#6D28D9] hover:bg-[#5B21B6] rounded-xl sm:rounded-md transition-all shadow-sm disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                'Processing...'
              ) : mode === 'login' ? (
                'Sign In to Account'
              ) : (
                'Create Researcher Account'
              )}
            </button>
          </div>

          <div className="pt-3 border-t border-slate-100 text-center text-xs text-slate-500">
            {mode === 'login' ? (
              <p>
                Don't have an account yet?{' '}
                <button
                  type="button"
                  onClick={() => { setMode('register'); setError(null); }}
                  className="font-bold text-[#6D28D9] hover:underline cursor-pointer"
                >
                  Create Researcher Account
                </button>
              </p>
            ) : (
              <p>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => { setMode('login'); setError(null); }}
                  className="font-bold text-[#6D28D9] hover:underline cursor-pointer"
                >
                  Sign In
                </button>
              </p>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
