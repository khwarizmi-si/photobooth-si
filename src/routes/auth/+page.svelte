<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';
	import { Sparkles, Flag, User, Lock, AlertCircle, LogIn } from '@lucide/svelte';

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
	<title>Login — Gumuruh Photobooth</title>
</svelte:head>

<main
	class="min-h-screen flex items-center justify-center relative overflow-hidden"
	style="background: linear-gradient(135deg, #fef2f2 0%, #ffffff 50%, #fee2e2 100%);"
>
	<!-- Background particles -->
	<div class="absolute inset-0 pointer-events-none" aria-hidden="true">
		{#each { length: 20 } as _, i}
			<div
				class="absolute w-1 h-1 rounded-full particle"
				style="left: {5 + i * 5}%; top: {Math.sin(i) * 30 + 50}%; background: #dc2626; opacity: {0.2 +
					(i % 5) * 0.1}; animation-delay: {i * 0.3}s; animation-duration: {2 + (i % 3)}s;"
			></div>
		{/each}
	</div>

	<div class="relative z-10 w-full max-w-sm mx-auto px-6 text-center">
		<!-- Logo & Header -->
		<div class="mb-8">
			<Flag style="color: #dc2626; width: 2rem; height: 2rem; margin-bottom: 0.75rem;" />
			<div
				class="w-24 h-24 mx-auto rounded-full flex items-center justify-center mb-4"
				style="border: 2px solid #dc2626; background: rgba(220, 38, 38, 0.05);"
			>
				<Flag style="color: #dc2626; width: 2rem; height: 2rem;" />
			</div>
			<div
				style="height: 1px; background: linear-gradient(to right, transparent, #dc2626, transparent); margin-bottom: 1.5rem;"
			></div>
		</div>

		<h1 class="text-4xl font-bold mb-2 red-shimmer font-serif">GUMURUH</h1>
		<p class="text-sm mb-1" style="color: #dc2626; letter-spacing: 0.15em; text-transform: uppercase;">
			Photobooth
		</p>
		<p class="text-lg mb-8 italic font-serif" style="color: #b91c1c;">"Dirgahayu Republik Indonesia"</p>

		<div
			style="height: 1px; background: linear-gradient(to right, transparent, #dc2626, transparent); margin-bottom: 2rem;"
		></div>

		<!-- Error Message -->
		{#if displayError}
			<div
				class="mb-6 px-4 py-3 rounded-lg text-sm flex items-center justify-center gap-2"
				style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); color: #ef4444;"
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
						style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: #dc2626; width: 1.25rem; height: 1.25rem;"
					/>
					<input
						type="text"
						name="username"
						bind:value={username}
						placeholder="Username"
						required
						class="w-full pl-12 pr-4 py-3 rounded-lg text-sm text-center outline-none transition-all duration-300 focus:ring-2"
						style="background: #ffffff; border: 1px solid rgba(220, 38, 38, 0.3); color: #1f2937; letter-spacing: 0.05em;"
					/>
				</div>
			</div>
			<div class="mb-6">
				<div class="relative">
					<Lock
						style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: #dc2626; width: 1.25rem; height: 1.25rem;"
					/>
					<input
						type="password"
						name="password"
						bind:value={password}
						placeholder="Password"
						required
						class="w-full pl-12 pr-4 py-3 rounded-lg text-sm text-center outline-none transition-all duration-300 focus:ring-2"
						style="background: #ffffff; border: 1px solid rgba(220, 38, 38, 0.3); color: #1f2937; letter-spacing: 0.05em;"
					/>
				</div>
			</div>
			<button
				type="submit"
				disabled={loading}
				class="flex items-center justify-center gap-3 w-full py-4 px-6 rounded-lg font-semibold text-sm transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-50"
				style="background: linear-gradient(135deg, #dc2626, #b91c1c); color: #ffffff; letter-spacing: 0.05em; box-shadow: 0 4px 20px rgba(220, 38, 38, 0.3);"
			>
				{#if loading}
					Loading...
				{:else}
					<LogIn style="width: 1rem; height: 1rem;" /> MASUK
				{/if}
			</button>
		</form>

		<a href="https://uwangraph.com" target="_blank" rel="noopener noreferrer" class="mt-16 text-xs" style="color: #9ca3af; letter-spacing: 0.1em;">
			POWERED BY UWANGRAPH
		</a>
	</div>
</main>
