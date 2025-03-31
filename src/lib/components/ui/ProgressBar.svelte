<script lang="ts">
  export let progress = 0; // 0-100の値
  export let height = '0.5rem';
  export let color = '#3b82f6';
  export let backgroundColor = '#e5e7eb';
</script>

<div class="progress-container" style="height: {height}; background-color: {backgroundColor};">
  <div 
    class="progress-bar" 
    style="width: {progress}%; background-color: {color};"
    role="progressbar"
    aria-valuenow={progress}
    aria-valuemin="0"
    aria-valuemax="100"
  ></div>
</div>

<style>
  .progress-container {
    width: 100%;
    border-radius: 9999px;
    overflow: hidden;
  }
  
  .progress-bar {
    height: 100%;
    transition: width 0.3s ease;
  }
</style> 