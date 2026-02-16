Feature: Admin API CORS
  The Admin API returns CORS headers for cross-origin requests

  Scenario: OPTIONS request returns CORS headers
    When I send an OPTIONS request to "/api/tenant"
    Then the response should have header "access-control-allow-origin"
    And the response should have header "access-control-allow-methods"
    And the response should have header "access-control-allow-headers"
