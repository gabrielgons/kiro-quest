import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';
import './assets/reset.css';
import './assets/variables.css';

window.addEventListener('error', (e) => {
  document.body.innerHTML =
    '<pre style="color:red;padding:20px">' + e.message + '</pre>';
});

window.addEventListener('unhandledrejection', (e) => {
  document.body.innerHTML =
    '<pre style="color:orange;padding:20px">' + e.reason + '</pre>';
});

const app = createApp(App);
app.use(createPinia());
app.use(router);
app.mount('#app');
