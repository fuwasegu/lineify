<script lang="ts">
  export let type: 'button' | 'submit' | 'reset' = 'button';
  export let variant: 'primary' | 'secondary' | 'outline' = 'primary';
  export let disabled = false;
  export let fullWidth = false;
</script>

<button 
  {type} 
  class={`btn btn-${variant} ${fullWidth ? 'full-width' : ''}`} 
  {disabled} 
  on:click
>
  <slot />
</button>

<style>
  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0.5rem 1rem;
    border-radius: 0.25rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    border: none;
  }
  
  .btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  
  .btn-primary {
    background-color: #3b82f6;
    color: white;
  }
  
  .btn-primary:hover:not(:disabled) {
    background-color: #2563eb;
  }
  
  .btn-secondary {
    background-color: #6b7280;
    color: white;
  }
  
  .btn-secondary:hover:not(:disabled) {
    background-color: #4b5563;
  }
  
  .btn-outline {
    background-color: transparent;
    border: 1px solid #d1d5db;
    color: #374151;
  }
  
  .btn-outline:hover:not(:disabled) {
    background-color: #f3f4f6;
  }
  
  .full-width {
    width: 100%;
  }
</style> 