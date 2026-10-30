// Vite incorpora estos archivos al paquete para usarlos también sin conexión.
export const teamLogos = [
  { id: 'diti', name: 'DITI', color: '#b42318', image: new URL('../logos/DITI TEXT.png', import.meta.url).href },
  { id: 'dica', name: 'DICA', color: '#23703c', image: new URL('../logos/DICA TEXT.png', import.meta.url).href },
  { id: 'dine', name: 'DINE', color: '#185abd', image: new URL('../logos/DINE TEXT.png', import.meta.url).href },
];

export function getTeamLogo(id) {
  return teamLogos.find(logo => logo.id === id);
}

export function applyTeamColor(node, logoId) {
  const logo = getTeamLogo(logoId);
  node.style.color = logo ? `var(--team-color-${logo.id}, ${logo.color})` : '';
  return node;
}

export function teamNameElement(team) {
  const node = document.createElement('span');
  node.className = 'team-name'; node.textContent = team.name;
  return applyTeamColor(node, team.logo);
}
