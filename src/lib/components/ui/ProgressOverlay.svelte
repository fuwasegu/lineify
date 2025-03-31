<script lang="ts">
  export let progress = 0;
  export let message = '処理中...';
</script>

<div class="overlay">
  <div class="progress-container">
    <h3>{message} {progress}%</h3>
    <div class="progress-bar-container">
      <div class="progress-bar" style="width: {progress}%"></div>
    </div>
  </div>
</div>

<style>
  .overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.7);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
  }
  
  .progress-container {
    background-color: white;
    border-radius: 0.5rem;
    padding: 2rem;
    width: 80%;
    max-width: 500px;
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  }
  
  h3 {
    margin: 0 0 1rem 0;
    color: #0369a1;
    font-size: 1.25rem;
    text-align: center;
  }
  
  .progress-bar-container {
    width: 100%;
    height: 1rem;
    background-color: #e0f2fe;
    border-radius: 0.5rem;
    overflow: hidden;
  }
  
  .progress-bar {
    height: 100%;
    background-color: #0ea5e9;
    border-radius: 0.5rem;
    transition: width 0.3s ease;
  }
</style> 