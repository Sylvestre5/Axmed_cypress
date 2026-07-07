import MarketplacePage, { ProcurementFixture, EdgeCaseFixture } from '../page-objects/MarketplacePage';

/**
 * Domain: Input Boundary & Edge Cases ("what breaks it?")
 * --------------------------------------------------------
 * Covers zero/negative/decimal/whitespace/non-numeric input on the
 * Demand Pool contribution field, an extreme (near-overflow) quantity,
 * and the RFQ form's native HTML5 validation (required / min="1").
 *
 * Important finding baked into this file: the Pool "Join Pool" button
 * is a plain <button> outside any <form>, so it only ever gets the
 * app's own JS guard (`!qty || qty <= 0`). The RFQ "Submit Purchase
 * Order" button is `type="submit"` inside a real <form> with
 * `required`/`min="1"` attributes, so the BROWSER blocks invalid
 * submissions before the app's JS ever runs. These two inputs fail
 * closed via two different mechanisms — worth flagging to the team as
 * an inconsistency, even though both currently fail safely.
 */
describe('Input Boundary & Edge Cases', () => {
  let fixtureData: ProcurementFixture;
  let edgeCases: EdgeCaseFixture;

  beforeEach(() => {
    cy.fixture<ProcurementFixture>('procurementData').then((data) => {
      fixtureData = data;
    });
    cy.fixture<EdgeCaseFixture>('edgeCaseData').then((data) => {
      edgeCases = data;
    });
    MarketplacePage.visit();
  });

  context('Demand Pool contribution input', () => {
    it('rejects empty, zero, negative, whitespace-only and non-numeric contributions', () => {
      edgeCases.invalidPoolContributions.forEach((invalidCase) => {
        const pool = fixtureData.demandPools.find((p) => p.slug === invalidCase.slug)!;

        cy.log(`**Case** — ${invalidCase.description} on ${invalidCase.poolName}`);
        MarketplacePage.contributeRawValue(invalidCase.slug, invalidCase.input);

        MarketplacePage.getToastMessage({ timeout: 8000 }).should('contain.text', invalidCase.expectedToastFragment);
        cy.log('Pool total must be untouched by a rejected contribution');
        MarketplacePage.getPoolProgressText(invalidCase.slug).should(
          'have.text',
          `${pool.initialUnits.toLocaleString()} / ${pool.moqUnits.toLocaleString()} ${pool.unit} filled`
        );
      });
    });

    it('truncates a decimal contribution instead of rejecting it (documented current behavior)', () => {
      const { decimalTruncationCase: dc } = edgeCases;

      MarketplacePage.contributeRawValue(dc.slug, dc.input);

      MarketplacePage.getPoolProgressText(dc.slug, { timeout: 8000 }).should(
        'have.text',
        `${dc.expectedNewTotal.toLocaleString()} / ${dc.moqUnits.toLocaleString()} ${dc.unit} filled`
      );
      MarketplacePage.verifyToast(`the ${dc.poolName} pool`);
    });

    it('handles a contribution far beyond the MOQ without breaking the progress bar or badge', () => {
      const { extremeValueCase: ec } = edgeCases;

      MarketplacePage.contributeRawValue(ec.slug, ec.input);

      cy.log('Progress bar must clamp visually at 100%, never overflow the card');
      MarketplacePage.getPoolProgressBar(ec.slug, { timeout: 8000 })
        .should('have.attr', 'style')
        .and('include', ec.expectedBarStyleContains);
      MarketplacePage.getPoolStatusBadge(ec.slug).should('have.text', ec.expectedStatus);
      cy.log('The raw (very large) total should still render as a formatted number, not NaN/undefined');
      MarketplacePage.getPoolProgressText(ec.slug).invoke('text').should('match', /^[\d,]+ \/ [\d,]+ \w+ filled$/);
    });
  });

  context('RFQ form native HTML5 validation', () => {
    it('blocks submission for every invalid combination and never fires the app-level success toast', () => {
      edgeCases.rfqNativeValidationCases.forEach((invalidCase) => {
        cy.log(`**Case** — ${invalidCase.description}`);
        MarketplacePage.attemptNativeRfqSubmission(invalidCase.pool, invalidCase.quantity);

        MarketplacePage.isRfqFormNativelyValid().should('eq', false);
        cy.log('Toast must stay hidden — the JS submit handler never runs on a natively-invalid form');
        MarketplacePage.getSuccessToast().should('have.class', 'hidden');
        MarketplacePage.getRecentOrderItems().should('not.exist');
      });
    });

    it('accepts the boundary value exactly at the minimum (quantity = 1)', () => {
      MarketplacePage.selectRfqPool('oxytocin');
      MarketplacePage.enterRfqQuantity(1);
      MarketplacePage.isRfqFormNativelyValid().should('eq', true);

      MarketplacePage.submitRfq();
      MarketplacePage.verifyToast('submitted as a self-funded purchase order');
      MarketplacePage.getRecentOrderItems().should('have.length', 1);
    });
  });
});
