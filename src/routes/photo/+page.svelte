<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { composePhotos, getFrameConfig, detectFrameSlotRatios } from '$lib/utils/canvas';
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
	const DEFAULT_RATIO = $derived(frameConfig.cameraAspectRatio);

	let slotRatios = $state<number[]>([]);
	const currentSlotIndex = $derived(retakeIndex !== null ? retakeIndex : photos.length);
	const currentSlotRatio = $derived(
		slotRatios[currentSlotIndex] ?? slotRatios[0] ?? DEFAULT_RATIO
	);

	async function loadSlotRatios() {
		if (!selectedFrameKey) {
			slotRatios = [];
			return;
		}
		try {
			const ratios = await detectFrameSlotRatios(
				`/api/frames/${selectedFrameKey}`,
				numPhotos
			);
			if (ratios.length > 0) slotRatios = ratios;
		} catch {
			slotRatios = [];
		}
	}

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
					height: { ideal: Math.round(1280 / currentSlotRatio) },
					aspectRatio: { ideal: currentSlotRatio },
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
		if (vw / vh > currentSlotRatio) sw = vh * currentSlotRatio;
		else sh = vw / currentSlotRatio;
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
		a.download = `gumuruh_${ts}.jpg`;
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

	$effect(() => {
		if (canTakePhoto) startCamera();
	});

	$effect(() => {
		loadSlotRatios();
	});

	let prevSlotRatio = $state(0);
	$effect(() => {
		if (
			cameraReady &&
			prevSlotRatio !== 0 &&
			currentSlotRatio !== prevSlotRatio &&
			Math.abs(currentSlotRatio - prevSlotRatio) > 0.05
		) {
			prevSlotRatio = currentSlotRatio;
			stopCamera();
			startCamera();
		} else {
			prevSlotRatio = currentSlotRatio;
		}
	});

	$effect(() => {
		if (stage === 'result' || stage === 'composing') {
			stopCamera();
		}
	});

	$effect(() => () => stopCamera());

	onMount(() => {
		refreshPhotoAccess();
		const interval = window.setInterval(refreshPhotoAccess, 2000);
		return () => window.clearInterval(interval);
	});
</script>

<svelte:head>
	<title>Ambil Foto — Gumuruh Photobooth</title>
</svelte:head>

