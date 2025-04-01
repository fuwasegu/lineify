<script lang="ts">
  import { onMount, createEventDispatcher } from 'svelte';
  import ButtonGroup from './ui/ButtonGroup.svelte';
  
  export let imageData: ImageData;
  export let brushSize = 10;
  export let color = 'white'; // 'white' または 'black'
  
  const dispatch = createEventDispatcher<{
    apply: ImageData;
    cancel: void;
  }>();
  
  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D;
  let isDrawing = false;
  let lastX = 0;
  let lastY = 0;
  let scale = 1;
  let cursorX = 0;
  let cursorY = 0;
  let canvasX = 0;  // キャンバス上の実際の位置
  let canvasY = 0;  // キャンバス上の実際の位置
  let showCursor = false;
  
  // 履歴管理
  let history: ImageData[] = [];
  let futureHistory: ImageData[] = [];
  let maxHistoryLength = 20;
  
  // ツールオプション
  const toolOptions = [
    { value: 'brush', label: 'ブラシ' },
    { value: 'eraser', label: '消しゴム' }
  ];
  
  const brushSizeOptions = [
    { value: 5, label: '極小' },
    { value: 10, label: '小' },
    { value: 20, label: '中' },
    { value: 30, label: '大' },
    { value: 50, label: '極大' }
  ];
  
  let selectedTool = 'brush';
  
  // 描画色の計算
  $: drawColor = selectedTool === 'brush' 
    ? (color === 'white' ? '#FFFFFF' : '#000000')
    : (color === 'white' ? '#000000' : '#FFFFFF');
  
  onMount(() => {
    console.log('ImageEditor マウント - 画像サイズ:', imageData.width, 'x', imageData.height);
    
    // 状態を初期化
    isDrawing = false;
    lastX = 0;
    lastY = 0;
    scale = 1;
    cursorX = 0;
    cursorY = 0;
    showCursor = false;
    history = [];
    futureHistory = [];
    
    if (!canvas) return;
    
    // willReadFrequently属性を追加してパフォーマンス警告を解消
    ctx = canvas.getContext('2d', { willReadFrequently: true })!;
    
    if (!ctx) {
      console.error('Canvas 2D context not available');
      return;
    }
    
    // キャンバスのサイズを設定
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    
    // 画像データを描画
    ctx.putImageData(imageData, 0, 0);
    
    // 初期状態を履歴に保存
    saveToHistory();
    
    // 初期スケールを計算（キャンバスを表示領域に合わせる）
    calculateScale();
    
    // ウィンドウリサイズ時にスケールを再計算
    window.addEventListener('resize', calculateScale);
    
    return () => {
      window.removeEventListener('resize', calculateScale);
    };
  });
  
  // スケールを計算する関数
  function calculateScale() {
    if (!canvas || !canvas.parentElement) return;
    
    // キャンバスをリセット
    canvas.style.transform = '';
    
    const containerWidth = canvas.parentElement.clientWidth;
    const containerHeight = canvas.parentElement.clientHeight;
    
    console.log('コンテナサイズ:', containerWidth, 'x', containerHeight, '画像サイズ:', imageData.width, 'x', imageData.height);
    
    // 画像が大きすぎる場合は縮小、小さすぎる場合は最大でも等倍まで拡大
    // パディングを確保するために少し小さめのスケールを使用
    const padding = 20; // ピクセル単位のパディング
    const scaleX = (containerWidth - padding * 2) / imageData.width;
    const scaleY = (containerHeight - padding * 2) / imageData.height;
    
    // 小さい方のスケールを使用（画像全体が表示されるように）
    // 最大スケールは1（等倍）まで
    scale = Math.min(scaleX, scaleY, 1);
    
    // スケールを適用
    canvas.style.transform = `scale(${scale})`;
    canvas.style.transformOrigin = 'top left';
    
    console.log('スケール計算結果:', scale);
  }
  
  // マウス/タッチ位置を取得
  function getPosition(e: MouseEvent | TouchEvent) {
    if (!canvas) {
      return { x: 0, y: 0 };
    }
    
    let clientX: number, clientY: number;
    
    if ('touches' in e) {
      // タッチイベント
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      // マウスイベント
      clientX = e.clientX;
      clientY = e.clientY;
    }
    
    const rect = canvas.getBoundingClientRect();
    const canvasContainer = canvas.closest('.canvas-container');
    
    // スクロール位置の取得
    const scrollLeft = canvasContainer ? canvasContainer.scrollLeft : 0;
    const scrollTop = canvasContainer ? canvasContainer.scrollTop : 0;
    
    // ブラウザ上の実際のカーソル位置（カスタムカーソルの表示位置）
    // rect.widthがスケール適用後の幅なので、実際のスケール値を算出
    const actualScale = rect.width / canvas.width;
    
    // マウス座標（ブラウザ座標系）- スクロール位置は考慮しない（getBoundingClientRectは既にスクロール位置を考慮済み）
    cursorX = clientX - rect.left;
    cursorY = clientY - rect.top;
    
    // キャンバス座標系に変換（描画用）
    canvasX = Math.floor(cursorX / actualScale);
    canvasY = Math.floor(cursorY / actualScale);
    
    // デバッグログ
    console.log('マウス位置計算:', { 
      clientX, clientY, 
      rectLeft: rect.left, rectTop: rect.top,
      cursorX, cursorY, 
      canvasX, canvasY, 
      scale, actualScale,
      scrollLeft, scrollTop
    });
    
    return { x: canvasX, y: canvasY };
  }
  
  // カーソル位置の更新
  function updateCursorPosition(e: MouseEvent | TouchEvent) {
    getPosition(e);
    showCursor = true;
  }
  
  // カーソルを非表示
  function hideCursor() {
    showCursor = false;
  }
  
  // 描画開始
  function startDrawing(e: MouseEvent | TouchEvent) {
    if (!ctx) return;
    
    isDrawing = true;
    
    // マウス/タッチ位置を取得
    const pos = getPosition(e);
    lastX = canvasX;  // スケール調整済みの位置を使う
    lastY = canvasY;  // スケール調整済みの位置を使う
    
    // 単一点の描画
    ctx.fillStyle = drawColor;
    ctx.beginPath();
    ctx.arc(lastX, lastY, brushSize / 2, 0, Math.PI * 2);
    ctx.fill();
    
    console.log('描画開始:', lastX, lastY, 'ツール:', selectedTool, '色:', drawColor, 'スケール:', scale);
  }
  
  // 描画中
  function draw(e: MouseEvent | TouchEvent) {
    updateCursorPosition(e);
    
    if (!isDrawing || !ctx) return;
    
    // 現在のキャンバス上の位置を取得
    const currentX = canvasX;  // スケール調整済みの位置を使う
    const currentY = canvasY;  // スケール調整済みの位置を使う
    
    // 線を描画
    ctx.strokeStyle = drawColor;
    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(currentX, currentY);
    ctx.stroke();
    
    console.log('描画中:', 'ブラウザ座標:', cursorX, cursorY, 'キャンバス座標:', currentX, currentY, '色:', drawColor);
    
    // 現在位置を保存
    lastX = currentX;
    lastY = currentY;
  }
  
  // 描画終了
  function stopDrawing() {
    if (isDrawing) {
      // 描画が終了したら履歴に保存
      saveToHistory();
      isDrawing = false;
    }
  }
  
  // 履歴に保存
  function saveToHistory() {
    if (!ctx) return;
    
    // 現在の状態を取得
    const currentState = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    // 履歴に追加
    history.push(currentState);
    
    // 履歴が長すぎる場合は古いものを削除
    if (history.length > maxHistoryLength) {
      history.shift();
    }
    
    // 新しい操作を行った場合、やり直し履歴をクリア
    futureHistory = [];
    
    // 配列の変更を反映
    history = history;
    futureHistory = futureHistory;
  }
  
  // 元に戻す
  function undo() {
    if (history.length <= 1) return; // 初期状態は残す
    
    // 現在の状態をやり直し履歴に追加
    const currentState = ctx.getImageData(0, 0, canvas.width, canvas.height);
    futureHistory.push(currentState);
    
    // 履歴から最新の状態を削除して、一つ前の状態を取得
    const previousState = history.pop();
    
    if (history.length > 0) {
      // 最後の要素を取得（現在表示すべき状態）
      const stateToRestore = history[history.length - 1];
      ctx.putImageData(stateToRestore, 0, 0);
    }
    
    // 配列の変更を反映
    history = history;
    futureHistory = futureHistory;
  }
  
  // やり直し
  function redo() {
    if (futureHistory.length === 0) return;
    
    // やり直し履歴から最新の状態を取得
    const stateToRestore = futureHistory.pop();
    
    if (stateToRestore) {
      // 現在の状態を履歴に追加
      const currentState = ctx.getImageData(0, 0, canvas.width, canvas.height);
      history.push(currentState);
      
      // やり直し状態を描画
      ctx.putImageData(stateToRestore, 0, 0);
    }
    
    // 配列の変更を反映
    history = history;
    futureHistory = futureHistory;
  }
  
  // 変更を適用
  function applyChanges() {
    if (!ctx) return;
    
    // 編集後の画像データを取得して親コンポーネントに通知
    const editedImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    dispatch('apply', editedImageData);
  }
  
  // 変更をキャンセル
  function cancelChanges() {
    dispatch('cancel');
  }
  
  // モーダルの外側をクリックしたときの処理
  function handleBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) {
      // モーダルの外側がクリックされた場合
      cancelChanges();
    }
  }
