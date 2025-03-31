<script lang="ts">
  export let checked = false;
  export let label = '';
  export let disabled = false;
  
  function handleChange(e: Event) {
    const target = e.target as HTMLInputElement;
    checked = target.checked;
  }
</script>

<label class="toggle-container">
  <span class="label">{label}</span>
  <div class="toggle-wrapper">
    <input 
      type="checkbox"
      bind:checked
      {disabled}
      on:change={handleChange}
    />
    <span class="toggle"></span>
  </div>
</label>

<style>
  .toggle-container {
    display: flex;
    align-items: center;
    justify-content: space-between;
    cursor: pointer;
    user-select: none;
  }
  
  .label {
    font-size: 0.875rem;
    color: #4b5563;
  }
  
  .toggle-wrapper {
    position: relative;
    display: inline-block;
    width: 3rem;
    height: 1.5rem;
  }
  
  input {
    opacity: 0;
    width: 0;
    height: 0;
  }
  
  .toggle {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: #e5e7eb;
    border-radius: 1rem;
    transition: 0.3s;
  }
  
  .toggle:before {
    position: absolute;
    content: "";
    height: 1.25rem;
    width: 1.25rem;
    left: 0.125rem;
    bottom: 0.125rem;
    background-color: white;
    border-radius: 50%;
    transition: 0.3s;
  }
  
  input:checked + .toggle {
    background-color: #3b82f6;
  }
  
  input:checked + .toggle:before {
    transform: translateX(1.5rem);
  }
  
  input:disabled + .toggle {
    opacity: 0.6;
    cursor: not-allowed;
  }
</style> 