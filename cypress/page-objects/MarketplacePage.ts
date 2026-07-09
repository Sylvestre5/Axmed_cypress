/// <reference types="cypress" />

/**
 * MarketplacePage
 * ----------------
 * Page Object encapsulating every data-cy interaction for the Axmed
 * B2B Procurement Marketplace prototype (Demand Pool Aggregator,
 * Fintech Facilities, Logistics & Compliance Tracker).
 *
 * Test files must never call cy.get() directly against app markup —
 * all element access is routed through this class so a markup/data-cy
 * change only requires an update here.
 */

// ---------------------------------------------------------------------
// Fixture / test-data type definitions
// ---------------------------------------------------------------------

export type PoolMoqStatus = 'Filling' | 'Near MOQ' | 'MOQ Met';
export type FinancingFacility = 'none' | 'riff' | 'gates';
export type TemperatureStatus = 'STABLE' | 'EXCURSION' | 'N/A';

export interface DemandPoolData {
  slug: string;
  name: string;
  initialUnits: number;
  moqUnits: number;
  unit: string;
  contributionQty: number;
  expectedStatusAfterContribution: PoolMoqStatus;
}

export interface FinancingFacilityData {
  label: string;
  initialBalance: number;
}

export interface FinancingFacilitiesData {
  riff: FinancingFacilityData;
  gates: FinancingFacilityData;
}

export interface RfqScenario {
  scenarioName: string;
  poolValue: string;
  poolLabel: string;
  unitPrice: number;
  quantity: number;
  financingFacility: FinancingFacility;
  expectedOrderValue: number;
  expectedMatchedAmount?: number;
  expectedTotalPurchasingPower?: number;
  expectedGatesBalanceAfter?: number;
  expectedRiffBalanceAfter?: number;
  expectedToastFragment: string;
}

export interface ColdChainThresholds {
  stableMinC: number;
  stableMaxC: number;
  note?: string;
}

export interface ShipmentData {
  id: string;
  medicine: string;
  temperatureC: number | null;
  expectedTempStatus: TemperatureStatus;
  milestone: string;
  nextMilestone: string | null;
  complianceStatus: string;
  coldChain: boolean;
}

export interface ProcurementFixture {
  demandPools: DemandPoolData[];
  financingFacilities: FinancingFacilitiesData;
  rfqScenarios: RfqScenario[];
  coldChainThresholds: ColdChainThresholds;
  shipments: ShipmentData[];
}

// ---------------------------------------------------------------------
// Edge-case / negative-path fixture type definitions (edgeCaseData.json)
// ---------------------------------------------------------------------

export interface InvalidContributionCase {
  slug: string;
  poolName: string;
  input: string;
  description: string;
  expectedToastFragment: string;
}

export interface DecimalTruncationCase {
  slug: string;
  poolName: string;
  input: string;
  initialUnits: number;
  expectedNewTotal: number;
  moqUnits: number;
  unit: string;
  note?: string;
}

export interface ExtremeValueCase {
  slug: string;
  poolName: string;
  input: string;
  initialUnits: number;
  moqUnits: number;
  unit: string;
  expectedStatus: PoolMoqStatus;
  expectedBarStyleContains: string;
}

export interface RfqNativeValidationCase {
  description: string;
  pool: string;
  quantity: string;
}

export interface MultiOrderCase {
  pool: string;
  poolLabel: string;
  quantity: number;
  facility: FinancingFacility;
}

export interface ToastOverwriteSequence {
  slug: string;
  poolName: string;
  erroringInput: string;
  expectedErrorFragment: string;
  followUpInput: string;
  expectedSuccessFragment: string;
}

export interface ViewportDefinition {
  name: string;
  width: number;
  height: number;
  systemDateVisible: boolean;
  userInfoVisible: boolean;
}

export interface CoreInteractionSmokeCheck {
  slug: string;
  contributionQty: number;
  note?: string;
}

export interface LocaleBaseline {
  note: string;
  hardcodedCurrencySymbol: string;
  hardcodedDateText: string;
  hardcodedComplianceStrings: string[];
  hardcodedStatusStrings: string[];
}

export interface FutureLocale {
  code: string;
  currencySymbol: string;
  numberSample: string;
}

export interface EdgeCaseFixture {
  invalidPoolContributions: InvalidContributionCase[];
  decimalTruncationCase: DecimalTruncationCase;
  extremeValueCase: ExtremeValueCase;
  rfqNativeValidationCases: RfqNativeValidationCase[];
  multiOrderAccumulation: MultiOrderCase[];
  toastOverwriteSequence: ToastOverwriteSequence;
  viewports: ViewportDefinition[];
  coreInteractionSmokeCheck: CoreInteractionSmokeCheck;
  localeBaseline: LocaleBaseline;
  futureLocales: FutureLocale[];
}

