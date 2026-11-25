import { UNIT_TYPES } from './config.js';
import { rosterCount } from './gameRules.js';

export class City {
  constructor({ id, name, x, y, owner, income, garrison = {}, recruitmentCapacity = 24 }) {
    this.id = id;
    this.name = name;
    this.x = x;
    this.y = y;
    this.owner = owner;
    this.income = income;
    this.recruitmentCapacity = recruitmentCapacity;
    // Every settlement has its own complete roster; never shared between cities.
    this.garrison = Object.fromEntries(Object.values(UNIT_TYPES).map(type => [type, garrison[type] || 0]));
  }
  get soldierCount() { return rosterCount(this.garrison); }
}

export class TravellingArmy {
  constructor({ id, originId, destinationId, roster, owner, duration, path }) {
    this.id = id;
    this.originId = originId;
    this.destinationId = destinationId;
    this.roster = { ...roster };
    this.owner = owner;
    this.duration = duration;
    this.elapsed = 0;
    this.path = path;
  }
  update(dt) { this.elapsed = Math.min(this.duration, this.elapsed + dt); }
  get progress() { return Math.min(1, this.elapsed / this.duration); }
  get position() {
    const t = this.progress;
    return { x: this.path.from.x + (this.path.to.x - this.path.from.x) * t, y: this.path.from.y + (this.path.to.y - this.path.from.y) * t };
  }
  get soldierCount() { return rosterCount(this.roster); }
}
