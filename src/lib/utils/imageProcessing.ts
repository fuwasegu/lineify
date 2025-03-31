/**
 * 画像からエッジを抽出する関数
 * @param imageData 元の画像データ
 * @param threshold エッジ検出の閾値 (0-255)
 * @param invert 白黒反転するかどうか
 * @returns エッジ抽出された画像データ
 */
export function detectEdges(
  imageData: ImageData,
  threshold: number = 20,
  invert: boolean = false
): ImageData {
  const { width, height, data } = imageData;
  const output = new ImageData(width, height);
  const outputData = output.data;
  
  // グレースケール変換
  const grayscale = new Uint8Array(width * height);
  for (let i = 0; i < height; i++) {
    for (let j = 0; j < width; j++) {
      const idx = (i * width + j) * 4;
      // RGBの加重平均でグレースケール化
      grayscale[i * width + j] = Math.round(
        0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2]
      );
    }
  }
  
  // Sobelフィルタでエッジ検出
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      // 水平方向のエッジ検出
      const gx = 
        grayscale[(y - 1) * width + (x - 1)] * -1 +
        grayscale[(y - 1) * width + (x + 1)] * 1 +
        grayscale[y * width + (x - 1)] * -2 +
        grayscale[y * width + (x + 1)] * 2 +
        grayscale[(y + 1) * width + (x - 1)] * -1 +
        grayscale[(y + 1) * width + (x + 1)] * 1;
      
      // 垂直方向のエッジ検出
      const gy = 
        grayscale[(y - 1) * width + (x - 1)] * -1 +
        grayscale[(y - 1) * width + x] * -2 +
        grayscale[(y - 1) * width + (x + 1)] * -1 +
        grayscale[(y + 1) * width + (x - 1)] * 1 +
        grayscale[(y + 1) * width + x] * 2 +
        grayscale[(y + 1) * width + (x + 1)] * 1;
      
      // エッジの強さを計算
      const magnitude = Math.sqrt(gx * gx + gy * gy);
      
      // 閾値処理で2値化
      const idx = (y * width + x) * 4;
      const edgeValue = magnitude > threshold ? 255 : 0;
      const pixelValue = invert ? 255 - edgeValue : edgeValue;
      
      outputData[idx] = pixelValue;     // R
      outputData[idx + 1] = pixelValue; // G
      outputData[idx + 2] = pixelValue; // B
      outputData[idx + 3] = 255;        // A
    }
  }
  
  return output;
}

/**
 * 画像データをPNG形式のBlobに変換する
 * @param imageData 画像データ
 * @returns PNG形式のBlob
 */
export function convertToPngBlob(imageData: ImageData): Promise<Blob> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context not available');
    
    ctx.putImageData(imageData, 0, 0);
    
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else throw new Error('Failed to create blob');
    }, 'image/png');
  });
}

/**
 * 画像をリサイズする関数
 * @param imageData 元の画像データ
 * @param maxWidth 最大幅
 * @param maxHeight 最大高さ
 * @returns リサイズされた画像データ
 */
export function resizeImage(
  imageData: ImageData,
  maxWidth: number,
  maxHeight: number
): ImageData {
  const { width, height } = imageData;
  
  // すでに指定サイズ以下なら何もしない
  if (width <= maxWidth && height <= maxHeight) {
    return imageData;
  }
  
  // アスペクト比を維持しながらリサイズ
  let newWidth = width;
  let newHeight = height;
  
  if (width > maxWidth) {
    newWidth = maxWidth;
    newHeight = Math.floor(height * (maxWidth / width));
  }
  
  if (newHeight > maxHeight) {
    newHeight = maxHeight;
    newWidth = Math.floor(newWidth * (maxHeight / newHeight));
  }
  
  // キャンバスを使ってリサイズ
  const canvas = document.createElement('canvas');
  canvas.width = newWidth;
  canvas.height = newHeight;
  
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context not available');
  
  // 一時的なキャンバスを作成して元の画像データを描画
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = width;
  tempCanvas.height = height;
  const tempCtx = tempCanvas.getContext('2d');
  if (!tempCtx) throw new Error('Canvas 2D context not available');
  tempCtx.putImageData(imageData, 0, 0);
  
  // リサイズ
  ctx.drawImage(tempCanvas, 0, 0, width, height, 0, 0, newWidth, newHeight);
  
  return ctx.getImageData(0, 0, newWidth, newHeight);
}

