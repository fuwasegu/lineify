<script lang="ts">
  export let options: { value: any; label: string }[] = [];
  export let value: any;
  export let name = '';
  
  function handleChange(newValue: any) {
    value = newValue;
  }
</script>

<div class="button-group">
  {#each options as option}
    <button
      class={value === option.value ? 'active' : ''}
      on:click={() => handleChange(option.value)}
      type="button"
    >
      {option.label}
    </button>
  {/each}
</div>

<style>
  .button-group {
    display: flex;
    border-radius: 0.375rem;
    overflow: hidden;
  }
  
  button {
    flex: 1;
    padding: 0.5rem 0.75rem;
    background-color: #f3f4f6;
    border: 1px solid #d1d5db;
    color: #4b5563;
    font-size: 0.875rem;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  button:not(:first-child) {
    border-left: none;
  }
  
  button:first-child {
    border-top-left-radius: 0.375rem;
    border-bottom-left-radius: 0.375rem;
  }
  
  button:last-child {
    border-top-right-radius: 0.375rem;
    border-bottom-right-radius: 0.375rem;
  }
  
  button:hover {
    background-color: #e5e7eb;
  }
  
  button.active {
    background-color: #0ea5e9;
    color: white;
    border-color: #0ea5e9;
  }
</style> 