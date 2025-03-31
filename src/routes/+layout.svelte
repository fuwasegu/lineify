<script lang="ts">
  import Header from '$lib/components/layout/Header.svelte';
  import Footer from '$lib/components/layout/Footer.svelte';
  import Container from '$lib/components/layout/Container.svelte';
  
  // グローバルスタイルを追加
  import '../app.css';
</script>

<div class="app">
  <Header />
  
  <main>
    <Container>
      <slot />
    </Container>
  </main>
  
  <Footer />
</div>

<style>
  .app {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
  }
  
  main {
    flex: 1;
    padding: 2rem 0;
  }
  
  @media (max-width: 768px) {
    main {
      padding: 1rem 0;
    }
  }
</style> 