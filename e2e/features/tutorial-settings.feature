@auth @tutorial
Feature: Tutorial - Settings
  View settings page to capture tutorial screenshots

  Scenario: View settings page
    Given I have onboarded a tenant with display name "Demo Creator"
    And I am authenticated in the browser
    When I navigate to the settings page
    Then I should see "Profile"
    And I should see "Telegram Webhook"
    And I take a screenshot named "settings-profile"
