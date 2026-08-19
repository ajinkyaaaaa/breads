import { useState } from 'react';
import { login } from '../lib/auth';
import { Icon } from './Icon';
import MoltenMetal from './MoltenMetal';
import aarhatLogo from '../assets/aarhat-logo.png';

interface LoginScreenProps {
  onSuccess: () => void;
}

export function LoginScreen({ onSuccess }: LoginScreenProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim() || !password) return;
    setSubmitting(true);
    setError(null);
    try {
      await login(username.trim(), password);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-ink px-4 font-sans text-wheat">
      <div className="absolute inset-0">
        <MoltenMetal
          color1="#C1502E"
          color2="#E8A33D"
          color3="#D9CFB8"
          speed={0.35}
          scale={4}
          detail={3}
          glow={1.6}
          coreSize={0.1}
          swirl={1}
          fold={-0.2}
          blackPoint={0.05}
          brightness={1.1}
          colorMode="ember"
          grain
          grainIntensity={0.05}
          mouseInteraction
          mouseStrength={0.3}
          opacity={0.85}
        />
      </div>
      <form onSubmit={handleSubmit} className="relative z-10 flex w-full max-w-sm flex-col items-center gap-7 px-2">
        <div className="flex flex-col items-center gap-2 text-center" style={{ filter: 'drop-shadow(0 2px 10px rgba(0,0,0,0.6))' }}>
          <img src={aarhatLogo} alt="Aarhat" className="h-12 w-auto" />
          <div>
            <div className="flex items-center justify-center gap-1.5 font-display text-xl font-bold uppercase tracking-tight text-wheat">
              M <span className="text-amber">//</span>{' '}
              <span className="bg-gradient-to-r from-[#FF9933] via-white to-[#138808] bg-clip-text text-transparent">India</span>
            </div>
            <div className="mt-0.5 text-[11px] uppercase tracking-[0.15em] text-dim">Sign in to continue</div>
          </div>
        </div>

        <div className="flex w-full flex-col gap-3">
          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-wheat/80" htmlFor="username">
              Username
            </label>
            <input
              id="username"
              type="text"
              autoFocus
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-sm border border-wheat/20 bg-ink/60 px-3 py-2 text-[13px] text-wheat shadow-lg outline-none backdrop-blur-md transition-colors duration-150 focus:border-amber"
            />
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-wheat/80" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-sm border border-wheat/20 bg-ink/60 px-3 py-2 text-[13px] text-wheat shadow-lg outline-none backdrop-blur-md transition-colors duration-150 focus:border-amber"
            />
          </div>
        </div>

        {error && (
          <div className="-mt-2 flex w-full items-center gap-1.5 rounded-sm bg-rust px-2.5 py-2 text-[11px] font-medium text-wheat shadow-lg">
            <Icon name="warning" size={13} />
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting || !username.trim() || !password}
          className="-mt-2 flex w-full items-center justify-center gap-1.5 rounded-sm bg-amber py-2 text-[12px] font-semibold uppercase tracking-wide text-ink shadow-lg transition-colors duration-150 hover:bg-amber/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? 'Signing in…' : 'Sign In'}
        </button>
      </form>
    </div>
  );
}