/**
 * 画像から線画を抽出する関数（プログレス報告付き）
 * @param imageData 元の画像データ
 * @param threshold エッジ検出の閾値 (0-255)
 * @param invert 白黒反転するかどうか
 * @param onProgress プログレス報告コールバック
 * @returns 線画抽出された画像データ
 */
export function extractLinesWithProgress(
  imageData: ImageData,
  threshold: number = 20,
  invert: boolean = false,
  onProgress?: (progress: number) => void
): Promise<ImageData> {
  return new Promise((resolve) => {
    const { width, height, data } = imageData;
    const output = new ImageData(width, height);
    const outputData = output.data;
    
    // 背景を白で初期化
    for (let i = 0; i < outputData.length; i += 4) {
      outputData[i] = 255;     // R
      outputData[i + 1] = 255; // G
      outputData[i + 2] = 255; // B
      outputData[i + 3] = 255; // A
    }
    
    setTimeout(() => {
      // グレースケール変換
      const grayscale = new Uint8Array(width * height);
      
      for (let i = 0; i < height; i++) {
        for (let j = 0; j < width; j++) {
          const idx = (i * width + j) * 4;
          // RGBの加重平均でグレースケール化
          grayscale[i * width + j] = Math.round(
            0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2]
          );
        }
        
        // 進捗報告（グレースケール変換: 0-20%）
        if (onProgress && i % 10 === 0) {
          onProgress(Math.floor(20 * i / height));
        }
      }
      
      // ガウシアンブラーを適用してノイズを軽減
      const blurred = applyGaussianBlur(grayscale, width, height);
      
      if (onProgress) {
        onProgress(30);
      }
      
      // Cannyエッジ検出の代わりに、改良版Sobelフィルタを使用
      // 勾配の強さと方向を計算
      const gradientMagnitude = new Uint8Array(width * height);
      const gradientDirection = new Float32Array(width * height);
      
      for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
          // 水平方向の勾配
          const gx = 
            blurred[(y - 1) * width + (x - 1)] * -1 +
            blurred[(y - 1) * width + (x + 1)] * 1 +
            blurred[y * width + (x - 1)] * -2 +
            blurred[y * width + (x + 1)] * 2 +
            blurred[(y + 1) * width + (x - 1)] * -1 +
            blurred[(y + 1) * width + (x + 1)] * 1;
          
          // 垂直方向の勾配
          const gy = 
            blurred[(y - 1) * width + (x - 1)] * -1 +
            blurred[(y - 1) * width + x] * -2 +
            blurred[(y - 1) * width + (x + 1)] * -1 +
            blurred[(y + 1) * width + (x - 1)] * 1 +
            blurred[(y + 1) * width + x] * 2 +
            blurred[(y + 1) * width + (x + 1)] * 1;
          
          // 勾配の強さ
          const magnitude = Math.sqrt(gx * gx + gy * gy);
          gradientMagnitude[y * width + x] = Math.min(255, magnitude);
          
          // 勾配の方向（ラジアン）
          gradientDirection[y * width + x] = Math.atan2(gy, gx);
        }
        
        // 進捗報告（勾配計算: 30-50%）
        if (onProgress && y % 10 === 0) {
          onProgress(30 + Math.floor(20 * (y - 1) / (height - 2)));
        }
      }
      
      // 非最大抑制（細線化）
      const thinEdges = new Uint8Array(width * height);
      
      for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
          const idx = y * width + x;
          const mag = gradientMagnitude[idx];
          
          if (mag < threshold) {
            continue; // 閾値以下は無視
          }
          
          // 勾配の方向を0-180度に正規化
          let angle = gradientDirection[idx] * 180 / Math.PI;
          if (angle < 0) angle += 180;
          
          // 勾配方向に沿った2つの隣接ピクセルを取得
          let mag1 = 0, mag2 = 0;
          
          // 0度（水平）
          if ((angle >= 0 && angle < 22.5) || (angle >= 157.5 && angle <= 180)) {
            mag1 = gradientMagnitude[idx - 1];
            mag2 = gradientMagnitude[idx + 1];
          }
          // 45度（右上-左下）
          else if (angle >= 22.5 && angle < 67.5) {
            mag1 = gradientMagnitude[(y - 1) * width + (x + 1)];
            mag2 = gradientMagnitude[(y + 1) * width + (x - 1)];
          }
          // 90度（垂直）
          else if (angle >= 67.5 && angle < 112.5) {
            mag1 = gradientMagnitude[(y - 1) * width + x];
            mag2 = gradientMagnitude[(y + 1) * width + x];
          }
          // 135度（左上-右下）
          else if (angle >= 112.5 && angle < 157.5) {
            mag1 = gradientMagnitude[(y - 1) * width + (x - 1)];
            mag2 = gradientMagnitude[(y + 1) * width + (x + 1)];
          }
          
          // 現在のピクセルが両隣より大きければ保持
          if (mag > mag1 && mag > mag2) {
            thinEdges[idx] = mag;
          }
        }
        
        // 進捗報告（非最大抑制: 50-70%）
        if (onProgress && y % 10 === 0) {
          onProgress(50 + Math.floor(20 * (y - 1) / (height - 2)));
        }
      }
      
      // ヒステリシスしきい値処理
      const lowThreshold = threshold * 0.5;
      const strongEdges = new Uint8Array(width * height);
      const weakEdges = new Uint8Array(width * height);
      
      // 強いエッジと弱いエッジを分類
      for (let i = 0; i < width * height; i++) {
        if (thinEdges[i] >= threshold) {
          strongEdges[i] = 255;
        } else if (thinEdges[i] >= lowThreshold) {
          weakEdges[i] = 255;
        }
      }
      
      // 弱いエッジのうち、強いエッジに接続しているものだけを保持
      const finalEdges = new Uint8Array(width * height);
      
      // まず強いエッジをコピー
      for (let i = 0; i < width * height; i++) {
        if (strongEdges[i] === 255) {
          finalEdges[i] = 255;
        }
      }
      
      // 弱いエッジを処理
      let edgeChanged = true;
      let iterations = 0;
      const maxIterations = 5; // 無限ループ防止
      
      while (edgeChanged && iterations < maxIterations) {
        edgeChanged = false;
        iterations++;
        
        for (let y = 1; y < height - 1; y++) {
          for (let x = 1; x < width - 1; x++) {
            const idx = y * width + x;
            
            // 弱いエッジで、まだ最終エッジに含まれていないもの
            if (weakEdges[idx] === 255 && finalEdges[idx] === 0) {
              // 8近傍に強いエッジがあるか確認
              let hasStrongNeighbor = false;
              
              for (let ny = -1; ny <= 1; ny++) {
                for (let nx = -1; nx <= 1; nx++) {
                  if (nx === 0 && ny === 0) continue;
                  
                  const neighborIdx = (y + ny) * width + (x + nx);
                  if (finalEdges[neighborIdx] === 255) {
                    hasStrongNeighbor = true;
                    break;
                  }
                }
                if (hasStrongNeighbor) break;
              }
              
              if (hasStrongNeighbor) {
                finalEdges[idx] = 255;
                edgeChanged = true;
              }
            }
          }
        }
        
        // 進捗報告（ヒステリシス: 70-90%）
        if (onProgress) {
          onProgress(70 + Math.floor(20 * iterations / maxIterations));
        }
      }
      
      // 最終的な画像を生成
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const idx = y * width + x;
          const outIdx = idx * 4;
          
          // エッジピクセルを黒（または白）に設定
          const edgeValue = finalEdges[idx] > 0 ? 0 : 255;
          const pixelValue = invert ? 255 - edgeValue : edgeValue;
          
          outputData[outIdx] = pixelValue;     // R
          outputData[outIdx + 1] = pixelValue; // G
          outputData[outIdx + 2] = pixelValue; // B
          // アルファは既に255に設定済み
        }
      }
      
      // 完了
      if (onProgress) {
        onProgress(100);
      }
      
      resolve(output);
    }, 0);
  });
}

