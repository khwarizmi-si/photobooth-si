import type { RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ platform, cookies }) => {
	const sessionId = cookies.get('session_id');

	if (sessionId && platform?.env?.GUMURUH_KV) {
		await platform.env.GUMURUH_KV.delete(`session_${sessionId}`);
	}

	const response = new Response(null, {
		status: 302,
		headers: { Location: '/auth' }
	});

	response.headers.append(
		'Set-Cookie',
		'session_id=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0'
	);

	return response;
};
