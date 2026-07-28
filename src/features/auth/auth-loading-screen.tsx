import { BrandMark } from '../../components/brand/brand-mark';
import { MaterialIcon } from '../../components/icons/material-icon';

export function AuthLoadingScreen() {
  return (
    <main className="auth-loading-page" aria-live="polite">
      <section className="auth-loading-card glass-panel specular-panel">
        <BrandMark />
        <MaterialIcon className="spin" name="progress_activity" />
        <p>Verifying your secure session…</p>
      </section>
    </main>
  );
}
