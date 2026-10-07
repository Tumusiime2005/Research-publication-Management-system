import React, { useState } from 'react';
import { authService } from '../../services/auth';
import { X, Lock, Mail, Building, User, KeyRound, AlertCircle, CheckCircle2 } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'register' | 'bootstrap';
  onSuccess: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'login',
  onSuccess,
}) => {
  const [mode, setMode] = useState<'login' | 'register' | 'bootstrap'>(initialMode);

  // Common fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Register / Bootstrap fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [institution, setInstitution] = useState('');
  const [department, setDepartment] = useState('');
  const [bootstrapToken, setBootstrapToken] = useState('BH-BOOTSTRAP-SECURE-KEY-2026');

  // Status
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
        if (!firstName.trim() || !lastName.trim() || !institution.trim()) {
          setError('Please provide all required profile fields.');
          setLoading(false);
          return;
        }
        if (password.length < 8) {
          setError('Password must be at least 8 characters in length.');
          setLoading(false);
          return;
        }
        const res = authService.registerResearcher({
          firstName,
          lastName,
          email,
          password,
          institution,
          department: department || undefined,
        });
        if (!res.success) {
          setError(res.error || 'Registration failed');
          setLoading(false);
          return;
        }
      } else if (mode === 'bootstrap') {
        if (!firstName.trim() || !lastName.trim() || !institution.trim() || !bootstrapToken.trim()) {
          setError('All administrator profile and authorization token fields are required.');
          setLoading(false);
          return;
        }
        const res = authService.bootstrapAdmin({
          firstName,
          lastName,
          email,
          password,
          institution,
          bootstrapToken,
        });
        if (!res.success) {
          setError(res.error || 'Administrator initialization failed');
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in">
      <div className="relative w-full max-w-md bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div>
            <h3 className="text-base font-bold text-[#1E1B4B]">
              {mode === 'login' && 'Sign In to BRAIN HUB'}
              {mode === 'register' && 'Researcher Registration'}
              {mode === 'bootstrap' && 'Initialize Editorial Administrator'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {mode === 'login' && 'Access research drafts, submissions, or review queues'}
              {mode === 'register' && 'Submit and manage peer-reviewed academic papers'}
              {mode === 'bootstrap' && 'Protected environment setup for first administrator'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-2.5 text-xs text-rose-700">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
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
              Academic Email Address *
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="researcher@university.edu"
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
                Minimum 8 characters. Passwords are securely hashed with BCrypt.
              </p>
            )}
          </div>

          {mode !== 'login' && (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Primary Institution / University *
                </label>
                <div className="relative">
                  <Building className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    value={institution}
                    onChange={(e) => setInstitution(e.target.value)}
                    placeholder="e.g. Oxford University / MIT"
                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-[#6D28D9] focus:border-[#6D28D9]"
                  />
                </div>
              </div>

              {mode === 'register' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Department / Laboratory (Optional)
                  </label>
                  <input
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="e.g. Department of Computer Science"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-[#6D28D9] focus:border-[#6D28D9]"
                  />
                </div>
              )}
            </>
          )}

          {mode === 'bootstrap' && (
            <div className="p-3 bg-purple-50/70 border border-purple-200/80 rounded-lg space-y-2">
              <label className="block text-xs font-bold text-[#6D28D9]">
                Bootstrap Secret Key (from Environment) *
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-[#6D28D9] absolute left-3 top-2.5" />
                <input
                  type="text"
                  required
                  value={bootstrapToken}
                  onChange={(e) => setBootstrapToken(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs font-mono border border-purple-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-[#6D28D9]"
                />
              </div>
              <p className="text-[11px] text-slate-600">
                Matches <code className="font-mono text-[#6D28D9]">ADMIN_BOOTSTRAP_TOKEN</code> in your backend .env file.
              </p>
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 text-xs font-bold text-white bg-[#6D28D9] hover:bg-[#5B21B6] rounded-md transition-all shadow-sm disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                'Processing...'
              ) : mode === 'login' ? (
                'Sign In to Account'
              ) : mode === 'register' ? (
                'Create Researcher Account'
              ) : (
                'Bootstrap Administrator'
              )}
            </button>
          </div>

          {/* Toggle modes */}
          <div className="pt-2 border-t border-slate-100 flex flex-col gap-2 text-center text-xs text-slate-500">
            {mode === 'login' ? (
              <>
                <p>
                  Don't have an account yet?{' '}
                  <button
                    type="button"
                    onClick={() => { setMode('register'); setError(null); }}
                    className="font-semibold text-[#6D28D9] hover:underline cursor-pointer"
                  >
                    Register as Researcher
                  </button>
                </p>
                <p>
                  Setting up system admin?{' '}
                  <button
                    type="button"
                    onClick={() => { setMode('bootstrap'); setError(null); }}
                    className="font-semibold text-slate-700 hover:underline cursor-pointer"
                  >
                    Bootstrap Admin
                  </button>
                </p>
              </>
            ) : (
              <p>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => { setMode('login'); setError(null); }}
                  className="font-semibold text-[#6D28D9] hover:underline cursor-pointer"
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
