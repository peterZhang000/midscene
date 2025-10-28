import { DefaultBridgeServerPort } from '@midscene/web/bridge-mode';

/**
 * Bridge configuration manager
 * Handles port storage, validation, and default management
 */
export class BridgeConfigManager {
  // Storage key for localStorage
  private static readonly STORAGE_KEY = 'midscene-bridge-port';

  // Default port (backward compatible)
  private static readonly DEFAULT_PORT = DefaultBridgeServerPort; // 3766

  // Valid port range (non-privileged ports)
  private static readonly MIN_PORT = 1024;
  private static readonly MAX_PORT = 65535;

  /**
   * Load the configured port from localStorage
   * Falls back to DEFAULT_PORT if not set or invalid
   * @returns The configured port, or DEFAULT_PORT if not set
   */
  public static loadPort(): number {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);

      if (stored === null) {
        return this.DEFAULT_PORT;
      }

      const port = parseInt(stored, 10);

      if (!this.validatePort(port)) {
        console.warn(
          `[BridgeConfig] Invalid stored port: ${stored}, falling back to default ${this.DEFAULT_PORT}`,
        );
        return this.DEFAULT_PORT;
      }

      console.log(`[BridgeConfig] Loaded port: ${port}`);
      return port;
    } catch (error) {
      console.error('[BridgeConfig] Failed to load bridge port:', error);
      return this.DEFAULT_PORT;
    }
  }

  /**
   * Save a port to localStorage
   * @param port - Port number to save
   * @throws Error if port is invalid
   */
  public static savePort(port: number): void {
    if (!this.validatePort(port)) {
      throw new Error(
        `Invalid port: ${port}. Must be between ${this.MIN_PORT} and ${this.MAX_PORT}`,
      );
    }

    try {
      localStorage.setItem(this.STORAGE_KEY, port.toString());
      console.log(`[BridgeConfig] Port saved: ${port}`);
    } catch (error) {
      console.error('[BridgeConfig] Failed to save bridge port:', error);
      throw new Error(
        'Failed to save configuration. localStorage may be full.',
      );
    }
  }

  /**
   * Validate a port number
   * @param port - Port to validate
   * @returns True if valid, false otherwise
   */
  public static validatePort(port: number): boolean {
    return (
      typeof port === 'number' &&
      !isNaN(port) &&
      Number.isInteger(port) &&
      port >= this.MIN_PORT &&
      port <= this.MAX_PORT
    );
  }

  /**
   * Get the default port
   * @returns Default port (3766)
   */
  public static getDefaultPort(): number {
    return this.DEFAULT_PORT;
  }

  /**
   * Suggest 5 alternative ports starting from current + 1
   * Wraps around to MIN_PORT if exceeding MAX_PORT
   * @param currentPort - The port that failed
   * @returns Array of suggested ports
   */
  public static suggestAlternativePorts(currentPort: number): number[] {
    const suggestions: number[] = [];
    let nextPort = currentPort + 1;

    for (let i = 0; i < 5; i++) {
      if (nextPort > this.MAX_PORT) {
        nextPort = this.MIN_PORT;
      }
      suggestions.push(nextPort);
      nextPort++;
    }

    return suggestions;
  }

  /**
   * Reset to default port
   */
  public static resetToDefault(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
      console.log(
        `[BridgeConfig] Reset to default port: ${this.DEFAULT_PORT}`,
      );
    } catch (error) {
      console.error('[BridgeConfig] Failed to reset bridge port:', error);
    }
  }

  /**
   * Get port range information
   * @returns Object with min and max port numbers
   */
  public static getPortRange(): { min: number; max: number } {
    return {
      min: this.MIN_PORT,
      max: this.MAX_PORT,
    };
  }
}

