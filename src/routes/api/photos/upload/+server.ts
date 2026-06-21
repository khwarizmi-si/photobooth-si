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

function generateFileName(): string {
	const now = new Date();
	const ts = now.toISOString().replace(/[-:T]/g, '').slice(0, 15);
	return `WISUDA_${ts}_FOTO_${Date.now()}`;
}

function getDatePath(): string {
	const now = new Date();
	const year = now.getFullYear();
	const month = String(now.getMonth() + 1).padStart(2, '0');
	const day = String(now.getDate()).padStart(2, '0');
	return `${year}/${month}/${day}`;
}

function base64ToBuffer(base64: string): Uint8Array {
	const base64Data = base64.replace(/^data:image\/\w+;base64,/, '');
	return Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
}

export const POST: RequestHandler = async ({ request, platform, locals }) => {

	const env = platform?.env;
	const bucket = env?.PHOTO_BUCKET;
	const kv = env?.WISUDA_KV;

	if (!bucket) {
		return new Response(JSON.stringify({ error: 'R2 bucket not configured' }), { status: 500 });
	}

	if (!kv) {
		return new Response(JSON.stringify({ error: 'KV not configured' }), { status: 500 });
	}

	const body = (await request.json()) as {
		framed_photo: string;
		original_photos: string[];
		thumbnail: string;
		frame_used?: string;
	};

	const { framed_photo, original_photos, thumbnail, frame_used } = body;

	if (!framed_photo) {
		return new Response(JSON.stringify({ error: 'No framed photo provided' }), { status: 400 });
	}

	try {
		const fileName = generateFileName();
		const datePath = getDatePath();

		// Upload original photos
		const originalUrls: string[] = [];
		if (original_photos && original_photos.length > 0) {
			for (let i = 0; i < original_photos.length; i++) {
				const key = `${datePath}/original/${fileName}_${i + 1}.jpg`;
				const buffer = base64ToBuffer(original_photos[i]);
				await bucket.put(key, buffer, {
					httpMetadata: { contentType: 'image/jpeg' }
				});
				originalUrls.push(`/api/photos/view/${key}`);
			}
		}

		// Upload framed photo
		const framedKey = `${datePath}/framed/${fileName}_frame.jpg`;
		const framedBuffer = base64ToBuffer(framed_photo);
		await bucket.put(framedKey, framedBuffer, {
			httpMetadata: { contentType: 'image/jpeg' }
		});
		const framedUrl = `/api/photos/view/${framedKey}`;

		// Upload thumbnail
		const thumbKey = `${datePath}/thumb/${fileName}_thumb.jpg`;
		const thumbBuffer = base64ToBuffer(thumbnail);
		await bucket.put(thumbKey, thumbBuffer, {
			httpMetadata: { contentType: 'image/jpeg' }
		});
		const thumbUrl = `/api/photos/view/${thumbKey}`;

		// Simpan metadata ke KV
		const photoData: PhotoMetadata = {
			id: fileName,
			original_urls: originalUrls,
			framed_url: framedUrl,
			thumbnail_url: thumbUrl,
			created_by: locals.user?.username ?? 'wisudawan',
			created_at: new Date().toISOString(),
			frame_used
		};

		// Get existing photos
		const existingPhotos = ((await kv.get('photos', { type: 'json' })) as PhotoMetadata[]) ?? [];
		existingPhotos.unshift(photoData);
		await kv.put('photos', JSON.stringify(existingPhotos.slice(0, 1000))); // Max 1000 foto

		// Increment photo count
		const current = parseInt((await kv.get('photo_count')) ?? '0');
		await kv.put('photo_count', String(current + 1));

		return new Response(
			JSON.stringify({
				success: true,
				photo: photoData
			}),
			{ headers: { 'Content-Type': 'application/json' } }
		);
	} catch (e) {
		const msg = e instanceof Error ? e.message : 'Unknown error';
		return new Response(JSON.stringify({ error: msg }), { status: 500 });
	}
};
