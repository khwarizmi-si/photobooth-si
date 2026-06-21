<script lang="ts">
	import type { PageData } from './$types';
	import { invalidateAll } from '$app/navigation';
	import { Image, Trash2, Sparkles, Upload, Shield, AlertCircle } from '@lucide/svelte';

	let { data } = $props<{ data: PageData }>();

	let uploading = $state(false);
	let uploadError = $state('');
	let uploadSuccess = $state('');
	let fileInput = $state<HTMLInputElement | null>(null);
	let previewUrl = $state<string | null>(null);

	async function handleUpload(e: Event) {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;

		if (!file.name.endsWith('.png')) {
			uploadError = 'Hanya file PNG yang diizinkan.';
			return;
		}

		// Cek ukuran file (max 5MB)
		if (file.size > 5 * 1024 * 1024) {
			uploadError = 'Ukuran file maksimal 5MB.';
			return;
		}

		previewUrl = URL.createObjectURL(file);
		uploadError = '';
		uploadSuccess = '';
		uploading = true;

		const formData = new FormData();
		formData.append('frame', file);

		try {
			const res = await fetch('/api/frames', { method: 'POST', body: formData });
			const json = (await res.json()) as { success?: boolean; key?: string; error?: string };

			if (!res.ok || !json.success) {
				uploadError = json.error ?? 'Gagal upload frame.';
			} else {
				uploadSuccess = 'Frame berhasil diupload!';
				await invalidateAll();
			}
		} catch {
			uploadError = 'Terjadi kesalahan saat upload.';
		} finally {
			uploading = false;
			input.value = '';
		}
	}

	async function setActive(key: string) {
		const res = await fetch('/api/frames/active', {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ key })
		});
		if (res.ok) await invalidateAll();
	}

	async function deleteFrame(key: string) {
		if (!confirm('Hapus frame ini?')) return;
		const res = await fetch('/api/frames', {
			method: 'DELETE',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ key })
		});
		if (res.ok) await invalidateAll();
	}

	function formatSize(bytes: number) {
		return bytes < 1024 * 1024
			? `${(bytes / 1024).toFixed(0)} KB`
			: `${(bytes / 1024 / 1024).toFixed(1)} MB`;
	}
</script>

<svelte:head>
	<title>Kelola Frame — Wisuda Photobooth</title>
</svelte:head>

