(async (page) => {
  const fs = require('fs');
  const env = {};
  for (const line of fs.readFileSync('.env.user.local', 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (match) env[match[1]] = match[2];
  }
  await page.getByRole('textbox', { name: 'Email atau Nama Pengguna' }).fill(env.ACCOUNT_1_EMAIL || env.ACCOUNT_1_USERNAME);
  await page.getByRole('textbox', { name: 'Kata Sandi' }).fill(env.ACCOUNT_1_PASSWORD);
  await page.getByRole('button', { name: 'Tekan Enter untuk Masuk' }).click();
  await page.waitForURL('**/app/**');
  return page.url();
})
