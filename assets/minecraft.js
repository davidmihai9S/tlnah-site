const { $, api, notice, onSubmit, cleanDiscordId, config } = window.TLNAH;

onSubmit($('registerForm'), 'registerNotice', async () => {
  const minecraftUsername = $('minecraftUsername').value.trim();
  const discordId = cleanDiscordId($('discordId').value);
  if (!/^[A-Za-z0-9_. ]{3,32}$/.test(minecraftUsername)) return notice('registerNotice', 'Enter your Minecraft username (letters, numbers, _ . or spaces).', 'error');
  if (!/^\d{17,20}$/.test(discordId)) return notice('registerNotice', 'Your Discord User ID should be a 17–20 digit number.', 'error');
  if (!$('discordUser').value.trim()) return notice('registerNotice', 'Enter your Discord username.', 'error');
  if (!['terms', 'risks', 'signature'].every(id => $(id).checked)) return notice('registerNotice', 'Tick all three boxes to sign the agreement.', 'error');
  notice('registerNotice', 'Submitting application…');
  const data = await api('/api/minecraft-apply', { method: 'POST', body: { minecraftUsername, discordId, discordUser: $('discordUser').value.trim(), termsAccepted: true } });
  const next = data.redirectUrl || config.afterApplyUrl;
  if (next) { notice('registerNotice', 'Application submitted. Redirecting…', 'ok'); setTimeout(() => location.assign(next), 1200); return; }
  $('register').classList.add('hidden');
  $('submitted').classList.remove('hidden');
});
