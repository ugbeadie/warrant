export const timeAgo = (date: string) => {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);

  const dayIntervals: [number, string][] = [
    [31536000, "year"],
    [2592000, "month"],
    [86400, "day"],
  ];

  for (const [secs, label] of dayIntervals) {
    const count = Math.floor(seconds / secs);
    if (count >= 1) return `${count} ${label}${count > 1 ? "s" : ""} ago`;
  }

  const subDayIntervals: [number, string][] = [
    [3600, "hour"],
    [60, "minute"],
  ];

  for (const [secs, label] of subDayIntervals) {
    const count = Math.floor(seconds / secs);
    if (count >= 1) return `about ${count} ${label}${count > 1 ? "s" : ""} ago`;
  }

  return "just now";
};
