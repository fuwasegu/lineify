/**
 * 2値画像データからSVGパスを生成する
 * @param imageData 2値画像データ
 * @param simplifyTolerance パス単純化の許容誤差
 * @returns SVG形式の文字列
 */
export function convertToSvg(
  imageData: ImageData,
  simplifyTolerance: number = 1
): string {
  const { width, height, data } = imageData;
  
  // 画像の輪郭を追跡
  const paths = tracePaths(imageData);
  
  // SVG文字列を生成
  let svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">`;
  
  // パスを追加
  for (const path of paths) {
    const simplifiedPath = simplifyPath(path, simplifyTolerance);
    if (simplifiedPath.length < 2) continue;
    
    let pathData = `M${simplifiedPath[0].x},${simplifiedPath[0].y}`;
    for (let i = 1; i < simplifiedPath.length; i++) {
      pathData += ` L${simplifiedPath[i].x},${simplifiedPath[i].y}`;
    }
    pathData += ' Z';
    
    svgContent += `<path d="${pathData}" fill="none" stroke="black" stroke-width="1" />`;
  }
  
  svgContent += '</svg>';
  return svgContent;
}

// 画像から輪郭を追跡する関数
function tracePaths(imageData: ImageData): Array<Array<{x: number, y: number}>> {
  const { width, height, data } = imageData;
  const visited = new Uint8Array(width * height);
  const paths: Array<Array<{x: number, y: number}>> = [];
  
  // 簡易的な輪郭追跡アルゴリズム
  // 実際のアプリケーションではより高度なアルゴリズムを使用することをお勧めします
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      
      // 黒いピクセル（エッジ）を見つけたら輪郭追跡を開始
      if (data[idx] === 0 && !visited[y * width + x]) {
        const path: Array<{x: number, y: number}> = [];
        let currentX = x;
        let currentY = y;
        
        // 輪郭を追跡
        do {
          path.push({ x: currentX, y: currentY });
          visited[currentY * width + currentX] = 1;
          
          // 隣接するピクセルをチェック
          let found = false;
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              if (dx === 0 && dy === 0) continue;
              
              const nx = currentX + dx;
              const ny = currentY + dy;
              
              if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                const nidx = (ny * width + nx) * 4;
                if (data[nidx] === 0 && !visited[ny * width + nx]) {
                  currentX = nx;
                  currentY = ny;
                  found = true;
                  break;
                }
              }
            }
            if (found) break;
          }
          
          if (!found) break;
        } while (currentX !== x || currentY !== y);
        
        if (path.length > 10) { // 短すぎるパスは無視
          paths.push(path);
        }
      }
    }
  }
  
  return paths;
}

// パスを単純化する関数（Douglas-Peucker アルゴリズム）
function simplifyPath(
  path: Array<{x: number, y: number}>,
  tolerance: number
): Array<{x: number, y: number}> {
  if (path.length <= 2) return path;
  
  // 最も遠い点を見つける
  let maxDistance = 0;
  let maxIndex = 0;
  
  const start = path[0];
  const end = path[path.length - 1];
  
  for (let i = 1; i < path.length - 1; i++) {
    const distance = perpendicularDistance(path[i], start, end);
    if (distance > maxDistance) {
      maxDistance = distance;
      maxIndex = i;
    }
  }
  
  // 再帰的に単純化
  if (maxDistance > tolerance) {
    const firstPart = simplifyPath(path.slice(0, maxIndex + 1), tolerance);
    const secondPart = simplifyPath(path.slice(maxIndex), tolerance);
    
    return [...firstPart.slice(0, -1), ...secondPart];
  } else {
    return [start, end];
  }
}

// 点と線分の間の垂直距離を計算
function perpendicularDistance(
  point: {x: number, y: number},
  lineStart: {x: number, y: number},
  lineEnd: {x: number, y: number}
): number {
  const dx = lineEnd.x - lineStart.x;
  const dy = lineEnd.y - lineStart.y;
  
  // 線分の長さの2乗
  const lineLengthSq = dx * dx + dy * dy;
  
  if (lineLengthSq === 0) {
    // 線分が点の場合
    const pointDx = point.x - lineStart.x;
    const pointDy = point.y - lineStart.y;
    return Math.sqrt(pointDx * pointDx + pointDy * pointDy);
  }
  
  // 線分上の最も近い点を計算
  const t = ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / lineLengthSq;
  const clampedT = Math.max(0, Math.min(1, t));
  
  const closestX = lineStart.x + clampedT * dx;
  const closestY = lineStart.y + clampedT * dy;
  
  // 点と最も近い点の距離
  const pointDx = point.x - closestX;
  const pointDy = point.y - closestY;
  return Math.sqrt(pointDx * pointDx + pointDy * pointDy);
} 