Feature: Subscription Lifecycle
  When a subscription is cancelled or deleted, users should lose access to their groups.
  Status is updated in the database and, where applicable, users are banned from Telegram groups.

  Background:
    Given table "dale-test-table" tenant "tenant-1" bot "bot-token"
    And a user mapping for customer "cus_abc" with user 123

  Scenario: Subscription deleted — user is banned from their Telegram group
    Given user 123 has an active subscription "sub_xyz" to room "room-1"
    And room "room-1" has Telegram group -1001234567890
    When subscription "sub_xyz" is deleted for customer "cus_abc"
    Then the user's subscription status is updated to "cancelled"
    And the user is banned from group -1001234567890
    And the user receives a cancellation message

  Scenario: Subscription deleted — room has no Telegram group, no ban issued
    Given user 123 has an active subscription "sub_xyz" to room "room-1"
    And room "room-1" has no Telegram group
    When subscription "sub_xyz" is deleted for customer "cus_abc"
    Then the user's subscription status is updated to "cancelled"
    And no ban is issued
    And the user receives a cancellation message

  Scenario: Subscription deleted — no user rooms match the subscription ID
    Given user 123 has no rooms matching subscription "sub_xyz"
    When subscription "sub_xyz" is deleted for customer "cus_abc"
    Then no status is updated
    And no ban is issued
    And the user receives a cancellation message

  Scenario: Subscription deleted — no customer mapping found
    Given no mapping exists for customer "cus_unknown"
    When subscription "sub_xyz" is deleted for customer "cus_unknown"
    Then no message is sent
    And no ban is issued
    And no status is updated
