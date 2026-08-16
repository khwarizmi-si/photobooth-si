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
				GUMURUH_KV: KVNamespace;
				GUMURUH_BUCKET: R2Bucket;
				ADMIN_PASSWORD: string;
				R2_PUBLIC_URL: string;
				APP_URL: string;
			};
			context: { waitUntil(promise: Promise<unknown>): void };
			caches: CacheStorage & { default: Cache };
		}
	}
}

export {};
