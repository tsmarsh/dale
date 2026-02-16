@auth @tutorial
Feature: Tutorial - Onboarding
  Walk through the onboarding wizard to capture tutorial screenshots

  Scenario: Complete the onboarding wizard
    Given I am authenticated in the browser
    When I navigate to the onboarding page
    And I fill in "Your creator name" with "Demo Creator"
    Then I take a screenshot named "onboarding-step1-display-name"
    When I click "Next"
    And I fill in "123456:ABC-DEF..." with "000000000:fake-bot-token-for-e2e"
    Then I take a screenshot named "onboarding-step2-telegram-token"
    When I click "Next"
    And I fill in "sk_live_..." with "sk_test_fake_for_e2e"
    And I fill in "whsec_..." with "whsec_fake_for_e2e"
    Then I take a screenshot named "onboarding-step3-stripe-credentials"
    When I click "Create Account"
    Then I should see "Account Created!"
    And I take a screenshot named "onboarding-success"
