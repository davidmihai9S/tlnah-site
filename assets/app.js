const { $, api, notice, onSubmit, cleanDiscordId, config } = window.TLNAH;

function show(view) {
  document.querySelectorAll('.tab').forEach(tab => tab.classList.toggle('active', tab.dataset.view === view));
  document.querySelectorAll('.view').forEach(section => section.classList.toggle('hidden', section.id !== view));
}
document.querySelectorAll('.tab').forEach(tab => tab.addEventListener('click', () => { show(tab.dataset.view); history.replaceState(null, '', tab.dataset.view === 'login' ? '?login=1' : location.pathname); }));
if (new URLSearchParams(location.search).get('login') === '1') show('login');

const allChecked = () => ['terms', 'risks', 'signature'].every(id => $(id).checked);

onSubmit($('registerForm'), 'registerNotice', async () => {
  const username = $('username').value.trim();
  const discordId = cleanDiscordId($('discordId').value);
  if (!/^[A-Za-z0-9_-]{3,32}$/.test(username)) return notice('registerNotice', 'Usernames are 3–32 characters: letters, numbers, _ or -.', 'error');
  if ($('password').value.length < 12) return notice('registerNotice', 'Use a password of at least 12 characters.', 'error');
  if (!/^\d{17,20}$/.test(discordId)) return notice('registerNotice', 'Your Discord User ID should be a 17–20 digit number.', 'error');
  if (!$('discordUser').value.trim()) return notice('registerNotice', 'Enter your Discord username.', 'error');
  if (!allChecked()) return notice('registerNotice', 'Tick all three boxes to sign the agreement.', 'error');
  notice('registerNotice', 'Checking your Discord account and submitting…');
  const data = await api('/api/register', { method: 'POST', body: {
    username, password: $('password').value, discordId, discordUser: $('discordUser').value.trim(), termsAccepted: true,
  } });
  const next = data.redirectUrl || config.afterApplyUrl;
  if (next) { notice('registerNotice', 'Application submitted. Redirecting…', 'ok'); setTimeout(() => location.assign(next), 1200); return; }
  $('registerForm').reset();
  document.querySelector('.tabs').classList.add('hidden');
  show('submitted');
});

onSubmit($('loginForm'), 'loginNotice', async () => {
  notice('loginNotice', 'Signing in…');
  await api('/api/login', { method: 'POST', body: { username: $('loginUsername').value.trim(), password: $('loginPassword').value } });
  location.assign('dashboard');
});

api('/api/login-hint').then(({ username }) => {
  $('loginUsername').value = username;
  $('loginUsernameLabel').classList.add('hidden');
  $('differentAccount').classList.remove('hidden');
  notice('sessionLoginHint', `You're already signed in as ${username}. `);
  const link = document.createElement('a'); link.href = 'dashboard'; link.textContent = 'Open your dashboard →';
  $('sessionLoginHint').appendChild(link);
}).catch(() => {});

$('differentAccount').addEventListener('click', () => {
  $('loginUsername').value = '';
  $('loginUsernameLabel').classList.remove('hidden');
  $('differentAccount').classList.add('hidden');
  notice('sessionLoginHint', '');
  $('loginUsername').focus();
});

// Tell visitors up front if the bot (and so the API) is offline.
api('/api/status').catch(error => {
  if (error.status === 0) { $('statusBanner').textContent = 'The staff portal is temporarily offline. Applications and logins will work again once the bot is back.'; $('statusBanner').classList.remove('hidden'); }
});
