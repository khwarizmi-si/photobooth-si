import { fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

interface User {
	password: string;
	role: 'admin' | 'user';
	name: string;
	photo_enabled: boolean;
}

const DEFAULT_USERS: Record<string, User> = {
	panitia: {
		password: 'gumuruh2026',
		role: 'admin',
		name: 'Panitia Gumuruh',
		photo_enabled: true
	},
	peserta: {
		password: 'gumuruh2026',
		role: 'user',
		name: 'Peserta',
		photo_enabled: true
	}
};

export const load: PageServerLoad = async ({ url }) => {
	const error = url.searchParams.get('error');
	return { error };
};

export const actions: Actions = {
	default: async ({ request, platform, cookies }) => {
		const formData = await request.formData();
		const username = formData.get('username') as string;
		const password = formData.get('password') as string;

		if (!username || !password) {
			return fail(400, { error: 'missing_credentials' });
		}

		const kv = platform?.env?.GUMURUH_KV;
		if (!kv) {
			return fail(500, { error: 'server_error' });
		}

		let users: Record<string, User>;
		const storedUsers = await kv.get('users', { type: 'json' });
		if (storedUsers) {
			users = storedUsers as Record<string, User>;
		} else {
			users = DEFAULT_USERS;
			await kv.put('users', JSON.stringify(users));
		}

		const user = users[username];
		if (!user || user.password !== password) {
			return fail(401, { error: 'wrong_credentials' });
		}

		const sessionId = crypto.randomUUID();
		const sessionData = {
			username,
			role: user.role,
			name: user.name,
			photo_enabled: user.photo_enabled,
			created_at: Date.now(),
			expires_at: Date.now() + 8 * 60 * 60 * 1000
		};

		await kv.put(`session_${sessionId}`, JSON.stringify(sessionData), {
			expirationTtl: 28800
		});

		cookies.set('session_id', sessionId, {
			httpOnly: true,
			secure: true,
			sameSite: 'lax',
			path: '/',
			maxAge: 28800
		});

		redirect(302, '/');
	}
};
