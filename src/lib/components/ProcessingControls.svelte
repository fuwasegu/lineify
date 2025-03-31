<script lang="ts">
  import Slider from './ui/Slider.svelte';
  import Toggle from './ui/Toggle.svelte';
  import Button from './ui/Button.svelte';
  
  export let threshold = 20;
  export let invert = false;
  export let simplifyTolerance = 1;
  export let processing = false;
  export let onProcess: () => void;
  export let onReset: () => void;
  
  // リサイズオプション
  export let enableResize = true;
  export let maxWidth = 1200;
  export let maxHeight = 1200;
</script>

<div class="controls-container">
  <h3>処理設定</h3>
  
  <div class="control-group">
    <div class="info-text">
      <p>大津の二値化アルゴリズムで自動的に最適な閾値を決定します</p>
    </div>
    
    <Toggle 
      label="白黒反転" 
      bind:checked={invert} 
    />
    
    <Toggle 
      label="大きな画像をリサイズする" 
      bind:checked={enableResize} 
    />
    
    {#if enableResize}
      <div class="resize-options">
        <Slider 
          label="最大幅" 
          min={100} 
          max={3000} 
          step={100} 
          bind:value={maxWidth} 
        />
        
        <Slider 
          label="最大高さ" 
          min={100} 
          max={3000} 
          step={100} 
          bind:value={maxHeight} 
        />
      </div>
    {/if}
    
    <Slider 
      label="SVG単純化（低いほど詳細）" 
      min={0.1} 
      max={5} 
      step={0.1} 
      bind:value={simplifyTolerance} 
    />
  </div>
  
  <div class="buttons">
    <Button 
      variant="primary" 
      disabled={processing} 
      on:click={onProcess}
    >
      {processing ? '処理中...' : '画像を処理'}
    </Button>
    
    <Button 
      variant="outline" 
      on:click={onReset}
    >
      リセット
    </Button>
  </div>
</div>

<style>
  .controls-container {
    background-color: #f8f9fa;
    padding: 1rem;
    border-radius: 0.5rem;
    margin-bottom: 1rem;
  }
  
  h3 {
    font-size: 1rem;
    margin: 0 0 1rem 0;
    color: #374151;
  }
  
  .control-group {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    margin-bottom: 1.5rem;
  }
  
  .resize-options {
    margin-left: 1rem;
    padding-left: 0.5rem;
    border-left: 2px solid #e5e7eb;
  }
  
  .buttons {
    display: flex;
    gap: 0.5rem;
  }
  
  @media (max-width: 768px) {
    .buttons {
      flex-direction: column;
    }
  }
  
  .info-text {
    background-color: #e0f2fe;
    padding: 0.75rem;
    border-radius: 0.25rem;
    margin-bottom: 0.5rem;
  }
  
  .info-text p {
    margin: 0;
    font-size: 0.875rem;
    color: #0369a1;
  }
</style> 