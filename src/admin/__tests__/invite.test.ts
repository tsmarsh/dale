import { describe, it, expect, beforeEach } from 'vitest';
import { mockClient } from 'aws-sdk-client-mock';
import {
  CognitoIdentityProviderClient,
  AdminCreateUserCommand,
  ListUsersCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { handleInviteUser, handleListUsers } from '../routes/invite.js';

const cognitoMock = mockClient(CognitoIdentityProviderClient);
const POOL_ID = 'us-east-1_TestPool';

beforeEach(() => {
  cognitoMock.reset();
});

describe('handleInviteUser', () => {
  it('invites a valid email and returns 201', async () => {
    cognitoMock.on(AdminCreateUserCommand).resolves({
      User: { Username: 'test@example.com' },
    });

    const result = await handleInviteUser(POOL_ID, JSON.stringify({ email: 'test@example.com' }));
    expect(result.statusCode).toBe(201);
    const body = JSON.parse(result.body);
    expect(body.email).toBe('test@example.com');
    expect(body.invited).toBe(true);

    const call = cognitoMock.commandCalls(AdminCreateUserCommand)[0];
    expect(call.args[0].input.UserPoolId).toBe(POOL_ID);
    expect(call.args[0].input.Username).toBe('test@example.com');
  });

  it('returns 400 for missing email', async () => {
    const result = await handleInviteUser(POOL_ID, JSON.stringify({}));
    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body).error).toBe('Valid email is required');
  });

  it('returns 400 for invalid email', async () => {
    const result = await handleInviteUser(POOL_ID, JSON.stringify({ email: 'notanemail' }));
    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body).error).toBe('Valid email is required');
  });

  it('returns 400 for invalid JSON', async () => {
    const result = await handleInviteUser(POOL_ID, 'not-json');
    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body).error).toBe('Invalid JSON');
  });
});

describe('handleListUsers', () => {
  it('returns list of users', async () => {
    cognitoMock.on(ListUsersCommand).resolves({
      Users: [
        {
          Username: 'user1',
          Attributes: [{ Name: 'email', Value: 'a@b.com' }],
          UserStatus: 'CONFIRMED',
          UserCreateDate: new Date('2025-01-01'),
        },
        {
          Username: 'user2',
          Attributes: [{ Name: 'email', Value: 'c@d.com' }],
          UserStatus: 'FORCE_CHANGE_PASSWORD',
          UserCreateDate: new Date('2025-06-15'),
        },
      ],
    });

    const result = await handleListUsers(POOL_ID);
    expect(result.statusCode).toBe(200);
    const users = JSON.parse(result.body);
    expect(users).toHaveLength(2);
    expect(users[0].email).toBe('a@b.com');
    expect(users[0].status).toBe('CONFIRMED');
    expect(users[1].email).toBe('c@d.com');
    expect(users[1].status).toBe('FORCE_CHANGE_PASSWORD');
  });

  it('returns empty list when no users', async () => {
    cognitoMock.on(ListUsersCommand).resolves({ Users: [] });

    const result = await handleListUsers(POOL_ID);
    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body)).toEqual([]);
  });
});
