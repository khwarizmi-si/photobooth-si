import type { RequestHandler } from '@sveltejs/kit';
import type { KVNamespace } from '@cloudflare/workers-types';

interface StoredUser {
	password: string;
	role: 'admin' | 'user';
	name: string;
	photo_enabled: boolean;
}

async function getWisudawanPhotoEnabled(kv: KVNamespace | undefined): Promise<boolean> {
	if (!kv) return true;
	const storedUsers = (await kv.get('users', { type: 'json' })) as Record<string, StoredUser> | null;
	return storedUsers?.wisudawan?.photo_enabled ?? true;
}

export const GET: RequestHandler = async ({ platform, locals }) => {
	if (!locals.user) {
		return new Response(JSON.stringify({ error: 'Unauthorized' }), {
			status: 401,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	const wisudawanPhotoEnabled = await getWisudawanPhotoEnabled(platform?.env?.WISUDA_KV);
	const photoEnabled = locals.user.role === 'admin' ? true : wisudawanPhotoEnabled;

	return new Response(
		JSON.stringify({
			photo_enabled: photoEnabled,
			wisudawan_photo_enabled: wisudawanPhotoEnabled
		}),
		{ headers: { 'Content-Type': 'application/json' } }
	);
};
