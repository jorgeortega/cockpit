// Application bootstrap.
//
// Vue 3 entry point. `createApp` builds the root component tree, the global
// stylesheet is imported here so Vite bundles it, and `.mount('#app')`
// attaches the tree to the `<div id="app">` declared in `index.html`.
import { createApp } from 'vue'
import './style.css'
import App from './App.vue'

createApp(App).mount('#app')
