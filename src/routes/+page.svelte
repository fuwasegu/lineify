<script lang="ts">
  import ImageProcessor from '$lib/components/ImageProcessor.svelte';
</script>

<div class="page-container">
  <section class="intro">
    <h2>画像からエッジを抽出</h2>
    <p>
      画像をアップロードして、エッジを抽出し、PNG形式またはSVG形式でダウンロードできます。
      すべての処理はブラウザ上で行われるため、画像がサーバーにアップロードされることはありません。
    </p>
  </section>
  
  <ImageProcessor />
</div>

<style>
  .page-container {
    width: 100%;
  }
  
  .intro {
    margin-bottom: 2rem;
    text-align: center;
  }
  
  h2 {
    font-size: 1.5rem;
    color: #1f2937;
    margin: 0 0 0.5rem 0;
  }
  
  p {
    color: #4b5563;
    max-width: 800px;
    margin: 0 auto;
  }
  
  @media (max-width: 768px) {
    .intro {
      margin-bottom: 1.5rem;
    }
    
    h2 {
      font-size: 1.25rem;
    }
    
    p {
      font-size: 0.9rem;
    }
  }
</style>
