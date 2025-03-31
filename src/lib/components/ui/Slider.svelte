<script lang="ts">
  export let min = 0;
  export let max = 100;
  export let step = 1;
  export let value = 50;
  export let label = '';
  
  // ユニークなIDを生成
  const id = `slider-${Math.random().toString(36).substring(2, 9)}`;
  
  function handleInput(e: Event) {
    const target = e.target as HTMLInputElement;
    value = parseFloat(target.value);
  }
</script>

<div class="slider-container">
  {#if label}
    <div class="label-container">
      <label for={id}>{label}</label>
      <span class="value">{value}</span>
    </div>
  {/if}
  
  <input 
    type="range"
    id={id}
    {min}
    {max}
    {step}
    {value}
    on:input={handleInput}
    aria-valuemin={min}
    aria-valuemax={max}
    aria-valuenow={value}
    aria-label={label || 'スライダー'}
  />
</div>

<style>
  .slider-container {
    width: 100%;
    margin-bottom: 1rem;
  }
  
  .label-container {
    display: flex;
    justify-content: space-between;
    margin-bottom: 0.25rem;
  }
  
  label {
    font-size: 0.875rem;
    color: #4b5563;
  }
  
  .value {
    font-size: 0.875rem;
    color: #6b7280;
  }
  
  input[type="range"] {
    width: 100%;
    height: 0.5rem;
    -webkit-appearance: none;
    background: #e5e7eb;
    border-radius: 0.25rem;
    outline: none;
  }
  
  input[type="range"]::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 1.25rem;
    height: 1.25rem;
    border-radius: 50%;
    background: #3b82f6;
    cursor: pointer;
    border: none;
  }
  
  input[type="range"]::-moz-range-thumb {
    width: 1.25rem;
    height: 1.25rem;
    border-radius: 50%;
    background: #3b82f6;
    cursor: pointer;
    border: none;
  }
</style> 