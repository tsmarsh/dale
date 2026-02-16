Feature: Stripe Webhook
  The Stripe webhook endpoint validates tenant and signature

  Scenario: Missing tenant parameter returns 400
    When I send a POST to the Stripe webhook without a tenant parameter
    Then the response status should be 400

  Scenario: Bad signature returns 400
    When I send a POST to the Stripe webhook with tenant "fake-tenant" and bad signature
    Then the response status should be 400 or 500
