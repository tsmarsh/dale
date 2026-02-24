@auth @tutorial
Feature: Tutorial - Setup Group from Dashboard
  Walk through the setup group wizard from the dashboard to capture tutorial screenshots

  Scenario: Set up a group from the dashboard
    Given I am authenticated in the browser
    When I navigate to the dashboard page
    Then I should see "Welcome to Dale!"
    And I take a screenshot named "dashboard-empty-state"
    When I click "Get Started"
    And I fill in "Your creator name" with "Demo Creator"
    Then I take a screenshot named "setup-step1-display-name"
    When I click "Next"
    And I fill in "Paste your bot token here" with "000000000:fake-bot-token-for-e2e"
    Then I take a screenshot named "setup-step2-telegram-token"
    When I click "Next"
    And I fill in "e.g. VIP Trading Signals" with "Demo Group"
    And I fill in "https://buy.stripe.com/..." with "https://buy.stripe.com/test_fake"
    Then I take a screenshot named "setup-step3-group-details"
    When I click "Create Group"
    Then I should see "Your paid group is ready!"
    And I take a screenshot named "setup-step4-success"
    When I click "Go to Dashboard"
    Then I should see "Welcome, Demo Creator"
    And I take a screenshot named "dashboard-with-group"
