Feature: Admin Room Management
  Authenticated users can manage rooms for their tenant

  @auth
  Scenario: Create a room
    Given I have onboarded a tenant with display name "E2E Rooms Tenant"
    When I send an authenticated POST request to "/api/rooms" with body:
      """
      {"name": "Test Room", "description": "A test room", "paymentLink": "https://buy.stripe.com/test", "priceDescription": "$10/month"}
      """
    Then the response status should be 201
    And the response body should have field "roomId"
    And the response body should have field "name"

  @auth
  Scenario: List rooms
    Given I have onboarded a tenant with display name "E2E List Rooms"
    And I have created a room named "Room A"
    When I send an authenticated GET request to "/api/rooms"
    Then the response status should be 200
    And the response body should be an array of length 1

  @auth
  Scenario: Get room by ID
    Given I have onboarded a tenant with display name "E2E Get Room"
    And I have created a room named "Room B"
    When I send an authenticated GET request to the created room
    Then the response status should be 200
    And the response body should have field "name"

  @auth
  Scenario: Update a room
    Given I have onboarded a tenant with display name "E2E Update Room"
    And I have created a room named "Room C"
    When I send an authenticated PUT request to the created room with body:
      """
      {"name": "Updated Room C"}
      """
    Then the response status should be 200
    And the response body should have field "updated"
