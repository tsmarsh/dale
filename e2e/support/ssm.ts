import { SSMClient, GetParameterCommand } from '@aws-sdk/client-ssm';

const ssmClient = new SSMClient({});

export async function getSSMParameter(name: string): Promise<string> {
  const result = await ssmClient.send(
    new GetParameterCommand({
      Name: name,
      WithDecryption: true,
    }),
  );

  if (!result.Parameter?.Value) {
    throw new Error(`SSM parameter ${name} not found or empty`);
  }

  return result.Parameter.Value;
}
