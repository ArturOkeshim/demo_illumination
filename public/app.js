const form = document.getElementById('prompt-form');
const input = document.getElementById('prompt-input');
const chatHistory = document.getElementById('chat-history');
const themeNameEl = document.getElementById('current-theme-name');
const heroEl = document.getElementById('hero');

const rootStyle = document.documentElement.style;
const appRoot = document.querySelector('.app');

function appendChatMessage(role, text) {
  const div = document.createElement('div');
  div.className = 'chat-message';

  const roleSpan = document.createElement('span');
  roleSpan.className = 'role';
  roleSpan.textContent = role === 'user' ? 'Вы:' : 'Система:';

  const textSpan = document.createElement('span');
  textSpan.textContent = text;

  div.appendChild(roleSpan);
  div.appendChild(textSpan);

  chatHistory.appendChild(div);
  chatHistory.scrollTop = chatHistory.scrollHeight;
}

function applyTheme(theme) {
  if (!theme || !theme.colors) return;

  themeNameEl.textContent = theme.name || 'Пользовательская тема';

  rootStyle.setProperty('--bg-color', theme.colors.background || '#020617');
  rootStyle.setProperty('--primary-color', theme.colors.primary || '#22c55e');
  rootStyle.setProperty('--accent-color', theme.colors.accent || '#f97316');
  rootStyle.setProperty('--text-on-bg', theme.colors.textOnBackground || '#f9fafb');
  rootStyle.setProperty('--card-bg', theme.colors.cardBackground || 'rgba(15, 23, 42, 0.9)');

  // Background gradient / solid from theme.background.css
  if (theme.background && theme.background.css) {
    // Use gradient/solid as a base layer
    heroEl.style.backgroundImage = theme.background.css;
  }

  // If LLM provides an image, it will visually dominate the hero
  if (theme.image && theme.image.url) {
    heroEl.style.backgroundImage = `url("${theme.image.url}")`;
    heroEl.style.backgroundPosition = theme.image.position || 'center center';
    heroEl.style.backgroundSize = theme.image.size || 'cover';
  }

  // --------- Typography (font + roundness) ----------
  if (theme.typography) {
    // Reset font classes
    document.body.classList.remove('font-system', 'font-serif', 'font-tech', 'font-playful');

    switch (theme.typography.fontFamily) {
      case 'serif':
        document.body.classList.add('font-serif');
        break;
      case 'tech':
        document.body.classList.add('font-tech');
        break;
      case 'playful':
        document.body.classList.add('font-playful');
        break;
      case 'system':
      default:
        document.body.classList.add('font-system');
        break;
    }

    // Reset roundness classes
    appRoot.classList.remove('roundness-square', 'roundness-medium', 'roundness-rounded');
    switch (theme.typography.roundness) {
      case 'square':
        appRoot.classList.add('roundness-square');
        break;
      case 'rounded':
        appRoot.classList.add('roundness-rounded');
        break;
      case 'medium':
      default:
        appRoot.classList.add('roundness-medium');
        break;
    }
  }

  // --------- Effects (hover + global animations) ----------
  if (theme.effects) {
    // Hover effects
    appRoot.classList.remove(
      'hover-glow-soft',
      'hover-glow-medium',
      'hover-glow-strong',
      'hover-pulse-soft',
      'hover-pulse-strong'
    );

    if (theme.effects.hover) {
      const { type, intensity } = theme.effects.hover;
      if (type === 'glow') {
        if (intensity === 'soft') appRoot.classList.add('hover-glow-soft');
        else if (intensity === 'medium') appRoot.classList.add('hover-glow-medium');
        else if (intensity === 'strong') appRoot.classList.add('hover-glow-strong');
      } else if (type === 'pulse') {
        if (intensity === 'soft' || intensity === 'medium') {
          appRoot.classList.add('hover-pulse-soft');
        } else if (intensity === 'strong') {
          appRoot.classList.add('hover-pulse-strong');
        }
      }
    }

    // Global animations
    appRoot.classList.remove(
      'anim-wave-hero',
      'anim-wave-cards',
      'anim-wave-page',
      'anim-flicker-hero',
      'anim-flicker-cards',
      'anim-breathing-hero',
      'anim-breathing-cards',
      'anim-breathing-page'
    );

    if (theme.effects.animation) {
      const { type, target, speed } = theme.effects.animation;

      // Base class per type/target
      if (type === 'wave') {
        if (target === 'hero') appRoot.classList.add('anim-wave-hero');
        else if (target === 'cards') appRoot.classList.add('anim-wave-cards');
        else if (target === 'page') appRoot.classList.add('anim-wave-page');
      } else if (type === 'flicker') {
        if (target === 'hero') appRoot.classList.add('anim-flicker-hero');
        else if (target === 'cards') appRoot.classList.add('anim-flicker-cards');
      } else if (type === 'breathing') {
        if (target === 'hero') appRoot.classList.add('anim-breathing-hero');
        else if (target === 'cards') appRoot.classList.add('anim-breathing-cards');
        else if (target === 'page') appRoot.classList.add('anim-breathing-page');
      }

      // Speed is currently baked into CSS durations; you could
      // later adjust animation-duration via JS if нужно.
      void speed; // keep linter happy if unused
    }
  }
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const prompt = input.value.trim();
  if (!prompt) return;

  appendChatMessage('user', prompt);
  input.value = '';

  const button = form.querySelector('button');
  button.disabled = true;
  button.textContent = 'Подбираем тему...';

  try {
    const res = await fetch('/api/theme', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt })
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const theme = await res.json();
    applyTheme(theme);

    appendChatMessage('system', `Тема применена: ${theme.name || 'без имени'}`);
  } catch (err) {
    console.error(err);
    appendChatMessage('system', 'Не удалось сгенерировать тему. Проверьте логи сервера.');
  } finally {
    button.disabled = false;
    button.textContent = 'Применить тему';
  }
});

