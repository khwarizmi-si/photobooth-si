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
	return storedUsers?.peserta?.photo_enabled ?? true;
}

export const GET: RequestHandler = async ({ platform, locals }) => {
	const wisudawanPhotoEnabled = await getWisudawanPhotoEnabled(platform?.env?.GUMURUH_KV);
	const photoEnabled = locals.user?.role === 'admin' ? true : wisudawanPhotoEnabled;

	return new Response(
		JSON.stringify({
			photo_enabled: photoEnabled,
			wisudawan_photo_enabled: wisudawanPhotoEnabled
		}),
		{ headers: { 'Content-Type': 'application/json' } }
	);
};
