@auth @tutorial
Feature: Tutorial - Room Management
  Manage rooms in the browser to capture tutorial screenshots

  Scenario: Room CRUD workflow
    Given I have onboarded a tenant with display name "Demo Creator"
    And I am authenticated in the browser
    When I navigate to the rooms page
    Then I should see "No rooms yet"
    And I take a screenshot named "rooms-list-empty"
    When I click "Create Room"
    Then I take a screenshot named "rooms-create-form"
    When I fill in "Room name" with "VIP Community"
    And I fill in "Stripe payment link URL" with "https://buy.stripe.com/test_example"
    And I click "Create"
    Then I should see "VIP Community"
    And I take a screenshot named "rooms-list-with-room"
    When I click on the room "VIP Community"
    Then I should see "Payment Link"
    And I take a screenshot named "room-detail-view"
    When I click "Edit"
    Then I take a screenshot named "room-detail-edit"
