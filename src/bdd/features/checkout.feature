Feature: Checkout Flow
  When a user completes a Stripe checkout, they should receive immediate access to their paid group.
  If the group has a Telegram group configured, the user gets a single-use invite link.

  Background:
    Given table "dale-test-table" tenant "tenant-1" bot "bot-token"

  Scenario: User pays for a group that has a Telegram group
    Given a room "room-1" named "Cool Club" with Telegram group -1001234567890
    And a checkout session for user 123 paying for room "room-1" with subscription "sub_xyz"
    And the invite link creation succeeds with "https://t.me/+abc123"
    When the checkout is completed
    Then a single-use invite link is created for group -1001234567890
    And the user receives a message containing "https://t.me/+abc123"

  Scenario: User pays for a group without a Telegram group
    Given a room "room-1" named "Text Newsletter" without a Telegram group
    And a checkout session for user 123 paying for room "room-1" with subscription "sub_xyz"
    When the checkout is completed
    Then no invite link is created
    And the user receives a message containing "active"

  Scenario: Invite link creation fails — user still gets confirmation
    Given a room "room-1" named "Cool Club" with Telegram group -1001234567890
    And a checkout session for user 123 paying for room "room-1" with subscription "sub_xyz"
    And the invite link creation fails
    When the checkout is completed
    Then the user receives a message containing "active"
    And the message does not contain a Telegram link

  Scenario: Invalid client_reference_id is silently rejected
    Given a checkout session with invalid client_reference_id "bad-format"
    When the checkout is completed
    Then no mapping is created
    And no message is sent

  Scenario: Tenant mismatch in client_reference_id is silently rejected
    Given a checkout session for user 123 from tenant "other-tenant" paying for room "room-1"
    When the checkout is completed
    Then no mapping is created
    And no message is sent
