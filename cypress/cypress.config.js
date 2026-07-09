const { defineConfig } = require("cypress");

module.exports = defineConfig({
  allowCypressEnv: false,

  // The prototype (index.html) is served from the parent folder via
  // `npm run serve` (http-server). Point the suite at it so
  // MarketplacePage.visit() -> cy.visit('/') resolves correctly.
  e2e: {
    baseUrl: "http://localhost:4173",
    // Paths below are relative to this config file's directory
    // (this "cypress" folder is the Cypress project root, not a
    // subfolder of it — hence no cypress/cypress nesting).
    specPattern: "e2e/**/*.cy.{js,jsx,ts,tsx}",
    supportFile: "support/e2e.ts",
    fixturesFolder: "fixtures",
    setupNodeEvents(on, config) {
      // implement node event listeners here
    },
  },
});
