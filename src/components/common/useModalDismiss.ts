import { useEffect, useRef, useCallback } from 'react';

interface UseModalDismissOptions {
  isOpen: boolean;
  onClose?: () => void;
  disableEscape?: boolean;
  disableBackdropClick?: boolean;
  lockScroll?: boolean;
}

/**
 * Universal accessible modal dismiss and scroll-locking hook.
 * - Listens for Escape key to close modal
 * - Prevents background scrolling (body overflow lock) while modal is open
 * - Provides accessible ARIA attributes (role="dialog", aria-modal="true")
 * - Handles backdrop dismiss safely without triggering on inside clicks
 * - Traps Tab inside the dialog, focuses the first control on open, and restores
 *   focus to the trigger on close (roadmap 8.3 keyboard navigation)
 */
export function useModalDismiss({
  isOpen,
  onClose,
  disableEscape = false,
  disableBackdropClick = false,
  lockScroll = true,
}: UseModalDismissOptions) {
  const contentRef = useRef<HTMLDivElement>(null);

  const FOCUSABLE =
    'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

  // 0. Focus management: focus into the dialog, keep Tab inside, restore on close
  useEffect(() => {
    if (!isOpen || typeof document === 'undefined') return;

    const container = contentRef.current;
    const previouslyFocused = document.activeElement as HTMLElement | null;

    const focusFirstControl = () => {
      if (!container) return;
      const items = container.querySelectorAll<HTMLElement>(FOCUSABLE);
      const target = items[0] ?? container;
      target.focus?.();
    };

    const frame = typeof requestAnimationFrame === 'function'
      ? requestAnimationFrame(focusFirstControl)
      : (setTimeout(focusFirstControl, 0) as unknown as number);

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || !container) return;
      const items = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        el => el.offsetParent !== null || el === document.activeElement
      );
      if (items.length === 0) {
        e.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (active && !container.contains(active)) {
        e.preventDefault();
        first.focus();
        return;
      }
      if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      } else if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      }
    };

    window.addEventListener('keydown', handleTab, true);
    return () => {
      if (typeof cancelAnimationFrame === 'function') cancelAnimationFrame(frame);
      else clearTimeout(frame as unknown as ReturnType<typeof setTimeout>);
      window.removeEventListener('keydown', handleTab, true);
      previouslyFocused?.focus?.();
    };
  }, [isOpen]);

  // 1. Escape key handler
  useEffect(() => {
    if (!isOpen || disableEscape || !onClose) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Esc') {
        e.stopPropagation();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [isOpen, disableEscape, onClose]);

  // 2. Body scroll locking
  useEffect(() => {
    if (!isOpen || !lockScroll || typeof document === 'undefined') return;

    const originalOverflow = document.body.style.overflow;
    const originalPaddingRight = document.body.style.paddingRight;

    // Check for scrollbar width to prevent layout shift
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.paddingRight = originalPaddingRight;
    };
  }, [isOpen, lockScroll]);

  // 3. Backdrop click handler
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (disableBackdropClick || !onClose) return;
      // Only close if clicking the backdrop element directly, not children
      if (e.target === e.currentTarget) {
        e.stopPropagation();
        onClose();
      }
    },
    [disableBackdropClick, onClose]
  );

  return {
    contentRef,
    backdropProps: {
      ref: contentRef,
      onClick: handleBackdropClick,
      role: 'dialog' as const,
      'aria-modal': true as const,
    },
  };
}
