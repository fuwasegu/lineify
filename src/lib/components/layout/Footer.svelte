<script lang="ts">
  import Container from './Container.svelte';
</script>

<footer>
  <Container>
    <p>© {new Date().getFullYear()} Lineify - ブラウザで動作する画像エッジ抽出ツール</p>
  </Container>
</footer>

<style>
  footer {
    margin-top: 2rem;
    padding: 1rem 0;
    background-color: #f8f9fa;
    border-top: 1px solid #e9ecef;
  }
  
  p {
    text-align: center;
    color: #6c757d;
    font-size: 0.9rem;
    margin: 0;
  }
</style> 