import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ platform, locals }) => {
	const kv = platform?.env?.WISUDA_KV;
	const photoCount = parseInt((await kv?.get('photo_count')) ?? '0');

	// Get photos list dari KV
	const photosData = await kv?.get('photos', { type: 'json' });
	const photos = (photosData as PhotoMetadata[]) ?? [];

	// Get app URL for QR code
	const appUrl = 'https://photobooth-wisuda-si.pages.dev';

	return {
		user: locals.user,
		photoCount,
		photos: photos.slice(0, 50),
		galleryUrl: `${appUrl}/gallery`
	};
};

interface PhotoMetadata {
	id: string;
	original_urls: string[];
	framed_url: string;
	thumbnail_url: string;
	created_by: string;
	created_at: string;
	frame_used?: string;
}
