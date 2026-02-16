Feature: Telegram Webhook
  The Telegram webhook endpoint handles incoming updates

  Scenario: POST with no secret returns 200
    When I send a POST to the Telegram webhook without a secret
    Then the response status should be 200

  Scenario: POST with unknown secret returns 200
    When I send a POST to the Telegram webhook with secret "unknown-secret-value"
    Then the response status should be 200
