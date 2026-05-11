import { describe, expect, it } from "vitest";

import {
  buildAdminCreateUserInput,
  describeCreateCognitoUserPlan,
  getCognitoUserPoolConfig,
  parseCreateCognitoUserArgs,
} from "./cognito-create-user";

describe("parseCreateCognitoUserArgs", () => {
  it("requires exactly one valid email", () => {
    expect(() => parseCreateCognitoUserArgs([])).toThrow(/Usage/);
    expect(() => parseCreateCognitoUserArgs(["not-an-email"])).toThrow(/Invalid email/);
    expect(() => parseCreateCognitoUserArgs(["a@example.com", "b@example.com"])).toThrow(/Usage/);
  });

  it("normalizes email and supports resend", () => {
    expect(parseCreateCognitoUserArgs(["User@Example.COM", "--resend"])).toEqual({
      dryRun: false,
      email: "user@example.com",
      resend: true,
      yes: false,
    });
  });

  it("supports dry-run and explicit confirmation", () => {
    expect(parseCreateCognitoUserArgs(["user@example.com", "--dry-run", "--yes"])).toEqual({
      dryRun: true,
      email: "user@example.com",
      resend: false,
      yes: true,
    });
  });

  it("rejects unknown flags", () => {
    expect(() => parseCreateCognitoUserArgs(["user@example.com", "--silent"])).toThrow(
      /Unknown option/,
    );
  });
});

describe("describeCreateCognitoUserPlan", () => {
  it("prints the target environment before mutating Cognito", () => {
    expect(
      describeCreateCognitoUserPlan(
        { dryRun: false, email: "user@example.com", resend: false, yes: true },
        { region: "us-east-1", userPoolId: "pool-id" },
      ),
    ).toContain("User Pool: pool-id");
  });
});

describe("getCognitoUserPoolConfig", () => {
  it("extracts region and user pool id from Amplify outputs", () => {
    expect(
      getCognitoUserPoolConfig({
        auth: {
          aws_region: "us-east-1",
          user_pool_id: "us-east-1_example",
        },
      }),
    ).toEqual({ region: "us-east-1", userPoolId: "us-east-1_example" });
  });

  it("throws a clear error when Auth outputs are missing", () => {
    expect(() => getCognitoUserPoolConfig({ auth: { aws_region: "us-east-1" } })).toThrow(
      /auth\.aws_region, auth\.user_pool_id/,
    );
  });
});

describe("buildAdminCreateUserInput", () => {
  it("builds a safe admin-created user invitation request", () => {
    expect(
      buildAdminCreateUserInput({
        dryRun: false,
        email: "user@example.com",
        resend: false,
        userPoolId: "pool-id",
        yes: true,
      }),
    ).toEqual({
      UserPoolId: "pool-id",
      Username: "user@example.com",
      UserAttributes: [
        { Name: "email", Value: "user@example.com" },
        { Name: "email_verified", Value: "true" },
      ],
      DesiredDeliveryMediums: ["EMAIL"],
      ForceAliasCreation: false,
    });
  });

  it("sets MessageAction only for resend", () => {
    expect(
      buildAdminCreateUserInput({
        dryRun: false,
        email: "user@example.com",
        resend: true,
        userPoolId: "pool-id",
        yes: true,
      }),
    ).toMatchObject({ MessageAction: "RESEND" });
  });
});