<div class="min-h-screen flex flex-col" style="background: #fafafa;">
	<header
		class="flex items-center justify-between px-6 py-4 shrink-0"
		style="border-bottom: 1px solid rgba(220, 38, 38, 0.15); background: #ffffff;"
	>
		<a href="/" class="text-sm" style="color: #dc2626;">← Dashboard</a>
		<h1 class="text-sm font-serif font-semibold flex items-center gap-2" style="color: #b91c1c;">
			<Camera style="width: 1rem; height: 1rem;" /> Foto Gumuruh
		</h1>
		<div class="flex gap-1.5">
			{#each { length: numPhotos } as _, i}
				<div
					class="w-2 h-2 rounded-full transition-all duration-300"
					style="background: {photos[i] ? '#dc2626' : 'rgba(220, 38, 38, 0.2)'};"
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
				<h2 class="text-xl font-serif font-bold mb-2" style="color: #1f2937;">Fitur Dinonaktifkan</h2>
				<p class="text-sm mb-4" style="color: #6b7280;">
					Admin telah menonaktifkan fitur foto untuk user.
				</p>
				<a href="/" class="inline-block mt-6 px-6 py-2 rounded-lg text-sm" style="color: #dc2626; border: 1px solid rgba(220, 38, 38, 0.3);">
					Kembali ke Dashboard
				</a>
			</div>

		<!-- RESULT -->
		{:else if stage === 'result' && resultImage}
			<div class="w-full max-w-xs text-center">
				<div
					class="mb-4 p-3 rounded-lg"
					style="background: rgba(220, 38, 38, 0.1); border: 1px solid rgba(220, 38, 38, 0.2);"
				>
					<p class="text-sm font-medium flex items-center justify-center gap-2" style="color: #dc2626;">
						<CheckCircle style="width: 1rem; height: 1rem;" /> Foto Berhasil
					</p>
					<p class="text-xs mt-1" style="color: #6b7280;">
						Foto asli + foto dengan frame tersimpan di galeri
					</p>
				</div>

				<div class="rounded-2xl overflow-hidden mb-4 shadow-2xl" style="border: 2px solid rgba(220, 38, 38, 0.4);">
					<img src={resultImage} alt="Hasil foto gumuruh" class="w-full" />
				</div>
				<div class="grid grid-cols-2 gap-3 mb-3">
					<button
						onclick={downloadPhoto}
						class="py-3 rounded-xl text-sm font-semibold transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
						style="background: linear-gradient(135deg, #dc2626, #b91c1c); color: #ffffff;"
					>
						<Download style="width: 1rem; height: 1rem;" /> Download
					</button>
					<button
						onclick={uploadToR2}
						disabled={uploadStatus === 'uploading' || uploadStatus === 'success'}
						class="py-3 rounded-xl text-sm font-semibold transition-all hover:scale-105 active:scale-95 disabled:opacity-60 flex items-center justify-center gap-2"
						style="border: 1.5px solid rgba(220, 38, 38, 0.3); color: #dc2626;"
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
					<p class="text-xs mb-2" style="color: #6b7280;">{uploadProgress}</p>
				{/if}
				{#if uploadStatus === 'success'}
					<p class="text-xs mb-3 flex items-center justify-center gap-1" style="color: #dc2626;">
						<CheckCircle style="width: 0.875rem; height: 0.875rem;" /> Foto berhasil diupload ke galeri!
					</p>
				{/if}
				<button
					onclick={reset}
					class="w-full py-2 rounded-xl text-xs flex items-center justify-center gap-2"
					style="color: #6b7280;"
				>
					<RotateCcw style="width: 0.875rem; height: 0.875rem;" /> Sesi Baru
				</button>
			</div>

		<!-- COMPOSING -->
		{:else if stage === 'composing'}
			<div class="text-center">
				<div class="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style="border: 2px solid rgba(220, 38, 38, 0.3);">
					<div class="w-8 h-8 rounded-full border-2 border-transparent spin-slow" style="border-top-color: #dc2626;"></div>
				</div>
				<p class="text-sm font-serif" style="color: #1f2937;">Memproses foto...</p>
				<p class="text-xs mt-2" style="color: #6b7280;">Menggabungkan foto dengan frame</p>
			</div>

		<!-- ERROR -->
		{:else if stage === 'error'}
			<div class="text-center">
				<p class="mb-4" style="color: #ef4444;">{errorMsg}</p>
				<button onclick={reset} class="px-6 py-2 rounded-lg text-sm" style="color: #dc2626; border: 1px solid rgba(220, 38, 38, 0.3);">
					Coba lagi
				</button>
			</div>

		<!-- REVIEW -->
		{:else if stage === 'review'}
			<p class="text-xs tracking-widest" style="color: #6b7280;">CEK FOTO</p>
			<div class="flex gap-3">
				{#each photos as photo, i}
					<div class="flex flex-col items-center gap-2">
						<div
							class="relative rounded-xl overflow-hidden"
							style="width: 100px; aspect-ratio: {slotRatios[i] ?? DEFAULT_RATIO}; border: 1.5px solid rgba(220, 38, 38, 0.4);"
						>
							<img src={photo} alt="Foto {i + 1}" class="w-full h-full object-cover" />
						</div>
						<button
							onclick={() => startRetake(i)}
							class="px-3 py-1 rounded-lg text-xs transition-all hover:scale-105"
							style="border: 1px solid rgba(220, 38, 38, 0.25); color: #b91c1c;"
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
					style="background: linear-gradient(135deg, #dc2626, #b91c1c); color: #ffffff; box-shadow: 0 4px 20px rgba(220, 38, 38, 0.3);"
				>
					<Sparkles style="width: 1rem; height: 1rem;" /> Buat Foto
				</button>
				<button
					onclick={reset}
					class="w-full py-2 rounded-xl text-xs flex items-center justify-center gap-2"
					style="color: #6b7280;"
				>
					<RotateCcw style="width: 0.875rem; height: 0.875rem;" /> Ulang Semua
				</button>
			</div>

		<!-- CAMERA -->
		{:else}
			{#if cameraError}
				<div class="text-center">
					<p class="text-sm mb-4" style="color: #ef4444;">{cameraError}</p>
					<button onclick={startCamera} class="px-6 py-2 rounded-lg text-sm" style="color: #dc2626; border: 1px solid rgba(220, 38, 38, 0.3);">
						Coba Lagi
					</button>
				</div>
			{:else}
				<!-- Preview -->
				<div
					class="relative w-full max-w-xl rounded-2xl overflow-hidden"
					style="aspect-ratio: {currentSlotRatio}; border: 1.5px solid rgba(220, 38, 38, 0.2); max-height: 70vh; background: #fef2f2;"
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
							style="background: rgba(255,255,255,0.9); color: #dc2626; border: 1px solid rgba(220, 38, 38, 0.3);"
							title="Ganti kamera"
						>
							<SwitchCamera style="width: 1.25rem; height: 1.25rem;" />
						</button>
					{/if}

					{#if stage === 'countdown' || stage === 'retaking'}
						<div class="absolute inset-0 flex flex-col items-center justify-center" style="background: rgba(255,255,255,0.7);">
							{#key countdownKey}
								<div
									class="countdown-number font-bold font-serif"
									style="font-size: clamp(80px, 20vw, 140px); color: #dc2626; text-shadow: 0 0 60px rgba(220, 38, 38, 0.5);"
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
						<div class="absolute inset-0 flex items-center justify-center" style="background: rgba(255,255,255,0.85);">
							<div class="w-6 h-6 rounded-full border-2 border-transparent spin-slow" style="border-top-color: #dc2626;"></div>
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
									style="width: 60px; aspect-ratio: {slotRatios[i] ?? DEFAULT_RATIO}; border: 1px solid #dc2626;"
								>
									<img src={photo} alt="Foto {i + 1}" class="w-full h-full object-cover" />
									{#if stage === 'idle' && cameraReady}
										<button
											onclick={() => startRetake(i)}
											class="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
											style="background: rgba(255,255,255,0.8);"
											title="Retake foto {i + 1}"
										>
											<RotateCcw style="width: 1rem; height: 1rem; color: #dc2626;" />
										</button>
									{/if}
								</div>
								{#if stage === 'idle' && cameraReady}
									<button
										onclick={() => startRetake(i)}
										class="text-xs transition-colors hover:opacity-80"
										style="color: #b91c1c;"
									>
										retake
									</button>
								{/if}
							</div>
						{/each}
						{#each { length: numPhotos - photos.length } as _, j}
							<div
								class="rounded-lg"
								style="width: 60px; aspect-ratio: {slotRatios[photos.length + j] ?? DEFAULT_RATIO}; border: 1px solid rgba(220, 38, 38, 0.15); background: #fef2f2;"
							></div>
						{/each}
					</div>
				{/if}

				<!-- Button -->
				<button
					onclick={takePhoto}
					disabled={!cameraReady || stage === 'countdown'}
					class="px-12 py-4 rounded-full font-semibold text-sm transition-all hover:scale-105 active:scale-95 disabled:opacity-40 pulse-red flex items-center justify-center gap-2"
					style="background: linear-gradient(135deg, #dc2626, #b91c1c); color: #ffffff; box-shadow: 0 6px 24px rgba(220, 38, 38, 0.35);"
				>
					<Camera style="width: 1.125rem; height: 1.125rem;" /> Foto {photos.length + 1} / {numPhotos}
				</button>

				{#if photos.length > 0}
					<button
						onclick={reset}
						class="text-xs flex items-center justify-center gap-1"
						style="color: #6b7280;"
					>
						<RotateCcw style="width: 0.75rem; height: 0.75rem;" /> Ulang Semua
					</button>
				{/if}
			{/if}
		{/if}
	</main>
</div>
