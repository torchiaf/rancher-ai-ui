Cypress.Commands.add('setFullScreen', () => {
  // Remove Cypress UI elements and fix layout
  cy.window().then((win) => {
    // Access parent window (Cypress runner)
    const runnerDoc = win.parent?.document || win.top?.document;

    if (runnerDoc) {
      // Remove sidebar, panels, and header
      const elementsToRemove = [
        '#sidebar',
        '[data-cy="specs-list-panel"]',
        '[data-cy="reporter-panel"]',
        '#spec-runner-header'
      ];

      elementsToRemove.forEach((selector) => {
        const elements = runnerDoc.querySelectorAll(selector);

        elements.forEach((el) => el.remove());
      });

      // Fix unified-runner styling
      const unifiedRunner = runnerDoc.querySelector('#unified-runner');

      if (unifiedRunner) {
        (unifiedRunner as HTMLElement).className = 'origin-top viewport';
        (unifiedRunner as HTMLElement).style.width = '100%';
        (unifiedRunner as HTMLElement).style.height = '100%';
        (unifiedRunner as HTMLElement).style.transform = 'scale(0.95)';
        (unifiedRunner as HTMLElement).style.position = 'absolute';
        (unifiedRunner as HTMLElement).style.marginLeft = '-20px';
      }
    }
  });
});
