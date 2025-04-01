<script lang="ts">
  import Slider from './ui/Slider.svelte';
  import Toggle from './ui/Toggle.svelte';
  import Button from './ui/Button.svelte';
  import ButtonGroup from './ui/ButtonGroup.svelte';
  
  export let threshold = 20;
  export let invert = false;
  export let simplifyTolerance = 1;
  export let processing = false;
  export let onReset: () => void;
  export let onDelete: () => void;
  
  // リサイズオプション
  export let enableResize = true;
  export let maxWidth = 1200;
  export let maxHeight = 1200;
  
  // 追加のプロパティ
  export let extractEdges = false;
  export let edgeThickness = 1;
  
  // エッジの太さのオプション
  const thicknessOptions = [
    { value: 1, label: '極細' },
    { value: 2, label: '細い' },
    { value: 3, label: '標準' },
    { value: 4, label: '太い' },
    { value: 5, label: '極太' }
  ];
  
  // 新しいプロパティ
  export let onChange: () => void = () => {};
  
  // 値が変更されたときに親コンポーネントに通知
  $: invert, extractEdges, threshold, edgeThickness, onChange();
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
      label="エッジのみを抽出" 
      bind:checked={extractEdges} 
    />
    
    {#if extractEdges}
      <div class="edge-options">
        <div class="option-label">エッジの太さ</div>
        <ButtonGroup 
          options={thicknessOptions} 
          bind:value={edgeThickness} 
        />
      </div>
    {/if}
    
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
      variant="outline" 
      on:click={onReset}
    >
      リセット
    </Button>
    
    <Button 
      variant="danger" 
      on:click={onDelete}
    >
      画像を削除
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
  
  .resize-options, .edge-options {
    margin-left: 1rem;
    padding-left: 0.5rem;
    border-left: 2px solid #e5e7eb;
  }
  
  .option-label {
    font-size: 0.875rem;
    color: #4b5563;
    margin-bottom: 0.5rem;
  }
  
  .buttons {
    display: flex;
    gap: 0.5rem;
    margin-top: 1rem;
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