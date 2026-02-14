<script lang="ts">
	import { page } from '$app/state';

	const tabs = [
		{ href: '/', label: 'Projects', icon: 'projects' },
		{ href: '/mission-control', label: 'Mission Control', icon: 'cpu' },
		{ href: '/dashboard', label: 'Dashboard', icon: 'grid' }
	] as const;

	function isActive(href: string): boolean {
		if (href === '/') return page.url.pathname === '/';
		return page.url.pathname.startsWith(href);
	}

	function tabClass(href: string): string {
		const base = 'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors';
		if (isActive(href)) return `${base} bg-zinc-800 text-zinc-100`;
		return `${base} text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50`;
	}
</script>

<nav class="h-10 flex items-center gap-1 px-4 border-b border-zinc-800 bg-zinc-925 flex-shrink-0">
	<span class="text-sm font-semibold text-zinc-300 mr-4">Deck</span>
	{#each tabs as tab}
		<a href={tab.href} class={tabClass(tab.href)}>
			{#if tab.icon === 'projects'}
				<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
				</svg>
			{:else if tab.icon === 'cpu'}
				<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
				</svg>
			{:else if tab.icon === 'grid'}
				<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
				</svg>
			{/if}
			{tab.label}
		</a>
	{/each}
</nav>