<div class="min-h-screen" style="background: #0a0a0a;">
	<header
		class="flex items-center justify-between px-6 py-4"
		style="border-bottom: 1px solid rgba(212,168,67,0.2);"
	>
		<a href="/" class="text-sm" style="color: #d4a843;">← Dashboard</a>
		<h1 class="text-base font-serif font-semibold flex items-center gap-2" style="color: #d4a843;">
			<Image style="width: 1rem; height: 1rem;" /> Kelola Frame
		</h1>
		<div class="flex items-center gap-2 px-3 py-1 rounded-full" style="background: rgba(212,168,67,0.1);">
			<Shield style="width: 0.875rem; height: 0.875rem; color: #d4a843;" />
			<span class="text-xs" style="color: #d4a843;">Admin Only</span>
		</div>
	</header>

	<main class="max-w-2xl mx-auto px-6 py-10">
		<!-- Header -->
		<div class="text-center mb-8">
			<p class="text-xs mb-1" style="color: #b8942e; letter-spacing: 0.15em;">ADMIN ONLY</p>
			<h2 class="text-2xl font-bold font-serif" style="color: #f8e8b0;">Manajemen Frame</h2>
			<div
				style="height: 1px; background: linear-gradient(to right, transparent, #d4a843, transparent); margin: 1rem 0;"
			></div>
		</div>

		<!-- Upload area -->
		<div
			class="mb-10 p-6 rounded-xl"
			style="border: 1px solid rgba(212,168,67,0.2); background: rgba(212,168,67,0.03);"
		>
			<h2 class="text-base font-serif font-semibold mb-4" style="color: #f8e8b0;">
				Upload Frame Baru
			</h2>

			<!-- Requirements -->
			<div
				class="mb-4 p-3 rounded-lg"
				style="background: rgba(212,168,67,0.05); border: 1px solid rgba(212,168,67,0.1);"
			>
				<div class="flex items-start gap-2">
					<AlertCircle style="width: 1rem; height: 1rem; color: #d4a843; flex-shrink: 0; margin-top: 0.125rem;" />
					<div class="text-xs" style="color: #6a6a6a;">
						<p>• Format: PNG (transparan)</p>
						<p>• Resolusi: 1080×1350px</p>
						<p>• Ukuran maks: 5MB</p>
					</div>
				</div>
			</div>

			<input bind:this={fileInput} type="file" accept=".png" onchange={handleUpload} class="hidden" />

			{#if previewUrl}
				<div
					class="mb-4 rounded-lg overflow-hidden"
					style="max-height: 200px; border: 1px solid rgba(212,168,67,0.3);"
				>
					<img
						src={previewUrl}
						alt="Preview"
						class="w-full h-full object-contain"
						style="background: repeating-conic-gradient(#1a1a1a 0% 25%, #111 0% 50%) 0 0 / 20px 20px;"
					/>
				</div>
			{/if}

			<button
				onclick={() => fileInput?.click()}
				disabled={uploading}
				class="w-full py-3 rounded-lg text-sm font-semibold transition-all hover:scale-105 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
				style="background: linear-gradient(135deg, #d4a843, #b8942e); color: #0a0a0a;"
			>
				<Upload style="width: 1rem; height: 1rem;" />
				{uploading ? 'Mengupload...' : '+ Pilih File PNG'}
			</button>

			{#if uploadError}
				<p class="mt-3 text-sm text-center" style="color: #fca5a5;">{uploadError}</p>
			{/if}
			{#if uploadSuccess}
				<p class="mt-3 text-sm text-center" style="color: #86efac;">{uploadSuccess}</p>
			{/if}
		</div>

		<!-- Frame list -->
		<h2 class="text-base font-serif font-semibold mb-4" style="color: #f8e8b0;">
			Frame Tersedia ({data.frames.length})
		</h2>

		{#if data.frames.length === 0}
			<div
				class="text-center py-16"
				style="border: 1px dashed rgba(212,168,67,0.2); border-radius: 12px;"
			>
				<Image style="color: #d4a843; width: 2rem; height: 2rem; margin: 0 auto 0.75rem;" />
				<p class="text-sm" style="color: #6a6a6a;">Belum ada frame. Upload frame PNG pertama kamu.</p>
			</div>
		{:else}
			<div class="grid grid-cols-2 gap-4">
				{#each data.frames as frame}
					{@const isActive = data.activeFrame === frame.key}
					<div
						class="rounded-xl overflow-hidden transition-all"
						style="border: 2px solid {isActive
							? '#d4a843'
							: 'rgba(212,168,67,0.15)'}; background: rgba(212,168,67,0.03);"
					>
						<!-- Preview -->
						<div
							class="relative"
							style="aspect-ratio: 4/5; background: repeating-conic-gradient(#1a1a1a 0% 25%, #111 0% 50%) 0 0 / 16px 16px;"
						>
							<img src="/api/frames/{frame.key}" alt={frame.key} class="w-full h-full object-contain" />
							{#if isActive}
								<div
									class="absolute top-2 left-2 px-2 py-0.5 rounded-full text-xs font-bold flex items-center gap-1"
									style="background: #d4a843; color: #0a0a0a;"
								>
									<Sparkles style="width: 0.75rem; height: 0.75rem;" /> Aktif
								</div>
							{/if}
						</div>

						<!-- Info & Actions -->
						<div class="p-3">
							<p class="text-xs truncate mb-1" style="color: #6a6a6a;" title={frame.key}>
								{frame.key}
							</p>
							<p class="text-xs mb-3" style="color: #4a4a4a;">{formatSize(frame.size)}</p>
							<div class="flex gap-2">
								{#if !isActive}
									<button
										onclick={() => setActive(frame.key)}
										class="flex-1 py-1.5 rounded text-xs font-semibold transition-all hover:scale-105"
										style="background: rgba(212,168,67,0.15); color: #d4a843; border: 1px solid rgba(212,168,67,0.3);"
									>
										Set Aktif
									</button>
								{:else}
									<div
										class="flex-1 py-1.5 rounded text-xs font-semibold text-center flex items-center justify-center gap-1"
										style="color: #d4a843; opacity: 0.5;"
									>
										<Sparkles style="width: 0.75rem; height: 0.75rem;" /> Digunakan
									</div>
								{/if}
								<button
									onclick={() => deleteFrame(frame.key)}
									class="py-1.5 px-3 rounded text-xs transition-all hover:scale-105 flex items-center justify-center"
									style="color: #ef4444; border: 1px solid rgba(239,68,68,0.3);"
								>
									<Trash2 style="width: 0.875rem; height: 0.875rem;" />
								</button>
							</div>
						</div>
					</div>
				{/each}
			</div>
		{/if}

		<!-- Footer -->
		<div class="mt-8 text-center">
			<p class="text-xs" style="color: #4a4a4a;">Total: {data.frames.length} Frame</p>
		</div>
	</main>
</div>
