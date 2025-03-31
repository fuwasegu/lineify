<script lang="ts">
  import Button from './ui/Button.svelte';
  
  export let onExportPng: () => void;
  export let onExportSvg: () => void;
  export let disabled = false;
</script>

<div class="export-container">
  <h3>エクスポート</h3>
  
  <div class="export-buttons">
    <Button 
      variant="secondary" 
      {disabled} 
      on:click={onExportPng}
    >
      PNG形式で保存
    </Button>
    
    <Button 
      variant="secondary" 
      {disabled} 
      on:click={onExportSvg}
    >
      SVG形式で保存
    </Button>
  </div>
</div>

<style>
  .export-container {
    background-color: #f8f9fa;
    padding: 1rem;
    border-radius: 0.5rem;
  }
  
  h3 {
    font-size: 1rem;
    margin: 0 0 1rem 0;
    color: #374151;
  }
  
  .export-buttons {
    display: flex;
    gap: 0.5rem;
  }
  
  @media (max-width: 768px) {
    .export-buttons {
      flex-direction: column;
    }
  }
</style> 