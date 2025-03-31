<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  
  export let accept = 'image/*';
  export let maxSize = 20 * 1024 * 1024; // 20MB
  
  let dragOver = false;
  let fileInput: HTMLInputElement;
  const dispatch = createEventDispatcher<{
    change: File;
    error: string;
  }>();
  
  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    dragOver = true;
  }
  
  function handleDragLeave() {
    dragOver = false;
  }
  
  function handleDrop(e: DragEvent) {
    e.preventDefault();
    dragOver = false;
    
    if (!e.dataTransfer) return;
    
    const files = e.dataTransfer.files;
    if (files.length) {
      validateAndDispatch(files[0]);
    }
  }
  
  function handleFileSelect() {
    if (fileInput.files && fileInput.files.length) {
      validateAndDispatch(fileInput.files[0]);
    }
  }
  
  function validateAndDispatch(file: File) {
    if (!file.type.startsWith('image/')) {
      dispatch('error', '画像ファイルのみアップロードできます');
      return;
    }
    
    if (file.size > maxSize) {
      dispatch('error', `ファイルサイズは${maxSize / 1024 / 1024}MB以下にしてください`);
      return;
    }
    
    dispatch('change', file);
  }
  
  // キーボードイベントハンドラを追加
  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      fileInput.click();
    }
  }
</script>

<div 
  class={`dropzone ${dragOver ? 'active' : ''}`}
  on:dragover={handleDragOver}
  on:dragleave={handleDragLeave}
  on:drop={handleDrop}
  on:click={() => fileInput.click()}
  on:keydown={handleKeyDown}
  role="button"
  tabindex="0"
  aria-label="ファイルをアップロード"
>
  <input 
    type="file"
    bind:this={fileInput}
    {accept}
    on:change={handleFileSelect}
    style="display: none;"
    aria-hidden="true"
  />
  
  <div class="content">
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
      <polyline points="17 8 12 3 7 8"></polyline>
      <line x1="12" y1="3" x2="12" y2="15"></line>
    </svg>
    <p>画像をドラッグ＆ドロップするか、クリックして選択</p>
    <span>JPG, PNG, GIF, BMP, WEBP (最大 {maxSize / 1024 / 1024}MB)</span>
  </div>
</div>

<style>
  .dropzone {
    border: 2px dashed #d1d5db;
    border-radius: 0.5rem;
    padding: 2rem;
    text-align: center;
    cursor: pointer;
    transition: all 0.2s ease;
    background-color: #f9fafb;
  }
  
  .dropzone:hover, .dropzone.active {
    border-color: #3b82f6;
    background-color: #eff6ff;
  }
  
  .content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    color: #6b7280;
  }
  
  svg {
    color: #9ca3af;
    margin-bottom: 0.5rem;
  }
  
  p {
    margin: 0;
    font-size: 1rem;
    color: #374151;
  }
  
  span {
    font-size: 0.875rem;
  }
  
  /* フォーカス状態のスタイルを追加 */
  .dropzone:focus {
    outline: 2px solid #3b82f6;
    outline-offset: 2px;
  }
</style> 