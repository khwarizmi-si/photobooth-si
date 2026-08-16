/**
 * Run: node scripts/get-refresh-token.mjs
 * Script akan buka browser otomatis, kamu tinggal login,
 * lalu refresh token akan terprint di terminal.
 */

import { createServer } from 'http';
import { exec } from 'child_process';

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID ?? 'ISI_CLIENT_ID_KAMU';
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET ?? 'ISI_CLIENT_SECRET_KAMU';
const REDIRECT_URI = 'http://localhost:5173/auth/callback';
const PORT = 5173;

const params = new URLSearchParams({
	client_id: CLIENT_ID,
	redirect_uri: REDIRECT_URI,
	response_type: 'code',
	scope: [
		'https://www.googleapis.com/auth/drive.file',
		'https://www.googleapis.com/auth/userinfo.email',
		'https://www.googleapis.com/auth/userinfo.profile',
		'openid'
	].join(' '),
	access_type: 'offline',
	prompt: 'consent'
});

const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;

const server = createServer(async (req, res) => {
	const url = new URL(req.url, `http://localhost:${PORT}`);
	if (url.pathname !== '/auth/callback') {
		res.end('Not found');
		return;
	}

	const code = url.searchParams.get('code');
	const error = url.searchParams.get('error');

	if (error || !code) {
		res.writeHead(200, { 'Content-Type': 'text/html' });
		res.end('<h2>❌ Error: ' + (error ?? 'no code') + '</h2><p>Tutup tab ini.</p>');
		server.close();
		return;
	}

	const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
		method: 'POST',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		body: new URLSearchParams({
			code,
			client_id: CLIENT_ID,
			client_secret: CLIENT_SECRET,
			redirect_uri: REDIRECT_URI,
			grant_type: 'authorization_code'
		})
	});

	const data = await tokenRes.json();

	if (data.error) {
		res.writeHead(200, { 'Content-Type': 'text/html' });
		res.end('<h2>❌ ' + data.error + '</h2><p>' + data.error_description + '</p>');
		console.error('\n❌ Error:', data.error, data.error_description);
		server.close();
		return;
	}

	res.writeHead(200, { 'Content-Type': 'text/html' });
	res.end('<h2 style="color:green">✅ Berhasil! Tutup tab ini dan lihat terminal.</h2>');

	console.log('\n✅ Refresh token berhasil didapat!\n');
	console.log('GOOGLE_REFRESH_TOKEN =', data.refresh_token);
	console.log('\nBeritahu Claude refresh token ini untuk di-set ke Cloudflare.');

	server.close();
});

server.listen(PORT, () => {
	console.log('\n=== GUMURUH PHOTOBOOTH — Google OAuth Setup ===\n');
	console.log('Membuka browser untuk login Google...\n');
	exec(`open "${authUrl}"`);
});
