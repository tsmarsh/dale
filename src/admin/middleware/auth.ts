import type { APIGatewayProxyEventV2 } from 'aws-lambda';
import { getTenantByCognitoSub } from '../../db/tenants.js';

export interface AuthContext {
  cognitoSub: string;
  tenantId: string;
}

export async function extractAuthContext(
  event: APIGatewayProxyEventV2,
  tableName: string,
): Promise<AuthContext | null> {
  // Cognito JWT authorizer puts claims in requestContext
  const claims = (event.requestContext as any)?.authorizer?.jwt?.claims;
  const cognitoSub = claims?.sub as string | undefined;

  if (!cognitoSub) {
    return null;
  }

  const tenant = await getTenantByCognitoSub(tableName, cognitoSub);
  if (!tenant) {
    return null;
  }

  return { cognitoSub, tenantId: tenant.tenantId };
}

export function extractCognitoSub(event: APIGatewayProxyEventV2): string | null {
  const claims = (event.requestContext as any)?.authorizer?.jwt?.claims;
  return (claims?.sub as string) ?? null;
}
