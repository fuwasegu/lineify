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
    
    const containerWidth = canvas.parentElement.clientWidth;
    const containerHeight = canvas.parentElement.clientHeight;
    
    const scaleX = containerWidth / imageData.width;
    const scaleY = containerHeight / imageData.height;
    
    // 小さい方のスケールを使用（画像全体が表示されるように）
    scale = Math.min(scaleX, scaleY, 1); // 最大スケールは1（等倍）
    
    // スケールを適用
    canvas.style.transform = `scale(${scale})`;
    canvas.style.transformOrigin = 'top left';
  }
  
  // カーソル位置の更新
  function updateCursorPosition(e: MouseEvent | TouchEvent) {
    const pos = getPosition(e);
    cursorX = pos.x;
    cursorY = pos.y;
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
    lastX = pos.x;
    lastY = pos.y;
    
    // 単一点の描画
    ctx.fillStyle = drawColor;
    ctx.beginPath();
    ctx.arc(lastX, lastY, brushSize / 2, 0, Math.PI * 2);
    ctx.fill();
    
    console.log('描画開始:', lastX, lastY, 'ツール:', selectedTool, '色:', drawColor);
  }
  
  // 描画中
  function draw(e: MouseEvent | TouchEvent) {
    updateCursorPosition(e);
    
    if (!isDrawing || !ctx) return;
    
    // マウス/タッチ位置を取得
    const pos = getPosition(e);
    const currentX = pos.x;
    const currentY = pos.y;
    
    // 線を描画
    ctx.strokeStyle = drawColor;
    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(currentX, currentY);
    ctx.stroke();
    
    console.log('描画中:', lastX, lastY, 'から', currentX, currentY, '色:', drawColor);
    
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
    
    // スケールを考慮した座標計算
    const x = Math.floor((clientX - rect.left) / scale);
    const y = Math.floor((clientY - rect.top) / scale);
    
    return { x, y };
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
            <div 
              class="custom-cursor" 
              style="
                left: {cursorX}px; 
                top: {cursorY}px; 
                width: {brushSize}px; 
                height: {brushSize}px;
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
  }
  
  .modal-content {
    width: 90%;
    height: 90%;
    max-width: 1200px;
    max-height: 800px;
    background-color: white;
    border-radius: 0.5rem;
    overflow: hidden;
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  }
  
  .editor-container {
    display: flex;
    flex-direction: column;
    height: 100%;
    background-color: #f0f0f0;
  }
  
  .toolbar {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    padding: 0.75rem;
    background-color: #e0e0e0;
    border-bottom: 1px solid #ccc;
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
    align-items: center;
    background-color: #d1d5db;
    padding: 1rem;
  }
  
  .canvas-wrapper {
    position: relative;
  }
  
  canvas {
    background-color: white;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    cursor: none; /* 標準カーソルを非表示 */
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
    .toolbar {
      flex-direction: column;
    }
    
    .actions {
      margin-left: 0;
      margin-top: 0.5rem;
    }
  }
</style> 