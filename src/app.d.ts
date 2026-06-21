import type { KVNamespace, R2Bucket } from '@cloudflare/workers-types';

declare global {
	namespace App {
		interface Error {
			message: string;
		}
		interface Locals {
			user: {
				username: string;
				role: 'admin' | 'user';
				name: string;
				photo_enabled: boolean;
			} | null;
		}
		interface PageData {}
		interface PageState {}
		interface Platform {
			env: {
				WISUDA_KV: KVNamespace;
				FRAME_BUCKET: R2Bucket;
				PHOTO_BUCKET: R2Bucket;
				ADMIN_PASSWORD: string;
				R2_PUBLIC_URL: string;
				APP_URL: string;
				GOOGLE_CLIENT_ID?: string;
				GOOGLE_CLIENT_SECRET?: string;
				GOOGLE_REFRESH_TOKEN?: string;
				GOOGLE_DRIVE_FOLDER_ID?: string;
			};
			context: { waitUntil(promise: Promise<unknown>): void };
			caches: CacheStorage & { default: Cache };
		}
	}
}

export {};
