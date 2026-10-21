(function () {
  var html = document.documentElement;
  html.classList.add('js');
  try {
    var theme = localStorage.getItem('brtp:theme');
    if (theme === 'light' || theme === 'dark') {
      html.dataset.theme = theme;
      var colour = theme === 'dark' ? '#15100B' : '#FFFFFF';
      var metas = document.querySelectorAll('meta[name="theme-color"]');
      for (var i = 0; i < metas.length; i++) metas[i].setAttribute('content', colour);
    }
  } catch (e) {}
  var ready = function () {
    html.classList.add('is-ready');
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready, { once: true });
  else ready();
  window.addEventListener('pageshow', function () {
    html.classList.remove('is-leaving');
    html.classList.add('is-ready');
  });
})();
