import React, { useState, useEffect } from 'react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { Download, Smartphone, X } from 'lucide-react';

interface PWAInstallButtonProps {
  label?: string;
  mobileLabel?: string;
  variant?: 'light' | 'dark';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  label = 'Install App',
  mobileLabel = 'Get App',
  variant = 'light',
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobileViewport(window.innerWidth < 768 || /android|mobile/i.test(navigator.userAgent));
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  if (isInstalled) {
    return null;
  }

  const buttonClasses =
    variant === 'dark'
      ? 'inline-flex items-center justify-center gap-1.5 min-h-[38px] px-3 py-1.5 text-xs font-semibold text-white bg-[#6D28D9] hover:bg-[#5B21B6] border border-purple-500/60 rounded-lg transition-all cursor-pointer whitespace-nowrap shrink-0'
      : 'inline-flex items-center justify-center gap-1.5 min-h-[38px] px-3 py-1.5 text-xs font-semibold text-[#6D28D9] bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg transition-all cursor-pointer whitespace-nowrap shrink-0';

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        className={buttonClasses}
        title={`Install ${label} on your device`}
      >
        <Download className="w-3.5 h-3.5 shrink-0" />
        <span className="sm:hidden">{mobileLabel}</span>
        <span className="hidden sm:inline">{label}</span>
      </button>
    );
  }

  if (isIOS || isMobileViewport) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowGuideModal(true)}
          className={buttonClasses}
          title="Install Web App on your phone"
        >
          <Smartphone className="w-3.5 h-3.5 shrink-0" />
          <span className="sm:hidden">{mobileLabel}</span>
          <span className="hidden sm:inline">{label}</span>
        </button>

        {showGuideModal && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/50 backdrop-blur-xs p-0 sm:p-4 text-left">
            <div className="w-full sm:max-w-sm rounded-t-3xl sm:rounded-xl bg-white p-6 pb-safe shadow-2xl border border-slate-200">
              <div className="w-10 h-1.5 bg-slate-200 rounded-full mx-auto mb-4 sm:hidden" />
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-[#1E1B4B]">Install as Mobile App</h3>
                <button
                  onClick={() => setShowGuideModal(false)}
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              {isIOS ? (
                <div className="text-xs text-slate-600 leading-relaxed space-y-2">
                  <p>1. Tap the <strong>Share</strong> icon in Safari at the bottom of your screen.</p>
                  <p>2. Scroll down and tap <strong>Add to Home Screen</strong>.</p>
                  <p>3. Tap <strong>Add</strong> to launch directly as a standalone mobile app.</p>
                </div>
              ) : (
                <div className="text-xs text-slate-600 leading-relaxed space-y-2">
                  <p>1. Tap your browser menu (<strong>⋮</strong> at the top-right corner).</p>
                  <p>2. Select <strong>Install app</strong> or <strong>Add to Home screen</strong>.</p>
                  <p>3. Confirm <strong>Install</strong> to add the app icon to your phone.</p>
                </div>
              )}
              <button
                onClick={() => setShowGuideModal(false)}
                className="mt-5 w-full min-h-[44px] rounded-xl bg-[#6D28D9] py-2.5 text-xs font-bold text-white hover:bg-[#5B21B6] cursor-pointer"
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
