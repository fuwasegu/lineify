<script lang="ts">
  import { onMount } from 'svelte';
  import Dropzone from './ui/Dropzone.svelte';
  import ImagePreview from './ImagePreview.svelte';
  import ProcessingControls from './ProcessingControls.svelte';
  import ExportOptions from './ExportOptions.svelte';
  import ProgressBar from './ui/ProgressBar.svelte';
  import ProgressOverlay from './ui/ProgressOverlay.svelte';
  import { imageStore } from '../stores/imageStore';
  import { fileToImageData, downloadBlob, downloadSvg } from '../utils/fileHandlers';
  import { detectEdges, convertToPngBlob, resizeImage, extractLinesWithProgress, binarizeWithOtsu, extractEdgesFromBinary } from '../utils/imageProcessing';
  import { convertToSvg } from '../utils/svgConverter';
  import ImageEditor from './ImageEditor.svelte';
  import Button from './ui/Button.svelte';
  
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
  
  // 追加の状態変数
  let extractEdges = false; // エッジ抽出を行うかどうか
  
  // エッジの太さ
  let edgeThickness = 1;
  
  // 編集モード
  let editMode = false;
  
  // 編集履歴のスタック
  let editHistory: ImageData[] = [];
  let maxHistoryLength = 10; // 最大履歴数
  
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
      console.log('処理開始: extractEdges =', extractEdges, 'edgeThickness =', edgeThickness);
      imageStore.setProcessing(true);
      progress = 0;
      
      // 手動修正された画像があればそれを使用し、なければ元画像から二値化
      let binarized;
      if (!extractEdges && processedImage) {
        // エッジ抽出しない場合は、既存の処理済み画像をそのまま使用
        imageStore.setProcessedImage(processedImage);
        imageStore.setProcessing(false);
        return;
      } else if (extractEdges && processedImage) {
        // エッジ抽出する場合は、既存の処理済み画像からエッジを抽出
        binarized = processedImage;
        progress = 50; // 二値化はすでに完了しているとみなす
      } else {
        // 処理済み画像がない場合は、元画像から二値化
        binarized = await binarizeWithOtsu(
          originalImage, 
          invert,
          (p) => {
            progress = extractEdges ? p * 0.5 : p;
          }
        );
      }
      
      console.log('二値化完了');
      
      // エッジ抽出オプションが有効な場合
      if (extractEdges) {
        console.log('エッジ抽出を実行します');
        const edged = await extractEdgesFromBinary(
          binarized,
          invert,
          edgeThickness,
          (p) => {
            progress = 50 + p * 0.5;
          }
        );
        console.log('エッジ抽出完了', edged);
        imageStore.setProcessedImage(edged);
      } else {
        console.log('エッジ抽出をスキップします');
        if (!processedImage) {
          // 初回処理時のみ二値化結果を設定
          imageStore.setProcessedImage(binarized);
        }
      }
    } catch (err) {
      console.error('画像処理エラー:', err);
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
  
  // 編集モードの切り替え
  function toggleEditMode() {
    if (!editMode && processedImage) {
      // 編集モードに入る前に現在の画像を履歴に保存
      saveToHistory(processedImage);
    }
    editMode = !editMode;
  }
  
  // 編集結果を適用（デバッグログ追加）
  function applyEdits(event: CustomEvent<ImageData>) {
    console.log('編集適用:', event.detail);
    const editedImageData = event.detail;
    
    // 編集前の画像を履歴に保存
    if (processedImage) {
      saveToHistory(processedImage);
    }
    
    imageStore.setProcessedImage(editedImageData);
    editMode = false;
  }
  
  // 履歴に保存
  function saveToHistory(imageData: ImageData) {
    // ImageDataをディープコピー
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    ctx.putImageData(imageData, 0, 0);
    const copiedImageData = ctx.getImageData(0, 0, imageData.width, imageData.height);
    
    // 履歴に追加
    editHistory.push(copiedImageData);
    
    // 履歴が長すぎる場合は古いものを削除
    if (editHistory.length > maxHistoryLength) {
      editHistory.shift();
    }
    
    // 配列の変更を反映
    editHistory = editHistory;
  }
  
  // 元に戻す
  function undoEdit() {
    if (editHistory.length === 0) return;
    
    // 履歴から最新の状態を取得
    const previousState = editHistory.pop();
    editHistory = editHistory; // 配列の変更を反映
    
    if (previousState) {
      imageStore.setProcessedImage(previousState);
    }
  }
  
  // 編集をキャンセル
  function cancelEdits() {
    editMode = false;
  }
  
  // 履歴をクリア
  function clearHistory() {
    editHistory = [];
  }
  
  // 新しい画像がロードされたときに履歴をクリア
  $: if (originalImage) {
    clearHistory();
  }
</script>

<div class="processor-container">
  {#if error}
    <div class="error-message">
      <p>{error}</p>
      <button on:click={() => imageStore.setError(null)}>✕</button>
    </div>
  {/if}
  
  {#if processing}
    <ProgressOverlay {progress} message="画像処理中..." />
  {/if}
  
  {#if !originalImage}
    <Dropzone 
      on:change={handleFileChange} 
      on:error={handleError}
      maxSize={20 * 1024 * 1024}
    />
  {:else}
    <div class="image-container">
      <div class="preview-grid">
        <div class="preview-item">
          <ImagePreview 
            imageData={originalImage} 
            label="元の画像" 
          />
        </div>
        
        <div class="preview-item">
          {#if editMode && processedImage}
            <ImageEditor 
              imageData={processedImage}
              color={invert ? 'black' : 'white'}
              on:apply={applyEdits}
              on:cancel={cancelEdits}
            />
          {:else}
            <div class="preview-with-actions">
              <ImagePreview 
                imageData={processedImage} 
                label="処理後の画像" 
              />
              {#if processedImage}
                <div class="preview-actions">
                  <button class="edit-button" on:click={toggleEditMode}>
                    ノイズを手動修正
                  </button>
                  
                  <!-- 元に戻すボタンを追加 -->
                  {#if editHistory.length > 0}
                    <button class="undo-button" on:click={undoEdit}>
                      元に戻す
                    </button>
                  {/if}
                </div>
              {/if}
            </div>
          {/if}
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
            bind:extractEdges
            bind:edgeThickness
            {processing}
            onReset={resetImage}
            onChange={processImage}
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
  
  .preview-with-actions {
    position: relative;
    height: 100%;
  }
  
  .preview-actions {
    position: absolute;
    bottom: 0.5rem;
    right: 0.5rem;
    display: flex;
    gap: 0.5rem;
  }
  
  .edit-button, .undo-button {
    background-color: rgba(0, 0, 0, 0.7);
    color: white;
    border: none;
    border-radius: 0.25rem;
    padding: 0.5rem 0.75rem;
    font-size: 0.75rem;
    cursor: pointer;
    transition: background-color 0.2s;
  }
  
  .edit-button:hover, .undo-button:hover {
    background-color: rgba(0, 0, 0, 0.9);
  }
  
  .undo-button {
    background-color: rgba(59, 130, 246, 0.7);
  }
  
  .undo-button:hover {
    background-color: rgba(59, 130, 246, 0.9);
  }
</style> 