const enum TimestampStep {
  START = 'START',
  END = 'END'
}

function recordTimestamp(name: string, step: TimestampStep, flag: 'a' | 'w') {
  cy.exec('mkdir -p cypress/timestamp', { failOnNonZeroExit: false });

  const path = `cypress/timestamp/${ name }.log`;

  const timestamp = new Date().toISOString();

  cy.writeFile(path, `${ step }::${ timestamp }\n`, { flag });
}

Cypress.Commands.add('recordTimestampStart', (name: string) => {
  recordTimestamp(name, TimestampStep.START, 'w');
});

Cypress.Commands.add('recordTimestampEnd', (name: string) => {
  recordTimestamp(name, TimestampStep.END, 'a');
});