// ガウシアンブラーを適用する関数
function applyGaussianBlur(
  data: Uint8Array,
  width: number,
  height: number,
  sigma: number = 1.4
): Uint8Array {
  const kernelSize = Math.max(3, Math.ceil(sigma * 3) * 2 + 1);
  const halfSize = Math.floor(kernelSize / 2);
  
  // ガウシアンカーネルを生成
  const kernel = new Float32Array(kernelSize);
  let sum = 0;
  
  for (let i = 0; i < kernelSize; i++) {
    const x = i - halfSize;
    // ガウス関数
    kernel[i] = Math.exp(-(x * x) / (2 * sigma * sigma));
    sum += kernel[i];
  }
  
  // 正規化
  for (let i = 0; i < kernelSize; i++) {
    kernel[i] /= sum;
  }
  
  // 水平方向のブラー
  const tempData = new Uint8Array(width * height);
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0;
      
      for (let i = -halfSize; i <= halfSize; i++) {
        const xi = Math.min(Math.max(x + i, 0), width - 1);
        sum += data[y * width + xi] * kernel[i + halfSize];
      }
      
      tempData[y * width + x] = Math.round(sum);
    }
  }
  
  // 垂直方向のブラー
  const result = new Uint8Array(width * height);
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0;
      
      for (let i = -halfSize; i <= halfSize; i++) {
        const yi = Math.min(Math.max(y + i, 0), height - 1);
        sum += tempData[yi * width + x] * kernel[i + halfSize];
      }
      
      result[y * width + x] = Math.round(sum);
    }
  }
  
  return result;
}

