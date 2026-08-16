import type { RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ params, platform }) => {
	const bucket = platform?.env?.GUMURUH_BUCKET;
	if (!bucket) return new Response('R2 not configured', { status: 500 });

	const key = params.key;
	if (!key) return new Response('Missing key', { status: 400 });

	const obj = await bucket.get(key);
	if (!obj) return new Response('Not found', { status: 404 });

	const buffer = await obj.arrayBuffer();
	const contentType = obj.httpMetadata?.contentType ?? 'image/jpeg';

	return new Response(buffer, {
		headers: {
			'Content-Type': contentType,
			'Cache-Control': 'public, max-age=86400'
		}
	});
};
