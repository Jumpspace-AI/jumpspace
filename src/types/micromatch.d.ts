declare module "micromatch" {
  export type MicromatchOptions = Record<string, unknown>;

  const micromatch: {
    (input: string[], patterns: string | string[], options?: MicromatchOptions): string[];
    isMatch(input: string, patterns: string | string[], options?: MicromatchOptions): boolean;
  };

  export default micromatch;
}
