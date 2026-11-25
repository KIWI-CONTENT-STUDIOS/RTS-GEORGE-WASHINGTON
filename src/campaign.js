import { FACTIONS, UNIT_TYPES } from './config.js';
import { City } from './models.js';

export function createCampaignMap() {
  const positions = {
    boston: [91, 105], concord: [67, 74], newyork: [74, 171], philadelphia: [96, 221],
    baltimore: [120, 272], richmond: [178, 327], yorktown: [204, 378], charleston: [276, 438],
    savannah: [330, 454], newhaven: [88, 131], albany: [53, 143], trenton: [88, 195], valleforge: [122, 201],
  };

  const cities = [
    new City({ id: 'boston', name: 'Boston', x: positions.boston[0], y: positions.boston[1], owner: FACTIONS.AMERICAN, income: 32, recruitmentCapacity: 24, garrison: { [UNIT_TYPES.INFANTRY]: 8, [UNIT_TYPES.RIFLEMEN]: 3, [UNIT_TYPES.MILITIA]: 6, [UNIT_TYPES.ARTILLERY]: 0, [UNIT_TYPES.CAVALRY]: 0 } }),
    new City({ id: 'concord', name: 'Concord', x: positions.concord[0], y: positions.concord[1], owner: FACTIONS.AMERICAN, income: 14, garrison: { [UNIT_TYPES.INFANTRY]: 3, [UNIT_TYPES.RIFLEMEN]: 2, [UNIT_TYPES.MILITIA]: 8, [UNIT_TYPES.ARTILLERY]: 0, [UNIT_TYPES.CAVALRY]: 0 } }),
    new City({ id: 'newyork', name: 'New York', x: positions.newyork[0], y: positions.newyork[1], owner: FACTIONS.BRITISH, income: 38, garrison: { [UNIT_TYPES.INFANTRY]: 12, [UNIT_TYPES.RIFLEMEN]: 2, [UNIT_TYPES.MILITIA]: 4, [UNIT_TYPES.ARTILLERY]: 2, [UNIT_TYPES.CAVALRY]: 2 } }),
    new City({ id: 'philadelphia', name: 'Philadelphia', x: positions.philadelphia[0], y: positions.philadelphia[1], owner: FACTIONS.AMERICAN, income: 40, garrison: { [UNIT_TYPES.INFANTRY]: 10, [UNIT_TYPES.RIFLEMEN]: 4, [UNIT_TYPES.MILITIA]: 5, [UNIT_TYPES.ARTILLERY]: 1, [UNIT_TYPES.CAVALRY]: 0 } }),
    new City({ id: 'baltimore', name: 'Baltimore', x: positions.baltimore[0], y: positions.baltimore[1], owner: FACTIONS.AMERICAN, income: 20, garrison: { [UNIT_TYPES.INFANTRY]: 5, [UNIT_TYPES.RIFLEMEN]: 2, [UNIT_TYPES.MILITIA]: 5, [UNIT_TYPES.ARTILLERY]: 0, [UNIT_TYPES.CAVALRY]: 0 } }),
    new City({ id: 'richmond', name: 'Richmond', x: positions.richmond[0], y: positions.richmond[1], owner: FACTIONS.AMERICAN, income: 18, garrison: { [UNIT_TYPES.INFANTRY]: 4, [UNIT_TYPES.RIFLEMEN]: 3, [UNIT_TYPES.MILITIA]: 7, [UNIT_TYPES.ARTILLERY]: 0, [UNIT_TYPES.CAVALRY]: 1 } }),
    new City({ id: 'yorktown', name: 'Yorktown', x: positions.yorktown[0], y: positions.yorktown[1], owner: FACTIONS.BRITISH, income: 24, garrison: { [UNIT_TYPES.INFANTRY]: 9, [UNIT_TYPES.RIFLEMEN]: 1, [UNIT_TYPES.MILITIA]: 3, [UNIT_TYPES.ARTILLERY]: 2, [UNIT_TYPES.CAVALRY]: 1 } }),
    new City({ id: 'charleston', name: 'Charleston', x: positions.charleston[0], y: positions.charleston[1], owner: FACTIONS.BRITISH, income: 28, garrison: { [UNIT_TYPES.INFANTRY]: 12, [UNIT_TYPES.RIFLEMEN]: 2, [UNIT_TYPES.MILITIA]: 3, [UNIT_TYPES.ARTILLERY]: 2, [UNIT_TYPES.CAVALRY]: 1 } }),
    new City({ id: 'savannah', name: 'Savannah', x: positions.savannah[0], y: positions.savannah[1], owner: FACTIONS.BRITISH, income: 22, garrison: { [UNIT_TYPES.INFANTRY]: 8, [UNIT_TYPES.RIFLEMEN]: 1, [UNIT_TYPES.MILITIA]: 4, [UNIT_TYPES.ARTILLERY]: 1, [UNIT_TYPES.CAVALRY]: 0 } }),
    new City({ id: 'newhaven', name: 'New Haven', x: positions.newhaven[0], y: positions.newhaven[1], owner: FACTIONS.AMERICAN, income: 16, garrison: { [UNIT_TYPES.INFANTRY]: 4, [UNIT_TYPES.RIFLEMEN]: 1, [UNIT_TYPES.MILITIA]: 6, [UNIT_TYPES.ARTILLERY]: 0, [UNIT_TYPES.CAVALRY]: 0 } }),
    new City({ id: 'albany', name: 'Albany', x: positions.albany[0], y: positions.albany[1], owner: FACTIONS.AMERICAN, income: 17, garrison: { [UNIT_TYPES.INFANTRY]: 5, [UNIT_TYPES.RIFLEMEN]: 2, [UNIT_TYPES.MILITIA]: 4, [UNIT_TYPES.ARTILLERY]: 0, [UNIT_TYPES.CAVALRY]: 1 } }),
    new City({ id: 'trenton', name: 'Trenton', x: positions.trenton[0], y: positions.trenton[1], owner: FACTIONS.AMERICAN, income: 15, garrison: { [UNIT_TYPES.INFANTRY]: 4, [UNIT_TYPES.RIFLEMEN]: 3, [UNIT_TYPES.MILITIA]: 5, [UNIT_TYPES.ARTILLERY]: 0, [UNIT_TYPES.CAVALRY]: 0 } }),
    new City({ id: 'valleforge', name: 'Valley Forge', x: positions.valleforge[0], y: positions.valleforge[1], owner: FACTIONS.AMERICAN, income: 12, garrison: { [UNIT_TYPES.INFANTRY]: 6, [UNIT_TYPES.RIFLEMEN]: 2, [UNIT_TYPES.MILITIA]: 8, [UNIT_TYPES.ARTILLERY]: 1, [UNIT_TYPES.CAVALRY]: 1 } }),
  ];

  const roads = [
    ['boston','concord'], ['concord','newhaven'], ['newhaven','albany'], ['albany','newyork'], ['newyork','trenton'],
    ['trenton','philadelphia'], ['philadelphia','valleforge'], ['philadelphia','baltimore'], ['baltimore','richmond'],
    ['richmond','yorktown'], ['richmond','charleston'], ['charleston','savannah'],
  ];

  return { cities, roads };
}