/**
 * 大津の二値化アルゴリズムで最適な閾値を計算する
 * @param histogram グレースケール画像のヒストグラム
 * @returns 最適な閾値
 */
function calculateOtsuThreshold(histogram: number[]): number {
  const total = histogram.reduce((sum, value) => sum + value, 0);
  
  let sum = 0;
  for (let i = 0; i < 256; i++) {
    sum += i * histogram[i];
  }
  
  let sumB = 0;
  let wB = 0;
  let wF = 0;
  let maxVariance = 0;
  let threshold = 0;
  
  for (let t = 0; t < 256; t++) {
    wB += histogram[t];  // 背景の重み
    
    if (wB === 0) continue;
    
    wF = total - wB;  // 前景の重み
    if (wF === 0) break;
    
    sumB += t * histogram[t];
    
    const mB = sumB / wB;  // 背景の平均値
    const mF = (sum - sumB) / wF;  // 前景の平均値
    
    // クラス間分散を計算
    const variance = wB * wF * (mB - mF) * (mB - mF);
    
    // 最大のクラス間分散を持つ閾値を記録
    if (variance > maxVariance) {
      maxVariance = variance;
      threshold = t;
    }
  }
  
  return threshold;
}

/**
 * 画像を大津の二値化アルゴリズムで二値化してノイズを除去する関数
 * @param imageData 元の画像データ
 * @param invert 白黒反転するかどうか
 * @param onProgress プログレス報告コールバック
 * @returns 二値化された画像データ
 */
