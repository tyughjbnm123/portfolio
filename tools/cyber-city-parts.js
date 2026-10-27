// GLTFLoader r160 sanitizes dots. Preserve a single authoritative model per part.
// Both findCyberPart(scene, 'tower_walls.001') and 'tower_walls001' resolve it.
export const CYBER_PART_NAMES = [
  'tower_walls','tower_walls.001','tower_walls.002','tower_walls.003','tower_roof',
  'midrise_walls','midrise_walls.001','midrise_roof','corner','terrace',
  'slim_walls','slim_walls.001','slim_roof','podium'
];
export function findCyberPart(scene, name) {
  const normalized = name.split('.').join('');
  let found = scene.getObjectByName(name) || scene.getObjectByName(normalized);
  if (!found) scene.traverse(node => {
    if (node.userData.partName?.split('.').join('') === normalized) found = node;
  });
  if (!found) throw new Error(`Missing original city part: ${name}`);
  return found;
}
