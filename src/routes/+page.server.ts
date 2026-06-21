import type { PageServerLoad } from './$types';

interface KVUser {
	password: string;
	role: 'admin' | 'user';
	name: string;
	photo_enabled: boolean;
}

export const load: PageServerLoad = async ({ locals, platform }) => {
	const kv = platform?.env?.WISUDA_KV;

	// Semua user bisa akses beranda
	// Admin: load full dashboard data
	if (locals.user?.role === 'admin') {
		const photoCount = parseInt((await kv?.get('photo_count')) ?? '0');
		const activeFrame = await kv?.get('active_frame');
		const storageUsed = await kv?.get('storage_used');

		let wisudawanPhotoEnabled = false;
		if (kv) {
			try {
				const storedUsers = (await kv.get('users', 'json')) as Record<string, KVUser> | null;
				wisudawanPhotoEnabled = storedUsers?.['wisudawan']?.photo_enabled ?? false;
			} catch {
				wisudawanPhotoEnabled = false;
			}
		}

		return {
			user: locals.user,
			photoCount,
			activeFrame: activeFrame ?? null,
			storageUsed: storageUsed ?? '0',
			wisudawanPhotoEnabled
		};
	}

	// Public/user: hanya data yang dibutuhkan beranda
	return {
		user: locals.user ?? null,
		photoCount: null,
		activeFrame: null,
		storageUsed: '0',
		wisudawanPhotoEnabled: false
	};
};
