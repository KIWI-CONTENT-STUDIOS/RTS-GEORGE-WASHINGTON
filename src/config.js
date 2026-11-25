export const FACTIONS = Object.freeze({ AMERICAN: 'American', BRITISH: 'British' });

// Unit definitions are data only in Phase 1; recruitment/combat arrive in later phases.
export const UNIT_TYPES = Object.freeze({
  INFANTRY: 'Continental Infantry',
  RIFLEMEN: 'Riflemen',
  MILITIA: 'Militia',
  ARTILLERY: 'Artillery',
  CAVALRY: 'Cavalry',
});

export const UNIT_STATS = Object.freeze({
  [UNIT_TYPES.INFANTRY]: { cost: 35, health: 100, damage: 12, speed: 65, range: 22 },
  [UNIT_TYPES.RIFLEMEN]: { cost: 45, health: 80, damage: 18, speed: 58, range: 35 },
  [UNIT_TYPES.MILITIA]: { cost: 20, health: 70, damage: 8, speed: 55, range: 20 },
  [UNIT_TYPES.ARTILLERY]: { cost: 90, health: 140, damage: 28, speed: 35, range: 55 },
  [UNIT_TYPES.CAVALRY]: { cost: 70, health: 120, damage: 16, speed: 95, range: 14 },
});
