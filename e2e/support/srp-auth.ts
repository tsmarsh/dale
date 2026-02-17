import {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
} from 'amazon-cognito-identity-js';

export interface SrpTokens {
  idToken: string;
  accessToken: string;
  refreshToken: string;
}

export function srpAuthenticate(
  userPoolId: string,
  clientId: string,
  username: string,
  password: string,
): Promise<SrpTokens> {
  return new Promise((resolve, reject) => {
    const pool = new CognitoUserPool({
      UserPoolId: userPoolId,
      ClientId: clientId,
    });

    const user = new CognitoUser({
      Username: username,
      Pool: pool,
    });

    const authDetails = new AuthenticationDetails({
      Username: username,
      Password: password,
    });

    user.authenticateUser(authDetails, {
      onSuccess(session) {
        resolve({
          idToken: session.getIdToken().getJwtToken(),
          accessToken: session.getAccessToken().getJwtToken(),
          refreshToken: session.getRefreshToken().getToken(),
        });
      },
      onFailure(err) {
        reject(err);
      },
    });
  });
}
