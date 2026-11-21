const { $, api, esc, formatDate, notice, onSubmit, passwordToggles } = window.TLNAH;

const REQUEST_LABELS = {
  nickname: 'Nickname', 'password-change': 'Password change', absence: 'Absence', issue: 'Issue', suggestion: 'Suggestion',
  feedback: 'Feedback', bug: 'Bug', role: 'Role request', promotion: 'Promotion request', appeal: 'Appeal', recovery: 'Account recovery',
};
const pill = value => `<span class="pill ${esc(value)}">${esc(String(value).replace('-', ' '))}</span>`;
const empty = text => `<p class="empty">${esc(text)}</p>`;
const state = { members: [], requests: [], minecraft: [], tab: 'applications' };

// Run an admin action from a button; show warnings (e.g. Discord role failures) without losing the decision.
async function act(button, path, body, success) {
  button.disabled = true;
  try {
    const result = await api(path, { method: 'POST', body });
    notice('globalNotice', result.warning ? `${success} — but Discord reported: ${result.warning}` : success, result.warning ? 'warn' : 'ok');
    await refresh();
  } catch (error) {
    notice('globalNotice', error.message, 'error');
    if (error.status === 401) return signedOut();
    button.disabled = false;
  }
}

function decisionButtons(kind, id, approveLabel = 'Approve', denyLabel = 'Deny') {
  return `<div class="actions"><button class="ok" type="button" data-${kind}="${esc(id)}" data-status="approved">${approveLabel}</button>
    <button class="danger" type="button" data-${kind}="${esc(id)}" data-status="denied">${denyLabel}</button></div>`;
}

// ── Renderers ────────────────────────────────────────────────────────────────
function renderStats(o) {
  $('stats').innerHTML = [
    ['Pending staff apps', o.pendingApplications], ['Active members', o.members], ['Suspended', o.suspended],
    ['Pending requests', o.pendingRequests], ['Pending Minecraft', o.pendingMinecraft], ['Discord bot', o.discordOnline ? '🟢 Online' : '🔴 Offline'],
  ].map(([label, value]) => `<div class="stat"><b>${esc(value)}</b><span>${esc(label)}</span></div>`).join('');
  document.querySelectorAll('[data-count]').forEach(el => {
    const n = o[el.dataset.count];
    el.textContent = n;
    el.classList.toggle('hidden', !n);
  });
}

function renderApplications(applications) {
  $('applications').innerHTML = applications.length ? applications.map(a => `<article class="card">
      <div class="row"><strong>${esc(a.username)}</strong>${pill(a.status)}</div>
      <p>Discord: <strong>${esc(a.discordUser)}</strong> <span class="meta">(${esc(a.discordId)})</span></p>
      <p class="meta">Applied ${formatDate(a.createdAt)}</p>
      ${decisionButtons('app', a.id, 'Approve & give staff role', 'Deny')}
    </article>`).join('') : empty('No pending staff applications. 🎉');
  document.querySelectorAll('[data-app]').forEach(b => b.addEventListener('click', () => {
    if (b.dataset.status === 'denied' && !confirm('Deny this application?')) return;
    act(b, '/api/admin/decision', { id: b.dataset.app, status: b.dataset.status }, `Application ${b.dataset.status}.`);
  }));
}

function memberCard(m) {
  const option = (value, label, current) => `<option value="${value}" ${current === value ? 'selected' : ''}>${label}</option>`;
  const photo = m.avatar ? `<img class="avatar" src="${esc(m.avatar)}" alt="">` : `<div class="avatar">${esc((m.nickname || m.username).slice(0, 1).toUpperCase())}</div>`;
  return `<article class="card">
    <div class="profile-head">${photo}<div class="grow">
      <div class="row"><strong>${esc(m.nickname || m.username)} <span class="meta">@${esc(m.username)}</span></strong><span>${pill(m.status)} ${pill(m.availability)}${m.locked ? ' <span class="pill denied">locked</span>' : ''}</span></div>
      <p class="meta">${esc(m.discordUser)} (${esc(m.discordId)}) · <span style="color:${esc(m.rankColor)}">${esc(m.rank)}</span>${m.badge ? ` · ${esc(m.badge)}` : ''}</p>
    </div></div>
    <details><summary>Edit member</summary>
      <div class="grid">
        <label>Staff rank<input data-field="rank" value="${esc(m.rank)}" maxlength="50"></label>
        <label>Account status<select data-field="status">${option('approved', 'Approved', m.status)}${option('suspended', 'Suspended', m.status)}${option('deactivated', 'Deactivated', m.status)}</select></label>
        <label>Availability<select data-field="availability">${option('active', 'Active', m.availability)}${option('inactive', 'Inactive', m.availability)}${option('on-leave', 'On leave', m.availability)}</select></label>
        <label>Rank colour<input data-field="rankColor" type="color" value="${esc(m.rankColor)}"></label>
        <label>Badge<input data-field="badge" value="${esc(m.badge)}" maxlength="40"></label>
        <label>Nickname<input data-field="nickname" value="${esc(m.nickname)}" maxlength="32"></label>
        <label>Time zone<input data-field="timeZone" value="${esc(m.timeZone)}" maxlength="80"></label>
        <label>Age range<input data-field="ageRange" value="${esc(m.ageRange)}" maxlength="40"></label>
      </div>
      <label>Internal admin note<textarea data-field="note" maxlength="1000">${esc(m.adminNote)}</textarea></label>
      <label>Reset password<input data-field="newPassword" type="password" minlength="12" autocomplete="new-password" placeholder="Leave blank to keep the current password"><small>Also unlocks the account and signs the member out everywhere.</small></label>
      ${m.locked ? '<label class="check"><input type="checkbox" data-field="unlock" checked> Unlock account (too many failed logins)</label>' : ''}
      <div class="actions"><button type="button" data-member="${esc(m.id)}">Save changes</button></div>
      <p class="meta">Signed agreement ${formatDate(m.acceptedAt)}</p>
    </details>
  </article>`;
}

