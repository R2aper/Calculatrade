import Alpine from 'alpinejs';

window.Alpine = Alpine;

Alpine.data('app', () => ({
  ready: true,
  message: 'Подготовка к миграции на API',
}));

Alpine.start();
