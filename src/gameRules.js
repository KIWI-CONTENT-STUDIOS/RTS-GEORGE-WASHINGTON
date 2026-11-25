export function mergeRosters(target, source) {
  for (const [type, count] of Object.entries(source)) {
    target[type] = (target[type] || 0) + count;
  }
  return target;
}

export function subtractRoster(target, source) {
  for (const [type, count] of Object.entries(source)) {
    target[type] = Math.max(0, (target[type] || 0) - count);
  }
  return target;
}

export function applyCasualties(roster, fraction) {
  const survivors = {};
  for (const [type, count] of Object.entries(roster)) {
    survivors[type] = Math.max(0, Math.floor(count * fraction));
  }
  return survivors;
}

export function rosterCount(roster) {
  return Object.values(roster).reduce((sum, count) => sum + count, 0);
}