export function binarizeWithOtsu(
  imageData: ImageData,
  invert: boolean = false,
  onProgress?: (progress: number) => void
): Promise<ImageData> {
  return new Promise((resolve) => {
    const { width, height, data } = imageData;
    const output = new ImageData(width, height);
    const outputData = output.data;
    
    // 背景を白で初期化
    for (let i = 0; i < outputData.length; i += 4) {
      outputData[i] = 255;     // R
      outputData[i + 1] = 255; // G
      outputData[i + 2] = 255; // B
      outputData[i + 3] = 255; // A
    }
    
    setTimeout(() => {
      // グレースケール変換とヒストグラム計算
      const grayscale = new Uint8Array(width * height);
      const histogram = new Array(256).fill(0);
      
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const idx = (y * width + x) * 4;
          
          // グレースケール値を計算
          const gray = Math.round(
            0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2]
          );
          
          grayscale[y * width + x] = gray;
          histogram[gray]++;
        }
        
        // 進捗報告（グレースケール変換: 0-20%）
        if (onProgress && y % 10 === 0) {
          onProgress(Math.floor(20 * y / height));
        }
      }
      
      if (onProgress) {
        onProgress(20);
      }
      
      // ガウシアンブラーを適用してノイズを軽減
      const blurred = applyGaussianBlur(grayscale, width, height, 1.5);
      
      if (onProgress) {
        onProgress(30);
      }
      
      // 大津の二値化アルゴリズムで閾値を計算
      // ブラー後の画像からヒストグラムを再計算
      const blurredHistogram = new Array(256).fill(0);
      for (let i = 0; i < blurred.length; i++) {
        blurredHistogram[blurred[i]]++;
      }
      const threshold = calculateOtsuThreshold(blurredHistogram);
      
      if (onProgress) {
        onProgress(40);
      }
      
      // 二値化
      const binaryImage = new Uint8Array(width * height);
      
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const idx = y * width + x;
          binaryImage[idx] = blurred[idx] < threshold ? 0 : 255;
        }
        
        // 進捗報告（二値化: 40-50%）
        if (onProgress && y % 10 === 0) {
          onProgress(40 + Math.floor(10 * y / height));
        }
      }
      
      if (onProgress) {
        onProgress(50);
      }
      
      // メディアンフィルタでノイズ除去（カーネルサイズを大きくして効果を高める）
      const medianFiltered = applyMedianFilter(binaryImage, width, height, 5);
      
      if (onProgress) {
        onProgress(60);
      }
      
      // モルフォロジー演算（オープニング処理）でさらにノイズを除去
      const eroded = applyErosion(medianFiltered, width, height, 2);
      
      if (onProgress) {
        onProgress(70);
      }
      
      const opened = applyDilation(eroded, width, height, 2);
      
      if (onProgress) {
        onProgress(80);
      }
      
      // 孤立点除去
      const cleaned = removeIsolatedPixels(opened, width, height);
      
      if (onProgress) {
        onProgress(90);
      }
      
      // 最終的な画像を生成
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const idx = y * width + x;
          const outIdx = idx * 4;
          
          // 二値化されたピクセル値を設定
          const pixelValue = invert 
            ? (cleaned[idx] === 0 ? 255 : 0) 
            : cleaned[idx];
          
          outputData[outIdx] = pixelValue;     // R
          outputData[outIdx + 1] = pixelValue; // G
          outputData[outIdx + 2] = pixelValue; // B
          // アルファは既に255に設定済み
        }
      }
      
      // 完了
      if (onProgress) {
        onProgress(100);
      }
      
      resolve(output);
    }, 0);
  });
}

/**
 * メディアンフィルタを適用してノイズを除去する
 * @param data 2値化された画像データ
 * @param width 画像の幅
 * @param height 画像の高さ
 * @returns ノイズ除去された画像データ
 */
function applyMedianFilter(
  data: Uint8Array,
  width: number,
  height: number,
  kernelSize: number = 3
): Uint8Array {
  const result = new Uint8Array(width * height);
  const halfKernel = Math.floor(kernelSize / 2);
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const values = [];
      
      // カーネル内の値を収集
      for (let ky = -halfKernel; ky <= halfKernel; ky++) {
        for (let kx = -halfKernel; kx <= halfKernel; kx++) {
          const nx = Math.min(Math.max(x + kx, 0), width - 1);
          const ny = Math.min(Math.max(y + ky, 0), height - 1);
          values.push(data[ny * width + nx]);
        }
      }
      
      // 中央値を計算
      values.sort((a, b) => a - b);
      result[y * width + x] = values[Math.floor(values.length / 2)];
    }
  }
  
  return result;
}