function renderMembers() {
  const q = $('memberSearch').value.trim().toLowerCase();
  const status = $('memberFilter').value;
  const list = state.members.filter(m => (!status || m.status === status)
    && (!q || [m.username, m.nickname, m.discordUser, m.discordId, m.rank, m.badge].some(v => String(v).toLowerCase().includes(q))));
  $('members').innerHTML = list.length ? list.map(memberCard).join('') : empty(state.members.length ? 'No members match that search.' : 'No members yet.');
  passwordToggles($('members'));
  document.querySelectorAll('[data-member]').forEach(button => button.addEventListener('click', () => {
    const card = button.closest('article');
    const body = { id: button.dataset.member };
    card.querySelectorAll('[data-field]').forEach(el => { body[el.dataset.field] = el.type === 'checkbox' ? el.checked : el.value; });
    if (body.status === 'deactivated' && !confirm('Deactivate this member? Their staff role will be removed in Discord.')) return;
    act(button, '/api/admin/member-update', body, 'Member saved.');
  }));
}

function renderRequests() {
  const status = $('requestFilter').value;
  const list = state.requests.filter(r => !status || r.status === status);
  $('requests').innerHTML = list.length ? list.map(r => `<article class="card">
      <div class="row"><strong>${esc(REQUEST_LABELS[r.type] || r.type)} · ${esc(r.username)}</strong>${pill(r.status)}</div>
      <p class="meta">${formatDate(r.createdAt)}${r.reviewedBy ? ` · ${esc(r.status)} by ${esc(r.reviewedBy)}` : ''}</p>
      ${r.data.text || r.data.note ? `<p style="white-space:pre-wrap">${esc(r.data.text || r.data.note)}</p>` : ''}
      ${r.status === 'pending' ? decisionButtons('request', r.id) : ''}
    </article>`).join('') : empty('Nothing here.');
  document.querySelectorAll('[data-request]').forEach(b => b.addEventListener('click', () => act(b, '/api/admin/request-decision', { id: b.dataset.request, status: b.dataset.status }, `Request ${b.dataset.status}.`)));
}

function renderMinecraft() {
  const status = $('minecraftFilter').value;
  const list = state.minecraft.filter(a => !status || a.status === status);
  $('minecraft').innerHTML = list.length ? list.map(a => `<article class="card">
      <div class="row"><strong>⛏️ ${esc(a.minecraftUsername)}</strong>${pill(a.status)}</div>
      <p>Discord: <strong>${esc(a.discordUser)}</strong> <span class="meta">(${esc(a.discordId)})</span></p>
      <p class="meta">Applied ${formatDate(a.createdAt)}${a.reviewedBy ? ` · ${esc(a.status)} by ${esc(a.reviewedBy)}` : ''}</p>
      ${a.status === 'pending' ? decisionButtons('mc', a.id) : ''}
    </article>`).join('') : empty('Nothing here.');
  document.querySelectorAll('[data-mc]').forEach(b => b.addEventListener('click', () => act(b, '/api/admin/minecraft-decision', { id: b.dataset.mc, status: b.dataset.status }, `Minecraft application ${b.dataset.status}.`)));
}

function renderAnnouncements(list) {
  $('announcements').innerHTML = list.length ? list.map(a => `<article class="card">
      <div class="row"><strong>${esc(a.title)}</strong><button class="small secondary" type="button" data-announcement="${esc(a.id)}">Remove</button></div>
      <p style="white-space:pre-wrap">${esc(a.message)}</p><p class="meta">${formatDate(a.createdAt)}${a.author ? ` · ${esc(a.author)}` : ''}</p>
    </article>`).join('') : empty('No announcements yet.');
  document.querySelectorAll('[data-announcement]').forEach(b => b.addEventListener('click', async () => {
    if (!confirm('Remove this announcement from member dashboards? (The Discord message stays.)')) return;
    b.disabled = true;
    try { await api('/api/admin/announcements', { method: 'DELETE', body: { id: b.dataset.announcement } }); await loadTab('announcements'); }
    catch (error) { notice('globalNotice', error.message, 'error'); b.disabled = false; }
  }));
}

