import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	server: {  
		port: 8888,  // ここを追加
		strictPort: true // ここを追加
	  }
});
