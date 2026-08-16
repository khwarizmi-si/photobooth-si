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

export const GET: RequestHandler = async ({ platform, url }) => {
	const kv = platform?.env?.GUMURUH_KV;
	if (!kv) {
		return new Response(JSON.stringify({ photos: [], total: 0 }), {
			headers: { 'Content-Type': 'application/json' }
		});
	}

	const photos = ((await kv.get('photos', { type: 'json' })) as PhotoMetadata[]) ?? [];

	// Pagination
	const page = parseInt(url.searchParams.get('page') || '1');
	const limit = parseInt(url.searchParams.get('limit') || '20');
	const start = (page - 1) * limit;
	const end = start + limit;

	return new Response(
		JSON.stringify({
			photos: photos.slice(start, end),
			total: photos.length,
			page,
			limit
		}),
		{ headers: { 'Content-Type': 'application/json' } }
	);
};
