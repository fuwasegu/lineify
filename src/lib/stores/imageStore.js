import { writable } from 'svelte/store';

function createImageStore() {
  const { subscribe, set, update } = writable({
    originalImage: null,
    processedImage: null,
    filename: '',
    processing: false,
    error: null,
    lastThreshold: 0,
    lastInvert: false
  });

  return {
    subscribe,
    setOriginalImage: (imageData, filename) => update(state => ({
      ...state,
      originalImage: imageData,
      filename
    })),
    setProcessedImage: (imageData) => update(state => ({
      ...state,
      processedImage: imageData
    })),
    setProcessing: (processing) => update(state => ({
      ...state,
      processing
    })),
    setError: (error) => update(state => ({
      ...state,
      error
    })),
    setLastParams: (threshold, invert) => update(state => ({
      ...state,
      lastThreshold: threshold,
      lastInvert: invert
    })),
    reset: () => update(state => ({
      ...state,
      originalImage: null,
      processedImage: null,
      filename: '',
      error: null
    }))
  };
}

export const imageStore = createImageStore(); 