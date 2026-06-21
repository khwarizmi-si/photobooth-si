import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async (event) => {
	const { locals, platform } = event;

	// Hanya admin yang bisa akses halaman frame
	if (!locals.user || locals.user.role !== 'admin') {
		throw redirect(302, '/');
	}

	const bucket = platform?.env?.FRAME_BUCKET;
	const kv = platform?.env?.WISUDA_KV;

	const activeFrame = (await kv?.get('active_frame')) ?? null;

	if (!bucket) return { frames: [], activeFrame };

	const list = await bucket.list();
	const frames = list.objects.map((obj) => ({
		key: obj.key,
		size: obj.size,
		uploaded: obj.uploaded?.toISOString() ?? null
	}));

	return { frames, activeFrame };
};
