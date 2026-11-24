export const site = { name: 'Little Heroes Village', tagline: 'Little heroes, growing together.', repository: 'https://github.com/MrRowey/family-rewards' };
export const navigation = [
  { path: '', label: 'Home' }, { path: 'features', label: 'Features' }, { path: 'screenshots', label: 'Screenshots' }, { path: 'documentation', label: 'Documentation' }, { path: 'installation', label: 'Installation' }, { path: 'roadmap', label: 'Roadmap' }, { path: 'changelog', label: 'Changelog' },
];
export function sitePath(path = '') { return import.meta.env.BASE_URL.replace(/\/$/, '') + '/' + path.replace(/^\/+|\/+$/g, '') + (path.replace(/^\/+|\/+$/g, '') ? '/' : ''); }
export function activePath(current: string, path: string) { const target = sitePath(path).replace(/\/$/, ''); const actual = current.replace(/\/$/, ''); return actual === target || (path !== '' && actual.startsWith(target + '/')); }
