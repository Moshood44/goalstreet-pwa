import React, { useState } from 'react';
import { TactileButton } from './TactileButton';

interface RecoveryCodeModalProps {
  code: string;
  onDismiss: () => void;
}

export const RecoveryCodeModal: React.FC<RecoveryCodeModalProps> = ({ code, onDismiss }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-sm bg-surface-container-lowest rounded-3xl p-6 shadow-2xl flex flex-col items-center text-center gap-4">
        <div className="w-14 h-14 rounded-full bg-secondary-container/20 text-secondary text-2xl flex items-center justify-center">
          🔑
        </div>

        <div>
          <h2 className="font-headline-lg text-xl text-on-surface font-bold tracking-tight">
            Save Your Recovery Code
          </h2>
          <p className="font-body-sm text-xs text-on-surface-variant mt-1">
            This code is shown only once. If you forget your 6-digit PIN, this is the only way to recover your account and Caps balance.
          </p>
        </div>

        {/* Code Box */}
        <div className="w-full bg-surface-container-high border-2 border-dashed border-outline-variant rounded-2xl p-4 flex items-center justify-between">
          <span className="font-label-ticker text-lg text-primary font-bold tracking-widest">
            {code}
          </span>
          <button
            onClick={handleCopy}
            type="button"
            className="p-2 rounded-xl bg-surface-container-lowest text-primary hover:bg-surface-container transition-colors shadow-sm"
          >
            <span className="material-symbols-outlined text-[20px]">
              {copied ? 'check' : 'content_copy'}
            </span>
          </button>
        </div>

        {copied && (
          <span className="text-[11px] text-tertiary-container font-semibold">
            ✓ Copied to clipboard!
          </span>
        )}

        <TactileButton fullWidth size="lg" variant="primary" onClick={onDismiss}>
          I've Saved It Safely
        </TactileButton>
      </div>
    </div>
  );
};
