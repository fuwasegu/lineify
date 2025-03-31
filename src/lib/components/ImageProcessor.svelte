<script lang="ts">
  import { onMount } from 'svelte';
  import Dropzone from './ui/Dropzone.svelte';
  import ImagePreview from './ImagePreview.svelte';
  import ProcessingControls from './ProcessingControls.svelte';
  import ExportOptions from './ExportOptions.svelte';
  import ProgressBar from './ui/ProgressBar.svelte';
  import { imageStore } from '../stores/imageStore';
  import { fileToImageData, downloadBlob, downloadSvg } from '../utils/fileHandlers';
  import { detectEdges, convertToPngBlob, resizeImage, extractLinesWithProgress, binarizeWithOtsu } from '../utils/imageProcessing';
  import { convertToSvg } from '../utils/svgConverter';
  
  let threshold = 20;
  let invert = false;
  let simplifyTolerance = 1;
  let error: string | null = null;
  
  // リサイズオプション
  let enableResize = true;
  let maxWidth = 1200;
  let maxHeight = 1200;
  
  // プログレス
  let progress = 0;
  
  // ストアからの値を購読
  $: originalImage = $imageStore.originalImage;
  $: processedImage = $imageStore.processedImage;
  $: filename = $imageStore.filename;
  $: processing = $imageStore.processing;
  $: error = $imageStore.error;
  
  // ファイルがドロップされたときの処理
  async function handleFileChange(event: CustomEvent<File>) {
    const file = event.detail;
    
    try {
      imageStore.setProcessing(true);
      progress = 0;
      
      // 画像データに変換
      const imageData = await fileToImageData(file);
      
      // リサイズが有効で、画像が大きい場合はリサイズ
      let processedImageData = imageData;
      if (enableResize && (imageData.width > maxWidth || imageData.height > maxHeight)) {
        processedImageData = resizeImage(imageData, maxWidth, maxHeight);
      }
      
      imageStore.setOriginalImage(processedImageData, file.name);
      processImage();
    } catch (err) {
      imageStore.setError(err instanceof Error ? err.message : '画像の読み込みに失敗しました');
    } finally {
      imageStore.setProcessing(false);
    }
  }
  
  // エラーハンドリング
  function handleError(event: CustomEvent<string>) {
    imageStore.setError(event.detail);
  }
  
  // 画像処理
  async function processImage() {
    if (!originalImage) return;
    
    try {
      imageStore.setProcessing(true);
      progress = 0;
      
      // 大津の二値化を使用
      const processed = await binarizeWithOtsu(
        originalImage, 
        invert,
        (p) => {
          progress = p;
        }
      );
      
      imageStore.setProcessedImage(processed);
    } catch (err) {
      imageStore.setError(err instanceof Error ? err.message : '画像処理に失敗しました');
    } finally {
      imageStore.setProcessing(false);
    }
  }
  
  // リセット
  function resetImage() {
    imageStore.reset();
    progress = 0;
  }
  
  // PNG形式でエクスポート
  async function exportAsPng() {
    if (!processedImage) return;
    
    try {
      imageStore.setProcessing(true);
      const blob = await convertToPngBlob(processedImage);
      const exportFilename = filename.replace(/\.[^/.]+$/, '') + '_edge.png';
      downloadBlob(blob, exportFilename);
    } catch (err) {
      imageStore.setError(err instanceof Error ? err.message : 'エクスポートに失敗しました');
    } finally {
      imageStore.setProcessing(false);
    }
  }
  
  // SVG形式でエクスポート
  function exportAsSvg() {
    if (!processedImage) return;
    
    try {
      imageStore.setProcessing(true);
      const svgString = convertToSvg(processedImage, simplifyTolerance);
      const exportFilename = filename.replace(/\.[^/.]+$/, '') + '_edge.svg';
      downloadSvg(svgString, exportFilename);
    } catch (err) {
      imageStore.setError(err instanceof Error ? err.message : 'エクスポートに失敗しました');
    } finally {
      imageStore.setProcessing(false);
    }
  }
  
  // 値が変更されたら自動的に処理
  $: if (originalImage && (threshold || invert !== undefined)) {
    processImage();
  }
</script>

<div class="processor-container">
  {#if error}
    <div class="error-message">
      <p>{error}</p>
      <button on:click={() => imageStore.setError(null)}>✕</button>
    </div>
  {/if}
  
  {#if !originalImage}
    <Dropzone 
      on:change={handleFileChange} 
      on:error={handleError}
      maxSize={20 * 1024 * 1024}
    />
  {:else}
    <div class="image-container">
      {#if processing}
        <div class="progress-container">
          <p>処理中... {progress}%</p>
          <ProgressBar {progress} />
        </div>
      {/if}
      
      <div class="preview-grid">
        <div class="preview-item">
          <ImagePreview 
            imageData={originalImage} 
            label="元の画像" 
          />
        </div>
        
        <div class="preview-item">
          <ImagePreview 
            imageData={processedImage} 
            label="処理後の画像" 
          />
        </div>
      </div>
      
      <div class="controls-grid">
        <div class="controls-item">
          <ProcessingControls 
            bind:threshold
            bind:invert
            bind:simplifyTolerance
            bind:enableResize
            bind:maxWidth
            bind:maxHeight
            {processing}
            onProcess={processImage}
            onReset={resetImage}
          />
        </div>
        
        <div class="controls-item">
          <ExportOptions 
            onExportPng={exportAsPng}
            onExportSvg={exportAsSvg}
            disabled={!processedImage || processing}
          />
        </div>
      </div>
      
      <div class="upload-new">
        <Dropzone 
          on:change={handleFileChange} 
          on:error={handleError}
          maxSize={20 * 1024 * 1024}
        />
      </div>
    </div>
  {/if}
</div>

<style>
  .processor-container {
    width: 100%;
  }
  
  .error-message {
    background-color: #fee2e2;
    color: #b91c1c;
    padding: 0.75rem 1rem;
    border-radius: 0.25rem;
    margin-bottom: 1rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .error-message p {
    margin: 0;
  }
  
  .error-message button {
    background: none;
    border: none;
    cursor: pointer;
    font-size: 1rem;
    color: #b91c1c;
  }
  
  .progress-container {
    background-color: #f0f9ff;
    padding: 1rem;
    border-radius: 0.5rem;
    margin-bottom: 1rem;
  }
  
  .progress-container p {
    margin: 0 0 0.5rem 0;
    font-size: 0.875rem;
    color: #0369a1;
  }
  
  .image-container {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }
  
  .preview-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }
  
  .controls-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }
  
  .upload-new {
    margin-top: 1rem;
  }
  
  @media (max-width: 768px) {
    .preview-grid, .controls-grid {
      grid-template-columns: 1fr;
    }
  }
</style> 