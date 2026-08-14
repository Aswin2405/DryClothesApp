// Pushes an alert time forward past the user's quiet-hours window, if it falls inside it.
// Handles the midnight-wraparound case (e.g. 22:00 -> 07:00).
export function applyQuietHours(alertTime, settings) {
  if (!settings?.quietHoursEnabled || !(alertTime instanceof Date)) return alertTime;

  const [startH, startM] = settings.quietHoursStart.split(":").map(Number);
  const [endH, endM]     = settings.quietHoursEnd.split(":").map(Number);

  const dayStart = new Date(alertTime); dayStart.setHours(startH, startM, 0, 0);
  const dayEnd   = new Date(alertTime); dayEnd.setHours(endH, endM, 0, 0);

  const wraps = dayStart.getTime() > dayEnd.getTime();
  const inQuietHours = wraps
    ? (alertTime >= dayStart || alertTime < dayEnd)
    : (alertTime >= dayStart && alertTime < dayEnd);

  if (!inQuietHours) return alertTime;

  const nudged = new Date(dayEnd);
  if (nudged <= alertTime) nudged.setDate(nudged.getDate() + 1);
  return nudged;
}

// Steps an "HH:mm" string by deltaMinutes, wrapping around a 24h clock.
export function stepTime(hhmm, deltaMinutes) {
  const [h, m] = hhmm.split(":").map(Number);
  const total  = (((h * 60 + m + deltaMinutes) % 1440) + 1440) % 1440;
  const nh     = Math.floor(total / 60);
  const nm     = total % 60;
  return `${String(nh).padStart(2, "0")}:${String(nm).padStart(2, "0")}`;
}
