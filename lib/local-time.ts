export function formatKickoffTime(utcDate: string): string {
  return new Date(utcDate).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatKickoffDate(utcDate: string): string {
  return new Date(utcDate).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export function formatKickoffDateTime(utcDate: string): string {
  return `${formatKickoffDate(utcDate)} · ${formatKickoffTime(utcDate)}`;
}

export function isToday(utcDate: string): boolean {
  const d = new Date(utcDate);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}
