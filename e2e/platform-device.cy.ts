import MarketplacePage, { EdgeCaseFixture } from '../page-objects/MarketplacePage';

/**
 * Domain: Platform & Device ("does it work for everyone?")
 * -----------------------------------------------------------------
 * Two sub-concerns, tested two different ways:
 *
 * 1) Responsive layout — covered here with cy.viewport(). The header
 *    hides the system-date widget below Tailwind's default `sm`
 *    breakpoint (640px) and the user name/role block below `md`
 *    (768px) — both via `hidden sm:flex` / `hidden md:block` in the
 *    markup, not a custom breakpoint config. We assert the EXACT
 *    pixel boundary, not just "looks fine on mobile", because that's
 *    where responsive bugs actually hide.
 *
 * 2) Cross-browser rendering — NOT something a single spec file can
 *    assert from the inside. It has to be run, not asserted: the same
 *    spec is executed once per browser via the `cy:run:<browser>`
 *    scripts in package.json (Chrome, Firefox, Edge, Electron). Add
 *    those to your CI matrix rather than looking for browser-detection
 *    logic in this file — there isn't any, by design.
 */
describe('Platform & Device', () => {
  let edgeCases: EdgeCaseFixture;

  beforeEach(() => {
    cy.fixture<EdgeCaseFixture>('edgeCaseData').then((data) => {
      edgeCases = data;
    });
  });

  it('hides or reveals header widgets at the exact Tailwind sm/md breakpoints', () => {
    edgeCases.viewports.forEach((viewport) => {
      cy.log(`**Viewport** — ${viewport.name} (${viewport.width}x${viewport.height})`);
      cy.viewport(viewport.width, viewport.height);
      MarketplacePage.visit();

      if (viewport.systemDateVisible) {
        MarketplacePage.getSystemDateWidget().should('be.visible');
      } else {
        MarketplacePage.getSystemDateWidget().should('not.be.visible');
      }

      if (viewport.userInfoVisible) {
        MarketplacePage.getLoggedInUserName().should('be.visible');
        MarketplacePage.getLoggedInUserRole().should('be.visible');
      } else {
        MarketplacePage.getLoggedInUserName().should('not.be.visible');
        MarketplacePage.getLoggedInUserRole().should('not.be.visible');
      }
    });
  });

  it('keeps every core panel reachable on a small mobile viewport, even though layout reflows', () => {
    cy.viewport(375, 667);
    MarketplacePage.visit();

    MarketplacePage.getDemandPoolPanel().scrollIntoView().should('be.visible');
    MarketplacePage.getFinancingPanel().scrollIntoView().should('be.visible');
    MarketplacePage.getLogisticsPanel().scrollIntoView().should('be.visible');
  });

  it('supports the full pool-join interaction on a mobile viewport, not just visually but functionally', () => {
    const check = edgeCases.coreInteractionSmokeCheck;
    cy.viewport(375, 667);
    MarketplacePage.visit();

    MarketplacePage.contributeToPool(check.slug, check.contributionQty);
    MarketplacePage.verifyToast('pool. New total');
  });

  it('supports the same interaction on a large desktop viewport for parity', () => {
    const check = edgeCases.coreInteractionSmokeCheck;
    cy.viewport(1920, 1080);
    MarketplacePage.visit();

    MarketplacePage.contributeToPool(check.slug, check.contributionQty);
    MarketplacePage.verifyToast('pool. New total');
  });

  // -----------------------------------------------------------------
  // Cross-browser: run, don't assert. See package.json — cy:run:chrome,
  // cy:run:firefox, cy:run:edge all point at this same spec directory.
  // Wire all three into CI so "works for everyone" covers engines too,
  // not just screen sizes.
  // -----------------------------------------------------------------
});
