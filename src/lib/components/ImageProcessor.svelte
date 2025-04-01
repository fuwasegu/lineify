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
  
  // モバイルデバイスかどうかのフラグ
  let isMobile = false;
  
  // 編集履歴のスタック
  let editHistory: ImageData[] = [];
  let maxHistoryLength = 10; // 最大履歴数
  
  // 二値化画像とエッジ画像を保存するための変数を追加
  let binarizedImage: ImageData | null = null;
  let edgedImage: ImageData | null = null;
  
  // ストアからの値を購読
  $: originalImage = $imageStore.originalImage;
  $: processedImage = $imageStore.processedImage;
  $: filename = $imageStore.filename;
  $: processing = $imageStore.processing;
  $: error = $imageStore.error;
  
  onMount(() => {
    // マウント時にデバイス判定を行う
    isMobile = checkIfMobile();
    
    // デバイス情報をコンソールに出力（デバッグ用）
    console.log('デバイス情報:', {
      isMobile,
      userAgent: navigator.userAgent,
      windowWidth: window.innerWidth,
      hasTouchScreen: 'ontouchstart' in window || navigator.maxTouchPoints > 0
    });
    
    // ウィンドウサイズ変更時にもモバイル判定を更新
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  });
  
  // リサイズハンドラー
  function handleResize() {
    isMobile = checkIfMobile();
    
    // モバイルに変わった場合、編集モードを強制終了
    if (isMobile && editMode) {
      editMode = false;
      showMobileEditMessage();
    }
  }
  
  // ファイルがドロップされたときの処理
  async function handleFileChange(event: CustomEvent<File>) {
    const file = event.detail;
    
    try {
      // すべての状態をリセット
      resetAllStates();
      
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
  
  // スマホでの編集ボタン押下時の処理
  function showMobileEditMessage() {
    imageStore.setError('この機能はPC版でのみ利用可能です。PCからご利用ください。');
  }
  
  // デバイスがモバイルかどうか判定する関数（複数の条件を組み合わせて判定）
  function checkIfMobile() {
    // ブラウザがロードされているときのみ実行
    if (typeof window === 'undefined') return false;

    // 1. User-Agent による判定
    const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera || '';
    const mobileRegex = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile|tablet/i;
    
    // 2. タッチデバイスかどうかの判定
    const hasTouchScreen = 'ontouchstart' in window || 
                           navigator.maxTouchPoints > 0 || 
                           (navigator as any).msMaxTouchPoints > 0;
    
    // 3. 画面サイズによる判定（768px以下をモバイルとする一般的な基準）
    const hasSmallScreen = window.innerWidth <= 768;
    
    // 複数の条件を組み合わせて判定
    // User-AgentがモバイルっぽいOR（タッチ機能があって画面が小さい）場合にモバイルと判定
    return mobileRegex.test(userAgent.toLowerCase()) || (hasTouchScreen && hasSmallScreen);
  }
  
  // 画像処理
  async function processImage() {
    if (!originalImage) return;
    
    try {
      console.log('処理開始: extractEdges =', extractEdges, 'edgeThickness =', edgeThickness);
      imageStore.setProcessing(true);
      progress = 0;
      
      // 手動修正された画像があればそれを使用し、なければ元画像から二値化
      if (!binarizedImage && !processedImage) {
        // 初回処理時：元画像から二値化
        binarizedImage = await binarizeWithOtsu(
          originalImage, 
          invert,
          (p) => {
            progress = extractEdges ? p * 0.5 : p;
          }
        );
        console.log('二値化完了（初回）');
      } else if (processedImage && !binarizedImage) {
        // 二値化画像が保存されていない場合は現在の処理済み画像を二値化画像として保存
        binarizedImage = processedImage;
      }
      
      // エッジ抽出オプションが有効な場合
      if (extractEdges) {
        console.log('エッジ抽出を実行します');
        if (!edgedImage) {
          // エッジ画像がまだ生成されていない場合は新たに生成
          edgedImage = await extractEdgesFromBinary(
            binarizedImage!,
            invert,
            edgeThickness,
            (p) => {
              progress = 50 + p * 0.5;
            }
          );
          console.log('エッジ抽出完了（新規）');
        }
        imageStore.setProcessedImage(edgedImage);
      } else {
        console.log('二値化画像を表示します');
        imageStore.setProcessedImage(binarizedImage);
      }
    } catch (err) {
      console.error('画像処理エラー:', err);
      imageStore.setError(err instanceof Error ? err.message : '画像処理に失敗しました');
    } finally {
      imageStore.setProcessing(false);
    }
  }
  
  // 編集結果を適用（デバッグログ追加）
  function applyEdits(event: CustomEvent<ImageData>) {
    console.log('編集適用:', event.detail);
    const editedImageData = event.detail;
    
    // 編集前の画像を履歴に保存
    if (processedImage) {
      // 画像をコピーして保存
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // processedImageがnullでないことを確認済み
        const currentImage = processedImage;
        canvas.width = currentImage.width;
        canvas.height = currentImage.height;
        ctx.putImageData(currentImage, 0, 0);
        const copiedImage = ctx.getImageData(0, 0, currentImage.width, currentImage.height);
        
        // 履歴に追加
        editHistory.push(copiedImage);
        
        // 履歴が長すぎる場合は古いものを削除
        if (editHistory.length > maxHistoryLength) {
          editHistory.shift();
        }
        
        // 配列の変更を反映
        editHistory = editHistory;
      }
    }
    
    // 現在表示中の画像タイプに応じて、適切な画像を更新
    if (extractEdges) {
      edgedImage = editedImageData;
    } else {
      binarizedImage = editedImageData;
    }
    
    imageStore.setProcessedImage(editedImageData);
    editMode = false;
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
  
  // 履歴に画像を保存するヘルパー関数（プライベート実装）
  function addToHistory(imageData: ImageData) {
    // 履歴に追加
    editHistory.push(imageData);
    
    // 履歴が長すぎる場合は古いものを削除
    if (editHistory.length > maxHistoryLength) {
      editHistory.shift();
    }
    
    // 配列の変更を反映
    editHistory = editHistory;
  }
  
  // 新しい画像がロードされたときに履歴をクリア
  $: if (originalImage) {
    clearHistory();
  }
  
  // エッジの太さが変更されたときにエッジ画像を再生成
  $: if (edgeThickness && extractEdges && binarizedImage) {
    // エッジの太さが変更されたらエッジ画像をリセット
    edgedImage = null;
    processImage();
  }
  
  // 白黒反転が変更されたときに両方の画像をリセット
  $: if (invert !== undefined) {
    // 反転設定が変更されたら両方の画像をリセット
    binarizedImage = null;
    edgedImage = null;
    processImage();
  }
  
  // リセット
  function resetImage() {
    // 画像処理パラメータを初期値に戻す
    threshold = 20;
    invert = false;
    extractEdges = false;
    edgeThickness = 1;
    simplifyTolerance = 1;
    
    // 画像処理状態をリセット
    binarizedImage = null;
    edgedImage = null;
    editMode = false;
    
    // 履歴をクリア
    clearHistory();
    
    // 元画像から再処理
    if (originalImage) {
      processImage();
    }
    
    console.log('画像処理をリセットしました');
  }
  
  // 削除関数を追加 - 画像を含めすべての状態をリセット
  function deleteImage() {
    // すべての状態をリセット
    resetAllStates();
    
    console.log('画像を削除しました');
  }
  
  // すべての状態をリセットする関数
  function resetAllStates() {
    // 画像関連の状態をリセット
    binarizedImage = null;
    edgedImage = null;
    editMode = false;
    
    // 履歴をクリア
    clearHistory();
    
    // 処理オプションを初期値に戻す
    threshold = 20;
    invert = false;
    extractEdges = false;
    edgeThickness = 1;
    simplifyTolerance = 1;
    
    // ストアをリセット
    imageStore.reset();
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
    // 必ず最新の判定を行う（isMobileが古くなっている可能性があるため）
    const currentIsMobile = checkIfMobile();
    
    // モバイルの状態を更新
    if (isMobile !== currentIsMobile) {
      isMobile = currentIsMobile;
    }
    
    // モバイルデバイスの場合はメッセージを表示して終了
    if (isMobile) {
      showMobileEditMessage();
      return;
    }
    
    // processedImageがnullの場合は処理を終了
    if (!processedImage) {
      console.log('processedImageがnullのため編集モードを開始できません');
      return;
    }
    
    // processedImageがnullでないときのみ保存処理を行う
    if (!editMode) {
      // 画像をコピーして保存
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // ここでは既にnullチェックを行っているので安全
        const currentImage = processedImage;
        canvas.width = currentImage.width;
        canvas.height = currentImage.height;
        ctx.putImageData(currentImage, 0, 0);
        const copiedImage = ctx.getImageData(0, 0, currentImage.width, currentImage.height);
        
        // 履歴に追加
        editHistory.push(copiedImage);
        
        // 履歴が長すぎる場合は古いものを削除
        if (editHistory.length > maxHistoryLength) {
          editHistory.shift();
        }
        
        // 配列の変更を反映
        editHistory = editHistory;
      }
    }
    
    // 編集モードを切り替え
    editMode = !editMode;
    
    // デバッグログ
    console.log('編集モード切替:', editMode ? '開始' : '終了', '(モバイル:', isMobile, ')');
  }
  
  // モバイルモードかつ編集モードになっていないかチェック
  $: if (isMobile && editMode) {
    // モバイルデバイスで編集モードになっている場合は強制的に終了
    console.log('モバイルデバイスで編集モードが検出されました。強制終了します。');
    editMode = false;
    showMobileEditMessage();
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
          {#if !isMobile && editMode && processedImage}
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
                    <span class="desktop-only">ノイズを手動修正</span>
                    <span class="mobile-only">PC版専用機能</span>
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
            onDelete={deleteImage}
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
    gap: 2rem;
  }
  
  .preview-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 2rem;
    min-height: 400px;
  }
  
  .preview-item {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 300px;
  }
  
  .controls-grid {
    display: grid;
    grid-template-columns: 2fr 1fr;
    gap: 2rem;
    align-items: flex-start;
  }
  
  .preview-with-actions {
    position: relative;
    height: 100%;
    display: flex;
    flex-direction: column;
  }
  
  .preview-actions {
    position: absolute;
    bottom: 0.75rem;
    right: 1.5rem;
    display: flex;
    gap: 0.5rem;
    z-index: 5;
  }
  
  .edit-button, .undo-button {
    background-color: rgba(0, 0, 0, 0.7);
    color: white;
    border: none;
    border-radius: 0.25rem;
    padding: 0.5rem 0.75rem;
    font-size: 0.875rem;
    cursor: pointer;
    transition: background-color 0.2s;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
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
  
  .desktop-only {
    display: inline;
  }
  
  .mobile-only {
    display: none;
  }
  
  @media (max-width: 768px) {
    .preview-grid, .controls-grid {
      grid-template-columns: 1fr;
    }
    
    .preview-item {
      min-height: 250px;
    }
    
    .desktop-only {
      display: none;
    }
    
    .mobile-only {
      display: inline;
    }
    
    /* モバイル向けの編集ボタンスタイル */
    .edit-button {
      background-color: rgba(107, 114, 128, 0.7); /* グレーっぽい色に変更 */
      cursor: help; /* ヘルプカーソルを表示 */
      font-style: italic; /* 斜体にして特別な状態を示す */
    }
    
    .edit-button:hover {
      background-color: rgba(107, 114, 128, 0.9);
    }
  }
</style> 