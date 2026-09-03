export type DemoSeedEnvironment = {
  NODE_ENV?: string;
  SORGENCE_ENVIRONMENT?: string;
  ALLOW_DEMO_SEED?: string;
};

export function assertDemoSeedSafety(environment: DemoSeedEnvironment) {
  const target = environment.SORGENCE_ENVIRONMENT?.trim().toLowerCase();
  if (environment.NODE_ENV === "production" || !["development", "dev", "demo"].includes(target ?? "") || environment.ALLOW_DEMO_SEED !== "true") {
    throw new Error("Seed demo bloccato. Impostare SORGENCE_ENVIRONMENT=development e ALLOW_DEMO_SEED=true solo sul database DEV/demo.");
  }
}
