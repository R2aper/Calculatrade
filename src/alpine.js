/*
 Сборка Alpine-компонента из функциональных модулей.
*/

document.addEventListener('alpine:init', () => {
  const modules = window.CalculatradeModules;
  const appModules = [
    modules.ui, modules.auth, modules.assets, modules.risks,
    modules.measures, modules.calculations, modules.dashboard
  ];

  Alpine.data('app', () => {
    const app = modules.createState();
    for (const module of appModules) {
      Object.defineProperties(app, Object.getOwnPropertyDescriptors(module));
    }
    return app;
  });
});
