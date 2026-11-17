import React from 'react';

interface LiveAnnouncerProps {
  /** Text announced to assistive tech; null clears the region. */
  message: string | null;
}

/**
 * Screen-reader live region (roadmap 8.3). Visually hidden; announces turn changes,
 * eliminations and other important transitions without stealing focus.
 */
export const LiveAnnouncer: React.FC<LiveAnnouncerProps> = ({ message }) => (
  <div
    role="status"
    aria-live="polite"
    aria-atomic="true"
    data-testid="live-announcer"
    className="sr-only"
  >
    {message ?? ''}
  </div>
);
