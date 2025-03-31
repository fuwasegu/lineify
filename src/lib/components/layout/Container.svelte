<script lang="ts">
  export let fullWidth = false;
</script>

<div class={`container ${fullWidth ? 'full-width' : ''}`}>
  <slot />
</div>

<style>
  .container {
    width: 100%;
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 1rem;
  }
  
  .full-width {
    max-width: none;
  }
  
  @media (max-width: 768px) {
    .container {
      padding: 0 0.5rem;
    }
  }
</style> 