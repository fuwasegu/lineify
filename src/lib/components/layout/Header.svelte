<script lang="ts">
  import Container from './Container.svelte';
</script>

<header>
  <Container>
    <div class="header-content">
      <h1>Lineify</h1>
      <p>画像からエッジを抽出するシンプルなツール</p>
    </div>
  </Container>
</header>

<style>
  header {
    background-color: #f8f9fa;
    padding: 1rem 0;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }
  
  .header-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
  }
  
  h1 {
    margin: 0;
    font-size: 2rem;
    color: #333;
  }
  
  p {
    margin: 0.5rem 0 0;
    color: #666;
  }
  
  @media (max-width: 768px) {
    h1 {
      font-size: 1.5rem;
    }
    
    p {
      font-size: 0.9rem;
    }
  }
</style> 