export class City {
  constructor({ id, name, x, y, owner, income, garrison, recruitmentCapacity = 30 }) {
    this.id = id;
    this.name = name;
    this.x = x;
    this.y = y;
    this.owner = owner;
    this.income = income;
    this.garrison = garrison;
    this.recruitmentCapacity = recruitmentCapacity;
  }

  get soldierCount() {
    return Object.values(this.garrison).reduce((sum, count) => sum + count, 0);
  }

  recruit(type, price) {
    if (this.soldierCount >= this.recruitmentCapacity) return false;
    this.garrison[type] = (this.garrison[type] || 0) + 1;
    return true;
  }
}

export class TravellingArmy {
  constructor({ id, originId, destinationId, roster, owner, origin, destination, duration = 8 }) {
    this.id = id;
    this.originId = originId;
    this.destinationId = destinationId;
    this.roster = { ...roster };
    this.owner = owner;
    this.progress = 0;
    this.duration = duration;
    this.origin = origin;
    this.destination = destination;
  }

  update(dt) {
    this.progress = Math.min(1, this.progress + dt / this.duration);
  }

  get position() {
    return {
      x: this.origin.x + (this.destination.x - this.origin.x) * this.progress,
      y: this.origin.y + (this.destination.y - this.origin.y) * this.progress,
    };
  }

  get soldierCount() {
    return Object.values(this.roster).reduce((sum, count) => sum + count, 0);
  }
}
