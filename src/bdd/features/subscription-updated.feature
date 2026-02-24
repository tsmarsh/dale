Feature: Subscription Status Updated
  When Stripe reports a subscription status change, access is granted or revoked accordingly.
  Critically, past_due users are NOT immediately banned — only active and cancelled trigger group actions.

  Background:
    Given table "dale-test-table" tenant "tenant-1" bot "bot-token"
    And a user mapping for customer "cus_abc" with user 123

  Scenario: Status becomes active — user is unbanned from group
    Given user 123 has a cancelled subscription "sub_xyz" to room "room-1"
    And room "room-1" has Telegram group -1001234567890
    When subscription "sub_xyz" status changes to "active" for customer "cus_abc"
    Then the user's subscription status is updated to "active"
    And the user is unbanned from group -1001234567890

  Scenario: Status becomes canceled — user is banned from group
    Given user 123 has an active subscription "sub_xyz" to room "room-1"
    And room "room-1" has Telegram group -1001234567890
    When subscription "sub_xyz" status changes to "canceled" for customer "cus_abc"
    Then the user's subscription status is updated to "cancelled"
    And the user is banned from group -1001234567890

  Scenario: Status becomes past_due — status updated, user is NOT banned
    Given user 123 has an active subscription "sub_xyz" to room "room-1"
    And room "room-1" has Telegram group -1001234567890
    When subscription "sub_xyz" status changes to "past_due" for customer "cus_abc"
    Then the user's subscription status is updated to "past_due"
    And no ban is issued
    And no unban is issued

  Scenario: Status changes but room has no Telegram group — status updated, no group action
    Given user 123 has a cancelled subscription "sub_xyz" to room "room-1"
    And room "room-1" has no Telegram group
    When subscription "sub_xyz" status changes to "active" for customer "cus_abc"
    Then the user's subscription status is updated to "active"
    And no unban is issued

  Scenario: No customer mapping found — nothing happens
    Given no mapping exists for customer "cus_unknown"
    When subscription "sub_xyz" status changes to "active" for customer "cus_unknown"
    Then no status is updated
