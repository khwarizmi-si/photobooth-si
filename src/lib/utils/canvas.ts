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

/**
 * Scan frame PNG to detect transparent "slots" where photos should go.
 * Uses a bounded flood-fill approach to find contiguous transparent regions.
 */
function detectSlots(
	frameImg: HTMLImageElement,
	expectedSlots: number
): Array<{ x: number; y: number; w: number; h: number }> {
	const fw = frameImg.naturalWidth;
	const fh = frameImg.naturalHeight;

	const tmp = document.createElement('canvas');
	tmp.width = fw;
	tmp.height = fh;
	const ctx = tmp.getContext('2d')!;
	ctx.drawImage(frameImg, 0, 0);

	const { data } = ctx.getImageData(0, 0, fw, fh);

	// Step 1: Build alpha mask (1 = transparent, 0 = opaque)
	const ALPHA_THRESHOLD = 80;
	const mask: Uint8Array = new Uint8Array(fw * fh);
	for (let i = 0; i < fw * fh; i++) {
		mask[i] = data[i * 4 + 3] < ALPHA_THRESHOLD ? 1 : 0;
	}

	// Step 2: Bounded flood-fill to find transparent regions
	const visited = new Uint8Array(fw * fh);
	const rawSlots: Array<{ x: number; y: number; w: number; h: number }> = [];

	const MIN_AREA = fw * fh * 0.005; // at least 0.5% of frame total area
	const MIN_WIDTH = fw * 0.05; // at least 5% of frame width
	const MIN_HEIGHT = fh * 0.05; // at least 5% of frame height

	for (let startY = 0; startY < fh; startY++) {
		for (let startX = 0; startX < fw; startX++) {
			const idx = startY * fw + startX;
			if (mask[idx] === 0 || visited[idx]) continue;

			// Flood fill
			const queue: number[] = [idx];
			visited[idx] = 1;
			let minX = startX, maxX = startX;
			let minY = startY, maxY = startY;
			let area = 0;

			while (queue.length > 0) {
				const ci = queue.pop()!;
				const cx = ci % fw;
				const cy = Math.floor(ci / fw);
				area++;

				if (cx < minX) minX = cx;
				if (cx > maxX) maxX = cx;
				if (cy < minY) minY = cy;
				if (cy > maxY) maxY = cy;

				// Check 4 neighbors
				if (cx > 0) {
					const left = cy * fw + (cx - 1);
					if (mask[left] && !visited[left]) { visited[left] = 1; queue.push(left); }
				}
				if (cx < fw - 1) {
					const right = cy * fw + (cx + 1);
					if (mask[right] && !visited[right]) { visited[right] = 1; queue.push(right); }
				}
				if (cy > 0) {
					const top = (cy - 1) * fw + cx;
					if (mask[top] && !visited[top]) { visited[top] = 1; queue.push(top); }
				}
				if (cy < fh - 1) {
					const bottom = (cy + 1) * fw + cx;
					if (mask[bottom] && !visited[bottom]) { visited[bottom] = 1; queue.push(bottom); }
				}
			}

			const w = maxX - minX + 1;
			const h = maxY - minY + 1;

			// Filter: must be big enough
			if (area >= MIN_AREA && w >= MIN_WIDTH && h >= MIN_HEIGHT) {
				rawSlots.push({ x: minX, y: minY, w, h });
			}
		}
	}

	// Step 3: Sort by position (top-to-bottom, then left-to-right)
	// Group slots that share vertical overlap into "rows"
	rawSlots.sort((a, b) => {
		// If vertically overlapping, sort left-to-right
		const aCenterY = a.y + a.h / 2;
		const bCenterY = b.y + b.h / 2;
		const overlap = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
		const tolerance = Math.min(a.h, b.h) * 0.4;

		if (overlap > tolerance) {
			return a.x - b.x;
		}
		return aCenterY - bCenterY;
	});

	// Step 4: Merge overlapping slots (take union)
	const merged: typeof rawSlots = [];
	for (const slot of rawSlots) {
		let didMerge = false;
		for (const existing of merged) {
			const overlapX = Math.min(slot.x + slot.w, existing.x + existing.w) - Math.max(slot.x, existing.x);
			const overlapY = Math.min(slot.y + slot.h, existing.y + existing.h) - Math.max(slot.y, existing.y);
			if (overlapX > 0 && overlapY > 0) {
				// Merge into union
				const newX = Math.min(slot.x, existing.x);
				const newY = Math.min(slot.y, existing.y);
				existing.w = Math.max(slot.x + slot.w, existing.x + existing.w) - newX;
				existing.h = Math.max(slot.y + slot.h, existing.y + existing.h) - newY;
				existing.x = newX;
				existing.y = newY;
				didMerge = true;
				break;
			}
		}
		if (!didMerge) {
			merged.push({ ...slot });
		}
	}

	// Step 5: If we detect more slots than expected, return the largest by area
	if (merged.length > expectedSlots && expectedSlots > 0) {
		merged.sort((a, b) => (b.w * b.h) - (a.w * a.h));
		return merged.slice(0, expectedSlots);
	}

	return merged;
}

