import type { RequestHandler } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';

// User database - HANYA 2 AKUN sesuai PRD
interface User {
	password: string;
	role: 'admin' | 'user';
	name: string;
	photo_enabled: boolean;
}

const DEFAULT_USERS: Record<string, User> = {
	panitia: {
		password: 'wisuda2026',
		role: 'admin',
		name: 'Panitia Wisuda',
		photo_enabled: true
	},
	wisudawan: {
		password: 'wisuda2026',
		role: 'user',
		name: 'Wisudawan',
		photo_enabled: false
	}
};

export const GET: RequestHandler = async () => {
	return new Response(null, {
		status: 302,
		headers: { Location: '/auth' }
	});
};

export const POST: RequestHandler = async ({ request, platform, cookies }) => {
	const formData = await request.formData();
	const username = formData.get('username') as string;
	const password = formData.get('password') as string;

	if (!username || !password) {
		return new Response(null, {
			status: 302,
			headers: { Location: '/auth?error=missing_credentials' }
		});
	}

	const kv = platform?.env?.WISUDA_KV;
	if (!kv) {
		return new Response('KV namespace not configured', { status: 500 });
	}

	// Get users from KV atau gunakan default
	let users: Record<string, User>;
	const storedUsers = await kv.get('users', { type: 'json' });
	if (storedUsers) {
		users = storedUsers as Record<string, User>;
	} else {
		// Inisialisasi dengan default users
		users = DEFAULT_USERS;
		await kv.put('users', JSON.stringify(users));
	}

	const user = users[username];

	if (!user || user.password !== password) {
		return new Response(null, {
			status: 302,
			headers: { Location: '/auth?error=wrong_credentials' }
		});
	}

	// Create session
	const sessionId = crypto.randomUUID();
	const sessionData = {
		username,
		role: user.role,
		name: user.name,
		photo_enabled: user.photo_enabled,
		created_at: Date.now(),
		expires_at: Date.now() + 8 * 60 * 60 * 1000 // 8 jam
	};

	await kv.put(`session_${sessionId}`, JSON.stringify(sessionData), {
		expirationTtl: 28800 // 8 jam dalam detik
	});

	const response = new Response(null, {
		status: 302,
		headers: { Location: '/' }
	});

	response.headers.append(
		'Set-Cookie',
		`session_id=${sessionId}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=28800`
	);

	return response;
};
