const { $, api, esc, formatDate, notice, onSubmit, passwordToggles, applyTheme } = window.TLNAH;

const REQUEST_LABELS = {
  nickname: 'Nickname change', 'password-change': 'Password change (admin approval)', absence: 'Absence / leave', issue: 'Report an issue',
  suggestion: 'Suggestion', feedback: 'Staff feedback', bug: 'Bug report', role: 'Role change', promotion: 'Promotion review',
  appeal: 'Appeal a decision', recovery: 'Account recovery',
};
const PASSWORD_TYPES = ['password-change', 'recovery'];
const pill = value => `<span class="pill ${esc(value)}">${esc(String(value).replace('-', ' '))}</span>`;
const initials = name => esc(String(name || '?').slice(0, 1).toUpperCase());
const avatar = p => (p.avatar ? `<img class="avatar" src="${esc(p.avatar)}" alt="">` : `<div class="avatar">${initials(p.nickname || p.username)}</div>`);

function requestsList(requests) {
  if (!requests.length) return '<p class="empty">No requests yet.</p>';
  return requests.map(r => `<div class="card"><div class="row"><strong>${esc(REQUEST_LABELS[r.type] || r.type)}</strong>${pill(r.status)}</div>
    <p class="meta">Submitted ${formatDate(r.createdAt)}${r.reviewedAt ? ` · reviewed ${formatDate(r.reviewedAt)}` : ''}</p>${r.data.text ? `<p>${esc(r.data.text)}</p>` : ''}</div>`).join('');
}

function requestForm(types, id) {
  return `<form id="${id}Form">
    <label>Request type<select id="${id}Type">${types.map(t => `<option value="${t}">${esc(REQUEST_LABELS[t])}</option>`).join('')}</select></label>
    <div id="${id}TextBox"><label>Details<textarea id="${id}Text" maxlength="2000" placeholder="Explain your request"></textarea></label></div>
    <div id="${id}PasswordBox" class="hidden"><label>New password<input id="${id}Password" type="password" minlength="12" autocomplete="new-password">
      <small>An administrator must approve this change. Never use your Discord password.</small></label></div>
    <button type="submit">Submit request</button><p id="${id}Notice" class="notice" aria-live="polite"></p></form>`;
}

function bindRequestForm(id, after) {
  const type = $(`${id}Type`);
  const toggle = () => {
    const password = PASSWORD_TYPES.includes(type.value);
    $(`${id}TextBox`).classList.toggle('hidden', password);
    $(`${id}PasswordBox`).classList.toggle('hidden', !password);
    $(`${id}Text`).placeholder = type.value === 'nickname'
      ? 'Your new nickname. In Discord it becomes "(nickname) / (rank)", max 32 characters in total.'
      : 'Explain your request';
  };
  type.addEventListener('change', toggle);
  toggle();
  onSubmit($(`${id}Form`), `${id}Notice`, async () => {
    await api('/api/user/requests', { method: 'POST', body: { type: type.value, text: $(`${id}Text`).value, newPassword: $(`${id}Password`).value } });
    $(`${id}Form`).reset();
    toggle();
    notice(`${id}Notice`, 'Request submitted for administration review.', 'ok');
    if (after) after();
  });
}

async function refreshRequests() {
  const { requests } = await api('/api/user/requests');
  $('requests').innerHTML = requestsList(requests);
}

function renderSuspended(p, requests) {
  $('app').innerHTML = `<section class="card"><div class="profile-head">${avatar(p)}<div><h2>Account suspended</h2><p class="meta">${esc(p.username)} · ${esc(p.discordUser)}</p></div></div>
    <p>Your account has limited access. You can appeal the suspension or request account recovery below.</p></section>
    <section class="card"><h2>Contact administration</h2>${requestForm(['appeal', 'recovery'], 'suspended')}</section>
    <section class="card"><h2>Your requests</h2><div id="requests">${requestsList(requests)}</div></section>`;
  passwordToggles($('app'));
  bindRequestForm('suspended', refreshRequests);
}

const option = (value, label, current) => `<option value="${esc(value)}" ${current === value ? 'selected' : ''}>${esc(label)}</option>`;

function sessionCard(x) {
  const action = x.current ? '<span class="pill active">This device</span>' : `<button class="small danger" type="button" data-signout="${esc(x.id)}">Sign out</button>`;
  return `<div class="card" style="background:var(--card)"><div class="row"><span>${esc(x.userAgent)}</span>${action}</div><p class="meta">Signed in ${formatDate(x.createdAt)}</p></div>`;
}

function announcementCard(a) {
  return `<article class="card" style="background:var(--card)"><strong>${esc(a.title)}</strong><p style="white-space:pre-wrap">${esc(a.message)}</p>
    <p class="meta">${formatDate(a.createdAt)}${a.author ? ` · ${esc(a.author)}` : ''}</p></article>`;
}

