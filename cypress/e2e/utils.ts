import path from 'path';

export function getSpecName(): string {
  return path.basename(Cypress.spec.name, '.spec.ts');
}

export function moveMouseAway(): void {
  cy.get('main').click({ force: true });
}