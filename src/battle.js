import { FACTIONS, UNIT_STATS } from './config.js';

export class Battle {
  constructor(city, attackerRoster, defenderRoster, attackerOwner) {
    this.city = city;
    this.attackerOwner = attackerOwner;
    this.attackerRoster = { ...attackerRoster };
    this.defenderRoster = { ...defenderRoster };
    this.time = 0;
  }

  resolve() {
    const attackPower = this._power(this.attackerRoster);
    const defencePower = this._power(this.defenderRoster) * 1.12;
    const attackerWins = attackPower >= defencePower;
    const winningFraction = attackerWins ? 0.72 : 0.48;
    const losingFraction = attackerWins ? 0.42 : 0.58;

    const survivingAttackers = this._survivors(this.attackerRoster, attackerWins ? winningFraction : losingFraction);
    const survivingDefenders = this._survivors(this.defenderRoster, attackerWins ? losingFraction : winningFraction);

    return { attackerWins, survivingAttackers, survivingDefenders };
  }

  _power(roster) {
    let power = 0;
    for (const [type, count] of Object.entries(roster)) {
      const stats = UNIT_STATS[type];
      if (stats) power += count * (stats.damage + stats.health / 18 + (stats.range > 30 ? 2 : 0));
    }
    return power;
  }

  _survivors(roster, fraction) {
    const result = {};
    for (const [type, count] of Object.entries(roster)) {
      result[type] = Math.max(0, Math.floor(count * fraction));
    }
    return result;
  }
}
