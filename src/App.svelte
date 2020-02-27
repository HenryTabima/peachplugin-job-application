<script>
	import Hello from './components/Hello.svelte'
	import Topbar from './components/Topbar.svelte'
	import Fullpage from './components/Fullpage.svelte'
	import Improvements from './components/Improvements.svelte'
	import Issues from './components/Issues.svelte'

	import { scrollto } from 'svelte-scrollto'
	import { getOffset } from './lib/utils'

	let y
</script>

<svelte:window bind:scrollY={y}/>
<Topbar/>
<main>
	<section id="about">
		<Hello/>
		<footer class="cta" use:scrollto={'#improvements'}>↓ Scroll down to see more thoughts about the Plugin ↓</footer>
	</section>
	<section id="improvements">
		<Improvements/>
		<footer class="cta" use:scrollto={'#issues'}>↓ I also discovered some issues, scroll down to see them ↓</footer>
	</section>
	<section id="issues">
		<Issues/>
		<footer class="cta" use:scrollto={'#about'}>↑ Back to Top ↑</footer>
	</section>
</main>

<style>
	:global(body) {
		margin: 0;
		padding: 0;
		scroll-behavior: smooth;
	}

	main {
		text-align: center;
		max-width: 95%;
		margin: 0 auto;
	}

	section {
		height: 100vh;
		display: flex;
		justify-content: center;
		align-items: center;
		flex-direction: column;
	}

	section:nth-child(even) {
		background-color: whitesmoke;
	}

	@media (min-width: 640px) {
		main {
			max-width: none;
		}
	}

	.cta {
		margin-top: 20px;
		font-size: 1.2rem;
		font-weight: bold;
		cursor: pointer;
	}
</style>