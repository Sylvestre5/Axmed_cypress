import MarketplacePage, { ProcurementFixture, EdgeCaseFixture } from '../page-objects/MarketplacePage';

/**
 * Domain: Localisation ("mapping to different locales based on user
 * selection")
 * -----------------------------------------------------------------
 * Honest scope note, on purpose: THIS APP HAS NO LOCALE-SELECTION
 * FEATURE. There is no language/currency picker anywhere in the UI.
 * Every string is hardcoded English, currency is hardcoded to a "$"
 * template literal (not Intl.NumberFormat with a currency style), and
 * the header date ("Tuesday, 7 July 2026") is static markup, not a
 * computed Date. So "localisation testing" for this build cannot mean
 * "verify locale X renders correctly" — that feature doesn't exist.
 *
 * What we CAN and DO test:
 *  1) A baseline regression suite that pins down today's hardcoded
 *     English/USD-only output. If a future refactor accidentally
 *     starts localising some strings but not others, these tests
 *     catch the inconsistency immediately.
 *  2) A skipped scaffold of the tests we WOULD run the day a real
 *     locale switcher ships, so whoever builds it has a ready-made
 *     spec instead of starting from a blank page.
 *
 * Flag for the product/automation lead: recommend this domain stay
 * "Blocked — pending feature" in the test plan until a locale
 * selector exists.
 */
describe('Localisation', () => {
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

  context('Baseline regression: today\'s hardcoded English/USD-only content', () => {
    it('renders every currency amount with a hardcoded "$" symbol, not a locale-aware currency format', () => {
      const { hardcodedCurrencySymbol } = edgeCases.localeBaseline;

      MarketplacePage.getRiffBalance().invoke('text').should('match', new RegExp(`^\\${hardcodedCurrencySymbol}[\\d,]+$`));
      MarketplacePage.getGatesBalance().invoke('text').should('match', new RegExp(`^\\${hardcodedCurrencySymbol}[\\d,]+$`));
    });

    it('renders the header date as static text, not a locale-computed date', () => {
      MarketplacePage.getSystemDateWidget().should('contain.text', edgeCases.localeBaseline.hardcodedDateText);
    });

    it('renders compliance and status badges in English only, with no translation layer', () => {
      edgeCases.localeBaseline.hardcodedComplianceStrings.forEach((expectedText) => {
        cy.contains(`[data-cy="regulatory-compliance-status"]`, expectedText).should('exist');
      });

      const oxytocin = fixtureData.demandPools.find((p) => p.slug === 'oxytocin')!;
      MarketplacePage.getPoolStatusBadge(oxytocin.slug).invoke('text').should('be.oneOf', edgeCases.localeBaseline.hardcodedStatusStrings.slice(0, 3));
    });

    it('formats large numbers using the browser\'s DEFAULT locale via bare toLocaleString() — a latent risk', () => {
      // This is the concrete bug-shaped risk worth flagging: every
      // `.toLocaleString()` call in the app omits an explicit locale
      // argument, so grouping separators silently follow whatever
      // locale the test runner / end-user's OS happens to default to
      // (e.g. "10,000" on en-US vs "10.000" on de-DE) even though the
      // currency symbol stays a hardcoded "$" regardless. Today, in a
      // standard en-US CI environment, we expect comma grouping.
      const oxytocin = fixtureData.demandPools.find((p) => p.slug === 'oxytocin')!;
      MarketplacePage.getPoolProgressText(oxytocin.slug).invoke('text').should('include', ',');
    });
  });

  // -----------------------------------------------------------------
  // Pending: activate once a real locale switcher (e.g. a
  // data-cy="locale-select" control) exists in the header.
  // -----------------------------------------------------------------
  describe.skip('Pending: locale-switcher feature (blocked — not built yet)', () => {
    // Hardcoded rather than generated from the fixture on purpose:
    // describe() bodies run during Cypress's synchronous spec-collection
    // pass, before any beforeEach/cy.fixture() has resolved, so the
    // fixture data isn't available yet at this point in the file.
    // See edgeCaseData.json -> futureLocales for the source values.
    it('renders currency as $ and numbers as 10,000 when locale=en-US is selected');
    it('renders currency as € and numbers as 10.000 when locale=de-DE is selected');
    it('renders currency as € and numbers as 10 000 when locale=fr-FR is selected');
    it('persists the user\'s chosen locale across a reload (ties into the State & Session domain)');
    it('falls back to en-US gracefully for an unsupported/unrecognised locale code');
  });
});
