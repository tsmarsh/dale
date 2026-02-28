import { CloudFormationClient, DeleteStackCommand } from '@aws-sdk/client-cloudformation';

const cf = new CloudFormationClient({});

export async function handler(): Promise<void> {
  const stackName = process.env.STACK_NAME;
  if (!stackName) {
    console.error('STACK_NAME env var not set — aborting');
    return;
  }

  console.log(`[auto-shutdown] Stack ${stackName} has been idle for 30+ minutes — initiating deletion`);

  try {
    await cf.send(new DeleteStackCommand({ StackName: stackName }));
    console.log(`[auto-shutdown] DeleteStack initiated for ${stackName}`);
  } catch (err) {
    console.error('[auto-shutdown] Failed to delete stack:', err);
    throw err;
  }
}
