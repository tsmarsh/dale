Feature: SPA Hosting
  The CloudFront distribution serves the React SPA

  Scenario: SPA root returns HTML
    When I request the SPA root
    Then the response status should be 200
    And the response body should contain "<!doctype html"

  Scenario: SPA deep link returns HTML
    When I request the SPA path "/callback"
    Then the response status should be 200
    And the response body should contain "<!doctype html"
