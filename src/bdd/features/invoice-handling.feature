Feature: Invoice Handling
  When invoices are paid, subscriptions are kept active.
  If a previously cancelled or past_due subscriber pays again, they are reinstated and unbanned.

  Background:
    Given table "dale-test-table" tenant "tenant-1" bot "bot-token"
    And a user mapping for customer "cus_abc" with user 123

  Scenario: Invoice paid — active subscription, no group action needed
    Given user 123 has an active subscription "sub_xyz" to room "room-1"
    And room "room-1" has no Telegram group
    When invoice is paid for customer "cus_abc" subscription "sub_xyz"
    Then the user's subscription status is updated to "active"
    And no unban is issued

  Scenario: Invoice paid — previously cancelled, user is reinstated and unbanned
    Given user 123 has a cancelled subscription "sub_xyz" to room "room-1"
    And room "room-1" has Telegram group -1001234567890
    When invoice is paid for customer "cus_abc" subscription "sub_xyz"
    Then the user's subscription status is updated to "active"
    And the user is unbanned from group -1001234567890

  Scenario: Invoice paid — previously past_due, user is reinstated and unbanned
    Given user 123 has a past_due subscription "sub_xyz" to room "room-1"
    And room "room-1" has Telegram group -1001234567890
    When invoice is paid for customer "cus_abc" subscription "sub_xyz"
    Then the user's subscription status is updated to "active"
    And the user is unbanned from group -1001234567890

  Scenario: Invoice paid — previously cancelled, room has no Telegram group
    Given user 123 has a cancelled subscription "sub_xyz" to room "room-1"
    And room "room-1" has no Telegram group
    When invoice is paid for customer "cus_abc" subscription "sub_xyz"
    Then the user's subscription status is updated to "active"
    And no unban is issued

  Scenario: Invoice paid — no customer mapping found
    Given no mapping exists for customer "cus_unknown"
    When invoice is paid for customer "cus_unknown" subscription "sub_xyz"
    Then no status is updated
