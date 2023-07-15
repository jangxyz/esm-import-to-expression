<script>
	import esmImportExpression from 'esm-import-to-expression';

	export let source = '';
	let source2 = '';

	function handleSubmit() {
		source2 = esmImportExpression(source);
	}
</script>

<div class="page">
	<header>
		<h1>ESM imports</h1>
	</header>

	<p>Convert ESM import statements to import function calls.</p>

	<main>
		<form class="container input" on:submit|preventDefault={handleSubmit}>
			<label for="input">Input:</label>
			<div class="text-wrapper">
				<textarea id="input" bind:value={source} />
			</div>

			<footer>
				<div class="left">
					<!--  -->
				</div>
				<div class="right">
					<button type="submit">Convert</button>
				</div>
			</footer>
		</form>

		<div class="container output">
			<label for="output">Output:</label>
			<div class="text-wrapper">
				<textarea id="output" value={source2} readonly />
			</div>
			<footer>
				<!--  -->
			</footer>
		</div>
	</main>
</div>

<style>
	:global(html, body) {
		margin: 0;
		padding: 0;
	}
	:global(*) {
		box-sizing: border-box;
	}

	.page {
		width: 100vw;
		height: 100vh;

		display: flex;
		flex-direction: column;
	}

	header {
		padding: 15px;
	}
	h1 {
		margin: 0;
	}
	p {
		margin: 15px;
	}

	main {
		width: 100%;
		flex: 1 1 auto;

		padding: 10px 20px;

		display: flex;
		justify-content: space-between;
		gap: 20px;
	}

	.container {
		flex: 1 1 auto;

		display: flex;
		flex-direction: column;
	}

	.text-wrapper {
		flex: 1 1 auto;
	}
	footer {
		flex: 0 0 60px;
	}
	footer {
		padding: 20px 10px;
		display: flex;
		justify-content: space-between;
	}

	textarea {
		width: 100%;
		height: 100%;
	}
</style>
