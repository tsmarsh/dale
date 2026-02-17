@auth @tutorial
Feature: Tutorial - Setup Room from Dashboard
  Walk through the setup room wizard from the dashboard to capture tutorial screenshots

  Scenario: Set up a room from the dashboard
    Given I am authenticated in the browser
    When I navigate to the dashboard page
    Then I should see "Welcome to Dale!"
    And I take a screenshot named "dashboard-empty-state"
    When I click "Setup Room"
    And I fill in "Your creator name" with "Demo Creator"
    Then I take a screenshot named "setup-step1-display-name"
    When I click "Next"
    And I fill in "123456:ABC-DEF..." with "000000000:fake-bot-token-for-e2e"
    Then I take a screenshot named "setup-step2-telegram-token"
    When I click "Next"
    And I fill in "My Premium Room" with "Demo Room"
    Then I take a screenshot named "setup-step3-room-details"
    When I click "Create Room"
    Then I should see "Welcome, Demo Creator"
    And I take a screenshot named "dashboard-with-room"
