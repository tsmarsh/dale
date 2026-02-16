# Dale

Serverless Telegram bot that gates access to a private service behind [Stripe Billing](https://stripe.com/billing) subscriptions. Built with AWS CDK, Lambda function URLs, and DynamoDB.

## Architecture

```
Stripe ──webhook──▶ Stripe Lambda ──▶ DynamoDB ◀── Telegram Lambda ◀──webhook── Telegram
```

- **Telegram Lambda** — receives Telegram updates, checks subscription state, responds to commands
- **Stripe Lambda** — receives Stripe billing events, keeps subscription state in sync
- **DynamoDB** — single-table design storing user profiles and Stripe-to-Telegram mappings
- **SSM Parameter Store** — secrets fetched at runtime and cached in memory

No API Gateway required — both Lambdas use [Lambda function URLs](https://docs.aws.amazon.com/lambda/latest/dg/lambda-urls.html).

## Prerequisites

- Node.js 20+
- AWS CLI configured with credentials
- [AWS CDK CLI](https://docs.aws.amazon.com/cdk/v2/guide/getting-started.html) (`npm install -g aws-cdk` or use `npx cdk`)
- A [Telegram bot](https://core.telegram.org/bots#creating-a-new-bot) (created via [@BotFather](https://t.me/BotFather))
- A [Stripe account](https://dashboard.stripe.com/) with a recurring payment link

## Quick Start

```bash
# Clone and install
git clone git@github.com:tsmarsh/dale.git
cd dale
npm install

# Run tests
npm test

# Synthesize CloudFormation (verify before deploying)
npx cdk synth
```

## Configuration

### SSM Parameters

Before deploying, create four SecureString parameters in AWS Systems Manager Parameter Store:

```bash
aws ssm put-parameter --name /dale/telegram-bot-token \
  --type SecureString --value "YOUR_TELEGRAM_BOT_TOKEN"

aws ssm put-parameter --name /dale/telegram-webhook-secret \
  --type SecureString --value "YOUR_RANDOM_SECRET_STRING"

aws ssm put-parameter --name /dale/stripe-secret-key \
  --type SecureString --value "sk_live_..."

aws ssm put-parameter --name /dale/stripe-webhook-secret \
  --type SecureString --value "whsec_..."
```

The Telegram webhook secret can be any random string — it's used to verify that incoming requests are from Telegram. Generate one with:

```bash
openssl rand -hex 32
```

> **Note:** The Stripe webhook secret (`whsec_...`) is created _after_ you register the endpoint in the Stripe dashboard (see [Post-Deploy Setup](#post-deploy-setup)). You can deploy first, then come back to set this parameter.

### Environment Variables

The CDK stack sets these automatically. Override `PAYMENT_LINK` at deploy time:

| Variable | Source | Description |
|---|---|---|
| `TABLE_NAME` | CDK | DynamoDB table name |
| `PAYMENT_LINK` | CDK / env | Stripe payment link URL |
| `TELEGRAM_BOT_TOKEN_PARAM` | CDK | SSM parameter name for bot token |
| `TELEGRAM_WEBHOOK_SECRET_PARAM` | CDK | SSM parameter name for webhook secret |
| `STRIPE_SECRET_KEY_PARAM` | CDK | SSM parameter name for Stripe key |
| `STRIPE_WEBHOOK_SECRET_PARAM` | CDK | SSM parameter name for Stripe webhook secret |

## Deployment

### 1. Bootstrap CDK (first time only)

```bash
npx cdk bootstrap
```

### 2. Deploy the stack

```bash
PAYMENT_LINK="https://buy.stripe.com/YOUR_LINK" npx cdk deploy
```

The deploy output will print two URLs:

```
Outputs:
DaleStack.TelegramWebhookUrl = https://xxxxx.lambda-url.us-east-1.on.aws/
DaleStack.StripeWebhookUrl   = https://yyyyy.lambda-url.us-east-1.on.aws/
```

### 3. Post-Deploy Setup

#### Register the Telegram webhook

```bash
npx tsx scripts/register-webhook.ts \
  "https://xxxxx.lambda-url.us-east-1.on.aws/" \
  "YOUR_TELEGRAM_BOT_TOKEN" \
  "YOUR_TELEGRAM_WEBHOOK_SECRET"
```

This calls the Telegram `setWebhook` API to point your bot at the Lambda function URL. It also sets the secret token for request validation and restricts updates to messages only.

#### Register the Stripe webhook

1. Go to [Stripe Dashboard > Developers > Webhooks](https://dashboard.stripe.com/webhooks)
2. Click **Add endpoint**
3. Set the URL to the `StripeWebhookUrl` from the deploy output
4. Select these events:
   - `checkout.session.completed`
   - `invoice.paid`
   - `invoice.payment_failed`
   - `customer.subscription.deleted`
   - `customer.subscription.updated`
5. Copy the signing secret (`whsec_...`) and store it in SSM:

```bash
aws ssm put-parameter --name /dale/stripe-webhook-secret \
  --type SecureString --value "whsec_..." --overwrite
```

## How It Works

### Subscription Flow

1. User sends `/start` to the bot
2. Bot replies with a Stripe payment link containing `?client_reference_id={telegramUserId}`
3. User completes checkout on Stripe
4. Stripe sends `checkout.session.completed` to the Stripe Lambda
5. Lambda creates a user profile and Stripe mapping in DynamoDB (atomic `TransactWrite`)
6. Lambda sends a confirmation message to the user via Telegram
7. Subsequent billing events (`invoice.paid`, `invoice.payment_failed`, etc.) keep the subscription status in sync

### Bot Commands

| Command | Description |
|---|---|
| `/start` | Subscribe (shows payment link) or welcome back if already active |
| `/status` | Check current subscription status |
| `/help` | List available commands |
| `/cancel` | Information about cancelling your subscription |

Non-command messages from active subscribers are echoed back (placeholder for your service logic). Non-subscribers are prompted to subscribe.

### Stripe Events

| Event | Action |
|---|---|
| `checkout.session.completed` | Create user mapping, set status to `active`, notify user |
| `invoice.paid` | Set status to `active` |
| `invoice.payment_failed` | Set status to `past_due`, notify user |
| `customer.subscription.deleted` | Set status to `cancelled`, notify user |
| `customer.subscription.updated` | Map Stripe status to internal status |

Stripe status mapping: `active`/`trialing` → `active`, `past_due` → `past_due`, `canceled`/`unpaid`/`incomplete_expired` → `cancelled`.

### DynamoDB Schema

Single-table design with two record types:

| pk | sk | Purpose |
|---|---|---|
| `USER#{telegramUserId}` | `PROFILE` | User profile with subscription status |
| `STRIPE#{stripeCustomerId}` | `MAPPING` | Reverse lookup from Stripe customer to Telegram user |

Both records are written atomically via `TransactWrite` when a checkout completes.

## Development

### Run tests

```bash
npm test              # single run
npm run test:watch    # watch mode
```

Tests use [vitest](https://vitest.dev/) with [aws-sdk-client-mock](https://github.com/m-radzikowski/aws-sdk-client-mock) for DynamoDB and `vi.mock` for module-level mocking. All 57 tests run in under a second.

### Project structure

```
├── cdk/
│   ├── bin/app.ts                 # CDK app entry point
│   └── lib/stack.ts               # Stack definition
├── src/
│   ├── shared/
│   │   ├── types.ts               # TypeScript types
│   │   └── config.ts              # SSM config loader with caching
│   ├── db/
│   │   ├── subscriptions.ts       # DynamoDB operations
│   │   └── subscriptions.test.ts
│   ├── telegram/
│   │   ├── api.ts                 # Telegram sendMessage wrapper
│   │   ├── commands.ts            # Command response functions
│   │   ├── middleware.ts          # Validation and parsing
│   │   ├── webhook.ts             # Lambda handler
│   │   └── *.test.ts
│   ├── stripe/
│   │   ├── events.ts              # Stripe event handlers
│   │   ├── webhook.ts             # Lambda handler
│   │   └── *.test.ts
│   └── test-setup.ts              # Test environment stubs
├── scripts/
│   └── register-webhook.ts        # Telegram webhook registration
├── cdk.json
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

### Design decisions

- **Always return 200 to Telegram** to prevent retries. Errors are logged but swallowed.
- **Return 500 to Stripe on errors** so Stripe retries payment-critical events.
- **TransactWrite for user mapping** — atomically writes both `USER#` and `STRIPE#` records to prevent orphans.
- **SSM parameter names as env vars** — Lambda code fetches and caches secrets at runtime, keeping them out of CloudFormation and the Lambda console.
- **`externalModules: ['@aws-sdk/*']`** — uses the Lambda runtime's built-in AWS SDK. Stripe is bundled since it's not in the runtime.

## Tearing Down

```bash
npx cdk destroy
```

> **Note:** The DynamoDB table has `RemovalPolicy.RETAIN` and will not be deleted. To remove it manually:
> ```bash
> aws dynamodb delete-table --table-name DaleStack-DaleTable-XXXXX
> ```
