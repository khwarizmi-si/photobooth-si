import type { RequestHandler } from '@sveltejs/kit';

interface User {
	password: string;
	role: 'admin' | 'user';
	name: string;
	photo_enabled: boolean;
}

// PUT — Toggle fitur foto untuk user (HANYA ADMIN)
export const PUT: RequestHandler = async ({ request, platform, locals }) => {
	// Cek role admin
	if (locals.user?.role !== 'admin') {
		return new Response(
			JSON.stringify({ error: 'Unauthorized - Admin only' }),
			{ status: 403, headers: { 'Content-Type': 'application/json' } }
		);
	}

	const kv = platform?.env?.GUMURUH_KV;
	if (!kv) {
		return new Response(
			JSON.stringify({ error: 'KV not configured' }),
			{ status: 500, headers: { 'Content-Type': 'application/json' } }
		);
	}

	const { photo_enabled } = (await request.json()) as { photo_enabled: boolean };
	if (typeof photo_enabled !== 'boolean') {
		return new Response(
			JSON.stringify({ error: 'Invalid photo_enabled value' }),
			{ status: 400, headers: { 'Content-Type': 'application/json' } }
		);
	}

	// Get users dari KV
	const storedUsers = await kv.get('users', { type: 'json' }) as Record<string, User> | null;
	if (!storedUsers || !storedUsers['peserta']) {
		return new Response(
			JSON.stringify({ error: 'User not found' }),
			{ status: 404, headers: { 'Content-Type': 'application/json' } }
		);
	}

	// Update photo_enabled untuk user peserta
	storedUsers['peserta'].photo_enabled = photo_enabled;
	await kv.put('users', JSON.stringify(storedUsers));

	return new Response(
		JSON.stringify({
			success: true,
			message: `Fitur foto ${photo_enabled ? 'diaktifkan' : 'dinonaktifkan'} untuk user`,
			photo_enabled
		}),
		{ headers: { 'Content-Type': 'application/json' } }
	);
};
