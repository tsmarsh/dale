Feature: Admin Subscriber Management
  Authenticated users can view subscribers for their rooms

  @auth
  Scenario: List subscribers for empty room
    Given I have onboarded a tenant with display name "E2E Subscribers"
    And I have created a room named "Empty Room"
    When I send an authenticated GET request to the created room's subscribers
    Then the response status should be 200
    And the response body should be an array of length 0
