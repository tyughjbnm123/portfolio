/* Local illustrative comparison; no real project dates or visitor data. */
document.addEventListener('click', event => {
  if (!(event.target instanceof Element)) return;
  const button = event.target.closest('button[data-kol-scenario]');
  if (!button) return;
  const board = button.closest('.yk-kol-schedule');
  const scenario = button.dataset.kolScenario;
  if (!board || !['original', 'adjusted'].includes(scenario)) return;
  board.dataset.scenario = scenario;
  board.querySelectorAll('[data-kol-scenario]').forEach(control => control.setAttribute('aria-pressed', String(control.dataset.kolScenario === scenario)));
  board.querySelectorAll('[data-for-scenario]').forEach(message => { message.hidden = message.dataset.forScenario !== scenario; });
  board.querySelectorAll('.yk-kol-schedule-track li').forEach(task => task.setAttribute('aria-label', task.dataset[scenario + 'Label']));
});
