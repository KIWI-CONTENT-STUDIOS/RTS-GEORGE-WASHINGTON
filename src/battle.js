import { FACTIONS } from './config.js';

export class Battle {
  // Deliberately a placeholder: tactical battle simulation is not part of Phase 1.
  constructor(city) { this.city = city; }
  canResolve() { return false; }
}

export function canCaptureWithoutBattle(city) {
  return city.owner === FACTIONS.BRITISH && city.soldierCount === 0;
}