export async function detectFrameSlotRatios(frameUrl: string, numSlots: number): Promise<number[]> {
	const img = await loadImage(frameUrl);
	const slots = detectSlots(img, numSlots);
	return slots.map((s) => s.w / s.h);
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

	// Auto-detect slot positions from transparent areas
	const expectedSlots = photos.length;
	const slots = detectSlots(frameImg, expectedSlots);

	if (slots.length === 0) {
		// Fallback: if no slots detected, draw image stretched to fill canvas
		console.warn('No transparent slots detected in frame, falling back to full canvas');
		const canvas = document.createElement('canvas');
		canvas.width = width;
		canvas.height = height;
		const ctx = canvas.getContext('2d')!;
		ctx.fillStyle = '#0A0A0A';
		ctx.fillRect(0, 0, width, height);
		if (photos.length > 0) {
			await drawPhotoCover(ctx, photos[0], 0, 0, width, height);
		}
		ctx.drawImage(frameImg, 0, 0, width, height);
		return canvas.toDataURL('image/jpeg', 0.92);
	}

	const canvas = document.createElement('canvas');
	canvas.width = width;
	canvas.height = height;
	const ctx = canvas.getContext('2d')!;

	// Fill background
	ctx.fillStyle = '#0A0A0A';
	ctx.fillRect(0, 0, width, height);

	// Draw photos into slots using "cover" mode (no distortion, crop to fill)
	const numToDraw = Math.min(photos.length, slots.length);
	for (let i = 0; i < numToDraw; i++) {
		const s = slots[i];
		await drawPhotoCover(ctx, photos[i], s.x, s.y, s.w, s.h);
	}

	// Draw frame on top (with transparency preserved)
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

	ctx.fillStyle = '#ffffff';
	ctx.fillRect(0, 0, width, height);

	ctx.fillStyle = '#dc2626';
	ctx.fillRect(0, 0, width, 6);
	ctx.fillRect(0, height - 6, width, 6);

	const padding = 24;
	const gap = 16;
	const photoWidth = width - padding * 2;
	const photoHeight = Math.floor((height - padding * 2 - gap * 2 - 80) / 3);

	ctx.fillStyle = '#b91c1c';
	ctx.font = 'bold 28px Georgia, serif';
	ctx.textAlign = 'center';
	ctx.fillText('GUMURUH', width / 2, padding + 30);

	ctx.strokeStyle = '#dc2626';
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
		await drawPhotoCover(ctx, photos[i], padding, y, photoWidth, photoHeight);
	}

	ctx.fillStyle = '#dc2626';
	ctx.font = '18px sans-serif';
	ctx.textAlign = 'center';
	const footerY = photoStartY + 3 * (photoHeight + gap) - gap + 20;
	ctx.fillText('Dirgahayu RI ke-81', width / 2, footerY + 14);

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

/**
 * Draw a photo into a slot using "cover" mode — fills entire slot without distortion.
 * Center-crop the photo to match the slot aspect ratio.
 */
async function drawPhotoCover(
	ctx: CanvasRenderingContext2D,
	src: string,
	x: number,
	y: number,
	w: number,
	h: number
): Promise<void> {
	const img = await loadImage(src);
	const imgRatio = img.naturalWidth / img.naturalHeight;
	const slotRatio = w / h;

	let sx = 0, sy = 0, sw = img.naturalWidth, sh = img.naturalHeight;

	if (imgRatio > slotRatio) {
		// Image is wider — crop sides
		sh = img.naturalHeight;
		sw = sh * slotRatio;
		sx = (img.naturalWidth - sw) / 2;
	} else {
		// Image is taller — crop top/bottom
		sw = img.naturalWidth;
		sh = sw / slotRatio;
		sy = (img.naturalHeight - sh) / 2;
	}

	ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}