// Cypress' own timeout options shape, reused so callers can pass
// `{ timeout: 8000 }` instead of a hardcoded cy.wait().
type QueryOptions = Partial<Cypress.Timeoutable>;

class MarketplacePage {
  private readonly DEFAULT_ASSERT_TIMEOUT = 8000;

  // -------------------------------------------------------------
  // Navigation
  // -------------------------------------------------------------
  visit(): void {
    cy.visit('/');
  }

  // -------------------------------------------------------------
  // Header / mock session
  // -------------------------------------------------------------
  getLoggedInUserName(options: QueryOptions = {}): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.get('[data-cy="logged-in-user-name"]', options);
  }

  getLoggedInUserRole(options: QueryOptions = {}): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.get('[data-cy="logged-in-user-role"]', options);
  }

  // -------------------------------------------------------------
  // Demand Pool Aggregator
  // -------------------------------------------------------------
  getPoolCard(slug: string): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.get(`[data-cy="pool-card-${slug}"]`);
  }

  getPoolProgressBar(slug: string, options: QueryOptions = {}): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.get(`[data-cy="pool-progress-bar"][data-pool="${slug}"]`, options);
  }

  getPoolProgressText(slug: string, options: QueryOptions = {}): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.get(`[data-cy="pool-progress-text"][data-pool="${slug}"]`, options);
  }

  getPoolStatusBadge(slug: string, options: QueryOptions = {}): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.get(`[data-cy="pool-moq-status"][data-pool="${slug}"]`, options);
  }

  getPoolContributionInput(slug: string): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.get(`[data-cy="pool-contribution-input"][data-pool="${slug}"]`);
  }

  getPoolJoinButton(slug: string): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.get(`[data-cy="pool-join-btn"][data-pool="${slug}"]`);
  }

  /** Types a quantity into the pool's contribution input and clicks "Join Pool". */
  contributeToPool(slug: string, quantity: number): void {
    this.getPoolContributionInput(slug).clear().type(String(quantity));
    this.getPoolJoinButton(slug).click();
  }

  /** Composite assertion: a pool has reached "MOQ Met" and its bar is visually full. */
  verifyPoolFullyAggregated(slug: string): void {
    this.getPoolStatusBadge(slug, { timeout: this.DEFAULT_ASSERT_TIMEOUT }).should('have.text', 'MOQ Met');
    this.getPoolProgressBar(slug)
      .should('have.attr', 'style')
      .and('include', 'width:100%');
  }

  // -------------------------------------------------------------
  // Fintech: Financing & Credit Line
  // -------------------------------------------------------------
  getRiffBalance(options: QueryOptions = {}): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.get('[data-cy="riff-available-balance"]', options);
  }

  getGatesBalance(options: QueryOptions = {}): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.get('[data-cy="gates-fund-available-balance"]', options);
  }

  getTotalFinancingMetric(options: QueryOptions = {}): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.get('[data-cy="metric-total-financing-value"]', options);
  }

  // -------------------------------------------------------------
  // RFQ / Purchase Order form
  // -------------------------------------------------------------
  selectRfqPool(poolValue: string): void {
    cy.get('[data-cy="rfq-pool-select"]').select(poolValue);
  }

  enterRfqQuantity(quantity: number): void {
    cy.get('[data-cy="rfq-quantity-input"]').clear().type(String(quantity));
  }

  selectFinancingFacility(facility: FinancingFacility): void {
    cy.get('[data-cy="financing-facility-select"]').select(facility);
  }

  getOrderValuePreview(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.get('[data-cy="order-value-preview"]');
  }

  getMatchingFundPreview(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.get('[data-cy="matching-fund-preview"]');
  }

  getRiffFacilityPreview(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.get('[data-cy="riff-facility-preview"]');
  }

  submitRfq(): void {
    cy.get('[data-cy="rfq-submit-btn"]').click();
  }

  getRecentOrderItems(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.get('[data-cy="recent-order-item"]');
  }

  /** Fills and submits the full RFQ form in one composite step. */
  submitPurchaseOrder(poolValue: string, quantity: number, facility: FinancingFacility): void {
    this.selectRfqPool(poolValue);
    this.enterRfqQuantity(quantity);
    this.selectFinancingFacility(facility);
    this.submitRfq();
  }

  // -------------------------------------------------------------
  // Success / error toast
  // -------------------------------------------------------------
  getSuccessToast(options: QueryOptions = {}): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.get('[data-cy="operation-success-toast"]', options);
  }

  getToastMessage(options: QueryOptions = {}): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.get('[data-cy="operation-success-toast-message"]', options);
  }

  /**
   * Composite verification: waits (with an explicit timeout rather than
   * cy.wait(ms)) for the toast to render, then asserts its message.
   */
  verifyToast(expectedMessageFragment: string): void {
    this.getSuccessToast({ timeout: this.DEFAULT_ASSERT_TIMEOUT }).should('be.visible');
    this.getToastMessage().should('contain.text', expectedMessageFragment);
  }

  // -------------------------------------------------------------
  // Logistics & Compliance Tracker
  // -------------------------------------------------------------
  getShipmentRow(shipmentId: string): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.get(`[data-cy="shipment-row-${shipmentId}"]`);
  }

  getTemperatureStatus(shipmentId: string, options: QueryOptions = {}): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.get(`[data-cy="logistics-temperature-status"][data-shipment="${shipmentId}"]`, options);
  }

  getMilestone(shipmentId: string, options: QueryOptions = {}): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.get(`[data-cy="logistics-milestone"][data-shipment="${shipmentId}"]`, options);
  }

  getComplianceStatus(shipmentId: string, options: QueryOptions = {}): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.get(`[data-cy="regulatory-compliance-status"][data-shipment="${shipmentId}"]`, options);
  }

  getAdvanceMilestoneButton(shipmentId: string): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.get(`[data-cy="advance-milestone-btn"][data-shipment="${shipmentId}"]`);
  }

  advanceShipmentMilestone(shipmentId: string): void {
    this.getAdvanceMilestoneButton(shipmentId).click();
  }

  /**
   * Composite verification: asserts a cold-chain shipment's displayed
   * temperature reading and status label against a business threshold,
   * rather than a hardcoded string — mirrors how a real SOP-based
   * compliance check would be authored.
   */
  verifyColdChainReading(shipment: ShipmentData, thresholds: ColdChainThresholds): void {
    this.getTemperatureStatus(shipment.id).should('be.visible').invoke('text').then((text) => {
      const temperature = shipment.temperatureC as number;
      const withinStableRange = temperature >= thresholds.stableMinC && temperature <= thresholds.stableMaxC;
      const expectedLabel: TemperatureStatus = withinStableRange ? 'STABLE' : 'EXCURSION';

      expect(text, `${shipment.id} reading should show ${temperature.toFixed(1)}°C`).to.contain(`${temperature.toFixed(1)}°C`);
      expect(text, `${shipment.id} status derived from ${thresholds.stableMinC}-${thresholds.stableMaxC}C threshold`).to.contain(expectedLabel);
      expect(expectedLabel, `${shipment.id} threshold-derived status must match fixture expectation`).to.equal(shipment.expectedTempStatus);
    });
  }

  // -------------------------------------------------------------
  // Edge case / negative-path helpers
  // -------------------------------------------------------------

  /**
   * Types a raw, unvalidated string into a pool's contribution input
   * (empty, negative, decimal, whitespace-only, absurdly large, etc.)
   * and clicks "Join Pool". Distinct from contributeToPool(), which
   * assumes a well-formed positive integer.
   */
  contributeRawValue(slug: string, rawInput: string): void {
    const input = this.getPoolContributionInput(slug).clear();
    if (rawInput !== '') {
      input.type(rawInput, { delay: 0 });
    }
    this.getPoolJoinButton(slug).click();
  }

  getRfqPoolSelectElement(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.get('[data-cy="rfq-pool-select"]');
  }

  getRfqQuantityInputElement(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.get('[data-cy="rfq-quantity-input"]');
  }

  getRfqFormElement(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.get('[data-cy="rfq-form"]');
  }

  /**
   * Fills the RFQ form with raw (possibly invalid) values via real
   * keyboard input and clicks the native submit button — this lets a
   * test observe the browser's own HTML5 constraint validation
   * (required / min="1") rather than the app's JS-level guard, which
   * a native-invalid form never actually reaches.
   */
  attemptNativeRfqSubmission(pool: string, quantity: string): void {
    if (pool !== '') {
      this.selectRfqPool(pool);
    }
    if (quantity !== '') {
      this.getRfqQuantityInputElement().clear().type(quantity, { delay: 0 });
    }
    this.submitRfq();
  }

  /** True if the RFQ form currently satisfies its own required/min constraints. */
  isRfqFormNativelyValid(): Cypress.Chainable<boolean> {
    return this.getRfqFormElement().then(($form) => ($form[0] as HTMLFormElement).checkValidity());
  }

  reload(): void {
    cy.reload();
  }

  // -------------------------------------------------------------
  // Header / layout regions (state, platform & device checks)
  // -------------------------------------------------------------
  getAppHeader(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.get('[data-cy="app-header"]');
  }

  getSystemDateWidget(options: QueryOptions = {}): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.get('[data-cy="system-date"]', options);
  }

  getNotificationsButton(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.get('[data-cy="notifications-btn"]');
  }

  getDemandPoolPanel(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.get('[data-cy="demand-pool-aggregator-panel"]');
  }

  getFinancingPanel(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.get('[data-cy="financing-credit-line-panel"]');
  }

  getLogisticsPanel(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.get('[data-cy="logistics-compliance-panel"]');
  }
}

export default new MarketplacePage();
