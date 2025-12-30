/**
 * Memory configuration utilities
 */

export function isMemoryEnabled(memoryConfig: any): boolean {
  if (!memoryConfig) {
    return false;
  }

  // Check if memory is explicitly disabled
  if (memoryConfig.disabled === true) {
    return false;
  }

  // Check if memory config exists and has valid settings
  return !!(
    memoryConfig &&
    typeof memoryConfig === 'object' &&
    (memoryConfig.type || memoryConfig.enabled === true)
  );
}

export default {
  isMemoryEnabled,
};
