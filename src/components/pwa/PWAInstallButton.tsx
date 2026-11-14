import React, { useState } from 'react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { Download, Smartphone, X } from 'lucide-react';

interface PWAInstallButtonProps {
  label?: string;
  variant?: 'light' | 'dark';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  label = 'Install App',
  variant = 'light',
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  const buttonClasses =
    variant === 'dark'
      ? 'inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#6D28D9] hover:bg-[#5B21B6] border border-purple-500/60 rounded-md transition-all cursor-pointer whitespace-nowrap'
      : 'inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#6D28D9] bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-md transition-all cursor-pointer whitespace-nowrap';

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        className={buttonClasses}
        title={`Install ${label} on your device`}
      >
        <Download className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">{label}</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className={buttonClasses}
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{label}</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 text-left">
            <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-2xl border border-slate-200">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-[#1E1B4B]">Save Web App to Device</h3>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed space-y-1.5">
                <span className="block">1. Tap the <strong>Share</strong> icon in your Safari toolbar.</span>
                <span className="block">2. Scroll down and tap <strong>Add to Home Screen</strong>.</span>
                <span className="block">3. Tap <strong>Add</strong> to save and launch directly as an app.</span>
              </p>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-4 w-full rounded-lg bg-[#6D28D9] py-2 text-xs font-bold text-white hover:bg-[#5B21B6] cursor-pointer"
              >
                Got It
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
