import MarketplacePage, { ProcurementFixture, EdgeCaseFixture } from '../page-objects/MarketplacePage';

/**
 * Domain: State & Session Context ("does it remember correctly?")
 * -----------------------------------------------------------------
 * The prototype has no backend and no localStorage/sessionStorage
 * calls (confirmed by source review) — every pool total, financing
 * balance, and shipment milestone lives only in an in-memory JS
 * object for the current page load. That is a deliberate product
 * decision for a prototype, but it is exactly the kind of thing a
 * "does it remember correctly?" pass needs to make explicit rather
 * than assume. The first test below documents today's actual
 * behavior (state is lost on reload) as a regression tripwire: if a
 * persistence layer is added later, this test should start failing
 * and prompt someone to update it deliberately, not silently.
 */
describe('State & Session Context', () => {
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

  it('does NOT persist demand pool contributions across a page reload (no storage layer — known gap)', () => {
    const pool = fixtureData.demandPools.find((p) => p.slug === 'oxytocin')!;

    cy.log('Contribute to the pool and confirm the in-memory total updates');
    MarketplacePage.contributeToPool(pool.slug, pool.contributionQty);
    const newTotal = pool.initialUnits + pool.contributionQty;
    MarketplacePage.getPoolProgressText(pool.slug, { timeout: 8000 }).should(
      'have.text',
      `${newTotal.toLocaleString()} / ${pool.moqUnits.toLocaleString()} ${pool.unit} filled`
    );

    cy.log('Reload — with no persistence layer, the total must revert to the original fixture baseline');
    MarketplacePage.reload();
    MarketplacePage.getPoolProgressText(pool.slug).should(
      'have.text',
      `${pool.initialUnits.toLocaleString()} / ${pool.moqUnits.toLocaleString()} ${pool.unit} filled`
    );
  });

  it('the mock user session is static content, not a real session — identical before and after reload', () => {
    MarketplacePage.getLoggedInUserName().should('have.text', 'Amara Okoye');
    MarketplacePage.getLoggedInUserRole().should('have.text', 'Regional Procurement Hub Manager');

    MarketplacePage.reload();

    // Unchanged after reload precisely BECAUSE it is hardcoded markup,
    // not because any session/auth mechanism restored it.
    MarketplacePage.getLoggedInUserName().should('have.text', 'Amara Okoye');
    MarketplacePage.getLoggedInUserRole().should('have.text', 'Regional Procurement Hub Manager');
  });

  it('accumulates multiple RFQ submissions in Recent Orders within a session, most recent first', () => {
    const [firstOrder, secondOrder] = edgeCases.multiOrderAccumulation;

    MarketplacePage.submitPurchaseOrder(firstOrder.pool, firstOrder.quantity, firstOrder.facility);
    MarketplacePage.getRecentOrderItems().should('have.length', 1);

    MarketplacePage.submitPurchaseOrder(secondOrder.pool, secondOrder.quantity, secondOrder.facility);
    MarketplacePage.getRecentOrderItems().should('have.length', 2);

    cy.log('Newest submission should be prepended, not appended');
    MarketplacePage.getRecentOrderItems().first().should('contain.text', secondOrder.poolLabel);
    MarketplacePage.getRecentOrderItems().last().should('contain.text', firstOrder.poolLabel);
  });

  it('overwrites the shared toast with the latest message instead of getting stuck on a stale one', () => {
    const seq = edgeCases.toastOverwriteSequence;

    cy.log('Trigger an error toast first');
    MarketplacePage.contributeRawValue(seq.slug, seq.erroringInput);
    MarketplacePage.getToastMessage({ timeout: 8000 }).should('contain.text', seq.expectedErrorFragment);

    cy.log('Immediately trigger a success action — the toast must reflect the NEW message, not the stale error');
    MarketplacePage.contributeRawValue(seq.slug, seq.followUpInput);
    MarketplacePage.getToastMessage({ timeout: 8000 }).should('contain.text', seq.expectedSuccessFragment);
  });

  it('keeps pool aggregation, financing, and logistics state isolated from one another', () => {
    const pool = fixtureData.demandPools.find((p) => p.slug === 'amoxicillin')!;
    const riffBaseline = fixtureData.financingFacilities.riff.initialBalance;
    const shipmentId = 'SHP-2291';

    cy.log('Baseline reads across all three subsystems');
    MarketplacePage.getRiffBalance().should('have.text', `$${riffBaseline.toLocaleString()}`);
    MarketplacePage.getMilestone(shipmentId).should('have.text', 'In Transit');

    cy.log('Mutate ONLY the demand pool subsystem');
    MarketplacePage.contributeToPool(pool.slug, pool.contributionQty);

    cy.log('Financing and logistics must be completely unaffected by a pool contribution');
    MarketplacePage.getRiffBalance().should('have.text', `$${riffBaseline.toLocaleString()}`);
    MarketplacePage.getMilestone(shipmentId).should('have.text', 'In Transit');

    cy.log('Mutate ONLY the logistics subsystem');
    MarketplacePage.advanceShipmentMilestone(shipmentId);

    cy.log('Pool total and financing balance must be unaffected by a milestone advance');
    MarketplacePage.getPoolProgressText(pool.slug).should(
      'have.text',
      `${(pool.initialUnits + pool.contributionQty).toLocaleString()} / ${pool.moqUnits.toLocaleString()} ${pool.unit} filled`
    );
    MarketplacePage.getRiffBalance().should('have.text', `$${riffBaseline.toLocaleString()}`);
  });
});