async function load() {
  let profile;
  try {
    ({ profile } = await api('/api/user/profile'));
  } catch (error) {
    if (error.status === 401) { location.replace('./?login=1'); return; }
    $('app').innerHTML = `<p class="notice error">${esc(error.message)}</p>`;
    return;
  }
  $('logout').classList.remove('hidden');
  applyTheme(profile.settings.theme);
  if (profile.status === 'suspended') { renderSuspended(profile, (await api('/api/user/requests')).requests); return; }

  const [{ announcements }, { requests }, { sessions }] = await Promise.all([
    api('/api/user/announcements'), api('/api/user/requests'), api('/api/user/sessions'),
  ]);
  const p = profile;
  const s = p.settings;
  const ages = ['', '13–15', '16–17', '18+', 'Prefer not to say'];
  $('app').innerHTML = `
  <section class="card">
    <div class="profile-head">${avatar(p)}<div class="grow">
      <h2 style="margin:0">Welcome, ${esc(p.nickname || p.username)}</h2>
      <p class="meta">${esc(p.discordUser)} · ${esc(p.discordId)}</p>
      <p><span class="pill" style="background:${esc(p.rankColor)}22;color:${esc(p.rankColor)}">${esc(p.rank)}</span>
        ${p.badge ? `<span class="pill">${esc(p.badge)}</span>` : ''} ${pill(s.availability)}</p>
    </div></div>
    <p class="meta">${esc(p.agreementVersion)} · signed ${formatDate(p.acceptedAt)}</p>
    <label>Profile picture<input id="avatarInput" type="file" accept="image/png,image/jpeg,image/webp"><small>PNG, JPEG or WebP under 300 KB.</small></label>
    <p id="avatarNotice" class="notice"></p>
  </section>

  <section class="card"><h2>📣 Announcements</h2>
    ${announcements.length ? announcements.map(announcementCard).join('') : '<p class="empty">No announcements yet.</p>'}
  </section>

  <section class="card"><h2>Profile &amp; preferences</h2>
    <form id="profileForm"><div class="grid">
      <label>Time zone<input id="timeZone" value="${esc(s.timeZone)}" placeholder="e.g. Europe/Bucharest" list="tzList"></label>
      <label>Age range<select id="ageRange">${ages.map(x => option(x, x || 'Select an option', s.ageRange)).join('')}</select></label>
      <label>Availability<select id="availability">${option('active', 'Active', s.availability)}${option('inactive', 'Inactive', s.availability)}${option('on-leave', 'On leave', s.availability)}</select></label>
      <label>Theme<select id="theme">${option('system', 'System', s.theme)}${option('light', 'Light', s.theme)}${option('dark', 'Dark', s.theme)}</select></label>
      <label>Privacy<select id="privacy">${option('staff-only', 'Visible to staff', s.privacy)}${option('private', 'Private', s.privacy)}</select></label>
    </div><datalist id="tzList"></datalist><button type="submit">Save profile</button><p id="profileNotice" class="notice"></p></form>
  </section>

  <section class="card"><h2>Requests &amp; support</h2>
    ${requestForm(['nickname', 'absence', 'issue', 'suggestion', 'feedback', 'bug', 'role', 'promotion', 'appeal', 'password-change'], 'request')}
    <h3>Your requests</h3><div id="requests">${requestsList(requests)}</div>
  </section>

  <section class="card"><h2>Security</h2>
    <h3>Change password</h3>
    <form id="passwordForm"><div class="grid">
      <label>Current password<input id="currentPassword" type="password" autocomplete="current-password" required></label>
      <label>New password<input id="newOwnPassword" type="password" autocomplete="new-password" minlength="12" required></label>
    </div><button type="submit" class="secondary">Change password</button><p id="passwordNotice" class="notice"></p></form>
    <h3>Signed-in devices</h3><div id="sessions">${sessions.map(sessionCard).join('')}</div>
    <p class="meta"><a href="./">Staff Code of Conduct &amp; agreement</a></p>
  </section>`;

  passwordToggles($('app'));
  try { $('tzList').innerHTML = Intl.supportedValuesOf('timeZone').map(z => `<option value="${z}">`).join(''); } catch (e) { /* older browsers */ }
  if (!s.timeZone) { try { $('timeZone').placeholder = Intl.DateTimeFormat().resolvedOptions().timeZone; } catch (e) { /* ignore */ } }

  $('avatarInput').addEventListener('change', event => {
    const file = event.target.files[0];
    if (!file) return;
    if (file.size > 300000) { notice('avatarNotice', 'Use an image smaller than 300 KB.', 'error'); return; }
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        await api('/api/user/avatar', { method: 'PUT', body: { image: reader.result } });
        notice('avatarNotice', 'Profile picture saved.', 'ok');
        setTimeout(load, 600);
      } catch (error) { notice('avatarNotice', error.message, 'error'); }
    };
    reader.readAsDataURL(file);
  });

  onSubmit($('profileForm'), 'profileNotice', async () => {
    const { profile: saved } = await api('/api/user/profile', { method: 'PUT', body: { settings: {
      timeZone: $('timeZone').value, ageRange: $('ageRange').value, availability: $('availability').value, theme: $('theme').value, privacy: $('privacy').value,
    } } });
    applyTheme(saved.settings.theme);
    notice('profileNotice', 'Profile saved.', 'ok');
  });

  bindRequestForm('request', refreshRequests);

  onSubmit($('passwordForm'), 'passwordNotice', async () => {
    await api('/api/user/password', { method: 'POST', body: { currentPassword: $('currentPassword').value, newPassword: $('newOwnPassword').value } });
    $('passwordForm').reset();
    notice('passwordNotice', 'Password changed. Your other devices were signed out.', 'ok');
  });

  document.querySelectorAll('[data-signout]').forEach(button => button.addEventListener('click', async () => {
    button.disabled = true;
    try {
      await api('/api/user/sessions', { method: 'DELETE', body: { id: button.dataset.signout } });
      button.closest('.card').remove();
    } catch (error) { alert(error.message); button.disabled = false; }
  }));
}

$('logout').addEventListener('click', async () => {
  await api('/api/logout', { method: 'POST', body: {} }).catch(() => {});
  location.replace('./?login=1');
});

load();
