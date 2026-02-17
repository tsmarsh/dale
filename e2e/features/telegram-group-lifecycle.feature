Feature: Telegram Group Lifecycle
  Simulates a bot being added to a Telegram group and verifies
  room auto-creation, activation, user commands, and subscribers

  @auth
  Scenario: Bot added to group auto-creates a room
    Given I have onboarded a tenant with display name "E2E TG Group"
    And I have retrieved the webhook secret
    When I simulate the bot being added to group "Test Community"
    Then the response status should be 200
    When I list rooms via the admin API
    Then the response status should be 200
    And there should be 1 room
    And the room should have name "Test Community"
    And the room should have a telegramGroupId
    And the room should not be active

  @auth
  Scenario: Activate room and verify user commands
    Given I have onboarded a tenant with display name "E2E TG Commands"
    And I have retrieved the webhook secret
    And I have simulated the bot being added to group "Commands Room"
    And I have activated the auto-created room with payment link "https://buy.stripe.com/test_e2e"
    When a user sends "/start" in the group
    Then the response status should be 200
    When a user sends "/start" as a direct message
    Then the response status should be 200
    When a user sends "/status" as a direct message
    Then the response status should be 200
    When a user sends "/help" in the group
    Then the response status should be 200

  @auth
  Scenario: Room subscribers empty before payments
    Given I have onboarded a tenant with display name "E2E TG Subs"
    And I have retrieved the webhook secret
    And I have simulated the bot being added to group "Subs Room"
    When I check the auto-created room's subscribers
    Then the response status should be 200
    And the response body should be an array of length 0
