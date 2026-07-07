import MarketplacePage, { ProcurementFixture } from '../page-objects/MarketplacePage';

/**
 * Domain: Network & Environment ("does it degrade gracefully?")
 * -----------------------------------------------------------------
 * Scope note: this is a static, backend-less prototype. There is
 * exactly ONE real network dependency in the whole app — the Tailwind
 * CDN <script> tag loaded in <head>. There are no fetch()/XHR calls,
 * so there is nothing to intercept for API timeouts, 5xx responses,
 * or rate limiting yet. The tests below exercise the one dependency
 * that does exist; the skipped block at the bottom is a ready-made
 * scaffold for the day RFQ submission/pool joins call a real API.
 *
 * Why this matters architecturally: the CDN <script> and the inline
 * <script> that configures it both sit in <head> with no async/defer,
 * and the business-logic <script> sits at the very end of <body>.
 * That means a slow or failed CDN response can delay or partially
 * break page load — worth knowing before this ships past prototype.
 */
describe('Network & Environment', () => {
  let fixtureData: ProcurementFixture;

  beforeEach(() => {
    cy.fixture<ProcurementFixture>('procurementData').then((data) => {
      fixtureData = data;
    });
  });

  it('stays functionally usable when the Tailwind CDN fails to load entirely', () => {
    cy.intercept('GET', 'https://cdn.tailwindcss.com/**', { forceNetworkError: true }).as('tailwindDown');

    // The CDN failure throws an uncaught ReferenceError ("tailwind is
    // not defined") in the very next inline <script> block. That is
    // expected and already handled globally in support/e2e.ts so this
    // test isn't failed by it — we're specifically checking that the
    // LATER business-logic script (a separate execution context) still
    // runs despite the earlier script's error.
    MarketplacePage.visit();

    const pool = fixtureData.demandPools.find((p) => p.slug === 'oxytocin')!;
    cy.log('Core JS-driven interaction must still work with no styling framework loaded');
    MarketplacePage.contributeToPool(pool.slug, pool.contributionQty);

    const newTotal = pool.initialUnits + pool.contributionQty;
    MarketplacePage.getPoolProgressText(pool.slug, { timeout: 8000 }).should(
      'have.text',
      `${newTotal.toLocaleString()} / ${pool.moqUnits.toLocaleString()} ${pool.unit} filled`
    );
    MarketplacePage.verifyToast('pool. New total');
  });

  it('still becomes interactive after a slow CDN response instead of hanging indefinitely', () => {
    cy.intercept('GET', 'https://cdn.tailwindcss.com/**', (req) => {
      req.reply((res) => {
        res.setDelay(3000);
      });
    }).as('tailwindSlow');

    MarketplacePage.visit();

    cy.log('Page must finish rendering and accept input within a bounded, generous timeout');
    MarketplacePage.getPoolJoinButton('rotavirus').should('be.visible');
    MarketplacePage.getLoggedInUserName({ timeout: 10000 }).should('have.text', 'Amara Okoye');
  });

  // -----------------------------------------------------------------
  // Scaffold for when a real backend exists behind the RFQ/pool APIs.
  // Activate these (remove .skip) once cy.intercept has something real
  // to target — timeouts, 500s, and 429s currently have no equivalent
  // in this client-only build.
  // -----------------------------------------------------------------
  describe.skip('Pending: real API resilience (blocked — no backend yet)', () => {
    it('shows a retry-able error state when the RFQ submission endpoint times out');
    it('surfaces a clear error when the RFQ submission endpoint returns 500');
    it('backs off and retries when the pool aggregation endpoint returns 429 (rate limited)');
    it('queues or warns the user when the app goes offline mid-submission');
  });
});
