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

	// Delete confirmation modal state
	let showDeleteModal = $state(false);
	let deleteTarget = $state<{ key: string; isActive: boolean } | null>(null);
	let deleteLoading = $state(false);
	let deleteError = $state('');

	function confirmDelete(key: string, isActive: boolean) {
		deleteTarget = { key, isActive };
		deleteError = '';
		showDeleteModal = true;
	}

	function cancelDelete() {
		showDeleteModal = false;
		deleteTarget = null;
		deleteError = '';
	}

	async function executeDelete() {
		if (!deleteTarget) return;
		deleteLoading = true;
		deleteError = '';
		try {
			const res = await fetch('/api/frames', {
				method: 'DELETE',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ key: deleteTarget.key })
			});
			if (!res.ok) {
				const json = (await res.json().catch(() => ({}))) as { error?: string };
				deleteError = json.error ?? 'Gagal menghapus frame.';
			} else {
				showDeleteModal = false;
				deleteTarget = null;
				await invalidateAll();
			}
		} catch {
			deleteError = 'Terjadi kesalahan saat menghapus.';
		} finally {
			deleteLoading = false;
		}
	}

	async function handleUpload(e: Event) {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;

		if (!file.name.endsWith('.png')) {
			uploadError = 'Hanya file PNG yang diizinkan.';
			return;
		}

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

	function deleteFrame(key: string) {
		const isActive = data.activeFrame === key;
		confirmDelete(key, isActive);
	}

	function formatSize(bytes: number) {
		return bytes < 1024 * 1024
			? `${(bytes / 1024).toFixed(0)} KB`
			: `${(bytes / 1024 / 1024).toFixed(1)} MB`;
	}

	function frameDisplayName(key: string): string {
		const m = key.match(/frame_\d+_(.+)$/);
		return m ? m[1] : key;
	}
</script>

<svelte:head>
	<title>Kelola Frame — Gumuruh Photobooth</title>
</svelte:head>

<div class="min-h-screen" style="background: #fafafa;">
	<header
		class="flex items-center justify-between px-6 py-4"
		style="border-bottom: 1px solid rgba(220, 38, 38, 0.15); background: #ffffff;"
	>
		<a href="/" class="text-sm" style="color: #dc2626;">← Dashboard</a>
		<h1 class="text-base font-serif font-semibold flex items-center gap-2" style="color: #b91c1c;">
			<Image style="width: 1rem; height: 1rem;" /> Kelola Frame
		</h1>
		<div class="flex items-center gap-2 px-3 py-1 rounded-full" style="background: rgba(220, 38, 38, 0.1);">
			<Shield style="width: 0.875rem; height: 0.875rem; color: #dc2626;" />
			<span class="text-xs" style="color: #dc2626;">Admin Only</span>
		</div>
	</header>

	<main class="max-w-2xl mx-auto px-6 py-10">
		<!-- Header -->
		<div class="text-center mb-8">
			<p class="text-xs mb-1" style="color: #dc2626; letter-spacing: 0.15em;">ADMIN ONLY</p>
			<h2 class="text-2xl font-bold font-serif" style="color: #b91c1c;">Manajemen Frame</h2>
			<div
				style="height: 1px; background: linear-gradient(to right, transparent, #dc2626, transparent); margin: 1rem 0;"
			></div>
		</div>

		<!-- Upload area -->
		<div
			class="mb-10 p-6 rounded-xl"
			style="border: 1px solid rgba(220, 38, 38, 0.2); background: #fef2f2;"
		>
			<h2 class="text-base font-serif font-semibold mb-4" style="color: #1f2937;">
				Upload Frame Baru
			</h2>

			<!-- Requirements -->
			<div
				class="mb-4 p-3 rounded-lg"
				style="background: rgba(220, 38, 38, 0.05); border: 1px solid rgba(220, 38, 38, 0.1);"
			>
				<div class="flex items-start gap-2">
					<AlertCircle style="width: 1rem; height: 1rem; color: #dc2626; flex-shrink: 0; margin-top: 0.125rem;" />
					<div class="text-xs" style="color: #6b7280;">
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
					style="max-height: 200px; border: 1px solid rgba(220, 38, 38, 0.3);"
				>
					<img
						src={previewUrl}
						alt="Preview"
						class="w-full h-full object-contain"
						style="background: repeating-conic-gradient(#fef2f2 0% 25%, #ffffff 0% 50%) 0 0 / 20px 20px;"
					/>
				</div>
			{/if}

			<button
				onclick={() => fileInput?.click()}
				disabled={uploading}
				class="w-full py-3 rounded-lg text-sm font-semibold transition-all hover:scale-105 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
				style="background: linear-gradient(135deg, #dc2626, #b91c1c); color: #ffffff;"
			>
				<Upload style="width: 1rem; height: 1rem;" />
				{uploading ? 'Mengupload...' : '+ Pilih File PNG'}
			</button>

			{#if uploadError}
				<p class="mt-3 text-sm text-center" style="color: #ef4444;">{uploadError}</p>
			{/if}
			{#if uploadSuccess}
				<p class="mt-3 text-sm text-center" style="color: #dc2626;">{uploadSuccess}</p>
			{/if}
		</div>

		<!-- Frame list -->
		<h2 class="text-base font-serif font-semibold mb-4" style="color: #1f2937;">
			Frame Tersedia ({data.frames.length})
		</h2>

		{#if data.frames.length === 0}
			<div
				class="text-center py-16"
				style="border: 1px dashed rgba(220, 38, 38, 0.3); border-radius: 12px; background: #fef2f2;"
			>
				<Image style="color: #dc2626; width: 2rem; height: 2rem; margin: 0 auto 0.75rem;" />
				<p class="text-sm" style="color: #6b7280;">Belum ada frame. Upload frame PNG pertama kamu.</p>
			</div>
		{:else}
			<div class="grid grid-cols-2 gap-4">
				{#each data.frames as frame}
					{@const isActive = data.activeFrame === frame.key}
					<div
						class="rounded-xl overflow-hidden transition-all"
						style="border: 2px solid {isActive
							? '#dc2626'
							: 'rgba(220, 38, 38, 0.15)'}; background: #fef2f2;"
					>
						<!-- Preview -->
						<div
							class="relative"
							style="aspect-ratio: 4/5; background: repeating-conic-gradient(#fef2f2 0% 25%, #ffffff 0% 50%) 0 0 / 16px 16px;"
						>
							<img src="/api/frames/{frame.key}" alt={frame.key} class="w-full h-full object-contain" />
							{#if isActive}
								<div
									class="absolute top-2 left-2 px-2 py-0.5 rounded-full text-xs font-bold flex items-center gap-1"
									style="background: #dc2626; color: #ffffff;"
								>
									<Sparkles style="width: 0.75rem; height: 0.75rem;" /> Aktif
								</div>
							{/if}
						</div>

						<!-- Info & Actions -->
						<div class="p-3">
							<p class="text-xs truncate mb-1" style="color: #6b7280;" title={frame.key}>
								{frame.key}
							</p>
							<p class="text-xs mb-3" style="color: #9ca3af;">{formatSize(frame.size)}</p>
							<div class="flex gap-2">
								{#if !isActive}
									<button
										onclick={() => setActive(frame.key)}
										class="flex-1 py-1.5 rounded text-xs font-semibold transition-all hover:scale-105"
										style="background: rgba(220, 38, 38, 0.15); color: #dc2626; border: 1px solid rgba(220, 38, 38, 0.3);"
									>
										Set Aktif
									</button>
								{:else}
									<div
										class="flex-1 py-1.5 rounded text-xs font-semibold text-center flex items-center justify-center gap-1"
										style="color: #dc2626; opacity: 0.5;"
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
			<p class="text-xs" style="color: #9ca3af;">Total: {data.frames.length} Frame</p>
		</div>
	</main>
</div>

<!-- Delete Confirmation Modal -->
{#if showDeleteModal && deleteTarget}
	<!-- svelte-ignore a11y-click-events-have-key-events -->
	<!-- svelte-ignore a11y-no-static-element-interactions -->
	<div
		class="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop"
		style="background: rgba(0,0,0,0.5); backdrop-filter: blur(4px);"
		role="dialog"
		aria-modal="true"
		aria-labelledby="delete-modal-title"
		onclick={(e) => {
			if (e.target === e.currentTarget) cancelDelete();
		}}
	>
		<div
			class="w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden modal-content"
			style="background: #ffffff; border: 1px solid rgba(239, 68, 68, 0.2);"
		>
			<!-- Header -->
			<div class="px-6 pt-6 pb-4 text-center">
				<div
					class="w-14 h-14 mx-auto mb-4 rounded-full flex items-center justify-center"
					style="background: rgba(239, 68, 68, 0.1); border: 2px solid rgba(239, 68, 68, 0.25);"
				>
					<Trash2 style="width: 1.5rem; height: 1.5rem; color: #ef4444;" />
				</div>
				<h3 id="delete-modal-title" class="text-lg font-serif font-bold" style="color: #1f2937;">
					Hapus Frame?
				</h3>
				<p class="text-sm mt-2 leading-relaxed" style="color: #6b7280;">
					Kamu akan menghapus frame
					<span class="font-mono font-semibold" style="color: #1f2937;">{frameDisplayName(deleteTarget.key)}</span>
				</p>
				{#if deleteTarget.isActive}
					<span
						class="inline-flex items-center gap-1 mt-2 px-2.5 py-1 rounded-full text-xs font-semibold"
						style="background: rgba(239, 68, 68, 0.1); color: #ef4444;"
					>
						<Sparkles style="width: 0.75rem; height: 0.75rem;" /> Frame Sedang Aktif
					</span>
				{/if}
			</div>

			<!-- Warning box -->
			<div class="mx-6 mb-4 p-3 rounded-lg" style="background: #fef2f2; border: 1px solid #fecaca;">
				<div class="flex items-start gap-2">
					<AlertCircle style="width: 1rem; height: 1rem; color: #ef4444; flex-shrink: 0; margin-top: 0.1rem;" />
					<p class="text-xs leading-relaxed" style="color: #991b1b;">
						Tindakan ini <strong>tidak bisa dibatalkan</strong>. File frame akan terhapus permanen dari storage.
						{#if deleteTarget.isActive}
							<br />Tidak ada frame aktif sampai kamu set yang lain.
						{/if}
					</p>
				</div>
			</div>

			{#if deleteError}
				<div class="mx-6 mb-3 p-2.5 rounded-lg text-xs text-center" style="background: #fef2f2; color: #991b1b; border: 1px solid #fecaca;">
					{deleteError}
				</div>
			{/if}

			<!-- Actions -->
			<div class="px-6 pb-6 flex gap-3">
				<button
					onclick={cancelDelete}
					disabled={deleteLoading}
					class="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
					style="background: #f3f4f6; color: #374151; border: 1px solid #e5e7eb;"
				>
					Batal
				</button>
				<button
					onclick={executeDelete}
					disabled={deleteLoading}
					class="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all hover:scale-105 active:scale-95 disabled:opacity-60 flex items-center justify-center gap-2"
					style="background: linear-gradient(135deg, #ef4444, #dc2626); color: #ffffff; box-shadow: 0 4px 16px rgba(239, 68, 68, 0.3);"
				>
					{#if deleteLoading}
						<div class="w-4 h-4 rounded-full border-2 border-transparent spin-slow" style="border-top-color: #ffffff;"></div>
						Menghapus...
					{:else}
						<Trash2 style="width: 1rem; height: 1rem;" /> Hapus
					{/if}
				</div>
		</div>
	</div>
{/if}

<style>
	@keyframes modal-in {
		from {
			opacity: 0;
			transform: scale(0.95) translateY(10px);
		}
		to {
			opacity: 1;
			transform: scale(1) translateY(0);
		}
	}
	@keyframes backdrop-in {
		from { opacity: 0; }
		to { opacity: 1; }
	}
	.modal-content {
		animation: modal-in 0.2s ease-out;
	}
	.modal-backdrop {
		animation: backdrop-in 0.15s ease-out;
	}
	.spin-slow {
		animation: spin 1s linear infinite;
	}
	@keyframes spin {
		from { transform: rotate(0deg); }
		to { transform: rotate(360deg); }
	}
</style>
