'use client';

import { useEffect, useState } from 'react';

type Props = {
  iso?: string | Date | null;
  className?: string;
};

export default function LocalDate({ iso, className }: Props) {
  const [label, setLabel] = useState<string | null>(null);

  // Normalize to an ISO string for attributes and fallback rendering
  const isoString: string | undefined = iso
    ? typeof iso === 'string'
      ? iso
      : iso instanceof Date
        ? iso.toISOString()
        : String(iso)
    : undefined;

  useEffect(() => {
    if (!iso) return;
    try {
      const d = typeof iso === 'string' ? new Date(iso) : new Date(iso as any);
      // Use the browser locale and timezone and show date + hour:minute (no seconds)
      // Format date and time separately and join with a non-breaking space so they stay on one line
      const dateOpts: Intl.DateTimeFormatOptions = {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      };
      const timeOpts: Intl.DateTimeFormatOptions = {
        hour: 'numeric',
        minute: '2-digit',
      };
      const datePart = d.toLocaleDateString(undefined, dateOpts);
      const timePart = d.toLocaleTimeString(undefined, timeOpts);
      setLabel(`${datePart}\u00A0${timePart}`);
    } catch (e) {
      setLabel(typeof iso === 'string' ? iso : String(iso));
    }
  }, [iso]);

  if (!isoString) return null;

  // Render the ISO string fallback if label isn't ready; ensures we never render a Date object as a child
  const finalClass = [className, 'whitespace-nowrap'].filter(Boolean).join(' ');
  return (
    <time dateTime={isoString} className={finalClass}>
      {label ?? isoString}
    </time>
  );
}
