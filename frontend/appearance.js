// Apply the last selected appearance before the first paint, including sign-in.
(() => {
  let appearance = {};
  try { appearance = JSON.parse(localStorage.getItem('fitnessos-appearance') || '{}'); } catch {}
  document.documentElement.dataset.theme = appearance?.theme === 'light' ? 'light' : 'dark';
  document.documentElement.dataset.font = ['serif', 'sans', 'mono'].includes(appearance?.font) ? appearance.font : 'serif';
  document.documentElement.dataset.density = appearance?.density === 'compact' ? 'compact' : 'comfortable';
})();
