export function createGuardrails(workdir: string) {
  return {
    isPathAllowed: (_targetPath: string) => true,
    isCommandAllowed: (_command: string) => true,
    rootDir: workdir,
  };
}
