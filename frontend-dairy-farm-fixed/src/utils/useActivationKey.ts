import { useEffect, useRef, useState } from 'react';

/**
 * Returns a key that increments only when `isActive` transitions from
 * false -> true.
 *
 * Why this exists:
 * Preserved/background tabs in this app stay mounted in the DOM but are
 * hidden with Tailwind's `hidden` class (display: none) so their state
 * (filters, scroll position, fetched data) survives switching tabs.
 *
 * Recharts' <ResponsiveContainer> measures its parent element's size on
 * mount using ResizeObserver/getBoundingClientRect. An element with
 * display:none reports 0x0, which produces the
 * "width(0) and height(0) of chart should be greater than 0" warning,
 * and in some browsers the chart never re-measures correctly even after
 * the tab is switched back to display:block.
 *
 * Putting this key on the chart's wrapper element forces React to
 * unmount and re-mount just that subtree at the exact moment the tab
 * becomes visible again, so ResponsiveContainer's first measurement
 * always happens while the element has real, non-zero dimensions.
 *
 * isActive defaults to true so components used outside a
 * show/hide tab (e.g. always-visible views) behave exactly as before.
 */
export function useActivationKey(isActive: boolean = true): number {
  const [key, setKey] = useState(0);
  const wasActiveRef = useRef(isActive);

  useEffect(() => {
    if (isActive && !wasActiveRef.current) {
      setKey((prev) => prev + 1);
    }
    wasActiveRef.current = isActive;
  }, [isActive]);

  return key;
}
