<script lang="ts">
	import QrCode from '@kodav.dev/svelte5-qrcode';
	import type { PageData } from './$types';
	import {
		Smartphone,
		Link,
		Search,
		Download,
		Sparkles,
		X,
		Image,
		Calendar,
		Trash2,
		ArrowLeft,
		Camera
	} from '@lucide/svelte';

	interface PhotoMetadata {
		id: string;
		original_urls: string[];
		framed_url: string;
		thumbnail_url: string;
		created_by: string;
		created_at: string;
		frame_used?: string;
	}

	let { data } = $props<{ data: PageData }>();

	let downloadUrl = $state<string | null>(null);
	let fullscreen = $state(false);
	let selectedPhoto = $state<PhotoMetadata | null>(null);
	let showModal = $state(false);
	let deleting = $state(false);

	// Custom confirm dialog
	let confirmVisible = $state(false);
	let confirmMessage = $state('');
	let confirmResolve = $state<((v: boolean) => void) | null>(null);

	function showConfirm(message: string): Promise<boolean> {
		return new Promise((resolve) => {
			confirmMessage = message;
			confirmResolve = resolve;
			confirmVisible = true;
		});
	}

	function confirmYes() {
		confirmVisible = false;
		confirmResolve?.(true);
	}

	function confirmNo() {
		confirmVisible = false;
		confirmResolve?.(false);
	}

	const isAdmin = $derived(data.user?.role === 'admin');

	function handleDownloadUrl(e: { url: string }) {
		downloadUrl = e.url;
	}

	function downloadQR() {
		if (!downloadUrl) return;
		const a = document.createElement('a');
		a.href = downloadUrl;
		a.download = 'qr-galeri-gumuruh.png';
		a.click();
	}

	function toggleFullscreen() {
		fullscreen = !fullscreen;
	}

	function openPhoto(photo: PhotoMetadata) {
		selectedPhoto = photo;
		showModal = true;
	}

	function closeModal() {
		showModal = false;
		selectedPhoto = null;
	}

	function downloadPhoto(url: string, filename: string) {
		const a = document.createElement('a');
		a.href = url;
		a.download = filename;
		a.target = '_blank';
		a.click();
	}

	function downloadSelectedFramed() {
		if (!selectedPhoto) return;
		downloadPhoto(selectedPhoto.framed_url, `${selectedPhoto.id}_framed.jpg`);
	}

	function downloadSelectedOriginal() {
		if (!selectedPhoto?.original_urls.length) return;
		downloadPhoto(selectedPhoto.original_urls[0], `${selectedPhoto.id}_original.jpg`);
	}

	function deleteSelectedPhoto() {
		if (!selectedPhoto) return;
		deletePhoto(selectedPhoto.id);
	}

	function handleModalBackdropKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			closeModal();
		}
	}

	async function deletePhoto(photoId: string) {
		const ok = await showConfirm('Hapus foto ini? Tindakan ini tidak dapat dibatalkan.');
		if (!ok) return;
		deleting = true;
		try {
			const res = await fetch(`/api/photos/${photoId}`, { method: 'DELETE' });
			if (res.ok) {
				closeModal();
				window.location.reload();
			}
		} finally {
			deleting = false;
		}
	}

	function formatDate(dateStr: string) {
		const date = new Date(dateStr);
		return date.toLocaleDateString('id-ID', {
			day: 'numeric',
			month: 'short',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}
</script>

<svelte:head>
	<title>Galeri — Gumuruh Photobooth</title>
</svelte:head>

<div
	class="min-h-screen"
	style="background: linear-gradient(180deg, #fef2f2 0%, #ffffff 60%);"
>
	<!-- Header -->
	<header
		class="flex items-center justify-between px-6 py-4"
		style="border-bottom: 1px solid rgba(220, 38, 38, 0.15); background: #ffffff;"
	>
		<a href="/" class="text-sm flex items-center gap-2" style="color: #dc2626;">
			<ArrowLeft style="width: 1rem; height: 1rem;" /> Dashboard
		</a>
		<h1 class="text-base font-serif font-semibold flex items-center gap-2" style="color: #b91c1c;">
			<Smartphone style="width: 1rem; height: 1rem;" /> Galeri
		</h1>
		<div></div>
	</header>

	<main class="max-w-4xl mx-auto px-6 py-10">
		<!-- QR Code Section -->
		<div class="text-center mb-10">
			<p class="text-xs mb-2" style="color: #dc2626; letter-spacing: 0.2em;">
				SCAN UNTUK LIHAT FOTO
			</p>
			<h2 class="text-2xl font-bold font-serif mb-2" style="color: #b91c1c;">Galeri Gumuruh</h2>
			<div
				style="height: 1px; background: linear-gradient(to right, transparent, #dc2626, transparent); margin: 1rem 0 2rem;"
			></div>

			<!-- Fullscreen QR overlay -->
			{#if fullscreen}
				<button
					onclick={toggleFullscreen}
					class="fixed inset-0 z-50 flex flex-col items-center justify-center gap-8 cursor-pointer"
					style="background: linear-gradient(180deg, #fef2f2 0%, #ffffff 60%);"
				>
					<p
						class="text-sm tracking-widest font-serif flex items-center justify-center gap-2"
						style="color: #dc2626;"
					>
						<Sparkles style="width: 0.875rem; height: 0.875rem;" /> SCAN UNTUK LIHAT FOTO GUMURUH
						<Sparkles style="width: 0.875rem; height: 0.875rem;" />
					</p>
					<div
						class="p-6 rounded-3xl"
						style="background: #fff; border: 4px solid #dc2626; box-shadow: 0 0 80px rgba(220, 38, 38, 0.3);"
					>
						<QrCode
							data={data.galleryUrl}
							size={280}
							backgroundColor="#ffffff"
							color="#b91c1c"
							errorCorrectionLevel="H"
						/>
					</div>
					<p class="text-xs" style="color: #6b7280;">Tap untuk tutup</p>
				</button>
			{/if}

			<!-- QR Code -->
			<div
				class="mx-auto mb-5 p-5 rounded-2xl inline-block"
				style="background: #fff; border: 3px solid #dc2626; box-shadow: 0 0 40px rgba(220, 38, 38, 0.2);;"
			>
				<QrCode
					data={data.galleryUrl}
					size={220}
					backgroundColor="#ffffff"
					color="#b91c1c"
					errorCorrectionLevel="H"
					dispatchDownloadUrl={true}
					downloadUrlFileFormat="png"
					ondownloadUrlGenerated={handleDownloadUrl}
				/>
			</div>

			<!-- Gallery link -->
			<p class="text-xs mb-6 truncate" style="color: #b91c1c;">
				<Link style="width: 0.875rem; height: 0.875rem; display: inline; vertical-align: middle;" />
				{data.galleryUrl}
			</p>

			<!-- Stats -->
			<div
				class="mb-6 py-4 px-6 rounded-xl inline-block"
				style="background: #fef2f2; border: 1px solid rgba(220, 38, 38, 0.2);"
			>
				<p class="text-3xl font-bold font-serif" style="color: #dc2626;">{data.photoCount}</p>
				<p class="text-xs mt-1" style="color: #6b7280;">Total Foto Tersimpan</p>
			</div>

			<div
				style="height: 1px; background: linear-gradient(to right, transparent, #dc2626, transparent); margin: 2rem 0;"
			></div>

			<!-- Actions -->
			<div class="flex flex-col sm:flex-row gap-3 justify-center">
				<button
					onclick={toggleFullscreen}
					class="px-6 py-3 rounded-xl font-semibold text-sm transition-all hover:scale-105 active:scale-95"
					style="background: linear-gradient(135deg, #dc2626, #b91c1c); color: #ffffff; box-shadow: 0 4px 20px rgba(220, 38, 38, 0.3);"
				>
					<Search style="width: 1rem; height: 1rem; display: inline; vertical-align: middle;" />
					Tampilkan QR Fullscreen
				</button>
				<button
					onclick={downloadQR}
					disabled={!downloadUrl}
					class="px-6 py-3 rounded-xl font-semibold text-sm transition-all hover:scale-105 active:scale-95 disabled:opacity-40"
					style="background: #fef2f2; border: 1.5px solid rgba(220, 38, 38, 0.3); color: #dc2626;"
				>
					<Download style="width: 1rem; height: 1rem; display: inline; vertical-align: middle;" />
					Download QR Code
				</button>
			</div>
		</div>

		<!-- Gallery Section -->
		{#if data.photos && data.photos.length > 0}
			<div class="mt-10">
				<h3 class="text-lg font-serif font-semibold mb-6 text-center flex items-center justify-center gap-2" style="color: #1f2937;">
					<Camera style="width: 1.25rem; height: 1.25rem;" /> Foto Terbaru
				</h3>
				<div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
					{#each data.photos as photo}
						<div class="relative rounded-xl overflow-hidden" style="aspect-ratio: 3/4; border: 1px solid rgba(220, 38, 38, 0.2);">
							<button
								onclick={() => openPhoto(photo)}
								class="absolute inset-0 w-full h-full"
							>
								<img
									src={photo.thumbnail_url || photo.framed_url}
									alt={photo.id}
									class="w-full h-full object-cover"
								/>
							</button>
							<div
								class="absolute bottom-0 left-0 right-0 p-2 flex items-end justify-between gap-1"
								style="background: linear-gradient(transparent, rgba(0,0,0,0.75));"
							>
								<p class="text-xs truncate" style="color: #fecaca;">{photo.id.slice(-8)}</p>
								<div class="flex items-center gap-1 shrink-0">
									<a
										href={photo.framed_url}
										download="{photo.id}_frame.jpg"
										onclick={(e) => e.stopPropagation()}
										class="p-1.5 rounded-lg flex items-center justify-center transition-all hover:scale-110"
										style="background: rgba(220, 38, 38, 0.3); color: #fecaca;"
										title="Download dengan frame"
									>
										<Download style="width: 0.875rem; height: 0.875rem;" />
									</a>
									{#if isAdmin}
										{#if photo.original_urls.length > 0}
											<a
												href={photo.original_urls[0]}
												download="{photo.id}_asli.jpg"
												onclick={(e) => e.stopPropagation()}
												class="p-1.5 rounded-lg flex items-center justify-center transition-all hover:scale-110"
												style="background: rgba(220, 38, 38, 0.15); color: #fca5a5; border: 1px solid rgba(220, 38, 38, 0.3);"
												title="Download asli"
											>
												<Image style="width: 0.875rem; height: 0.875rem;" />
											</a>
										{/if}
										<button
											onclick={(e) => { e.stopPropagation(); deletePhoto(photo.id); }}
											disabled={deleting}
											class="p-1.5 rounded-lg flex items-center justify-center transition-all hover:scale-110 disabled:opacity-40"
											style="background: rgba(239,68,68,0.15); color: #ef4444; border: 1px solid rgba(239,68,68,0.3);"
											title="Hapus"
										>
											<Trash2 style="width: 0.875rem; height: 0.875rem;" />
										</button>
									{/if}
								</div>
							</div>
						</div>
					{/each}
				</div>
			</div>
		{:else}
			<div class="mt-10 text-center py-16" style="border: 1px dashed rgba(220, 38, 38, 0.3); border-radius: 12px; background: #fef2f2;">
				<Image style="color: #dc2626; width: 2.5rem; height: 2.5rem; margin: 0 auto 1rem;" />
				<p class="text-sm" style="color: #6b7280;">Belum ada foto. Mulai ambil foto sekarang!</p>
				<a
					href="/photo"
					class="inline-block mt-4 px-6 py-2 rounded-lg text-sm"
					style="color: #dc2626; border: 1px solid rgba(220, 38, 38, 0.3);"
				>
					Ambil Foto
				</a>
			</div>
		{/if}
	</main>
</div>

<!-- Photo Modal -->
{#if showModal && selectedPhoto}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center p-4"
		style="background: rgba(0,0,0,0.8);"
		onclick={closeModal}
		onkeydown={handleModalBackdropKeydown}
		role="button"
		tabindex="0"
	>
		<div
			class="relative w-full rounded-2xl flex flex-col"
			style="background: #ffffff; border: 2px solid rgba(220, 38, 38, 0.3); max-width: 28rem; max-height: 90vh;"
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.stopPropagation()}
			role="dialog"
			aria-modal="true"
			tabindex="-1"
		>
			<!-- Close button -->
			<button
				onclick={closeModal}
				class="absolute top-3 right-3 z-10 p-1.5 rounded-full"
				style="background: rgba(255,255,255,0.9); color: #dc2626;"
			>
				<X style="width: 1.125rem; height: 1.125rem;" />
			</button>

			<!-- Photo -->
			<div class="overflow-y-auto flex-1 min-h-0">
				<img
					src={selectedPhoto.framed_url}
					alt={selectedPhoto.id}
					class="w-full block"
				/>
			</div>

			<!-- Info & Actions -->
			<div class="p-4 shrink-0" style="border-top: 1px solid rgba(220, 38, 38, 0.15);">
				<div class="flex items-center gap-2 mb-3">
					<Calendar style="width: 0.875rem; height: 0.875rem; color: #dc2626;" />
					<span class="text-xs" style="color: #6b7280;">{formatDate(selectedPhoto.created_at)}</span>
				</div>

				<div class="grid gap-2" style="grid-template-columns: repeat({selectedPhoto.original_urls.length > 0 ? 2 : 1}, 1fr);">
					<button
						onclick={downloadSelectedFramed}
						class="py-2.5 rounded-xl text-xs font-semibold transition-all hover:scale-105 flex items-center justify-center gap-1.5"
						style="background: linear-gradient(135deg, #dc2626, #b91c1c); color: #ffffff;"
					>
						<Download style="width: 0.875rem; height: 0.875rem;" /> Download Frame
					</button>
					{#if selectedPhoto.original_urls.length > 0}
						<button
							onclick={downloadSelectedOriginal}
							class="py-2.5 rounded-xl text-xs font-semibold transition-all hover:scale-105 flex items-center justify-center gap-1.5"
							style="border: 1.5px solid rgba(220, 38, 38, 0.3); color: #dc2626;"
						>
							<Image style="width: 0.875rem; height: 0.875rem;" /> Download Asli
						</button>
					{/if}
				</div>

				{#if isAdmin}
					<button
						onclick={deleteSelectedPhoto}
						disabled={deleting}
						class="w-full mt-2 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all hover:scale-105 disabled:opacity-40"
						style="background: rgba(239,68,68,0.1); color: #ef4444; border: 1px solid rgba(239,68,68,0.3);"
					>
						<Trash2 style="width: 0.875rem; height: 0.875rem;" />
						{deleting ? 'Menghapus...' : 'Hapus Foto'}
					</button>
				{/if}
			</div>
		</div>
	</div>
{/if}

<!-- Custom Confirm Dialog -->
{#if confirmVisible}
	<div
		class="fixed inset-0 z-[60] flex items-center justify-center p-6"
		style="background: rgba(0,0,0,0.6); backdrop-filter: blur(4px);"
	>
		<div
			class="w-full max-w-sm rounded-2xl p-6 text-center"
			style="background: #ffffff; border: 1.5px solid rgba(220, 38, 38, 0.35); box-shadow: 0 0 60px rgba(220, 38, 38, 0.12);"
		>
			<div
				class="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4"
				style="background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.3);"
			>
				<Trash2 style="width: 1.25rem; height: 1.25rem; color: #ef4444;" />
			</div>

			<h3 class="text-base font-semibold font-serif mb-2" style="color: #1f2937;">Hapus Foto</h3>
			<p class="text-sm mb-6" style="color: #6b7280;">{confirmMessage}</p>

			<div class="flex gap-3">
				<button
					onclick={confirmNo}
					class="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all hover:scale-105"
					style="background: #f3f4f6; color: #b91c1c; border: 1px solid rgba(220, 38, 38, 0.2);"
				>
					Batal
				</button>
				<button
					onclick={confirmYes}
					class="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all hover:scale-105"
					style="background: rgba(239,68,68,0.15); color: #ef4444; border: 1px solid rgba(239,68,68,0.35);"
				>
					Ya, Hapus
				</button>
			</div>
		</div>
	</div>
{/if}
