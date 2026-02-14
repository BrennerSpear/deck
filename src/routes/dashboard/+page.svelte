<script lang="ts">
	import CronHealthCard from '$lib/components/dashboard/CronHealthCard.svelte';
	import TmuxSessionsCard from '$lib/components/dashboard/TmuxSessionsCard.svelte';
	import SubAgentsCard from '$lib/components/dashboard/SubAgentsCard.svelte';
</script>

<div class="h-full overflow-y-auto p-6">
	<div class="max-w-7xl mx-auto">
		<div class="mb-6">
			<h1 class="text-xl font-semibold">System Status</h1>
			<p class="text-sm text-zinc-500 mt-1">Live overview of infrastructure and agents</p>
		</div>

		<div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
			<CronHealthCard class="lg:col-span-1" />
			<TmuxSessionsCard class="lg:col-span-1" />
			<SubAgentsCard class="lg:col-span-2" />
		</div>
	</div>
</div>
