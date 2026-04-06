export type UpgradeType = 'fire_rate' | 'speed' | 'shotgun' | 'laser' | 'fire_damage' | 'poison_damage' | 'ice_damage';

export interface Upgrade {
  id: UpgradeType;
  name: string;
  description: string;
  color: string;
}

export const UPGRADES: Upgrade[] = [
  { id: 'fire_rate', name: 'Rapid Fire', description: 'Increases shooting speed by 50%', color: '#ffff00' },
  { id: 'speed', name: 'Agility', description: 'Increases movement speed by 30%', color: '#00ffff' },
  { id: 'shotgun', name: 'Spread Shot', description: 'Fires 5 bullets in an arc', color: '#ff8800' },
  { id: 'laser', name: 'Laser Beam', description: 'Fires a fast, piercing laser', color: '#ff00ff' },
  { id: 'fire_damage', name: 'Incendiary Rounds', description: 'Bullets burn enemies over time', color: '#ff4400' },
  { id: 'poison_damage', name: 'Toxic Rounds', description: 'Bullets poison enemies for a long duration', color: '#00ff44' },
  { id: 'ice_damage', name: 'Cryo Rounds', description: 'Bullets slow down enemies', color: '#00ccff' },
];

export function getRandomUpgrades(count: number): Upgrade[] {
  const shuffled = [...UPGRADES].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}
