Feature: Real Telegram Group Lifecycle
  Tests the full loop using GramJS against the Telegram Test DC:
  create group, add bot, verify room auto-creation, send commands, verify replies.

  @auth @real-telegram
  Scenario: Real Telegram group lifecycle
    Given I have onboarded a tenant with the test bot
    And I have retrieved the webhook secret
    When I create a Telegram group "Real E2E Room"
    And I add the bot to the group
    Then a room should be auto-created within 10 seconds
    And the room should have name "Real E2E Room"
    And the room should not be active
    When I activate the auto-created room with payment link "https://buy.stripe.com/test_e2e"
    And I send "/start" in the Telegram group
    Then the bot should reply within 10 seconds
    And the reply should contain "subscribe"
    When I send "/help" in the Telegram group
    Then the bot should reply within 10 seconds

  @auth @real-telegram
  Scenario: Real Telegram DM commands
    Given I have onboarded a tenant with the test bot
    And I have retrieved the webhook secret
    When I create a Telegram group "DM Test Room"
    And I add the bot to the group
    Then a room should be auto-created within 10 seconds
    When I activate the auto-created room with payment link "https://buy.stripe.com/test_e2e"
    And I send "/start" as a DM to the bot
    Then the bot should reply within 10 seconds
    And the reply should contain "room"