function renderAudit(entries) {
  $('audit').innerHTML = entries.length ? `<div class="card">${entries.map(e => `<p><span class="meta">${formatDate(e.createdAt)}</span> · <strong>${esc(e.actor)}</strong> ${esc(e.action.replace(/-/g, ' '))} <strong>${esc(e.target)}</strong>${e.detail ? ` <span class="meta">(${esc(e.detail)})</span>` : ''}</p>`).join('')}</div>` : empty('No activity yet.');
}

// ── Data loading ─────────────────────────────────────────────────────────────
async function loadTab(tab) {
  if (tab === 'applications') renderApplications((await api('/api/admin/applications')).applications);
  if (tab === 'members') { state.members = (await api('/api/admin/members')).members; renderMembers(); }
  if (tab === 'requests') { state.requests = (await api('/api/admin/requests')).requests; renderRequests(); }
  if (tab === 'minecraft') { state.minecraft = (await api('/api/admin/minecraft')).applications; renderMinecraft(); }
  if (tab === 'announcements') renderAnnouncements((await api('/api/admin/announcements')).announcements);
  if (tab === 'audit') renderAudit((await api('/api/admin/audit')).entries);
}

async function refresh() {
  const [overview] = await Promise.all([api('/api/admin/overview'), loadTab(state.tab)]);
  renderStats(overview);
}

function showTab(tab) {
  state.tab = tab;
  document.querySelectorAll('#adminTabs .tab').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  document.querySelectorAll('[data-panel]').forEach(p => p.classList.toggle('hidden', p.dataset.panel !== tab));
  history.replaceState(null, '', `#${tab}`);
  notice('globalNotice', '');
  loadTab(tab).catch(error => { notice('globalNotice', error.message, 'error'); if (error.status === 401) signedOut(); });
}

function signedIn(username) {
  $('adminLogin').classList.add('hidden');
  $('dashboard').classList.remove('hidden');
  $('logout').classList.remove('hidden');
  $('shell').classList.add('wide');
  $('whoami').textContent = `Signed in as ${username}`;
  const initial = location.hash.slice(1);
  showTab(document.querySelector(`[data-tab="${initial}"]`) ? initial : 'applications');
  api('/api/admin/overview').then(renderStats).catch(() => {});
}

function signedOut() {
  $('dashboard').classList.add('hidden');
  $('logout').classList.add('hidden');
  $('adminLogin').classList.remove('hidden');
  $('shell').classList.remove('wide');
  $('whoami').textContent = 'Your session ended. Please sign in again.';
}

// ── Wiring ───────────────────────────────────────────────────────────────────
document.querySelectorAll('#adminTabs .tab').forEach(b => b.addEventListener('click', () => showTab(b.dataset.tab)));
$('memberSearch').addEventListener('input', renderMembers);
$('memberFilter').addEventListener('change', renderMembers);
$('requestFilter').addEventListener('change', renderRequests);
$('minecraftFilter').addEventListener('change', renderMinecraft);

onSubmit($('adminLoginForm'), 'loginNotice', async () => {
  notice('loginNotice', 'Signing in…');
  const { username } = await api('/api/admin/login', { method: 'POST', body: { username: $('adminUsername').value.trim(), password: $('adminPassword').value } });
  $('adminLoginForm').reset();
  notice('loginNotice', '');
  signedIn(username);
});

onSubmit($('announcementForm'), 'announcementNotice', async () => {
  await api('/api/admin/announcements', { method: 'POST', body: { title: $('announcementTitle').value, message: $('announcementMessage').value, postToDiscord: $('announcementDiscord').checked } });
  $('announcementForm').reset();
  $('announcementDiscord').checked = true;
  notice('announcementNotice', 'Announcement posted.', 'ok');
  await loadTab('announcements');
});

onSubmit($('adminPasswordForm'), 'adminPasswordNotice', async () => {
  if ($('adminNewPassword').value !== $('adminConfirmPassword').value) { notice('adminPasswordNotice', 'The new passwords do not match.', 'error'); return; }
  await api('/api/admin/password', { method: 'POST', body: { currentPassword: $('adminCurrentPassword').value, newPassword: $('adminNewPassword').value } });
  $('adminPasswordForm').reset();
  notice('adminPasswordNotice', 'Your admin password was changed.', 'ok');
});

$('logout').addEventListener('click', async () => {
  await api('/api/admin/logout', { method: 'POST', body: {} }).catch(() => {});
  signedOut();
  $('whoami').textContent = 'Signed out.';
});

// Resume an existing admin session.
api('/api/admin/me').then(({ username }) => signedIn(username)).catch(() => {});
