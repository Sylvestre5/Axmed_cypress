import MarketplacePage, {
  ProcurementFixture,
  DemandPoolData,
  RfqScenario,
  ShipmentData,
} from '../page-objects/MarketplacePage';

describe('Axmed B2B Procurement Marketplace', () => {
  let fixtureData: ProcurementFixture;

  beforeEach(() => {
    // Fixture is re-loaded per test; app state is client-side only and
    // resets on visit(), so each test starts from the same known baseline.
    cy.fixture<ProcurementFixture>('procurementData').then((data) => {
      fixtureData = data;
    });
    MarketplacePage.visit();
  });

  // ===================================================================
  // Test Case 1: Dynamic SaaS Pool Aggregation (Demand Aggregator)
  // ===================================================================
  context('Test Case 1: Dynamic SaaS Pool Aggregation', () => {
    it('joins a pool and dynamically flips its MOQ status to "MOQ Met"', () => {
      const pool = fixtureData.demandPools.find((p) => p.slug === 'oxytocin') as DemandPoolData;

      cy.log(`**Step 1** — confirm baseline state for ${pool.name}`);
      MarketplacePage.getPoolProgressText(pool.slug).should(
        'have.text',
        `${pool.initialUnits.toLocaleString()} / ${pool.moqUnits.toLocaleString()} ${pool.unit} filled`
      );
      MarketplacePage.getPoolStatusBadge(pool.slug).should('have.text', 'Filling');

      cy.log(`**Step 2** — contribute ${pool.contributionQty.toLocaleString()} ${pool.unit}`);
      MarketplacePage.contributeToPool(pool.slug, pool.contributionQty);

      cy.log('**Step 3** — progress bar and status badge must update without a page reload');
      const newTotal = pool.initialUnits + pool.contributionQty;
      // Explicit timeout option (no cy.wait(ms)) to tolerate the UI's
      // transition/re-render before the assertion retries.
      MarketplacePage.getPoolProgressText(pool.slug, { timeout: 8000 }).should(
        'have.text',
        `${newTotal.toLocaleString()} / ${pool.moqUnits.toLocaleString()} ${pool.unit} filled`
      );
      MarketplacePage.verifyPoolFullyAggregated(pool.slug);

      cy.log('**Step 4** — success toast must acknowledge the contribution');
      MarketplacePage.verifyToast(`Added ${pool.contributionQty.toLocaleString()} ${pool.unit} to the ${pool.name} pool`);
    });

    it('keeps a pool "Filling" and promotes another to "Near MOQ" based on contribution size', () => {
      const filling = fixtureData.demandPools.find((p) => p.slug === 'amoxicillin') as DemandPoolData;
      const nearMoq = fixtureData.demandPools.find((p) => p.slug === 'rotavirus') as DemandPoolData;

      cy.log(`Contribute a modest volume to ${filling.name} — status should remain "Filling"`);
      MarketplacePage.contributeToPool(filling.slug, filling.contributionQty);
      MarketplacePage.getPoolStatusBadge(filling.slug, { timeout: 8000 }).should(
        'have.text',
        filling.expectedStatusAfterContribution
      );

      cy.log(`Contribute enough to ${nearMoq.name} to cross the 85% threshold — status should read "Near MOQ"`);
      MarketplacePage.contributeToPool(nearMoq.slug, nearMoq.contributionQty);
      MarketplacePage.getPoolStatusBadge(nearMoq.slug, { timeout: 8000 }).should(
        'have.text',
        nearMoq.expectedStatusAfterContribution
      );
    });

    it('rejects an empty contribution with an error toast and leaves the pool total unchanged', () => {
      const pool = fixtureData.demandPools[0];

      MarketplacePage.getPoolContributionInput(pool.slug).clear();
      MarketplacePage.getPoolJoinButton(pool.slug).click();

      MarketplacePage.getToastMessage({ timeout: 8000 }).should('contain.text', 'Enter a valid quantity');
      MarketplacePage.getPoolProgressText(pool.slug).should(
        'have.text',
        `${pool.initialUnits.toLocaleString()} / ${pool.moqUnits.toLocaleString()} ${pool.unit} filled`
      );
    });
  });

  // ===================================================================
  // Test Case 2: Fintech Logic Validation (RIFF / Gates MNCH Fund)
  // ===================================================================
  context('Test Case 2: Fintech Logic Validation', () => {
    it('previews and applies the Gates Foundation 1:1 match, doubling purchasing power', () => {
      const scenario = fixtureData.rfqScenarios.find((s) => s.financingFacility === 'gates') as RfqScenario;

      cy.log('**Step 1** — enter medicine and quantity, verify computed order value');
      MarketplacePage.selectRfqPool(scenario.poolValue);
      MarketplacePage.enterRfqQuantity(scenario.quantity);
      MarketplacePage.getOrderValuePreview().should(
        'have.text',
        `Order value: ${scenario.quantity.toLocaleString()} units x $${scenario.unitPrice.toFixed(2)} = $${scenario.expectedOrderValue.toLocaleString()}`
      );

      cy.log('**Step 2** — select the Gates Foundation MNCH Matching Fund and verify the 1:1 message');
      MarketplacePage.selectFinancingFacility('gates');
      MarketplacePage.getMatchingFundPreview()
        .should('be.visible')
        .and('contain.text', 'Gates Foundation will match this purchase 1:1! Effective purchasing power doubled.')
        .and('contain.text', `$${(scenario.expectedMatchedAmount as number).toLocaleString()} matched`)
        .and('contain.text', `$${(scenario.expectedTotalPurchasingPower as number).toLocaleString()} total purchasing power`);

      cy.log('**Step 3** — submit and verify the fund balance is drawn down by the buyer contribution only');
      MarketplacePage.submitRfq();
      MarketplacePage.verifyToast(scenario.expectedToastFragment);
      MarketplacePage.getGatesBalance({ timeout: 8000 }).should(
        'have.text',
        `$${(scenario.expectedGatesBalanceAfter as number).toLocaleString()}`
      );
      MarketplacePage.getRecentOrderItems().should('have.length.at.least', 1);
    });

    it('draws down the RIFF revolving line for a financed order', () => {
      const scenario = fixtureData.rfqScenarios.find(
        (s) => s.financingFacility === 'riff' && s.expectedRiffBalanceAfter !== undefined
      ) as RfqScenario;

      MarketplacePage.selectRfqPool(scenario.poolValue);
      MarketplacePage.enterRfqQuantity(scenario.quantity);
      MarketplacePage.selectFinancingFacility('riff');

      MarketplacePage.getRiffFacilityPreview().should('be.visible').and('contain.text', 'Drawing from RIFF');

      MarketplacePage.submitRfq();
      MarketplacePage.verifyToast(scenario.expectedToastFragment);
      MarketplacePage.getRiffBalance({ timeout: 8000 }).should(
        'have.text',
        `$${(scenario.expectedRiffBalanceAfter as number).toLocaleString()}`
      );
    });

    it('blocks submission and surfaces an error toast when RIFF balance cannot cover the order', () => {
      const scenario = fixtureData.rfqScenarios.find((s) => s.scenarioName.includes('exceeding')) as RfqScenario;

      MarketplacePage.submitPurchaseOrder(scenario.poolValue, scenario.quantity, 'riff');

      MarketplacePage.verifyToast(scenario.expectedToastFragment);
      // Balance must remain untouched — the guard rejects before mutating state.
      MarketplacePage.getRiffBalance().should(
        'have.text',
        `$${fixtureData.financingFacilities.riff.initialBalance.toLocaleString()}`
      );
    });
  });

  // ===================================================================
  // Test Case 3: Logistics Tracker Monitoring (Cold-Chain & Compliance)
  // ===================================================================
  context('Test Case 3: Logistics Tracker Monitoring', () => {
    it('reports cold-chain temperature readings that match SOP thresholds', () => {
      const { coldChainThresholds, shipments } = fixtureData;

      shipments
        .filter((shipment) => shipment.coldChain)
        .forEach((shipment) => {
          cy.log(`Checking cold-chain telemetry for **${shipment.id}** (${shipment.medicine})`);
          MarketplacePage.verifyColdChainReading(shipment, coldChainThresholds);
        });
    });

    it('shows "Ambient - N/A" for shipments outside the cold-chain', () => {
      const shipment = fixtureData.shipments.find((s) => !s.coldChain) as ShipmentData;
      MarketplacePage.getTemperatureStatus(shipment.id).should('have.text', 'Ambient - N/A');
    });

    it('displays the correct regulatory compliance badge for every tracked shipment', () => {
      fixtureData.shipments.forEach((shipment) => {
        cy.log(`Verifying compliance badge for ${shipment.id}`);
        MarketplacePage.getComplianceStatus(shipment.id).should('have.text', shipment.complianceStatus);
      });
    });

    it('advances a shipment milestone and reconciles compliance once it reaches "Delivered"', () => {
      const shipment = fixtureData.shipments.find((s) => s.id === 'SHP-2288') as ShipmentData; // mid-transit, pending clearance

      cy.log(`**Before** — ${shipment.id} should be at "${shipment.milestone}" with pending clearance`);
      MarketplacePage.getMilestone(shipment.id).should('have.text', shipment.milestone);
      MarketplacePage.getComplianceStatus(shipment.id).should('have.text', 'Pending FDA Clearance');

      cy.log(`**Action** — advance ${shipment.id} to its next milestone`);
      MarketplacePage.advanceShipmentMilestone(shipment.id);

      cy.log(`**After** — milestone should read "${shipment.nextMilestone}" and toast should confirm the transition`);
      MarketplacePage.getMilestone(shipment.id, { timeout: 8000 }).should('have.text', shipment.nextMilestone as string);
      MarketplacePage.verifyToast(`${shipment.id} advanced to "${shipment.nextMilestone}"`);

      cy.log(`Compliance should auto-reconcile to approved once ${shipment.id} reaches Delivered`);
      MarketplacePage.getComplianceStatus(shipment.id).should('have.text', 'FDA Ghana Approved');
    });
  });
});
