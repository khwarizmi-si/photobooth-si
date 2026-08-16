import type { RequestHandler } from '@sveltejs/kit';

// GET — get active frame (public)
export const GET: RequestHandler = async ({ platform }) => {
	const kv = platform?.env?.GUMURUH_KV;
	if (!kv) {
		return new Response(JSON.stringify({ error: 'KV not configured' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	const activeFrame = await kv.get('active_frame');

	return new Response(JSON.stringify({ active: activeFrame }), {
		headers: { 'Content-Type': 'application/json' }
	});
};

// PUT — set frame aktif (HANYA ADMIN)
export const PUT: RequestHandler = async ({ request, platform, locals }) => {
	// Cek role admin
	if (locals.user?.role !== 'admin') {
		return new Response(
			JSON.stringify({ error: 'Unauthorized - Admin only' }),
			{ status: 403, headers: { 'Content-Type': 'application/json' } }
		);
	}

	const kv = platform?.env?.GUMURUH_KV;
	if (!kv) return new Response(JSON.stringify({ error: 'KV not configured' }), { status: 500 });

	const { key } = (await request.json()) as { key: string };
	if (!key) return new Response(JSON.stringify({ error: 'No key provided' }), { status: 400 });

	await kv.put('active_frame', key);

	return new Response(JSON.stringify({ success: true, active: key }), {
		headers: { 'Content-Type': 'application/json' }
	});
};

// DELETE — hapus frame aktif (HANYA ADMIN)
export const DELETE: RequestHandler = async ({ platform, locals }) => {
	// Cek role admin
	if (locals.user?.role !== 'admin') {
		return new Response(
			JSON.stringify({ error: 'Unauthorized - Admin only' }),
			{ status: 403, headers: { 'Content-Type': 'application/json' } }
		);
	}

	const kv = platform?.env?.GUMURUH_KV;
	if (!kv) return new Response(JSON.stringify({ error: 'KV not configured' }), { status: 500 });

	await kv.delete('active_frame');

	return new Response(JSON.stringify({ success: true }), {
		headers: { 'Content-Type': 'application/json' }
	});
};
