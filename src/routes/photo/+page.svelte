<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { composePhotos, getFrameConfig } from '$lib/utils/canvas';
	import type { PageData } from './$types';
	import {
		Camera,
		Download,
		Cloud,
		Sparkles,
		Loader2,
		CheckCircle,
		XCircle,
		RotateCcw,
		Ban,
		SwitchCamera
	} from '@lucide/svelte';

	let { data } = $props<{ data: PageData }>();

	type Stage =
		| 'idle'
		| 'countdown'
		| 'retaking'
		| 'review'
		| 'composing'
		| 'uploading'
		| 'result'
		| 'error';

	let stage = $state<Stage>('idle');
	let selectedFrameKey = $state<string | null>(data.activeFrame ?? null);
	let countdown = $state(3);
	let countdownKey = $state(0);
	let showFlash = $state(false);
	let photos = $state<string[]>([]);
	let retakeIndex = $state<number | null>(null);
	let resultImage = $state<string | null>(null);
	let thumbnailImage = $state<string | null>(null);
	let errorMsg = $state('');
	let uploadStatus = $state<'idle' | 'uploading' | 'success' | 'error'>('idle');
	let uploadProgress = $state('');
	let photoAccess = $state(data.photoEnabled !== false);

	let videoEl = $state.raw<HTMLVideoElement | null>(null);
	let stream = $state.raw<MediaStream | null>(null);
	let cameraReady = $state(false);
	let cameraError = $state('');
	let aborted = false;
	let facingMode = $state<'user' | 'environment'>('user');

	const canTakePhoto = $derived(photoAccess);
	const frameConfig = $derived(getFrameConfig(selectedFrameKey));
	const numPhotos = $derived(frameConfig.numPhotos);
	const SLOT_RATIO = $derived(frameConfig.cameraAspectRatio);

	async function refreshPhotoAccess() {
		try {
			const res = await fetch('/api/photo-access');
			const json = (await res.json()) as { photo_enabled?: boolean };
			if (!res.ok || typeof json.photo_enabled !== 'boolean') return;

			const wasEnabled = photoAccess;
			photoAccess = json.photo_enabled;

			if (!photoAccess && wasEnabled) {
				aborted = true;
				photos = [];
				retakeIndex = null;
				resultImage = null;
				thumbnailImage = null;
				uploadStatus = 'idle';
				uploadProgress = '';
				stage = 'idle';
				stopCamera();
			}

			if (photoAccess && !wasEnabled && stage === 'idle') {
				// Fetch active frame karena saat page load akses mungkin OFF (activeFrame null)
				try {
					const fr = await fetch('/api/frames/active');
					const fj = (await fr.json()) as { active?: string | null };
					selectedFrameKey = fj.active ?? null;
				} catch { /* keep null */ }
				await tick();
				await startCamera();
			}
		} catch {
			// Keep the last known status if polling temporarily fails.
		}
	}

	async function startCamera() {
		if (!canTakePhoto) return;
		cameraError = '';
		try {
			stream = await navigator.mediaDevices.getUserMedia({
				video: {
					width: { ideal: 1280 },
					height: { ideal: Math.round(1280 / SLOT_RATIO) },
					aspectRatio: { ideal: SLOT_RATIO },
					facingMode
				},
				audio: false
			});
			if (videoEl) {
				videoEl.srcObject = stream;
				cameraReady = true;
			}
		} catch {
			cameraError = 'Kamera tidak dapat diakses.';
		}
	}

	function stopCamera() {
		stream?.getTracks().forEach((t) => t.stop());
		stream = null;
		cameraReady = false;
	}

	async function switchCamera() {
		stopCamera();
		cameraReady = false;
		facingMode = facingMode === 'user' ? 'environment' : 'user';
		await startCamera();
	}

	function captureFrame(): string {
		const vw = videoEl!.videoWidth || 1280;
		const vh = videoEl!.videoHeight || 720;
		let sw = vw,
			sh = vh;
		if (vw / vh > SLOT_RATIO) sw = vh * SLOT_RATIO;
		else sh = vw / SLOT_RATIO;
		const canvas = document.createElement('canvas');
		canvas.width = Math.round(sw);
		canvas.height = Math.round(sh);
		canvas
			.getContext('2d')!
			.drawImage(videoEl!, (vw - sw) / 2, (vh - sh) / 2, sw, sh, 0, 0, canvas.width, canvas.height);
		return canvas.toDataURL('image/jpeg', 0.9);
	}

	function generateThumbnail(dataUrl: string): Promise<string> {
		return new Promise((resolve) => {
			const img = new window.Image();
			img.onload = () => {
				const canvas = document.createElement('canvas');
				const size = 200;
				canvas.width = size;
				canvas.height = size;
				const ctx = canvas.getContext('2d')!;
				const scale = Math.max(size / img.width, size / img.height);
				const sw = size / scale;
				const sh = size / scale;
				const sx = (img.width - sw) / 2;
				const sy = (img.height - sh) / 2;
				ctx.drawImage(img, sx, sy, sw, sh, 0, 0, size, size);
				resolve(canvas.toDataURL('image/jpeg', 0.7));
			};
			img.src = dataUrl;
		});
	}

	function runCountdown(): Promise<void> {
		return new Promise((resolve) => {
			countdown = 3;
			countdownKey++;
			const t = setInterval(() => {
				if (aborted) {
					clearInterval(t);
					resolve();
					return;
				}
				countdown--;
				countdownKey++;
				if (countdown <= 0) {
					clearInterval(t);
					resolve();
				}
			}, 1000);
		});
	}

	async function takePhoto() {
		if (!cameraReady || stage !== 'idle' || !canTakePhoto) return;
		aborted = false;
		stage = 'countdown';
		await runCountdown();
		if (aborted) return;

		showFlash = true;
		setTimeout(() => (showFlash = false), 500);
		photos = [...photos, captureFrame()];

		if (photos.length >= numPhotos) {
			stage = 'review';
		} else {
			stage = 'idle';
		}
	}

	async function startRetake(index: number) {
		aborted = false;
		retakeIndex = index;
		stage = 'retaking';
		await tick();
		if (stream && videoEl && !videoEl.srcObject) {
			videoEl.srcObject = stream;
			cameraReady = true;
		} else if (!stream) {
			await startCamera();
		}
		await runCountdown();
		if (aborted) return;

		showFlash = true;
		setTimeout(() => (showFlash = false), 500);
		const next = [...photos];
		next[index] = captureFrame();
		photos = next;
		retakeIndex = null;
		stage = photos.length >= numPhotos ? 'review' : 'idle';
	}

	async function compose() {
		stage = 'composing';
		stopCamera();
		try {
			resultImage = await composePhotos({
				photos: [...photos],
				frameKey: selectedFrameKey,
				frameUrl: selectedFrameKey ? `/api/frames/${selectedFrameKey}` : null
			});
			thumbnailImage = await generateThumbnail(resultImage);
			stage = 'result';
		} catch (e) {
			console.error('compose error:', e);
			stage = 'error';
			errorMsg = e instanceof Error ? e.message : String(e);
		}
	}

	function downloadPhoto() {
		if (!resultImage) return;
		const ts = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 15);
		const a = document.createElement('a');
		a.href = resultImage;
		a.download = `wisuda_${ts}.jpg`;
		a.click();
	}

	async function uploadToR2() {
		if (!resultImage || !thumbnailImage || uploadStatus === 'uploading') return;
		uploadStatus = 'uploading';
		uploadProgress = 'Mengupload foto...';

		try {
			const res = await fetch('/api/photos/upload', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					framed_photo: resultImage,
					original_photos: photos,
					thumbnail: thumbnailImage,
					frame_used: selectedFrameKey
				})
			});
			const json = (await res.json()) as {
				success?: boolean;
				photo?: { id: string; framed_url: string };
				error?: string;
			};
			if (!res.ok || !json.success) throw new Error(json.error ?? 'Upload gagal');
			uploadStatus = 'success';
			uploadProgress = '';
		} catch {
			uploadStatus = 'error';
			uploadProgress = '';
		}
	}

	function reset() {
		aborted = true;
		photos = [];
		resultImage = null;
		thumbnailImage = null;
		retakeIndex = null;
		uploadStatus = 'idle';
		uploadProgress = '';
		selectedFrameKey = data.activeFrame ?? null;
		stage = 'idle';
		startCamera();
	}

	// Auto-start kamera saat halaman dibuka
	$effect(() => {
		if (canTakePhoto) startCamera();
	});

	// Hanya stop kamera di stage yang tidak butuh kamera
	$effect(() => {
		if (stage === 'result' || stage === 'composing') {
			stopCamera();
		}
	});

	// Cleanup saat komponen di-unmount (tidak ikut re-run saat stage berubah)
	$effect(() => () => stopCamera());

	onMount(() => {
		refreshPhotoAccess();
		const interval = window.setInterval(refreshPhotoAccess, 2000);
		return () => window.clearInterval(interval);
	});
