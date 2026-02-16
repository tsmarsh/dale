Feature: Admin Tenant Management
  Authenticated users can onboard and manage tenants

  @auth
  Scenario: Onboard a new tenant
    When I onboard a new tenant with display name "E2E Test Tenant"
    Then the response status should be 201
    And the response body should have field "tenantId"
    And the response body should have field "stripeWebhookUrl"

  @auth
  Scenario: Get tenant after onboarding
    Given I have onboarded a tenant with display name "E2E Get Tenant"
    When I send an authenticated GET request to "/api/tenant"
    Then the response status should be 200
    And the response body should have field "tenantId"
    And the response body should have field "displayName"

  @auth
  Scenario: Update tenant display name
    Given I have onboarded a tenant with display name "E2E Update Tenant"
    When I send an authenticated PUT request to "/api/tenant" with body:
      """
      {"displayName": "Updated Tenant Name"}
      """
    Then the response status should be 200
    And the response body should have field "updated"

  Scenario: Onboard without authentication returns 401
    When I send a POST request to "/api/tenant/onboard" without auth with body:
      """
      {"displayName": "Unauth Tenant", "telegramBotToken": "fake", "stripeSecretKey": "fake", "stripeWebhookSecret": "fake"}
      """
    Then the response status should be 401
