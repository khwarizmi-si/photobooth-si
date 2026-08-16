import type { RequestHandler } from '@sveltejs/kit';

// GET — list semua frame dari R2 (public, untuk mendapatkan daftar frame)
export const GET: RequestHandler = async ({ platform, locals }) => {
	const bucket = platform?.env?.GUMURUH_BUCKET;
	if (!bucket) return new Response(JSON.stringify({ frames: [] }), { status: 200 });

	const list = await bucket.list({ prefix: 'frames/' });
	const frames = list.objects.map((obj) => ({
		key: obj.key,
		size: obj.size,
		uploaded: obj.uploaded
	}));

	return new Response(JSON.stringify({ frames }), {
		headers: { 'Content-Type': 'application/json' }
	});
};

// POST — upload frame baru ke R2 (HANYA ADMIN)
export const POST: RequestHandler = async ({ request, platform, locals }) => {
	// Cek role admin
	if (locals.user?.role !== 'admin') {
		return new Response(
			JSON.stringify({ error: 'Unauthorized - Admin only' }),
			{ status: 403, headers: { 'Content-Type': 'application/json' } }
		);
	}

	const bucket = platform?.env?.GUMURUH_BUCKET;
	if (!bucket) return new Response(JSON.stringify({ error: 'R2 not configured' }), { status: 500 });

	const formData = await request.formData();
	const file = formData.get('frame') as File | null;

	if (!file) return new Response(JSON.stringify({ error: 'No file provided' }), { status: 400 });
	if (!file.name.endsWith('.png')) {
		return new Response(JSON.stringify({ error: 'Hanya file PNG yang diizinkan' }), { status: 400 });
	}

	// Cek ukuran file (max 5MB)
	if (file.size > 5 * 1024 * 1024) {
		return new Response(JSON.stringify({ error: 'Ukuran file maksimal 5MB' }), { status: 400 });
	}

	const key = `frames/frame_${Date.now()}_${file.name}`;
	const buffer = await file.arrayBuffer();

	await bucket.put(key, buffer, {
		httpMetadata: { contentType: 'image/png' }
	});

	return new Response(JSON.stringify({ success: true, key }), {
		headers: { 'Content-Type': 'application/json' }
	});
};

// DELETE — hapus frame dari R2 (HANYA ADMIN)
export const DELETE: RequestHandler = async ({ request, platform, locals }) => {
	// Cek role admin
	if (locals.user?.role !== 'admin') {
		return new Response(
			JSON.stringify({ error: 'Unauthorized - Admin only' }),
			{ status: 403, headers: { 'Content-Type': 'application/json' } }
		);
	}

	const bucket = platform?.env?.GUMURUH_BUCKET;
	if (!bucket) return new Response(JSON.stringify({ error: 'R2 not configured' }), { status: 500 });

	const { key } = (await request.json()) as { key: string };
	if (!key) return new Response(JSON.stringify({ error: 'No key provided' }), { status: 400 });

	await bucket.delete(key);

	// Kalau frame yang dihapus adalah frame aktif, reset active_frame
	const kv = platform?.env?.GUMURUH_KV;
	if (kv) {
		const active = await kv.get('active_frame');
		if (active === key) await kv.delete('active_frame');
	}

	return new Response(JSON.stringify({ success: true }), {
		headers: { 'Content-Type': 'application/json' }
	});
};
