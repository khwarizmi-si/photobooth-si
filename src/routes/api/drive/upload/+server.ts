import type { RequestHandler } from '@sveltejs/kit';

interface GoogleDriveEnv {
	GOOGLE_CLIENT_ID: string;
	GOOGLE_CLIENT_SECRET: string;
	GOOGLE_REFRESH_TOKEN: string;
	GOOGLE_DRIVE_FOLDER_ID: string;
}

async function getAccessToken(env: GoogleDriveEnv): Promise<string> {
	const res = await fetch('https://oauth2.googleapis.com/token', {
		method: 'POST',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		body: new URLSearchParams({
			client_id: env.GOOGLE_CLIENT_ID,
			client_secret: env.GOOGLE_CLIENT_SECRET,
			refresh_token: env.GOOGLE_REFRESH_TOKEN,
			grant_type: 'refresh_token'
		})
	});
	if (!res.ok) throw new Error('Failed to refresh access token');
	const data = (await res.json()) as { access_token: string };
	return data.access_token;
}

interface PhotoMetadata {
	id: string;
	original_urls: string[];
	framed_url: string;
	thumbnail_url: string;
	created_by: string;
	created_at: string;
	frame_used?: string;
}

export const POST: RequestHandler = async ({ request, platform, locals }) => {
	if (!locals.user) {
		return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
	}

	// Cek permission foto untuk user
	if (locals.user.role === 'user' && !locals.user.photo_enabled) {
		return new Response(
			JSON.stringify({ error: 'Fitur foto dinonaktifkan oleh admin' }),
			{ status: 403, headers: { 'Content-Type': 'application/json' } }
		);
	}

	const env = platform?.env;
	if (
		!env?.GOOGLE_CLIENT_ID ||
		!env?.GOOGLE_CLIENT_SECRET ||
		!env?.GOOGLE_REFRESH_TOKEN ||
		!env?.GOOGLE_DRIVE_FOLDER_ID
	) {
		return new Response(JSON.stringify({ error: 'Google Drive not configured' }), { status: 500 });
	}
	const googleEnv: GoogleDriveEnv = {
		GOOGLE_CLIENT_ID: env.GOOGLE_CLIENT_ID,
		GOOGLE_CLIENT_SECRET: env.GOOGLE_CLIENT_SECRET,
		GOOGLE_REFRESH_TOKEN: env.GOOGLE_REFRESH_TOKEN,
		GOOGLE_DRIVE_FOLDER_ID: env.GOOGLE_DRIVE_FOLDER_ID
	};

	const body = (await request.json()) as {
		image: string;
		original_photos?: string[];
		filename?: string;
		frame_used?: string;
	};
	const { image, original_photos, filename, frame_used } = body;

	if (!image) {
		return new Response(JSON.stringify({ error: 'No image provided' }), { status: 400 });
	}

	const now = new Date();
	const ts = now.toISOString().replace(/[-:T]/g, '').slice(0, 15);
	const finalFilename = filename ?? `wisuda_${ts}.jpg`;

	try {
		const accessToken = await getAccessToken(googleEnv);

		// Upload framed photo ke Google Drive
		const uploadSingle = async (imgData: string, fname: string) => {
			const base64Data = imgData.replace(/^data:image\/\w+;base64,/, '');
			const binaryData = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));

			const boundary = '-------wisuda_boundary';
			const metadata = JSON.stringify({
				name: fname,
				parents: [googleEnv.GOOGLE_DRIVE_FOLDER_ID]
			});

			const metaPart = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n`;
			const dataPart = `--${boundary}\r\nContent-Type: image/jpeg\r\n\r\n`;
			const endPart = `\r\n--${boundary}--`;

			const encoder = new TextEncoder();
			const parts = [
				encoder.encode(metaPart),
				encoder.encode(dataPart),
				binaryData,
				encoder.encode(endPart)
			];

			const totalLength = parts.reduce((sum, p) => sum + p.length, 0);
			const reqBody = new Uint8Array(totalLength);
			let offset = 0;
			for (const part of parts) {
				reqBody.set(part, offset);
				offset += part.length;
			}

			return fetch(
				'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink',
				{
					method: 'POST',
					headers: {
						Authorization: `Bearer ${accessToken}`,
						'Content-Type': `multipart/related; boundary=${boundary}`,
						'Content-Length': String(totalLength)
					},
					body: reqBody
				}
			);
		};

		// Upload framed photo
		const uploadRes = await uploadSingle(image, finalFilename);
		if (!uploadRes.ok) {
			const err = await uploadRes.text();
			return new Response(JSON.stringify({ error: 'Upload failed', detail: err }), { status: 500 });
		}

		const file = (await uploadRes.json()) as { id: string; name: string; webViewLink: string };

		// Upload original photos jika ada
		const originalUrls: string[] = [];
		if (original_photos && original_photos.length > 0) {
			for (let i = 0; i < original_photos.length; i++) {
				const origRes = await uploadSingle(original_photos[i], `wisuda_${ts}_${i + 1}_original.jpg`);
				if (origRes.ok) {
					const origFile = (await origRes.json()) as { webViewLink: string };
					originalUrls.push(origFile.webViewLink);
				}
			}
		}

		// Simpan metadata ke KV
		if (env.WISUDA_KV) {
			const photoId = `WISUDA_${ts}_FOTO_${Date.now()}`;
			const photoData: PhotoMetadata = {
				id: photoId,
				original_urls: originalUrls,
				framed_url: file.webViewLink,
				thumbnail_url: file.webViewLink, // Gunakan framed URL sebagai thumbnail
				created_by: locals.user.username,
				created_at: now.toISOString(),
				frame_used: frame_used
			};

			// Get existing photos
			const existingPhotos = ((await env.WISUDA_KV.get('photos', { type: 'json' })) as PhotoMetadata[]) ?? [];
			existingPhotos.unshift(photoData);
			await env.WISUDA_KV.put('photos', JSON.stringify(existingPhotos.slice(0, 1000))); // Max 1000 foto

			// Increment photo count
			const current = parseInt((await env.WISUDA_KV.get('photo_count')) ?? '0');
			await env.WISUDA_KV.put('photo_count', String(current + 1));
		}

		return new Response(JSON.stringify({ success: true, file }), {
			headers: { 'Content-Type': 'application/json' }
		});
	} catch (e) {
		const msg = e instanceof Error ? e.message : 'Unknown error';
		return new Response(JSON.stringify({ error: msg }), { status: 500 });
	}
};
