<script lang="ts">
  export let imageData: ImageData | null = null;
  export let label: string = '';
  
  let canvas: HTMLCanvasElement;
  
  $: if (canvas && imageData) {
    const ctx = canvas.getContext('2d');
    if (ctx) {
      canvas.width = imageData.width;
      canvas.height = imageData.height;
      ctx.putImageData(imageData, 0, 0);
    }
  }
</script>

<div class="preview-container">
  {#if label}
    <h3>{label}</h3>
  {/if}
  
  <div class="canvas-wrapper">
    {#if imageData}
      <canvas bind:this={canvas}></canvas>
    {:else}
      <div class="placeholder">
        <p>画像がありません</p>
      </div>
    {/if}
  </div>
</div>

<style>
  .preview-container {
    margin-bottom: 1rem;
  }
  
  h3 {
    font-size: 1rem;
    margin: 0 0 0.5rem 0;
    color: #374151;
  }
  
  .canvas-wrapper {
    width: 100%;
    border: 1px solid #e5e7eb;
    border-radius: 0.25rem;
    overflow: hidden;
    background-color: #f9fafb;
  }
  
  canvas {
    display: block;
    max-width: 100%;
    height: auto;
  }
  
  .placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 200px;
    color: #9ca3af;
  }
</style> 