</script>

<svelte:head>
	<title>Ambil Foto — Wisuda Photobooth</title>
</svelte:head>

<div class="min-h-screen flex flex-col" style="background: #0a0a0a;">
	<header
		class="flex items-center justify-between px-6 py-4 shrink-0"
		style="border-bottom: 1px solid rgba(212,168,67,0.15);"
	>
		<a href="/" class="text-sm" style="color: #d4a843;">← Dashboard</a>
		<h1 class="text-sm font-serif font-semibold flex items-center gap-2" style="color: #d4a843;">
			<Camera style="width: 1rem; height: 1rem;" /> Foto Wisuda
		</h1>
		<div class="flex gap-1.5">
			{#each { length: numPhotos } as _, i}
				<div
					class="w-2 h-2 rounded-full transition-all duration-300"
					style="background: {photos[i] ? '#d4a843' : 'rgba(212,168,67,0.2)'};"
				></div>
			{/each}
		</div>
	</header>

	<main class="flex-1 flex flex-col items-center justify-center p-4 gap-4">

		<!-- FITUR DINONAKTIFKAN -->
		{#if !canTakePhoto}
			<div class="text-center max-w-sm">
				<div
					class="w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center"
					style="background: rgba(239, 68, 68, 0.1); border: 2px solid rgba(239, 68, 68, 0.3);"
				>
					<Ban style="color: #ef4444; width: 2.5rem; height: 2.5rem;" />
				</div>
				<h2 class="text-xl font-serif font-bold mb-2" style="color: #f8e8b0;">Fitur Dinonaktifkan</h2>
				<p class="text-sm mb-4" style="color: #6a6a6a;">
					Admin telah menonaktifkan fitur foto untuk user.
				</p>
				<a href="/" class="inline-block mt-6 px-6 py-2 rounded-lg text-sm" style="color: #d4a843; border: 1px solid rgba(212,168,67,0.3);">
					Kembali ke Dashboard
				</a>
			</div>

		<!-- RESULT -->
		{:else if stage === 'result' && resultImage}
			<div class="w-full max-w-xs text-center">
				<div
					class="mb-4 p-3 rounded-lg"
					style="background: rgba(134, 239, 172, 0.1); border: 1px solid rgba(134, 239, 172, 0.2);"
				>
					<p class="text-sm font-medium flex items-center justify-center gap-2" style="color: #86efac;">
						<CheckCircle style="width: 1rem; height: 1rem;" /> Foto Berhasil
					</p>
					<p class="text-xs mt-1" style="color: #6a6a6a;">
						Foto asli + foto dengan frame tersimpan di galeri
					</p>
				</div>

				<div class="rounded-2xl overflow-hidden mb-4 shadow-2xl" style="border: 2px solid rgba(212,168,67,0.4);">
					<img src={resultImage} alt="Hasil foto wisuda" class="w-full" />
				</div>
				<div class="grid grid-cols-2 gap-3 mb-3">
					<button
						onclick={downloadPhoto}
						class="py-3 rounded-xl text-sm font-semibold transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
						style="background: linear-gradient(135deg, #d4a843, #b8942e); color: #0a0a0a;"
					>
						<Download style="width: 1rem; height: 1rem;" /> Download
					</button>
					<button
						onclick={uploadToR2}
						disabled={uploadStatus === 'uploading' || uploadStatus === 'success'}
						class="py-3 rounded-xl text-sm font-semibold transition-all hover:scale-105 active:scale-95 disabled:opacity-60 flex items-center justify-center gap-2"
						style="border: 1.5px solid rgba(212,168,67,0.3); color: #d4a843;"
					>
						{#if uploadStatus === 'uploading'}
							<Loader2 style="width: 1rem; height: 1rem;" class="animate-spin" />
						{:else if uploadStatus === 'success'}
							<CheckCircle style="width: 1rem; height: 1rem;" />
						{:else if uploadStatus === 'error'}
							<XCircle style="width: 1rem; height: 1rem;" />
						{:else}
							<Cloud style="width: 1rem; height: 1rem;" />
						{/if}
						{uploadStatus === 'uploading'
							? 'Upload...'
							: uploadStatus === 'success'
								? 'Tersimpan'
								: uploadStatus === 'error'
									? 'Coba Lagi'
									: 'Simpan ke Galeri'}
					</button>
				</div>
				{#if uploadProgress}
					<p class="text-xs mb-2" style="color: #6a6a6a;">{uploadProgress}</p>
				{/if}
				{#if uploadStatus === 'success'}
					<p class="text-xs mb-3 flex items-center justify-center gap-1" style="color: #86efac;">
						<CheckCircle style="width: 0.875rem; height: 0.875rem;" /> Foto berhasil diupload ke galeri!
					</p>
				{/if}
				<button
					onclick={reset}
					class="w-full py-2 rounded-xl text-xs flex items-center justify-center gap-2"
					style="color: #4a4a4a;"
				>
					<RotateCcw style="width: 0.875rem; height: 0.875rem;" /> Sesi Baru
				</button>
			</div>

		<!-- COMPOSING -->
		{:else if stage === 'composing'}
			<div class="text-center">
				<div class="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style="border: 2px solid rgba(212,168,67,0.3);">
					<div class="w-8 h-8 rounded-full border-2 border-transparent spin-slow" style="border-top-color: #d4a843;"></div>
				</div>
				<p class="text-sm font-serif" style="color: #f8e8b0;">Memproses foto...</p>
				<p class="text-xs mt-2" style="color: #6a6a6a;">Menggabungkan foto dengan frame</p>
			</div>

		<!-- ERROR -->
		{:else if stage === 'error'}
			<div class="text-center">
				<p class="mb-4" style="color: #fca5a5;">{errorMsg}</p>
				<button onclick={reset} class="px-6 py-2 rounded-lg text-sm" style="color: #d4a843; border: 1px solid rgba(212,168,67,0.3);">
					Coba lagi
				</button>
			</div>

		<!-- REVIEW -->
		{:else if stage === 'review'}
			<p class="text-xs tracking-widest" style="color: #6a6a6a;">CEK FOTO</p>
			<div class="flex gap-3">
				{#each photos as photo, i}
					<div class="flex flex-col items-center gap-2">
						<div
							class="relative rounded-xl overflow-hidden"
							style="width: 100px; aspect-ratio: {frameConfig.cameraAspectRatio}; border: 1.5px solid rgba(212,168,67,0.4);"
						>
							<img src={photo} alt="Foto {i + 1}" class="w-full h-full object-cover" />
						</div>
						<button
							onclick={() => startRetake(i)}
							class="px-3 py-1 rounded-lg text-xs transition-all hover:scale-105"
							style="border: 1px solid rgba(212,168,67,0.25); color: #b8942e;"
						>
							Retake
						</button>
					</div>
				{/each}
			</div>
			<div class="flex flex-col gap-2 w-full max-w-xs mt-2">
				<button
					onclick={compose}
					class="w-full py-3 rounded-xl font-semibold text-sm transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
					style="background: linear-gradient(135deg, #d4a843, #b8942e); color: #0a0a0a; box-shadow: 0 4px 20px rgba(212,168,67,0.3);"
				>
					<Sparkles style="width: 1rem; height: 1rem;" /> Buat Foto
				</button>
				<button
					onclick={reset}
					class="w-full py-2 rounded-xl text-xs flex items-center justify-center gap-2"
					style="color: #4a4a4a;"
				>
					<RotateCcw style="width: 0.875rem; height: 0.875rem;" /> Ulang Semua
				</button>
			</div>

		<!-- CAMERA -->
		{:else}
			{#if cameraError}
				<div class="text-center">
					<p class="text-sm mb-4" style="color: #fca5a5;">{cameraError}</p>
					<button onclick={startCamera} class="px-6 py-2 rounded-lg text-sm" style="color: #d4a843; border: 1px solid rgba(212,168,67,0.3);">
						Coba Lagi
					</button>
				</div>
			{:else}
				<!-- Preview -->
				<div
					class="relative w-full max-w-xl rounded-2xl overflow-hidden"
					style="aspect-ratio: {SLOT_RATIO}; border: 1.5px solid rgba(212,168,67,0.2); max-height: 70vh;"
				>
					<video
						bind:this={videoEl}
						autoplay
						muted
						playsinline
						class="w-full h-full object-cover"
						style="transform: {facingMode === 'user' ? 'scaleX(-1)' : 'none'};"
					></video>

					<!-- Switch camera button -->
					{#if cameraReady && stage !== 'countdown' && stage !== 'retaking'}
						<button
							onclick={switchCamera}
							class="absolute top-3 right-3 p-2 rounded-full transition-all hover:scale-110 active:scale-95"
							style="background: rgba(0,0,0,0.5); color: #d4a843; border: 1px solid rgba(212,168,67,0.3);"
							title="Ganti kamera"
						>
							<SwitchCamera style="width: 1.25rem; height: 1.25rem;" />
						</button>
					{/if}

					{#if stage === 'countdown' || stage === 'retaking'}
						<div class="absolute inset-0 flex flex-col items-center justify-center" style="background: rgba(0,0,0,0.5);">
							{#key countdownKey}
								<div
									class="countdown-number font-bold font-serif"
									style="font-size: clamp(80px, 20vw, 140px); color: #d4a843; text-shadow: 0 0 60px rgba(212,168,67,0.8);"
								>
									{countdown}
								</div>
							{/key}
						</div>
					{/if}

					{#if showFlash}
						<div class="capture-flash absolute inset-0" style="background: white;"></div>
					{/if}

					{#if !cameraReady && !cameraError}
						<div class="absolute inset-0 flex items-center justify-center" style="background: rgba(0,0,0,0.85);">
							<div class="w-6 h-6 rounded-full border-2 border-transparent spin-slow" style="border-top-color: #d4a843;"></div>
						</div>
					{/if}
				</div>

				<!-- Thumbnails strip -->
				{#if photos.length > 0}
					<div class="flex gap-2">
						{#each photos as photo, i}
							<div class="flex flex-col items-center gap-1">
								<div
									class="relative rounded-lg overflow-hidden"
									style="width: 60px; aspect-ratio: {SLOT_RATIO}; border: 1px solid #d4a843;"
								>
									<img src={photo} alt="Foto {i + 1}" class="w-full h-full object-cover" />
									{#if stage === 'idle' && cameraReady}
										<button
											onclick={() => startRetake(i)}
											class="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
											style="background: rgba(0,0,0,0.6);"
											title="Retake foto {i + 1}"
										>
											<RotateCcw style="width: 1rem; height: 1rem; color: #d4a843;" />
										</button>
									{/if}
								</div>
								{#if stage === 'idle' && cameraReady}
									<button
										onclick={() => startRetake(i)}
										class="text-xs transition-colors hover:opacity-80"
										style="color: #b8942e;"
									>
										retake
									</button>
								{/if}
							</div>
						{/each}
						{#each { length: numPhotos - photos.length } as _}
							<div
								class="rounded-lg"
								style="width: 60px; aspect-ratio: {SLOT_RATIO}; border: 1px solid rgba(212,168,67,0.15);"
							></div>
						{/each}
					</div>
				{/if}

				<!-- Button -->
				<button
					onclick={takePhoto}
					disabled={!cameraReady || stage === 'countdown'}
					class="px-12 py-4 rounded-full font-semibold text-sm transition-all hover:scale-105 active:scale-95 disabled:opacity-40 pulse-gold flex items-center justify-center gap-2"
					style="background: linear-gradient(135deg, #d4a843, #b8942e); color: #0a0a0a; box-shadow: 0 6px 24px rgba(212,168,67,0.35);"
				>
					<Camera style="width: 1.125rem; height: 1.125rem;" /> Foto {photos.length + 1} / {numPhotos}
				</button>

				{#if photos.length > 0}
					<button
						onclick={reset}
						class="text-xs flex items-center justify-center gap-1"
						style="color: #3a3a3a;"
					>
						<RotateCcw style="width: 0.75rem; height: 0.75rem;" /> Ulang Semua
					</button>
				{/if}
			{/if}
		{/if}
	</main>
</div>
