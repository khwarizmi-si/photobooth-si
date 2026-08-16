<script lang="ts">
	import type { PageData } from './$types';
	import {
		Camera,
		Image,
		Smartphone,
		Sparkles,
		Shield,
		ToggleLeft,
		ToggleRight,
		LogOut,
		CheckCircle,
		XCircle,
		Info,
		Flag
	} from '@lucide/svelte';
	import { onMount } from 'svelte';

	let { data } = $props<{ data: PageData }>();

	const isAdmin = $derived(data.user?.role === 'admin');

	let toggling = $state(false);
	let wisudawanPhotoEnabled = $state(data.wisudawanPhotoEnabled);
	let accessError = $state('');

	async function refreshPhotoAccess() {
		try {
			const res = await fetch('/api/photo-access');
			const json = (await res.json()) as {
				wisudawan_photo_enabled?: boolean;
				error?: string;
			};
			if (!res.ok || typeof json.wisudawan_photo_enabled !== 'boolean') {
				throw new Error(json.error ?? 'Gagal membaca status akses');
			}
			wisudawanPhotoEnabled = json.wisudawan_photo_enabled;
			accessError = '';
		} catch {
			accessError = 'Status akses belum tersinkron.';
		}
	}

	async function toggleUserPhoto() {
		if (!isAdmin || toggling) return;
		toggling = true;
		const next = !wisudawanPhotoEnabled;
		wisudawanPhotoEnabled = next;

		try {
			const res = await fetch('/api/admin/toggle-user-photo', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ photo_enabled: next })
			});
			if (!res.ok) {
				wisudawanPhotoEnabled = !next;
			} else {
				await refreshPhotoAccess();
			}
		} catch {
			wisudawanPhotoEnabled = !next;
		} finally {
			toggling = false;
		}
	}

	onMount(() => {
		if (!isAdmin) return;
		refreshPhotoAccess();
		const interval = window.setInterval(refreshPhotoAccess, 2000);
		return () => window.clearInterval(interval);
	});
</script>

<svelte:head>
	<title>Gumuruh Photobooth</title>
</svelte:head>

<div
	class="min-h-screen flex flex-col"
	style="background: linear-gradient(180deg, #fef2f2 0%, #ffffff 60%);"
>

