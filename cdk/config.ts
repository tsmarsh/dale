export interface EnvConfig {
  retainData: boolean;
}

export const environments: Record<string, EnvConfig> = {
  dev: { retainData: false },
  staging: { retainData: true },
  prod: { retainData: true },
};
