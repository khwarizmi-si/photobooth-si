import type { RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ params, platform }) => {
	const bucket = platform?.env?.FRAME_BUCKET;
	if (!bucket) return new Response('R2 not configured', { status: 500 });
	if (!params.key) return new Response('Missing key', { status: 400 });

	const obj = await bucket.get(params.key);
	if (!obj) return new Response('Frame not found', { status: 404 });

	const buffer = await obj.arrayBuffer();

	return new Response(buffer, {
		headers: {
			'Content-Type': 'image/png',
			'Cache-Control': 'public, max-age=3600',
			'Access-Control-Allow-Origin': '*'
		}
	});
};
