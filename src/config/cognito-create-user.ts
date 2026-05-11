import {
  AdminCreateUserCommand,
  type AdminCreateUserCommandInput,
  CognitoIdentityProviderClient,
} from "@aws-sdk/client-cognito-identity-provider";

import outputs from "../../amplify_outputs.json";

type AmplifyAuthOutputs = {
  aws_region?: string;
  user_pool_id?: string;
};

type AmplifyOutputs = {
  auth?: AmplifyAuthOutputs;
};

export type CreateCognitoUserOptions = {
  dryRun: boolean;
  email: string;
  resend: boolean;
  yes: boolean;
};

export type CognitoUserPoolConfig = {
  region: string;
  userPoolId: string;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SUPPORTED_FLAGS = new Set(["--dry-run", "--resend", "--yes"]);

export const parseCreateCognitoUserArgs = (args: string[]): CreateCognitoUserOptions => {
  const dryRun = args.includes("--dry-run");
  const resend = args.includes("--resend");
  const yes = args.includes("--yes");
  const positional = args.filter((arg) => !arg.startsWith("--"));
  const unknownFlags = args.filter((arg) => arg.startsWith("--") && !SUPPORTED_FLAGS.has(arg));

  if (unknownFlags.length > 0) {
    throw new Error(
      `Unknown option: ${unknownFlags.join(", ")}. Supported options: --dry-run, --resend, --yes.`,
    );
  }

  const [email, extra] = positional;

  if (!email || extra) {
    throw new Error(
      "Usage: bun run auth:create-user user@example.com [--resend] [--dry-run] [--yes]",
    );
  }

  if (!EMAIL_PATTERN.test(email)) {
    throw new Error(`Invalid email address: ${email}`);
  }

  return { dryRun, email: email.toLowerCase(), resend, yes };
};

export const buildUserPoolArn = ({ region, userPoolId }: CognitoUserPoolConfig): string => {
  const accountId = process.env.AWS_ACCOUNT_ID ?? "<account-id>";
  return `arn:aws:cognito-idp:${region}:${accountId}:userpool/${userPoolId}`;
};

export const getCognitoUserPoolConfig = (
  candidate: AmplifyOutputs = outputs,
): CognitoUserPoolConfig => {
  const region = candidate.auth?.aws_region;
  const userPoolId = candidate.auth?.user_pool_id;

  if (!region || !userPoolId) {
    throw new Error(
      [
        "Amplify Auth outputs are missing Cognito user pool configuration.",
        "Run `nvm use && npx ampx sandbox` or deploy Amplify, then retry.",
        "Required fields: auth.aws_region, auth.user_pool_id.",
      ].join(" "),
    );
  }

  return { region, userPoolId };
};

export const buildAdminCreateUserInput = ({
  email,
  resend,
  userPoolId,
}: CreateCognitoUserOptions &
  Pick<CognitoUserPoolConfig, "userPoolId">): AdminCreateUserCommandInput => ({
  UserPoolId: userPoolId,
  Username: email,
  UserAttributes: [
    { Name: "email", Value: email },
    { Name: "email_verified", Value: "true" },
  ],
  DesiredDeliveryMediums: ["EMAIL"],
  ForceAliasCreation: false,
  ...(resend ? { MessageAction: "RESEND" } : {}),
});

export const describeCreateCognitoUserPlan = (
  options: CreateCognitoUserOptions,
  config: CognitoUserPoolConfig,
): string =>
  [
    `Email: ${options.email}`,
    `Action: ${options.resend ? "resend invitation" : "create invited user"}`,
    `Region: ${config.region}`,
    `User Pool: ${config.userPoolId}`,
    `User Pool ARN: ${buildUserPoolArn(config)}`,
  ].join("\n");

export const createCognitoUser = async (
  options: CreateCognitoUserOptions,
  config: CognitoUserPoolConfig = getCognitoUserPoolConfig(),
): Promise<void> => {
  const client = new CognitoIdentityProviderClient({ region: config.region });
  const input = buildAdminCreateUserInput({
    ...options,
    userPoolId: config.userPoolId,
  });

  await client.send(new AdminCreateUserCommand(input));
};

if (import.meta.main) {
  const options = parseCreateCognitoUserArgs(process.argv.slice(2));
  const config = getCognitoUserPoolConfig();

  console.info(describeCreateCognitoUserPlan(options, config));

  if (options.dryRun) {
    console.info("Dry run only. No Cognito user was created or modified.");
    process.exit(0);
  }

  if (!options.yes) {
    throw new Error(
      "Refusing to create or modify a Cognito user without --yes. Re-run with --yes after confirming the target User Pool.",
    );
  }

  await createCognitoUser(options, config);

  console.info(
    options.resend
      ? `Resent Cognito invitation to ${options.email}.`
      : `Created Cognito user ${options.email} and sent the invitation email.`,
  );
}