/**
 * 収縮処理（Erosion）を適用する
 * @param data 二値化された画像データ
 * @param width 画像の幅
 * @param height 画像の高さ
 * @param iterations 繰り返し回数
 * @returns 処理後の画像データ
 */
function applyErosion(
  data: Uint8Array,
  width: number,
  height: number,
  iterations: number = 1
): Uint8Array {
  let result = new Uint8Array(data);
  
  for (let iter = 0; iter < iterations; iter++) {
    const temp = new Uint8Array(width * height);
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        // 黒ピクセル（0）は処理しない
        if (result[y * width + x] === 0) {
          temp[y * width + x] = 0;
          continue;
        }
        
        // 周囲8近傍に黒ピクセルがあれば、このピクセルも黒にする
        let shouldErode = false;
        
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            if (kx === 0 && ky === 0) continue;
            
            const nx = x + kx;
            const ny = y + ky;
            
            if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
            
            if (result[ny * width + nx] === 0) {
              shouldErode = true;
              break;
            }
          }
          if (shouldErode) break;
        }
        
        temp[y * width + x] = shouldErode ? 0 : 255;
      }
    }
    
    result = temp;
  }
  
  return result;
}

/**
 * 膨張処理（Dilation）を適用する
 * @param data 二値化された画像データ
 * @param width 画像の幅
 * @param height 画像の高さ
 * @param iterations 繰り返し回数
 * @returns 処理後の画像データ
 */
function applyDilation(
  data: Uint8Array,
  width: number,
  height: number,
  iterations: number = 1
): Uint8Array {
  let result = new Uint8Array(data);
  
  for (let iter = 0; iter < iterations; iter++) {
    const temp = new Uint8Array(width * height);
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        // 白ピクセル（255）は処理しない
        if (result[y * width + x] === 255) {
          temp[y * width + x] = 255;
          continue;
        }
        
        // 周囲8近傍に白ピクセルがあれば、このピクセルも白にする
        let shouldDilate = false;
        
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            if (kx === 0 && ky === 0) continue;
            
            const nx = x + kx;
            const ny = y + ky;
            
            if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
            
            if (result[ny * width + nx] === 255) {
              shouldDilate = true;
              break;
            }
          }
          if (shouldDilate) break;
        }
        
        temp[y * width + x] = shouldDilate ? 255 : 0;
      }
    }
    
    result = temp;
  }
  
  return result;
}

/**
 * 孤立したピクセルを除去する
 * @param data 二値化された画像データ
 * @param width 画像の幅
 * @param height 画像の高さ
 * @returns 処理後の画像データ
 */
function removeIsolatedPixels(
  data: Uint8Array,
  width: number,
  height: number
): Uint8Array {
  const result = new Uint8Array(width * height);
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const currentPixel = data[idx];
      
      // 画像の端は変更しない
      if (x === 0 || x === width - 1 || y === 0 || y === height - 1) {
        result[idx] = currentPixel;
        continue;
      }
      
      // 黒ピクセルの場合、周囲8近傍の黒ピクセル数をカウント
      if (currentPixel === 0) {
        let blackCount = 0;
        
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            if (kx === 0 && ky === 0) continue;
            
            const nx = x + kx;
            const ny = y + ky;
            
            if (data[ny * width + nx] === 0) {
              blackCount++;
            }
          }
        }
        
        // 周囲に黒ピクセルが少ない場合は孤立点とみなして白に変更
        result[idx] = blackCount < 2 ? 255 : 0;
      } 
      // 白ピクセルの場合、周囲8近傍の白ピクセル数をカウント
      else {
        let whiteCount = 0;
        
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            if (kx === 0 && ky === 0) continue;
            
            const nx = x + kx;
            const ny = y + ky;
            
            if (data[ny * width + nx] === 255) {
              whiteCount++;
            }
          }
        }
        
        // 周囲に白ピクセルが少ない場合は孤立点とみなして黒に変更
        result[idx] = whiteCount < 2 ? 0 : 255;
      }
    }
  }
  
  return result;
} 