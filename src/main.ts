import './style.css';
import { titleLine } from './core/version';

const app = document.querySelector<HTMLElement>('#app');
if (app) {
  app.innerHTML = `
    <section class="placeholder">
      <h1 class="logo">Blockfall</h1>
      <p class="tagline">A modern falling-block puzzle game.</p>
      <p class="status">Under construction. Gameplay arrives in the next milestone.</p>
      <p class="version"></p>
    </section>
  `;
  const version = app.querySelector<HTMLElement>('.version');
  if (version) version.textContent = titleLine();
}
