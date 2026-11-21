// Shared helpers for every page. Talks to the bot's portal API (see config.js).
(() => {
  const config = window.TLNAH_CONFIG || {};
  const local = ['localhost', '127.0.0.1'].includes(location.hostname);
  const API_BASE = String(local ? (config.localApiBase || 'http://localhost:8787') : config.apiBase || '').replace(/\/$/, '');

  const $ = id => document.getElementById(id);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const formatDate = value => (value ? new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—');

  class ApiError extends Error { constructor(message, status) { super(message); this.status = status; } }

  async function api(path, { method = 'GET', body } = {}) {
    let response;
    try {
      response = await fetch(API_BASE + path, {
        method, credentials: 'include',
        headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch {
      throw new ApiError('Could not reach the server. The bot may be offline — try again in a minute.', 0);
    }
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new ApiError(data.error || `Request failed (${response.status}).`, response.status);
    return data;
  }

  function notice(target, message, kind = '') {
    const el = typeof target === 'string' ? $(target) : target;
    if (!el) return;
    el.textContent = message || '';
    el.className = `notice ${kind}`.trim();
  }

  /** Disable the submit button while an async handler runs, and surface errors. */
  function onSubmit(form, noticeId, handler) {
    form.addEventListener('submit', async event => {
      event.preventDefault();
      const button = form.querySelector('button[type="submit"], button:not([type])');
      if (button) button.disabled = true;
      try { await handler(event); }
      catch (error) { notice(noticeId, error.message, 'error'); }
      finally { if (button) button.disabled = false; }
    });
  }

  /** Adds a Show/Hide toggle to every password field. */
  function passwordToggles(root = document) {
    root.querySelectorAll('input[type="password"]:not([data-toggle])').forEach(input => {
      input.dataset.toggle = '1';
      const wrap = document.createElement('div');
      wrap.className = 'password-wrap';
      input.parentNode.insertBefore(wrap, input);
      wrap.appendChild(input);
      const button = document.createElement('button');
      button.type = 'button'; button.className = 'reveal'; button.textContent = 'Show';
      button.setAttribute('aria-label', 'Show password');
      button.addEventListener('click', () => {
        const show = input.type === 'password';
        input.type = show ? 'text' : 'password';
        button.textContent = show ? 'Hide' : 'Show';
      });
      wrap.appendChild(button);
    });
  }

  function applyTheme(theme) {
    if (theme === 'light' || theme === 'dark') document.documentElement.dataset.theme = theme;
    else delete document.documentElement.dataset.theme;
    try { localStorage.setItem('tlnah-theme', theme || 'system'); } catch {}
  }
  try { applyTheme(localStorage.getItem('tlnah-theme')); } catch {}

  const cleanDiscordId = value => String(value || '').replace(/\D/g, '');

  window.TLNAH = { API_BASE, config, $, esc, formatDate, api, ApiError, notice, onSubmit, passwordToggles, applyTheme, cleanDiscordId };
  document.addEventListener('DOMContentLoaded', () => passwordToggles());
})();
