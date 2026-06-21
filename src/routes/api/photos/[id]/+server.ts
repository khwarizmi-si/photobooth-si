import type { RequestHandler } from '@sveltejs/kit';

interface PhotoMetadata {
	id: string;
	original_urls: string[];
	framed_url: string;
	thumbnail_url: string;
	created_by: string;
	created_at: string;
	frame_used?: string;
}

// GET - Get photo by ID
export const GET: RequestHandler = async ({ params, platform }) => {
	const kv = platform?.env?.WISUDA_KV;
	if (!kv) {
		return new Response(JSON.stringify({ error: 'KV not configured' }), { status: 500 });
	}

	const photos = ((await kv.get('photos', { type: 'json' })) as PhotoMetadata[]) ?? [];
	const photo = photos.find((p) => p.id === params.id);

	if (!photo) {
		return new Response(JSON.stringify({ error: 'Photo not found' }), { status: 404 });
	}

	return new Response(JSON.stringify({ photo }), {
		headers: { 'Content-Type': 'application/json' }
	});
};

// DELETE - Delete photo (admin only)
export const DELETE: RequestHandler = async ({ params, platform, locals }) => {
	if (locals.user?.role !== 'admin') {
		return new Response(JSON.stringify({ error: 'Unauthorized - Admin only' }), { status: 403 });
	}

	const kv = platform?.env?.WISUDA_KV;
	const bucket = platform?.env?.PHOTO_BUCKET;

	if (!kv) {
		return new Response(JSON.stringify({ error: 'KV not configured' }), { status: 500 });
	}

	const photos = ((await kv.get('photos', { type: 'json' })) as PhotoMetadata[]) ?? [];
	const photoIndex = photos.findIndex((p) => p.id === params.id);

	if (photoIndex === -1) {
		return new Response(JSON.stringify({ error: 'Photo not found' }), { status: 404 });
	}

	const photo = photos[photoIndex];

	// Delete from R2
	if (bucket) {
		const datePath = photo.created_at.slice(0, 10).replace(/-/g, '/');
		const keys = [
			`${datePath}/framed/${photo.id}_frame.jpg`,
			`${datePath}/thumb/${photo.id}_thumb.jpg`,
			...photo.original_urls.map((_, i) => `${datePath}/original/${photo.id}_${i + 1}.jpg`)
		];

		await Promise.all(keys.map((key) => bucket.delete(key).catch(() => {})));
	}

	// Remove from KV
	photos.splice(photoIndex, 1);
	await kv.put('photos', JSON.stringify(photos));

	// Decrement photo count
	const current = parseInt((await kv.get('photo_count')) ?? '0');
	await kv.put('photo_count', String(Math.max(0, current - 1)));

	return new Response(JSON.stringify({ success: true }), {
		headers: { 'Content-Type': 'application/json' }
	});
};
