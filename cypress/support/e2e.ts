// ---------------------------------------------------------------------
// cypress/support/e2e.ts
// ---------------------------------------------------------------------
// This file runs before every spec file. Cypress requires it to exist
// (or supportFile: false to be set explicitly) — see:
// https://on.cypress.io/support-file-missing-or-invalid
//
// Import custom commands here as the suite grows, e.g.:
// import './commands';

// The prototype is a static, backend-less HTML/JS app. It has no known
// unhandled-rejection or console-error noise, but guarding against an
// unexpected runtime error is cheap insurance so a single stray
// exception in the app doesn't fail an otherwise-passing assertion.
Cypress.on("uncaught:exception", (error) => {
  // eslint-disable-next-line no-console
  console.error("Uncaught exception in application under test:", error.message);
  return false;
});