</script>

<div class="modal-backdrop" on:click={handleBackdropClick}>
  <div class="modal-content">
    <div class="editor-container">
      <div class="toolbar">
        <div class="tool-group">
          <div class="tool-label">ツール</div>
          <ButtonGroup 
            options={toolOptions} 
            bind:value={selectedTool} 
          />
        </div>
        
        <div class="tool-group">
          <div class="tool-label">ブラシサイズ</div>
          <ButtonGroup 
            options={brushSizeOptions} 
            bind:value={brushSize} 
          />
        </div>
        
        <div class="history-controls">
          <button 
            class="history-button" 
            on:click={undo} 
            disabled={history.length <= 1}
            aria-label="元に戻す"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="9 14 4 9 9 4"></polyline>
              <path d="M20 20v-7a4 4 0 0 0-4-4H4"></path>
            </svg>
          </button>
          
          <button 
            class="history-button" 
            on:click={redo} 
            disabled={futureHistory.length === 0}
            aria-label="やり直し"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="15 4 20 9 15 14"></polyline>
              <path d="M4 20v-7a4 4 0 0 1 4-4h12"></path>
            </svg>
          </button>
        </div>
        
        <div class="actions">
          <button class="action-button apply" on:click={applyChanges}>
            適用
          </button>
          <button class="action-button cancel" on:click={cancelChanges}>
            キャンセル
          </button>
        </div>
      </div>
      
      <div class="canvas-container">
        <div class="canvas-wrapper">
          <canvas
            bind:this={canvas}
            on:mousedown={startDrawing}
            on:mousemove={draw}
            on:mouseup={stopDrawing}
            on:mouseleave={() => { stopDrawing(); hideCursor(); }}
            on:mouseenter={updateCursorPosition}
            on:touchstart|preventDefault={startDrawing}
            on:touchmove|preventDefault={draw}
            on:touchend={stopDrawing}
            on:touchcancel={stopDrawing}
          ></canvas>
          
          {#if showCursor}
            <!-- カスタムカーソル - 実際のマウス位置に表示 -->
            <div 
              class="custom-cursor" 
              style="
                width: {brushSize * scale}px; 
                height: {brushSize * scale}px; 
                left: {cursorX}px;
                top: {cursorY}px;
                transform: translate(-50%, -50%);
              "
            ></div>
          {/if}
        </div>
      </div>
    </div>
  </div>
</div>

<style>
  .modal-backdrop {
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
    overflow: hidden;
  }
  
  .modal-content {
    width: 95%;
    height: 95%;
    max-width: 1600px; /* より大きな最大幅 */
    max-height: 900px; /* より大きな最大高さ */
    background-color: white;
    border-radius: 0.5rem;
    overflow: hidden;
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
    display: flex;
    flex-direction: column;
  }
  
  .editor-container {
    display: flex;
    flex-direction: column;
    height: 100%;
    background-color: #f0f0f0;
    overflow: hidden;
  }
  
  .toolbar {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    padding: 0.75rem;
    background-color: #e0e0e0;
    border-bottom: 1px solid #ccc;
    flex-shrink: 0;
    align-items: center;
  }
  
  .tool-group {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }
  
  .tool-label {
    font-size: 0.75rem;
    color: #4b5563;
  }
  
  .history-controls {
    display: flex;
    gap: 0.5rem;
    margin-left: auto;
    margin-right: 1rem;
  }
  
  .history-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    border: none;
    border-radius: 0.25rem;
    background-color: #f3f4f6;
    color: #4b5563;
    cursor: pointer;
    transition: background-color 0.2s;
  }
  
  .history-button:hover:not(:disabled) {
    background-color: #e5e7eb;
  }
  
  .history-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  .actions {
    display: flex;
    gap: 0.5rem;
    margin-left: auto;
  }
  
  .action-button {
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 0.25rem;
    font-size: 0.875rem;
    cursor: pointer;
    transition: background-color 0.2s;
  }
  
  .apply {
    background-color: #0ea5e9;
    color: white;
  }
  
  .apply:hover {
    background-color: #0284c7;
  }
  
  .cancel {
    background-color: #f3f4f6;
    color: #4b5563;
  }
  
  .cancel:hover {
    background-color: #e5e7eb;
  }
  
  .canvas-container {
    flex: 1;
    overflow: auto;
    display: flex;
    justify-content: center;
    align-items: flex-start;
    background-color: #d1d5db;
    padding: 2rem;
    min-height: 0;
  }
  
  .canvas-wrapper {
    position: relative;
    margin: auto;
    display: flex;
    justify-content: center;
    align-items: center;
  }
  
  canvas {
    background-color: white;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    cursor: none; /* 標準カーソルを非表示 */
    transform-origin: top left; /* トランスフォームの基点を明示的に指定 */
    display: block;
  }
  
  .custom-cursor {
    position: absolute;
    border: 2px solid #0ea5e9; /* 水色のボーダー */
    background-color: rgba(14, 165, 233, 0.2); /* 半透明の水色 */
    border-radius: 50%;
    pointer-events: none;
    z-index: 10;
  }
  
  @media (max-width: 768px) {
    .modal-content {
      width: 100%;
      height: 100%;
      border-radius: 0;
    }
    
    .toolbar {
      flex-direction: column;
      align-items: stretch;
      padding: 0.5rem;
      gap: 0.5rem;
    }
    
    .history-controls {
      margin-left: 0;
      margin-right: 0;
      justify-content: center;
      margin-top: 0.5rem;
    }
    
    .actions {
      margin-left: 0;
      margin-top: 0.5rem;
      justify-content: space-between;
      width: 100%;
    }
    
    .canvas-container {
      padding: 0.5rem;
    }
  }
</style> 