{#if isAdmin}
	<!-- ========== ADMIN DASHBOARD ========== -->
	<header
		class="flex items-center justify-between px-6 py-4"
		style="border-bottom: 1px solid rgba(220, 38, 38, 0.15); background: #ffffff;"
	>
		<div class="flex items-center gap-3">
			<Flag style="color: #dc2626; width: 1.25rem; height: 1.25rem;" />
			<h1 class="text-lg font-semibold font-serif" style="color: #b91c1c;">GUMURUH</h1>
		</div>
		<div class="flex items-center gap-3">
			<div class="text-right">
				<p class="text-sm font-medium" style="color: #1f2937;">{data.user?.name}</p>
				<p class="text-xs flex items-center justify-end gap-1" style="color: #dc2626;">
					<Shield style="width: 0.75rem; height: 0.75rem;" /> Admin
				</p>
			</div>
			<a
				href="/auth/logout"
				class="p-2 rounded-lg transition-colors hover:bg-gray-100"
				style="color: #dc2626;"
				title="Logout"
			>
				<LogOut style="width: 1.25rem; height: 1.25rem;" />
			</a>
		</div>
	</header>

	<main class="max-w-4xl mx-auto w-full px-6 py-8">
		<div class="text-center mb-8">
			<p class="text-sm mb-1" style="color: #dc2626; letter-spacing: 0.15em;">SELAMAT DATANG</p>
			<h2 class="text-3xl font-bold font-serif" style="color: #b91c1c;">{data.user?.name}</h2>
			<p class="text-sm mt-2" style="color: #6b7280;">Kontrol penuh untuk panitia acara</p>
		</div>

		<!-- Stats -->
		<div class="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
			<div class="p-4 rounded-xl text-center" style="background: #fef2f2; border: 1px solid rgba(220, 38, 38, 0.2);">
				<p class="text-2xl font-bold font-serif" style="color: #dc2626;">{data.photoCount}</p>
				<p class="text-xs mt-1" style="color: #6b7280;">Total Foto</p>
			</div>
			<div class="p-4 rounded-xl text-center" style="background: #fef2f2; border: 1px solid rgba(220, 38, 38, 0.2);">
				<p class="text-sm font-medium mt-1" style="color: #dc2626;">{data.activeFrame ? 'Aktif' : 'Belum ada'}</p>
				<p class="text-xs mt-1" style="color: #6b7280;">Frame</p>
			</div>
			<div class="p-4 rounded-xl text-center" style="background: #fef2f2; border: 1px solid rgba(220, 38, 38, 0.2);">
				<p class="text-sm font-medium mt-1" style="color: #dc2626;">3/Sesi</p>
				<p class="text-xs mt-1" style="color: #6b7280;">Jumlah Foto</p>
			</div>
			<div class="p-4 rounded-xl text-center" style="background: #fef2f2; border: 1px solid rgba(220, 38, 38, 0.2);">
				<p class="text-sm font-medium mt-1" style="color: {wisudawanPhotoEnabled ? '#dc2626' : '#ef4444'};">
					{wisudawanPhotoEnabled ? 'Aktif' : 'Nonaktif'}
				</p>
				<p class="text-xs mt-1" style="color: #6b7280;">Akses Foto</p>
			</div>
		</div>

		<!-- Kontrol Admin -->
		<div class="mb-8 p-6 rounded-xl" style="background: #fef2f2; border: 1px solid rgba(220, 38, 38, 0.15);">
			<h3 class="text-base font-serif font-semibold mb-4 flex items-center gap-2" style="color: #b91c1c;">
				<Shield style="width: 1.25rem; height: 1.25rem;" /> KONTROL ADMIN
			</h3>
			<div class="overflow-hidden rounded-lg" style="border: 1px solid rgba(220, 38, 38, 0.15);">
				<table class="w-full text-sm">
					<thead>
						<tr style="background: rgba(220, 38, 38, 0.08);">
							<th class="px-4 py-3 text-left" style="color: #b91c1c;">Role</th>
							<th class="px-4 py-3 text-left" style="color: #b91c1c;">Nama</th>
							<th class="px-4 py-3 text-center" style="color: #b91c1c;">Foto</th>
							<th class="px-4 py-3 text-center" style="color: #b91c1c;">Aksi</th>
						</tr>
					</thead>
					<tbody>
						<tr style="border-top: 1px solid rgba(220, 38, 38, 0.1);">
							<td class="px-4 py-3" style="color: #dc2626;">Admin</td>
							<td class="px-4 py-3" style="color: #1f2937;">Panitia</td>
							<td class="px-4 py-3 text-center" style="color: #dc2626;">
								<CheckCircle style="width: 1rem; height: 1rem; display: inline-block;" />
							</td>
							<td class="px-4 py-3 text-center" style="color: #6b7280;">-</td>
						</tr>
						<tr style="border-top: 1px solid rgba(220, 38, 38, 0.1);">
							<td class="px-4 py-3" style="color: #b91c1c;">Publik</td>
							<td class="px-4 py-3" style="color: #1f2937;">Peserta</td>
							<td class="px-4 py-3 text-center">
								<span style="color: {wisudawanPhotoEnabled ? '#dc2626' : '#ef4444'};">
									{#if wisudawanPhotoEnabled}
										<CheckCircle style="width: 1rem; height: 1rem; display: inline-block;" /> ON
									{:else}
										<XCircle style="width: 1rem; height: 1rem; display: inline-block;" /> OFF
									{/if}
								</span>
							</td>
							<td class="px-4 py-3 text-center">
								<button
									onclick={toggleUserPhoto}
									disabled={toggling}
									class="p-2 rounded-lg transition-all hover:scale-110 disabled:opacity-40"
									style="color: {wisudawanPhotoEnabled ? '#dc2626' : '#ef4444'};"
									title={wisudawanPhotoEnabled ? 'Nonaktifkan' : 'Aktifkan'}
								>
									{#if wisudawanPhotoEnabled}
										<ToggleRight style="width: 1.5rem; height: 1.5rem;" />
									{:else}
										<ToggleLeft style="width: 1.5rem; height: 1.5rem;" />
									{/if}
								</button>
							</td>
						</tr>
					</tbody>
				</table>
			</div>
			<p class="text-xs mt-2 flex items-center gap-1" style="color: #6b7280;">
				<Info style="width: 0.75rem; height: 0.75rem;" /> Peserta tidak perlu login untuk ambil foto
			</p>
			{#if accessError}
				<p class="text-xs mt-1" style="color: #ef4444;">{accessError}</p>
			{/if}
		</div>

		<!-- Menu -->
		<h3 class="text-base font-serif font-semibold mb-4" style="color: #1f2937;">Menu Utama</h3>
		<div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
			<a href="/photo" class="p-5 rounded-xl flex items-center gap-4 transition-all duration-300 hover:scale-105" style="background: #fef2f2; border: 1px solid rgba(220, 38, 38, 0.25);">
				<div class="w-12 h-12 rounded-full flex items-center justify-center" style="background: rgba(220, 38, 38, 0.15);">
					<Camera style="color: #dc2626; width: 1.5rem; height: 1.5rem;" />
				</div>
				<div>
					<h4 class="font-semibold font-serif" style="color: #1f2937;">Ambil Foto</h4>
					<p class="text-xs mt-1" style="color: #6b7280;">Mulai sesi foto 3x</p>
				</div>
			</a>
			<a href="/frames" class="p-5 rounded-xl flex items-center gap-4 transition-all duration-300 hover:scale-105" style="background: #fef2f2; border: 1px solid rgba(220, 38, 38, 0.25);">
				<div class="w-12 h-12 rounded-full flex items-center justify-center" style="background: rgba(220, 38, 38, 0.15);">
					<Image style="color: #dc2626; width: 1.5rem; height: 1.5rem;" />
				</div>
				<div>
					<h4 class="font-semibold font-serif" style="color: #1f2937;">Kelola Frame</h4>
					<p class="text-xs mt-1" style="color: #6b7280;">Upload & set frame aktif</p>
				</div>
			</a>
			<a href="/gallery" class="p-5 rounded-xl flex items-center gap-4 transition-all duration-300 hover:scale-105" style="background: #fef2f2; border: 1px solid rgba(220, 38, 38, 0.25);">
				<div class="w-12 h-12 rounded-full flex items-center justify-center" style="background: rgba(220, 38, 38, 0.15);">
					<Smartphone style="color: #dc2626; width: 1.5rem; height: 1.5rem;" />
				</div>
				<div>
					<h4 class="font-semibold font-serif" style="color: #1f2937;">Galeri</h4>
					<p class="text-xs mt-1" style="color: #6b7280;">Lihat semua foto acara</p>
				</div>
			</a>
		</div>
	</main>

{:else}
	<!-- ========== BERANDA PUBLIK ========== -->
	<main class="flex-1 flex flex-col items-center justify-center px-6 py-12 text-center">
		<!-- Logo / Branding -->
		<div class="mb-10">
			<div
				class="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5"
				style="background: rgba(220, 38, 38, 0.12); border: 2px solid rgba(220, 38, 38, 0.3); box-shadow: 0 0 40px rgba(220, 38, 38, 0.15);"
			>
				<Flag style="color: #dc2626; width: 2.5rem; height: 2.5rem;" />
			</div>
			<p class="text-xs tracking-widest mb-2" style="color: #dc2626; letter-spacing: 0.25em;">GUMURUH STUDIO</p>
			<h1 class="text-3xl font-bold font-serif mb-1" style="color: #b91c1c;">Photobooth</h1>
			<h1 class="text-3xl font-bold font-serif" style="color: #dc2626;">Gumuruh</h1>
			<div style="height: 1px; background: linear-gradient(to right, transparent, #dc2626, transparent); margin: 1.25rem auto; max-width: 200px;"></div>
			<p class="text-sm" style="color: #6b7280;">Abadikan momen kemerdekaanmu di kampung Gumuruh</p>
		</div>

		<!-- Dua tombol utama -->
		<div class="w-full max-w-xs flex flex-col gap-4">
			<a
				href="/photo"
				class="flex items-center justify-center gap-3 py-4 px-6 rounded-2xl font-semibold text-base transition-all duration-200 hover:scale-105 active:scale-95"
				style="background: linear-gradient(135deg, #dc2626, #b91c1c); color: #ffffff; box-shadow: 0 4px 24px rgba(220, 38, 38, 0.35);"
			>
				<Camera style="width: 1.25rem; height: 1.25rem;" />
				Ambil Foto
			</a>
			<a
				href="/gallery"
				class="flex items-center justify-center gap-3 py-4 px-6 rounded-2xl font-semibold text-base transition-all duration-200 hover:scale-105 active:scale-95"
				style="background: #fef2f2; color: #dc2626; border: 1.5px solid rgba(220, 38, 38, 0.3);"
			>
				<Smartphone style="width: 1.25rem; height: 1.25rem;" />
				Lihat Galeri
			</a>
		</div>
	</main>

	<!-- Footer beranda -->
	<footer class="text-center py-5 flex flex-col items-center gap-1">
		<a href="https://uwangraph.com" target="_blank" rel="noopener noreferrer" class="text-xs" style="color: #9ca3af;">© 2026 Gumuruh Photobooth by UWANGRAPH</a>
		<a href="/auth" class="text-xs" style="color: #9ca3af;">Masuk sebagai panitia</a>
	</footer>
{/if}

</div>
