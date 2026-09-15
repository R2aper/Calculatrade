/*
 Сборка Alpine-компонента из функциональных модулей.
*/

document.addEventListener('alpine:init', () => {
  const modules = window.CalculatradeModules;
  const dashboard = modules.dashboard;

  Alpine.data('app', () => {
    const app = Object.assign(
        modules.createState(), modules.ui, modules.auth, modules.assets,
        modules.risks, modules.measures, modules.calculations);

    Object.keys(dashboard).forEach(key => {
      const descriptor = Object.getOwnPropertyDescriptor(dashboard, key);
      if (typeof descriptor.value === 'function') app[key] = descriptor.value;
    });

    Object.defineProperties(app, Object.getOwnPropertyDescriptors(dashboard));
    return app;
  });
});
