import { useEffect, useRef } from 'react';
import { notification } from 'antd';

/**
 * Displays a bottom-right floating error toast whenever `error` is set.
 * Auto-dismisses after `duration` seconds (default 5).
 * When `error` becomes null again (e.g. after a successful retry), closes
 * any still-open notification for this key immediately.
 *
 * @param {string|null} error   - The error string from Redux state (or local state)
 * @param {string}      title   - Short title for the notification (e.g. "Failed to load users")
 * @param {number}      [duration=5] - Seconds before auto-dismiss (0 = never)
 */
export function useErrorToast(error, title, duration = 5) {
  // Each hook instance gets a unique key so multiple pages can coexist
  const keyRef = useRef(`err-toast-${Math.random().toString(36).slice(2)}`);

  useEffect(() => {
    const key = keyRef.current;

    if (error) {
      notification.error({
        key,
        message: title,
        description: error,
        placement: 'bottomRight',
        duration,
        style: {
          borderRadius: 12,
          boxShadow: '0 8px 32px rgba(239,68,68,0.18)',
        },
      });
    } else {
      // Error cleared (server back, retry succeeded) — dismiss immediately
      notification.destroy(key);
    }

    return () => {
      notification.destroy(key);
    };
  }, [error]); // eslint-disable-line react-hooks/exhaustive-deps
}
