/* Move the existing stage into a native modal; draw state stays with raffle.html. */
window.RaffleFocus = {
  mount({stage, dialog, closeButton, drawButton, onClose}) {
    const marker = document.createComment('raffle stage home');
    stage.before(marker);
    let returnFocus, scrollX = 0, scrollY = 0;

    function restore() {
      if (stage.parentNode !== dialog) return;
      marker.after(stage);
      document.documentElement.classList.remove('raffle-focus-open');
      onClose();
      const target = returnFocus?.disabled ? stage.querySelector('#skipDrawBtn:not([hidden])') : returnFocus;
      target?.focus({preventScroll: true});
      window.scrollTo(scrollX, scrollY);
    }
    closeButton.addEventListener('click', () => dialog.close());
    dialog.addEventListener('close', restore);

    return {
      get active() { return dialog.open; },
      begin() {
        if (dialog.open || typeof dialog.showModal !== 'function') return;
        returnFocus = document.activeElement;
        scrollX = window.scrollX;
        scrollY = window.scrollY;
        dialog.append(stage);
        document.documentElement.classList.add('raffle-focus-open');
        try {
          dialog.showModal();
          closeButton.focus({preventScroll: true});
        } catch (error) {
          // Drawing can still proceed in the normal layout if modal display fails.
          restore();
        }
      },
      complete() {
        if (dialog.open && (document.activeElement?.id === 'skipDrawBtn' || !dialog.contains(document.activeElement))) {
          (drawButton.disabled ? closeButton : drawButton).focus({preventScroll: true});
        }
      }
    };
  }
};
