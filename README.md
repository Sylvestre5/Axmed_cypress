# Axmed B2B Procurement Ecosystem - Test Engineering Prototype

An automated testing framework and high-fidelity frontend prototype modeled after the Axmed B2B health tech marketplace. This repository serves as an internal pilot project to demonstrate how to architect a scalable, resilient web automation test suite against a multi-sided marketplace platform without authentication bottlenecks.

## Project Overview

The prototype showcases a mock frontend of a cross-border healthcare procurement hub (e.g., Regional Hub Manager / Ghana Ministry of Health) to simulate and test three core product pillars:

1. **Aggregated Demand Engine (SaaS):** Tools that allow fragmented local hospitals and NGOs to pool medicine orders to dynamically meet manufacturer Minimum Order Quantities (MOQs).
2. **Integrated Fintech Solutions:** Real-time credit monitoring and purchasing rules leveraging the Revolving Inventory Financing Facility (RIFF) and the Gates Foundation MNCH 1:1 Matching Fund.
3. **End-to-End Logistics Dashboard:** Real-time visibility tracking metrics including cold-chain temperature monitoring stability (2°C–8°C) and regulatory clearance milestones.

## Automation Architecture & Best Practices

The end-to-end automation test suite is built using **Cypress** and **TypeScript**, observing professional test engineering paradigms:

* **Page Object Model (POM):** Complete decoupling of test logic from UI selectors to ensure long-term test suite maintainability.
* **Resilient Locators:** Relying strictly on custom `data-cy` HTML data attributes to insulate the automation suite from future CSS, Tailwind, or structural layout updates.
* **Deterministic Assertions:** Zero reliance on arbitrary, flaky wait delays (`cy.wait(ms)`). The framework leverages Cypress's native retryability and explicit timeout guards.
* **Decoupled Auth State:** Built purely around a hardcoded mock user state to eliminate login/MFA flakiness and optimize execution speeds inside CI/CD pipelines.

## Local Development & Execution

### Prerequisites
Ensure you have Node.js installed.

### Installation
```bash
# Clone the repository
git clone <your-repo-url>

# Install development dependencies (Cypress, http-server, start-server-and-test)
npm install
