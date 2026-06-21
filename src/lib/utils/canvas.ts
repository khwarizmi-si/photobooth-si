export interface FrameConfig {
	numPhotos: number;
	cameraAspectRatio: number;
	slots: Array<{ x: number; y: number; w: number; h: number }>; // normalized 0-1
	canvasWidth: number;
	canvasHeight: number;
}

export interface ComposeOptions {
	photos: string[];
	frameKey?: string | null;
	frameUrl?: string | null;
}

const DEFAULT_CONFIG: FrameConfig = {
	numPhotos: 3,
	cameraAspectRatio: 654 / 389, // landscape slot ratio ~1.68
	slots: [],
	canvasWidth: 1080,
	canvasHeight: 1350
};

export function getFrameConfig(_frameKey: string | null | undefined): FrameConfig {
	return DEFAULT_CONFIG;
}

// Scan frame PNG untuk temukan posisi transparent slot secara otomatis
function detectSlots(
	frameImg: HTMLImageElement
): Array<{ x: number; y: number; w: number; h: number }> {
	const fw = frameImg.naturalWidth;
	const fh = frameImg.naturalHeight;

	const tmp = document.createElement('canvas');
	tmp.width = fw;
	tmp.height = fh;
	const ctx = tmp.getContext('2d')!;
	ctx.drawImage(frameImg, 0, 0);

	const { data } = ctx.getImageData(0, 0, fw, fh);

	// Pixel dianggap "transparan" kalau alpha < 100
	const ALPHA = 100;
	// Row dianggap bagian dari slot kalau >30% pixel transparan
	const ROW_RATIO = 0.3;
	// Slot valid kalau tingginya >5% dari tinggi frame
	const MIN_H = fh * 0.05;

	// Tandai setiap baris apakah "transparan"
	const transRow: boolean[] = new Array(fh).fill(false);
	for (let y = 0; y < fh; y++) {
		let count = 0;
		for (let x = 0; x < fw; x++) {
			if (data[(y * fw + x) * 4 + 3] < ALPHA) count++;
		}
		transRow[y] = count / fw > ROW_RATIO;
	}

	// Kumpulkan range baris yang kontinu menjadi slot
	const raw: Array<{ y: number; h: number }> = [];
	let start = -1;
	for (let y = 0; y <= fh; y++) {
		if (y < fh && transRow[y]) {
			if (start < 0) start = y;
		} else if (start >= 0) {
			const h = y - start;
			if (h >= MIN_H) raw.push({ y: start, h });
			start = -1;
		}
	}

	// Cari batas x untuk setiap slot
	return raw.map(({ y: sy, h: sh }) => {
		let minX = fw,
			maxX = 0;
		for (let y = sy; y < sy + sh; y++) {
			for (let x = 0; x < fw; x++) {
				if (data[(y * fw + x) * 4 + 3] < ALPHA) {
					if (x < minX) minX = x;
					if (x > maxX) maxX = x;
				}
			}
		}
		return { x: minX, y: sy, w: maxX - minX + 1, h: sh };
	});
}

export async function composePhotos(options: ComposeOptions): Promise<string> {
	const { photos, frameUrl } = options;

	if (frameUrl) {
		return composeWithFrame(photos, frameUrl);
	}

	return composeDefault(photos);
}

async function composeWithFrame(photos: string[], frameUrl: string): Promise<string> {
	const frameImg = await loadImage(frameUrl);
	const width = frameImg.naturalWidth;
	const height = frameImg.naturalHeight;

	// Auto-detect slot positions dari transparent area frame
	const slots = detectSlots(frameImg);

	const canvas = document.createElement('canvas');
	canvas.width = width;
	canvas.height = height;
	const ctx = canvas.getContext('2d')!;

	ctx.fillStyle = '#0A0A0A';
	ctx.fillRect(0, 0, width, height);

	for (let i = 0; i < Math.min(photos.length, slots.length); i++) {
		const s = slots[i];
		await drawPhoto(ctx, photos[i], s.x, s.y, s.w, s.h);
	}

	// Frame ditaruh paling atas
	ctx.drawImage(frameImg, 0, 0, width, height);

	return canvas.toDataURL('image/jpeg', 0.92);
}

async function composeDefault(photos: string[]): Promise<string> {
	const width = 1080;
	const height = 1350;

	const canvas = document.createElement('canvas');
	canvas.width = width;
	canvas.height = height;
	const ctx = canvas.getContext('2d')!;

	ctx.fillStyle = '#0A0A0A';
	ctx.fillRect(0, 0, width, height);

	ctx.fillStyle = '#D4A843';
	ctx.fillRect(0, 0, width, 6);
	ctx.fillRect(0, height - 6, width, 6);

	const padding = 24;
	const gap = 16;
	const photoWidth = width - padding * 2;
	const photoHeight = Math.floor((height - padding * 2 - gap * 2 - 80) / 3);

	ctx.fillStyle = '#D4A843';
	ctx.font = 'bold 28px Georgia, serif';
	ctx.textAlign = 'center';
	ctx.fillText('WISUDA 2026', width / 2, padding + 30);

	ctx.strokeStyle = '#D4A843';
	ctx.lineWidth = 1;
	ctx.globalAlpha = 0.5;
	ctx.beginPath();
	ctx.moveTo(padding, padding + 44);
	ctx.lineTo(width - padding, padding + 44);
	ctx.stroke();
	ctx.globalAlpha = 1;

	const photoStartY = padding + 56;
	for (let i = 0; i < Math.min(photos.length, 3); i++) {
		const y = photoStartY + i * (photoHeight + gap);
		await drawPhoto(ctx, photos[i], padding, y, photoWidth, photoHeight);
	}

	ctx.fillStyle = '#B8942E';
	ctx.font = '18px sans-serif';
	ctx.textAlign = 'center';
	const footerY = photoStartY + 3 * (photoHeight + gap) - gap + 20;
	ctx.fillText('Prestasi & Kebanggaan', width / 2, footerY + 14);

	return canvas.toDataURL('image/jpeg', 0.92);
}

function loadImage(src: string): Promise<HTMLImageElement> {
	return new Promise((resolve, reject) => {
		const img = new Image();
		img.crossOrigin = 'anonymous';
		img.onload = () => resolve(img);
		img.onerror = reject;
		img.src = src;
	});
}

async function drawPhoto(
	ctx: CanvasRenderingContext2D,
	src: string,
	x: number,
	y: number,
	w: number,
	h: number
): Promise<void> {
	const img = await loadImage(src);
	const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
	const sw = w / scale;
	const sh = h / scale;
	const sx = (img.naturalWidth - sw) / 2;
	const sy = (img.naturalHeight - sh) / 2;
	ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}
