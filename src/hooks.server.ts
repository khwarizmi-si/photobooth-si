import type { Handle } from '@sveltejs/kit';

const PUBLIC_ROUTES = ['/auth', '/auth/login', '/auth/logout'];
const PUBLIC_API_ROUTES = ['/api/frames/active', '/api/frames/'];

interface SessionData {
	username: string;
	role: 'admin' | 'user';
	name: string;
	photo_enabled: boolean;
	created_at: number;
	expires_at: number;
}

interface StoredUser {
	password: string;
	role: 'admin' | 'user';
	name: string;
	photo_enabled: boolean;
}

export const handle: Handle = async ({ event, resolve }) => {
	const { platform, cookies, url } = event;

	const sessionId = cookies.get('session_id');
	event.locals.user = null;

	if (sessionId && platform?.env?.GUMURUH_KV) {
		const sessionData = (await platform.env.GUMURUH_KV.get(
			`session_${sessionId}`,
			'json'
		)) as SessionData | null;

		if (sessionData && sessionData.expires_at > Date.now()) {
			const storedUsers = (await platform.env.GUMURUH_KV.get('users', {
				type: 'json'
			})) as Record<string, StoredUser> | null;
			const currentUser = storedUsers?.[sessionData.username];

			event.locals.user = {
				username: sessionData.username,
				role: currentUser?.role ?? sessionData.role,
				name: currentUser?.name ?? sessionData.name,
				photo_enabled: currentUser?.photo_enabled ?? sessionData.photo_enabled
			};
		}
	}

	// Proteksi halaman admin (frame management)
	const adminPages = ['/frames'];
	if (adminPages.some((p) => url.pathname === p || url.pathname.startsWith(p + '/')) && event.locals.user?.role !== 'admin') {
		return new Response(null, { status: 302, headers: { Location: '/auth' } });
	}

	// Proteksi API admin
	if (url.pathname.startsWith('/api/admin/') && event.locals.user?.role !== 'admin') {
		return new Response(JSON.stringify({ error: 'Unauthorized - Admin only' }), {
			status: 403,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	// Proteksi write API frame management (hanya admin) — GET boleh publik untuk load gambar frame
	if (
		url.pathname.startsWith('/api/frames') &&
		event.request.method !== 'GET' &&
		event.locals.user?.role !== 'admin'
	) {
		return new Response(JSON.stringify({ error: 'Unauthorized - Admin only' }), {
			status: 403,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	return resolve(event);
};
