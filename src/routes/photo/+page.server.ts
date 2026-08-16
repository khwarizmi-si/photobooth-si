import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, platform }) => {
	const kv = platform?.env?.GUMURUH_KV;

	// Cek global photo_enabled flag (dari KV)
	let photoEnabled = true;
	if (kv) {
		try {
			const storedUsers = (await kv.get('users', 'json')) as Record<
				string,
				{ photo_enabled?: boolean }
			> | null;
			photoEnabled = storedUsers?.['peserta']?.photo_enabled ?? true;
		} catch {
			photoEnabled = true;
		}
	}

	const bucket = platform?.env?.GUMURUH_BUCKET;
	let frames: Array<{ key: string }> = [];
	if (bucket) {
		const list = await bucket.list({ prefix: 'frames/' });
		frames = list.objects.map((o) => ({ key: o.key }));
	}

	const activeFrame = (await kv?.get('active_frame')) ?? (frames[0]?.key ?? null);

	return { frames, activeFrame, photoEnabled, user: locals.user };
};
