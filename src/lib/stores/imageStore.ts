import { writable } from 'svelte/store';

export interface ImageState {
  originalImage: ImageData | null;
  processedImage: ImageData | null;
  filename: string;
  processing: boolean;
  error: string | null;
}

const initialState: ImageState = {
  originalImage: null,
  processedImage: null,
  filename: '',
  processing: false,
  error: null
};

function createImageStore() {
  const { subscribe, set, update } = writable<ImageState>(initialState);
  
  return {
    subscribe,
    setOriginalImage: (imageData: ImageData, filename: string) => {
      update(state => ({
        ...state,
        originalImage: imageData,
        filename,
        error: null
      }));
    },
    setProcessedImage: (imageData: ImageData) => {
      update(state => ({
        ...state,
        processedImage: imageData
      }));
    },
    setProcessing: (processing: boolean) => {
      update(state => ({
        ...state,
        processing
      }));
    },
    setError: (error: string | null) => {
      update(state => ({
        ...state,
        error
      }));
    },
    reset: () => set(initialState)
  };
}

export const imageStore = createImageStore(); 