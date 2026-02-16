@auth @tutorial
Feature: Tutorial - Dashboard
  View the dashboard after onboarding to capture tutorial screenshots

  Scenario: View the dashboard
    Given I have onboarded a tenant with display name "Demo Creator"
    And I am authenticated in the browser
    When I navigate to the dashboard page
    Then I should see "Welcome, Demo Creator"
    And I take a screenshot named "dashboard-welcome"
