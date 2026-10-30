// Vite incorpora estos archivos al paquete para usarlos también sin conexión.
export const teamLogos = [
  { id: 'diti', name: 'DITI', image: new URL('../logos/DITI TEXT.png', import.meta.url).href },
  { id: 'dica', name: 'DICA', image: new URL('../logos/DICA TEXT.png', import.meta.url).href },
  { id: 'dine', name: 'DINE', image: new URL('../logos/DINE TEXT.png', import.meta.url).href },
];

export function getTeamLogo(id) {
  return teamLogos.find(logo => logo.id === id);
}
