/**
 * ServiceUnavailableBanner
 *
 * Shown when the FastAPI backend is unreachable.
 * Does NOT generate fake AI answers.
 * Directs citizens to the PACS clerk.
 */

import type { KioskStrings } from '../../i18n';

interface Props {
  strings: KioskStrings;
}

export function ServiceUnavailableBanner({ strings }: Props) {
  return (
    <div
      role="alert"
      aria-live="polite"
      style={{
        backgroundColor: '#fef9c3',
        border: '2px solid #fde047',
        borderRadius: '12px',
        padding: '16px 24px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        fontSize: '16px',
        color: '#713f12',
        fontWeight: 500,
      }}
    >
      <span style={{ fontSize: '24px' }} aria-hidden="true">⚠️</span>
      <span>{strings.serviceUnavailable}</span>
    </div>
  );
}
