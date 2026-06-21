<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';
	import { Sparkles, GraduationCap, User, Lock, AlertCircle, LogIn } from '@lucide/svelte';

	let { data, form } = $props<{ data: PageData; form: ActionData }>();

	let username = $state('');
	let password = $state('');
	let loading = $state(false);

	const errorMessages: Record<string, string> = {
		wrong_credentials: 'Username atau password salah.',
		missing_credentials: 'Masukkan username dan password.',
		server_error: 'Terjadi kesalahan server. Silakan coba lagi.'
	};

	const errorKey = $derived(form?.error ?? data.error ?? null);
	const displayError = $derived(
		errorKey ? (errorMessages[errorKey] ?? 'Terjadi kesalahan. Silakan coba lagi.') : null
	);
</script>

<svelte:head>
	<title>Login — Wisuda Photobooth</title>
</svelte:head>

<main
	class="min-h-screen flex items-center justify-center relative overflow-hidden"
	style="background: radial-gradient(ellipse at center, #1a1200 0%, #0a0a0a 70%);"
>
	<!-- Background particles -->
	<div class="absolute inset-0 pointer-events-none" aria-hidden="true">
		{#each { length: 20 } as _, i}
			<div
				class="absolute w-1 h-1 rounded-full particle"
				style="left: {5 + i * 5}%; top: {Math.sin(i) * 30 + 50}%; background: #d4a843; opacity: {0.2 +
					(i % 5) * 0.1}; animation-delay: {i * 0.3}s; animation-duration: {2 + (i % 3)}s;"
			></div>
		{/each}
	</div>

	<div class="relative z-10 w-full max-w-sm mx-auto px-6 text-center">
		<!-- Logo & Header -->
		<div class="mb-8">
			<Sparkles style="color: #d4a843; width: 2rem; height: 2rem; margin-bottom: 0.75rem;" />
			<div
				class="w-24 h-24 mx-auto rounded-full flex items-center justify-center mb-4"
				style="border: 2px solid #d4a843; background: rgba(212, 168, 67, 0.05);"
			>
				<GraduationCap style="color: #d4a843; width: 2rem; height: 2rem;" />
			</div>
			<div
				style="height: 1px; background: linear-gradient(to right, transparent, #d4a843, transparent); margin-bottom: 1.5rem;"
			></div>
		</div>

		<h1 class="text-4xl font-bold mb-2 gold-shimmer font-serif">WISUDA 2026</h1>
		<p class="text-sm mb-1" style="color: #b8942e; letter-spacing: 0.15em; text-transform: uppercase;">
			Photobooth
		</p>
		<p class="text-lg mb-8 italic font-serif" style="color: #f8e8b0;">"Prestasi & Kebanggaan"</p>

		<div
			style="height: 1px; background: linear-gradient(to right, transparent, #d4a843, transparent); margin-bottom: 2rem;"
		></div>

		<!-- Error Message -->
		{#if displayError}
			<div
				class="mb-6 px-4 py-3 rounded-lg text-sm flex items-center justify-center gap-2"
				style="background: rgba(220, 38, 38, 0.15); border: 1px solid rgba(220, 38, 38, 0.4); color: #fca5a5;"
			>
				<AlertCircle style="width: 1rem; height: 1rem; flex-shrink: 0;" />
				{displayError}
			</div>
		{/if}

		<!-- Login Form -->
		<form
			method="POST"
			use:enhance={() => {
				loading = true;
				return async ({ update }) => {
					loading = false;
					await update();
				};
			}}
		>
			<div class="mb-4">
				<div class="relative">
					<User
						style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: #d4a843; width: 1.25rem; height: 1.25rem;"
					/>
					<input
						type="text"
						name="username"
						bind:value={username}
						placeholder="Username / NIM"
						required
						class="w-full pl-12 pr-4 py-3 rounded-lg text-sm text-center outline-none transition-all duration-300 focus:ring-2"
						style="background: rgba(212, 168, 67, 0.08); border: 1px solid rgba(212, 168, 67, 0.3); color: #f8e8b0; letter-spacing: 0.05em;"
					/>
				</div>
			</div>
			<div class="mb-6">
				<div class="relative">
					<Lock
						style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: #d4a843; width: 1.25rem; height: 1.25rem;"
					/>
					<input
						type="password"
						name="password"
						bind:value={password}
						placeholder="Password"
						required
						class="w-full pl-12 pr-4 py-3 rounded-lg text-sm text-center outline-none transition-all duration-300 focus:ring-2"
						style="background: rgba(212, 168, 67, 0.08); border: 1px solid rgba(212, 168, 67, 0.3); color: #f8e8b0; letter-spacing: 0.05em;"
					/>
				</div>
			</div>
			<button
				type="submit"
				disabled={loading}
				class="flex items-center justify-center gap-3 w-full py-4 px-6 rounded-lg font-semibold text-sm transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-50"
				style="background: linear-gradient(135deg, #d4a843, #b8942e); color: #0a0a0a; letter-spacing: 0.05em; box-shadow: 0 4px 20px rgba(212, 168, 67, 0.3);"
			>
				{#if loading}
					Loading...
				{:else}
					<LogIn style="width: 1rem; height: 1rem;" /> MASUK
				{/if}
			</button>
		</form>

		<div class="mt-8 text-xs" style="color: #2a2a2a; letter-spacing: 0.1em;">
			POWERED BY SEKOLAH IMPIAN STUDIO
		</div>
	</div>
</main>
