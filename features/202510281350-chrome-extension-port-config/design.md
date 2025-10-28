# Technical Specification: Chrome Extension Bridge Port Configuration

**Version:** 1.0  
**Date:** 2025-10-28  
**Author:** AI Principal Architect  
**Related Design:** `features/202510271749-multi-user-multi-bridge-architecture/design.md`

## 1. Overview & Business Goals

### 1.1 Background

The BigTestAgent multi-user multi-browser architecture (as designed in `202510271749-multi-user-multi-bridge-architecture`) enables users to run multiple Chrome Profiles on the same computer, each connecting to the platform via a separate Bridge. However, the current Midscene Chrome Extension hardcodes the Bridge port to `3766`, causing port conflicts when multiple Profiles attempt to start their Bridges simultaneously.

### 1.2 Business Requirements

**Core Objective:**
Enable users to configure custom Bridge ports for each Chrome Profile, allowing multiple Profiles on the same computer to run concurrently without port conflicts.

**User Stories:**
- **US-1**: As a user, I want to configure the Bridge port in the Extension settings so that I can run multiple Chrome Profiles simultaneously.
- **US-2**: As a user, I want to see the currently configured port in the Bridge UI so that I know which port my Bridge is using.
- **US-3**: As a user, I want to receive clear error messages if my chosen port is already in use so that I can select an available port.
- **US-4**: As a user, I want the Extension to remember my port configuration so that I don't have to reconfigure it every time.

**Success Metrics:**
- Users can successfully run 2+ Chrome Profiles on the same computer without port conflicts
- Port configuration is persistent across browser restarts
- Clear error messages for port conflicts (user comprehension > 90%)
- Zero breaking changes for existing single-Bridge users

### 1.3 Key Features

1. **Configurable Bridge Port**
   - User-definable port in Extension settings
   - Validation: 1024-65535 range
   - Default: 3766 (backward compatible)
   
2. **Port Conflict Detection**
   - Detect port conflicts at Bridge startup
   - Display friendly error messages
   - Suggest alternative ports (3766-3800 range)

3. **Persistent Configuration**
   - Store port in localStorage (Profile-specific)
   - Load on Extension startup
   - Survive browser restarts

4. **Runtime Port Display**
   - Show active port in Bridge UI
   - Log port information in console
   - Display in status messages

---

## 2. Analysis of Existing System

### 2.1 Technology Stack

**Midscene Chrome Extension:**
- **Framework**: React 18 with TypeScript
- **UI Library**: Ant Design (antd)
- **Build Tool**: Vite
- **Storage**: localStorage (Chrome Extension API)
- **WebSocket**: Custom BridgeClient/BridgeServer implementation

**Key Dependencies:**
- `@midscene/web`: Core web integration library
- `@midscene/web/bridge-mode-browser`: Bridge-mode specific components
- `socket.io-client`: WebSocket communication

### 2.2 Relevant Architecture & Patterns

**Current Architecture:**

```
Chrome Extension (Browser Side)
├── Bridge UI (extension/bridge/index.tsx)
│   └── BridgeConnector (utils/bridgeConnector.ts)
│       └── ExtensionBridgePageBrowserSide (packages/web-integration/.../page-browser-side.ts)
│           └── BridgeClient (io-client.ts)
│               └── WebSocket Connection (ws://localhost:3766)
```

**Existing Patterns:**
- **React Hooks**: Functional components with `useState`, `useEffect`, `useRef`
- **Callback Pattern**: Status updates via callback functions
- **Singleton Pattern**: `BridgeConnector` instance managed via `useRef`
- **Local Storage**: Configuration persistence using `localStorage`

**Key Integration Points:**

1. **`DefaultBridgeServerPort` Constant** (`packages/web-integration/src/bridge-mode/common.ts`):
   ```typescript
   export const DefaultBridgeServerPort = 3766;
   ```
   - Used in: `ExtensionBridgePageBrowserSide`, `agent-cli-side.ts`, `io-server.ts`

2. **`ExtensionBridgePageBrowserSide` Constructor** (`packages/web-integration/src/bridge-mode/page-browser-side.ts:26`):
   ```typescript
   constructor(
     public onDisconnect: () => void = () => {},
     public onLogMessage: (message: string, type: 'log' | 'status') => void = () => {},
     forceSameTabNavigation = true,
   )
   ```
   - Currently does NOT accept a port parameter

3. **Bridge Connection** (`page-browser-side.ts:38`):
   ```typescript
   this.bridgeClient = new BridgeClient(
     `ws://localhost:${DefaultBridgeServerPort}`,  // Hardcoded!
     async (method, args: any[]) => { /* ... */ }
   );
   ```

4. **`BridgeConnector.connect()` Method** (`apps/chrome-extension/src/utils/bridgeConnector.ts:51`):
   ```typescript
   activeBridgePage = new ExtensionBridgePageBrowserSide(() => { /* ... */ }, this.onMessage);
   ```
   - No port parameter passed

### 2.3 Current Limitations

1. **Hardcoded Port**: `DefaultBridgeServerPort = 3766` is used everywhere
2. **No Configuration Management**: No module to store/load port settings
3. **No Validation**: No port range or conflict checks
4. **No UI for Configuration**: Users cannot change the port
5. **Implicit Dependency**: Multiple files depend on the global constant

---

## 3. Proposed Architecture

### 3.1 High-Level Design

#### 3.1.1 Architectural Approach

**Chosen Pattern: Configuration Module + Constructor Injection**

This design introduces a new `BridgeConfigManager` module to manage port configuration, and modifies the existing component chain to inject the configured port through constructors.

**Why This Approach:**
- ✅ **Minimal Invasiveness**: Only modifies constructor signatures (additive change)
- ✅ **Single Responsibility**: Configuration management is isolated in one module
- ✅ **Backward Compatible**: Default port behavior unchanged for existing users
- ✅ **Testable**: Configuration logic can be unit tested independently
- ✅ **Extensible**: Future configs (auth tokens, timeouts) can be added to same module

**Rejected Alternatives:**
1. **Global Variable Mutation**: Modifying `DefaultBridgeServerPort` at runtime
   - ❌ Risk: Other code may cache the value
   - ❌ Not thread-safe (if Extension runs multiple contexts)
   - ❌ Violates immutability principles

2. **Environment Variables**: Using `process.env.BRIDGE_PORT`
   - ❌ Chrome Extensions don't support runtime environment variables
   - ❌ Not user-configurable without rebuilding Extension

3. **Chrome Storage API**: Using `chrome.storage.local`
   - ❌ Asynchronous API complicates synchronous reads
   - ❌ Requires permissions configuration
   - ⚠️ localStorage is sufficient for this use case

#### 3.1.2 System Context Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     Chrome Extension (User Profile)              │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Bridge UI Component (index.tsx)                          │  │
│  │  ┌────────────────────────────────────────────────────┐  │  │
│  │  │  Port Configuration UI                              │  │  │
│  │  │  - Input field (1024-65535)                         │  │  │
│  │  │  - Port status display                              │  │  │
│  │  │  - Save button                                       │  │  │
│  │  └───────────────────┬────────────────────────────────┘  │  │
│  │                      │ getBridgePort()                    │  │
│  │                      │ setBridgePort(port)                │  │
│  │  ┌───────────────────▼────────────────────────────────┐  │  │
│  │  │  BridgeConfigManager (NEW)                         │  │  │
│  │  │  - loadPort(): number                               │  │  │
│  │  │  - savePort(port: number): void                     │  │  │
│  │  │  - validatePort(port: number): boolean              │  │  │
│  │  │  - Storage: localStorage                            │  │  │
│  │  └───────────────────┬────────────────────────────────┘  │  │
│  │                      │                                     │  │
│  │  ┌───────────────────▼────────────────────────────────┐  │  │
│  │  │  BridgeConnector                                    │  │  │
│  │  │  - connect(port: number): Promise<void>   (MODIFIED)│  │  │
│  │  └───────────────────┬────────────────────────────────┘  │  │
│  │                      │                                     │  │
│  │  ┌───────────────────▼────────────────────────────────┐  │  │
│  │  │  ExtensionBridgePageBrowserSide          (MODIFIED) │  │  │
│  │  │  constructor(..., bridgePort?: number)              │  │  │
│  │  └───────────────────┬────────────────────────────────┘  │  │
│  │                      │                                     │  │
│  │  ┌───────────────────▼────────────────────────────────┐  │  │
│  │  │  BridgeClient                                        │  │  │
│  │  │  new BridgeClient(`ws://localhost:${port}`)         │  │  │
│  │  └──────────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
        │
        │ WebSocket (ws://localhost:{configured_port})
        ▼
┌─────────────────────────────────┐
│  Midscene MCP Server             │
│  (Remote, configured in          │
│   BigTestAgent)                  │
└─────────────────────────────────┘
```

#### 3.1.3 Component Interaction Flow

**Port Configuration Flow:**
```
1. User opens Bridge UI
   ↓
2. UI loads current port from BridgeConfigManager.loadPort()
   ├─ If exists → Display saved port
   └─ If not exists → Display default (3766)
   ↓
3. User changes port value
   ↓
4. User clicks Save (or input loses focus)
   ↓
5. BridgeConfigManager.validatePort(newPort)
   ├─ Valid → BridgeConfigManager.savePort(newPort) → Success message
   └─ Invalid → Show error message
   ↓
6. If Bridge is running → Show "Restart required" message
```

**Bridge Connection Flow (with custom port):**
```
1. User clicks "Start Bridge" button
   ↓
2. Bridge UI calls BridgeConnector.connect()
   ↓
3. BridgeConnector loads port from BridgeConfigManager.loadPort()
   ↓
4. BridgeConnector creates ExtensionBridgePageBrowserSide(onDisconnect, onMessage, true, port)
   ↓
5. ExtensionBridgePageBrowserSide.setupBridgeClient()
   ├─ Uses this.bridgePort (from constructor)
   └─ Creates: new BridgeClient(`ws://localhost:${this.bridgePort}`)
   ↓
6. BridgeClient.connect()
   ├─ Success → Bridge status: "connected"
   └─ Failure (EADDRINUSE) → Show error + suggest alternative ports
```

### 3.2 Impact Analysis

#### 3.2.1 Invasiveness Assessment

**New Modules** (No disruption to existing code):
- `apps/chrome-extension/src/utils/bridgeConfig.ts` (~100 lines)
  - Responsibilities: Port storage, validation, default management
  - Dependencies: None (uses browser-native localStorage)

**Modified Modules** (Low-Medium impact):

1. **`packages/web-integration/src/bridge-mode/page-browser-side.ts`** (Low impact):
   - **Change**: Add optional `bridgePort?: number` parameter to constructor
   - **Lines affected**: ~15 lines (constructor signature + 2 usages)
   - **Risk**: Low (additive change, default value maintains backward compatibility)
   
   *Before:*
   ```typescript
   constructor(
     public onDisconnect: () => void = () => {},
     public onLogMessage: (...) => void = () => {},
     forceSameTabNavigation = true,
   )
   ```
   
   *After:*
   ```typescript
   constructor(
     public onDisconnect: () => void = () => {},
     public onLogMessage: (...) => void = () => {},
     forceSameTabNavigation = true,
     public bridgePort: number = DefaultBridgeServerPort  // NEW parameter
   )
   ```

2. **`apps/chrome-extension/src/utils/bridgeConnector.ts`** (Low impact):
   - **Change**: Load port from config and pass to `ExtensionBridgePageBrowserSide`
   - **Lines affected**: ~10 lines (import + 5 lines in `connect()`)
   - **Risk**: Low (isolated change in one method)

3. **`apps/chrome-extension/src/extension/bridge/index.tsx`** (Medium impact):
   - **Change**: Add port configuration UI + state management
   - **Lines affected**: ~100 lines (new UI section + state hooks)
   - **Risk**: Medium (significant UI addition, but isolated in new component section)

**No Changes Required:**
- ✅ `packages/web-integration/src/bridge-mode/io-client.ts` (BridgeClient accepts URL string)
- ✅ `packages/web-integration/src/bridge-mode/common.ts` (Keep constant for default)
- ✅ `packages/web-integration/src/bridge-mode/agent-cli-side.ts` (CLI-side code, not affected)

#### 3.2.2 Compatibility Analysis

**Backward Compatibility:**
- ✅ **Existing Users**: No configuration → Default port 3766 used automatically
- ✅ **API Compatibility**: All constructor changes use optional parameters with defaults
- ✅ **Storage**: localStorage keys are namespaced (`midscene-bridge-port`), no collisions
- ✅ **No Data Migration**: Fresh feature, no existing data to migrate

**Forward Compatibility:**
- ✅ **Future Configs**: `BridgeConfigManager` can be extended to manage additional settings:
  - Auth tokens
  - Connection timeouts
  - Auto-reconnect preferences
- ✅ **Multi-Port Profiles**: Architecture supports saving multiple port configs (future feature)

#### 3.2.3 Risks & Mitigation Strategies

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| **Port Already in Use** | High | Medium | - Catch `EADDRINUSE` error in `BridgeClient.connect()`<br>- Display friendly error: "Port {port} is already in use"<br>- Suggest alternatives: "Try ports 3767, 3768, 3769" |
| **Invalid Port Input** | Medium | Low | - Validate on input change: range 1024-65535<br>- Disable save button if invalid<br>- Show inline error message |
| **localStorage Quota Exceeded** | Very Low | Low | - Port config is tiny (~10 bytes)<br>- If quota exceeded, fallback to default 3766<br>- Log warning to console |
| **TypeScript Type Mismatch** | Low | Low | - Use strict typing: `number` not `string`<br>- `parseInt()` when reading from localStorage<br>- Validate type before saving |
| **User Forgets Port After Restart** | Medium | Low | - Display current port prominently in UI<br>- Add "Copy port to clipboard" button<br>- Include port in status messages |
| **Conflict Between Profiles** | High | High | - Document best practice: Use 3766, 3767, 3768, ...<br>- Provide automated setup script (future enhancement)<br>- Clear error messages with actionable suggestions |

---

## 4. Detailed Design

### 4.1 API Specification

#### 4.1.1 BridgeConfigManager Module

**Module Path**: `apps/chrome-extension/src/utils/bridgeConfig.ts`

**Public API:**

```typescript
/**
 * Bridge configuration manager
 * Handles port storage, validation, and default management
 */
export class BridgeConfigManager {
  // Storage key for localStorage
  private static readonly STORAGE_KEY = 'midscene-bridge-port';
  
  // Default port (backward compatible)
  private static readonly DEFAULT_PORT = 3766;
  
  // Valid port range (non-privileged ports)
  private static readonly MIN_PORT = 1024;
  private static readonly MAX_PORT = 65535;

  /**
   * Load the configured port from localStorage
   * @returns The configured port, or DEFAULT_PORT if not set
   */
  public static loadPort(): number;

  /**
   * Save a port to localStorage
   * @param port - Port number to save
   * @throws Error if port is invalid
   */
  public static savePort(port: number): void;

  /**
   * Validate a port number
   * @param port - Port to validate
   * @returns True if valid, false otherwise
   */
  public static validatePort(port: number): boolean;

  /**
   * Get the default port
   * @returns Default port (3766)
   */
  public static getDefaultPort(): number;

  /**
   * Suggest alternative ports if the given port is in use
   * @param currentPort - The port that failed
   * @returns Array of suggested ports
   */
  public static suggestAlternativePorts(currentPort: number): number[];

  /**
   * Reset to default port
   */
  public static resetToDefault(): void;
}
```

**Usage Example:**

```typescript
import { BridgeConfigManager } from '@/utils/bridgeConfig';

// Load port
const port = BridgeConfigManager.loadPort();  // Returns 3766 if not configured

// Save new port
try {
  BridgeConfigManager.savePort(3767);
  console.log('Port saved successfully');
} catch (error) {
  console.error('Invalid port:', error.message);
}

// Validate before saving
if (BridgeConfigManager.validatePort(userInput)) {
  BridgeConfigManager.savePort(userInput);
}

// Get suggestions for conflict
const suggestions = BridgeConfigManager.suggestAlternativePorts(3766);
// Returns: [3767, 3768, 3769, 3770, 3771]
```

---

### 4.2 Data Model Specification

#### 4.2.1 localStorage Schema

**Key:** `midscene-bridge-port`  
**Type:** `string` (localStorage only stores strings)  
**Format:** Plain integer as string (e.g., `"3767"`)  

**Storage Structure:**
```javascript
{
  "midscene-bridge-port": "3767"  // User-configured port
}
```

**Important Notes:**
- ✅ **Profile Isolation**: Each Chrome Profile has its own localStorage, so configs are automatically isolated
- ✅ **Persistence**: localStorage survives browser restarts
- ✅ **Size**: ~10 bytes per config (well within quota)
- ⚠️ **Type Conversion**: Must use `parseInt()` when reading (localStorage stores strings)

**Default Behavior:**
- If key does not exist → Use default port 3766
- If value is invalid → Fallback to 3766 and log warning

#### 4.2.2 Runtime State (React Component)

**Bridge UI Component State:**
```typescript
interface BridgeUIState {
  // Core bridge state
  bridgeStatus: BridgeStatus;  // 'listening' | 'connected' | 'disconnected' | 'closed'
  
  // Port configuration state (NEW)
  currentPort: number;          // Currently configured port
  portInputValue: string;       // Input field value (string for controlled input)
  isPortValid: boolean;         // Validation result
  portError: string | null;     // Validation error message
  portSaved: boolean;           // Show "Saved" indicator
  needsRestart: boolean;        // True if port changed while Bridge is running
  
  // UI state
  messageList: BridgeMessageItem[];
  autoConnect: boolean;
  // ... existing state
}
```

---

### 4.3 Component Breakdown

#### 4.3.1 BridgeConfigManager Implementation

**File:** `apps/chrome-extension/src/utils/bridgeConfig.ts`

```typescript
import { DefaultBridgeServerPort } from '@midscene/web/bridge-mode';

/**
 * Bridge configuration manager
 * Handles port storage, validation, and default management
 */
export class BridgeConfigManager {
  private static readonly STORAGE_KEY = 'midscene-bridge-port';
  private static readonly DEFAULT_PORT = DefaultBridgeServerPort; // 3766
  private static readonly MIN_PORT = 1024;
  private static readonly MAX_PORT = 65535;

  /**
   * Load the configured port from localStorage
   * Falls back to DEFAULT_PORT if not set or invalid
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
          `Invalid stored port: ${stored}, falling back to default ${this.DEFAULT_PORT}`
        );
        return this.DEFAULT_PORT;
      }

      return port;
    } catch (error) {
      console.error('Failed to load bridge port:', error);
      return this.DEFAULT_PORT;
    }
  }

  /**
   * Save a port to localStorage
   * @throws Error if port is invalid
   */
  public static savePort(port: number): void {
    if (!this.validatePort(port)) {
      throw new Error(
        `Invalid port: ${port}. Must be between ${this.MIN_PORT} and ${this.MAX_PORT}`
      );
    }

    try {
      localStorage.setItem(this.STORAGE_KEY, port.toString());
    } catch (error) {
      console.error('Failed to save bridge port:', error);
      throw new Error('Failed to save configuration. localStorage may be full.');
    }
  }

  /**
   * Validate a port number
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
   */
  public static getDefaultPort(): number {
    return this.DEFAULT_PORT;
  }

  /**
   * Suggest 5 alternative ports starting from current + 1
   * Wraps around to MIN_PORT if exceeding MAX_PORT
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
    } catch (error) {
      console.error('Failed to reset bridge port:', error);
    }
  }

  /**
   * Get port range information
   */
  public static getPortRange(): { min: number; max: number } {
    return {
      min: this.MIN_PORT,
      max: this.MAX_PORT,
    };
  }
}
```

---

#### 4.3.2 ExtensionBridgePageBrowserSide Modification

**File:** `packages/web-integration/src/bridge-mode/page-browser-side.ts`

**Changes:**

1. **Constructor Signature** (Line 26):
```typescript
// BEFORE
constructor(
  public onDisconnect: () => void = () => {},
  public onLogMessage: (
    message: string,
    type: 'log' | 'status',
  ) => void = () => {},
  forceSameTabNavigation = true,
)

// AFTER
constructor(
  public onDisconnect: () => void = () => {},
  public onLogMessage: (
    message: string,
    type: 'log' | 'status',
  ) => void = () => {},
  forceSameTabNavigation = true,
  public bridgePort: number = DefaultBridgeServerPort,  // NEW: Accept custom port
)
```

2. **setupBridgeClient Method** (Line 38):
```typescript
// BEFORE
private async setupBridgeClient() {
  this.bridgeClient = new BridgeClient(
    `ws://localhost:${DefaultBridgeServerPort}`,  // Hardcoded
    async (method, args: any[]) => { /* ... */ }
  );
  // ...
}

// AFTER
private async setupBridgeClient() {
  this.bridgeClient = new BridgeClient(
    `ws://localhost:${this.bridgePort}`,  // Use configured port
    async (method, args: any[]) => { /* ... */ }
  );
  // ...
}
```

---

#### 4.3.3 BridgeConnector Modification

**File:** `apps/chrome-extension/src/utils/bridgeConnector.ts`

**Changes:**

1. **Import** (Top of file):
```typescript
import { ExtensionBridgePageBrowserSide } from '@midscene/web/bridge-mode-browser';
import { BridgeConfigManager } from './bridgeConfig';  // NEW
```

2. **connect() Method** (Line 50):
```typescript
// BEFORE
let activeBridgePage: ExtensionBridgePageBrowserSide | null = null;
try {
  activeBridgePage = new ExtensionBridgePageBrowserSide(() => {
    if (this.status !== 'closed') {
      this.setStatus('disconnected');
      this.activeBridgePage = null;
    }
  }, this.onMessage);

  await activeBridgePage.connect();
  // ...
}

// AFTER
let activeBridgePage: ExtensionBridgePageBrowserSide | null = null;
try {
  // Load configured port
  const bridgePort = BridgeConfigManager.loadPort();  // NEW
  
  // Log the port being used
  console.log(`🔧 Starting Bridge on port ${bridgePort}`);  // NEW
  
  activeBridgePage = new ExtensionBridgePageBrowserSide(
    () => {
      if (this.status !== 'closed') {
        this.setStatus('disconnected');
        this.activeBridgePage = null;
      }
    },
    this.onMessage,
    true,             // forceSameTabNavigation
    bridgePort        // NEW: Pass custom port
  );

  await activeBridgePage.connect();
  this.activeBridgePage = activeBridgePage;
  this.setStatus('connected');
  
  // Log success with port info
  this.onMessage(
    `Bridge started successfully on port ${bridgePort}`,  // NEW
    'status'
  );
} catch (e) {
  this.activeBridgePage?.destroy();
  this.activeBridgePage = null;
  
  // Enhanced error handling for port conflicts
  const errorMessage = e instanceof Error ? e.message : String(e);
  
  // Check for EADDRINUSE (port conflict)
  if (errorMessage.includes('EADDRINUSE') || errorMessage.includes('address already in use')) {
    const currentPort = BridgeConfigManager.loadPort();
    const suggestions = BridgeConfigManager.suggestAlternativePorts(currentPort);
    
    this.onMessage(
      `❌ Port ${currentPort} is already in use. Try: ${suggestions.slice(0, 3).join(', ')}`,
      'log'
    );
  } else {
    console.warn('failed to setup connection', e);
  }
  
  await new Promise((resolve) =>
    setTimeout(resolve, this.connectRetryInterval),
  );
}
```

---

#### 4.3.4 Bridge UI Enhancement

**File:** `apps/chrome-extension/src/extension/bridge/index.tsx`

**New State Variables** (Add after existing state declarations, ~line 40):
```typescript
// Port configuration state
const [currentPort, setCurrentPort] = useState<number>(() => 
  BridgeConfigManager.loadPort()
);
const [portInputValue, setPortInputValue] = useState<string>(
  currentPort.toString()
);
const [portError, setPortError] = useState<string | null>(null);
const [portSaved, setPortSaved] = useState(false);
const [needsRestart, setNeedsRestart] = useState(false);
```

**Port Validation Handler** (Add as new function):
```typescript
const handlePortChange = (value: string) => {
  setPortInputValue(value);
  setPortSaved(false);
  
  // Clear error after user starts typing
  if (portError) {
    setPortError(null);
  }
  
  // Real-time validation
  const port = parseInt(value, 10);
  if (isNaN(port) || !BridgeConfigManager.validatePort(port)) {
    const range = BridgeConfigManager.getPortRange();
    setPortError(`Port must be between ${range.min} and ${range.max}`);
  }
};

const handlePortSave = () => {
  const port = parseInt(portInputValue, 10);
  
  if (!BridgeConfigManager.validatePort(port)) {
    setPortError('Invalid port number');
    return;
  }
  
  try {
    BridgeConfigManager.savePort(port);
    setCurrentPort(port);
    setPortSaved(true);
    setPortError(null);
    
    // Show restart message if Bridge is currently running
    if (bridgeStatus === 'connected' || bridgeStatus === 'listening') {
      setNeedsRestart(true);
    }
    
    // Auto-hide success message after 3 seconds
    setTimeout(() => setPortSaved(false), 3000);
  } catch (error) {
    setPortError(error instanceof Error ? error.message : 'Failed to save port');
  }
};

const handlePortReset = () => {
  BridgeConfigManager.resetToDefault();
  const defaultPort = BridgeConfigManager.getDefaultPort();
  setCurrentPort(defaultPort);
  setPortInputValue(defaultPort.toString());
  setPortError(null);
  setPortSaved(false);
  
  if (bridgeStatus === 'connected' || bridgeStatus === 'listening') {
    setNeedsRestart(true);
  }
};
```

**UI Component** (Add before the existing Bridge controls section, ~line 200):
```tsx
{/* Port Configuration Section */}
<div style={{ marginBottom: 16, padding: '12px', backgroundColor: '#f5f5f5', borderRadius: 4 }}>
  <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
    <span style={{ fontWeight: 500 }}>
      <ApiOutlined style={{ marginRight: 4 }} />
      Bridge Port Configuration
    </span>
    {bridgeStatus === 'connected' && (
      <span style={{ fontSize: 12, color: '#52c41a' }}>
        ● Active: {currentPort}
      </span>
    )}
  </div>
  
  <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
    <div style={{ flex: 1 }}>
      <Input
        type="number"
        value={portInputValue}
        onChange={(e) => handlePortChange(e.target.value)}
        onBlur={handlePortSave}
        onPressEnter={handlePortSave}
        placeholder="3766"
        disabled={bridgeStatus === 'connected' || bridgeStatus === 'listening'}
        status={portError ? 'error' : undefined}
        addonBefore="Port"
        style={{ width: '100%' }}
      />
      {portError && (
        <div style={{ fontSize: 12, color: '#ff4d4f', marginTop: 4 }}>
          {portError}
        </div>
      )}
      {portSaved && !portError && (
        <div style={{ fontSize: 12, color: '#52c41a', marginTop: 4 }}>
          ✓ Port saved successfully
        </div>
      )}
      {needsRestart && (
        <div style={{ fontSize: 12, color: '#fa8c16', marginTop: 4 }}>
          ⚠️ Restart Bridge to apply new port
        </div>
      )}
    </div>
    
    <Button
      size="small"
      onClick={handlePortReset}
      disabled={bridgeStatus === 'connected' || bridgeStatus === 'listening'}
      title="Reset to default (3766)"
    >
      Reset
    </Button>
  </div>
  
  <div style={{ fontSize: 12, color: '#8c8c8c', marginTop: 8 }}>
    💡 Tip: Use different ports (3766, 3767, 3768...) for multiple Chrome Profiles on the same computer.
  </div>
</div>
```

**Clear Restart Flag on Disconnect** (Add in existing `useEffect` for `bridgeStatus`):
```typescript
useEffect(() => {
  // ... existing code ...
  
  // Clear restart flag when Bridge is stopped
  if (bridgeStatus === 'closed' || bridgeStatus === 'disconnected') {
    setNeedsRestart(false);
  }
}, [bridgeStatus]);
```

---

## 5. Non-Functional Requirements (NFRs)

### 5.1 Security

**Threat Model:**
- **No sensitive data**: Port numbers are not sensitive information
- **localStorage scope**: Already sandboxed per Chrome Profile (no cross-Profile access)
- **No network exposure**: Configuration is local-only

**Security Measures:**
- ✅ **Input Validation**: Strict port range validation (1024-65535)
- ✅ **Type Safety**: TypeScript enforces `number` type
- ✅ **Sanitization**: `parseInt()` with radix 10 prevents injection
- ✅ **Error Handling**: Graceful fallback to default on any storage errors

**No Additional Security Requirements**: This feature does not introduce new security risks.

---

### 5.2 Performance & Scalability

**Performance Targets:**
- Port load from localStorage: < 1ms (synchronous read)
- Port save to localStorage: < 5ms (synchronous write)
- UI validation response: < 10ms (client-side validation)
- No impact on Bridge connection latency

**Resource Usage:**
- **Storage**: ~10 bytes per Profile (negligible)
- **Memory**: ~200 bytes for config manager (static class)
- **CPU**: Validation is O(1), no loops or heavy computation

**Scalability:**
- ✅ **Per-Profile Isolation**: No global state, scales linearly with number of Profiles
- ✅ **No Backend Dependency**: Purely client-side, no server load
- ✅ **Concurrent Profiles**: Architecture supports unlimited Profiles per computer (limited only by available ports 1024-65535)

---

### 5.3 Observability (Logging & Monitoring)

**Logging Strategy:**

*Log Levels:*
- **INFO**: Port loaded successfully, port saved successfully
- **WARN**: Invalid stored port (fallback to default)
- **ERROR**: localStorage write failure, validation failure

*Key Log Events:*
```typescript
// Port loaded
console.log(`🔧 Bridge port loaded: ${port}`);

// Port saved
console.log(`💾 Bridge port saved: ${port}`);

// Port conflict detected
console.error(`❌ Port ${port} is already in use. Suggestions: ${suggestions.join(', ')}`);

// Validation failed
console.warn(`⚠️ Invalid port value: ${value}, falling back to default ${DEFAULT_PORT}`);

// localStorage error
console.error(`💥 Failed to save port to localStorage:`, error);
```

**User-Facing Feedback:**
- ✅ Real-time validation errors in UI
- ✅ Success confirmation messages
- ✅ Port conflict suggestions
- ✅ Current port displayed in status bar

**Metrics (Optional - for future Telemetry):**
- Port distribution (which ports are most commonly used)
- Validation failure rate
- Port conflict frequency
- Time between port changes

---

### 5.4 Testing Strategy

**Unit Tests** (Target: 80% coverage):

1. **BridgeConfigManager Tests** (`bridgeConfig.test.ts`):
```typescript
describe('BridgeConfigManager', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('loadPort', () => {
    it('should return default port when not configured', () => {
      expect(BridgeConfigManager.loadPort()).toBe(3766);
    });

    it('should return saved port when valid', () => {
      localStorage.setItem('midscene-bridge-port', '3767');
      expect(BridgeConfigManager.loadPort()).toBe(3767);
    });

    it('should fallback to default when stored value is invalid', () => {
      localStorage.setItem('midscene-bridge-port', 'invalid');
      expect(BridgeConfigManager.loadPort()).toBe(3766);
    });

    it('should fallback to default when port is out of range', () => {
      localStorage.setItem('midscene-bridge-port', '500');
      expect(BridgeConfigManager.loadPort()).toBe(3766);
    });
  });

  describe('savePort', () => {
    it('should save valid port', () => {
      BridgeConfigManager.savePort(3768);
      expect(localStorage.getItem('midscene-bridge-port')).toBe('3768');
    });

    it('should throw error for invalid port', () => {
      expect(() => BridgeConfigManager.savePort(500)).toThrow();
      expect(() => BridgeConfigManager.savePort(70000)).toThrow();
      expect(() => BridgeConfigManager.savePort(NaN)).toThrow();
    });
  });

  describe('validatePort', () => {
    it('should validate port in range 1024-65535', () => {
      expect(BridgeConfigManager.validatePort(1024)).toBe(true);
      expect(BridgeConfigManager.validatePort(3766)).toBe(true);
      expect(BridgeConfigManager.validatePort(65535)).toBe(true);
    });

    it('should reject ports out of range', () => {
      expect(BridgeConfigManager.validatePort(1023)).toBe(false);
      expect(BridgeConfigManager.validatePort(65536)).toBe(false);
    });

    it('should reject non-integer values', () => {
      expect(BridgeConfigManager.validatePort(3766.5)).toBe(false);
      expect(BridgeConfigManager.validatePort(NaN)).toBe(false);
    });
  });

  describe('suggestAlternativePorts', () => {
    it('should suggest 5 alternative ports', () => {
      const suggestions = BridgeConfigManager.suggestAlternativePorts(3766);
      expect(suggestions).toEqual([3767, 3768, 3769, 3770, 3771]);
    });

    it('should wrap around at MAX_PORT', () => {
      const suggestions = BridgeConfigManager.suggestAlternativePorts(65534);
      expect(suggestions).toEqual([65535, 1024, 1025, 1026, 1027]);
    });
  });
});
```

2. **Component Integration Tests** (`bridge.test.tsx`):
```typescript
describe('Bridge Port Configuration UI', () => {
  it('should display current port on mount', () => {
    BridgeConfigManager.savePort(3767);
    const { getByDisplayValue } = render(<Bridge />);
    expect(getByDisplayValue('3767')).toBeInTheDocument();
  });

  it('should show error for invalid port', () => {
    const { getByPlaceholderText, getByText } = render(<Bridge />);
    const input = getByPlaceholderText('3766');
    
    fireEvent.change(input, { target: { value: '500' } });
    
    expect(getByText(/must be between 1024 and 65535/i)).toBeInTheDocument();
  });

  it('should save port on blur', () => {
    const { getByPlaceholderText } = render(<Bridge />);
    const input = getByPlaceholderText('3766');
    
    fireEvent.change(input, { target: { value: '3768' } });
    fireEvent.blur(input);
    
    expect(BridgeConfigManager.loadPort()).toBe(3768);
  });

  it('should disable input when Bridge is connected', () => {
    // Mock connected state
    const { getByPlaceholderText } = render(<Bridge />);
    // Simulate Bridge connection
    // ...
    const input = getByPlaceholderText('3766');
    expect(input).toBeDisabled();
  });
});
```

**Integration Tests:**

1. **End-to-End Port Configuration Flow**:
   - User changes port to 3767
   - Clicks "Start Bridge"
   - Verify Bridge connects on port 3767
   - Verify status message shows correct port

2. **Port Conflict Scenario**:
   - Start Bridge on port 3766 (Profile 1)
   - Attempt to start Bridge on port 3766 (Profile 2, simulated)
   - Verify error message displayed
   - Verify suggestions shown

**Manual Testing Checklist:**

- [ ] Default port (3766) works without configuration
- [ ] Configured port persists after browser restart
- [ ] Invalid port shows error and prevents save
- [ ] Port conflict shows friendly error with suggestions
- [ ] Port input disabled when Bridge is running
- [ ] "Restart required" message shown when port changed while connected
- [ ] Reset button restores default port
- [ ] Multiple Chrome Profiles can run on different ports simultaneously

---

## 6. Implementation Plan

### Phase 1: Configuration Module (Day 1, 2-3 hours)
**Tasks:**
- [ ] Create `bridgeConfig.ts` module
- [ ] Implement `loadPort()`, `savePort()`, `validatePort()` methods
- [ ] Implement `suggestAlternativePorts()` logic
- [ ] Write unit tests for all methods

**Deliverables:**
- `apps/chrome-extension/src/utils/bridgeConfig.ts` (~100 lines)
- `apps/chrome-extension/src/utils/bridgeConfig.test.ts` (~150 lines)

**Acceptance Criteria:**
- ✅ All unit tests passing (coverage > 80%)
- ✅ No lint errors
- ✅ Type safety verified (no `any` types)

---

### Phase 2: Core Integration (Day 1-2, 3-4 hours)
**Tasks:**
- [ ] Modify `ExtensionBridgePageBrowserSide` constructor
- [ ] Update `setupBridgeClient` to use `this.bridgePort`
- [ ] Modify `BridgeConnector.connect()` to load and pass port
- [ ] Add enhanced error handling for port conflicts

**Deliverables:**
- Modified `packages/web-integration/src/bridge-mode/page-browser-side.ts`
- Modified `apps/chrome-extension/src/utils/bridgeConnector.ts`

**Acceptance Criteria:**
- ✅ Extension compiles without errors
- ✅ Bridge connects using configured port
- ✅ Console logs show correct port
- ✅ Error messages displayed for port conflicts

---

### Phase 3: UI Enhancement (Day 2, 4-5 hours)
**Tasks:**
- [ ] Add port configuration UI to Bridge component
- [ ] Implement state management (useState hooks)
- [ ] Add real-time validation
- [ ] Implement save/reset handlers
- [ ] Add "Restart required" indicator
- [ ] Style components (Ant Design)

**Deliverables:**
- Modified `apps/chrome-extension/src/extension/bridge/index.tsx` (~100 lines added)
- Updated styles in `index.less` (if needed)

**Acceptance Criteria:**
- ✅ UI matches design mockup
- ✅ Real-time validation works
- ✅ Save button functional
- ✅ Restart indicator shows when needed
- ✅ Responsive layout

---

### Phase 4: Testing & Documentation (Day 3, 3-4 hours)
**Tasks:**
- [ ] Write integration tests
- [ ] Perform manual testing across scenarios
- [ ] Test with multiple Chrome Profiles
- [ ] Update user documentation
- [ ] Create troubleshooting guide

**Deliverables:**
- Integration tests for Bridge component
- User guide: "Setting Up Multiple Chrome Profiles"
- Troubleshooting doc: "Port Conflict Resolution"

**Acceptance Criteria:**
- ✅ All automated tests passing
- ✅ Manual test checklist completed
- ✅ Documentation reviewed and approved

---

### Phase 5: Build & Deployment (Day 3, 1-2 hours)
**Tasks:**
- [ ] Build Extension with Vite
- [ ] Test built Extension in Chrome
- [ ] Verify localStorage persistence
- [ ] Create release notes
- [ ] Tag version in Git

**Deliverables:**
- Built Extension package (`.zip`)
- Release notes (changelog)
- Deployment guide

**Acceptance Criteria:**
- ✅ Extension loads in Chrome without errors
- ✅ All features functional in production build
- ✅ No console errors

---

**Total Estimated Timeline:** 3 days (16-18 hours)  
**Team Size:** 1 developer (full-stack with TypeScript/React expertise)

**Dependencies:**
- None (isolated feature)

**Risks:**
- **Risk**: TypeScript compilation issues with modified `ExtensionBridgePageBrowserSide`
  - **Mitigation**: Use optional parameter with default value (maintains signature compatibility)

---

## 7. Open Questions & Future Considerations

### Open Questions

1. **Port Availability Check:**
   - **Question**: Should we implement a pre-check to detect if a port is available before attempting connection?
   - **Impact**: Would improve UX (proactive error prevention) but adds complexity
   - **Recommendation**: Defer to v2.0; rely on connection error handling for MVP

2. **Port Auto-Assignment:**
   - **Question**: Should the Extension automatically find an available port if the configured port is in use?
   - **Impact**: Better UX but more complex logic (port scanning)
   - **Recommendation**: Defer to v2.0; display suggestions for MVP

3. **Cross-Profile Port Detection:**
   - **Question**: Can we detect which ports are in use by other Chrome Profiles on the same computer?
   - **Impact**: Would prevent conflicts before they occur
   - **Technical Limitation**: Chrome Extensions cannot access other Profiles' state
   - **Recommendation**: Not feasible with current Chrome Extension APIs

4. **Cloud Sync:**
   - **Question**: Should port configuration sync across devices (Chrome Sync API)?
   - **Impact**: Could cause issues if users use different computers (port conflicts)
   - **Recommendation**: No sync; localStorage per-Profile is correct behavior

---

### Future Enhancements

**v2.0 Features:**
1. **Smart Port Assignment**
   - Automatically detect used ports (within same Profile)
   - Suggest first available port in range
   - One-click "Find Available Port" button

2. **Port History**
   - Remember last 5 used ports
   - Quick switch between saved ports
   - Favorite port marking

3. **Advanced Diagnostics**
   - Test port connectivity before starting Bridge
   - Display network diagnostics (firewall status, localhost resolution)
   - Latency measurements

4. **Port Reservation System**
   - Reserve ports for specific test suites
   - Named port profiles (e.g., "dev", "staging", "production")
   - Integration with BigTestAgent (bidirectional sync)

**v3.0 Features:**
1. **Multi-Bridge Manager**
   - Manage multiple Bridges from one UI
   - Start/stop Bridges on different ports simultaneously
   - Visual port map (which ports are in use)

2. **Automation Scripts**
   - CLI tool to configure ports (for CI/CD)
   - Batch setup for teams (pre-configured ports)
   - Integration with Chrome Profile auto-creation

3. **Monitoring Dashboard**
   - Real-time view of all active Bridges
   - Network traffic visualization
   - Performance metrics (latency, throughput)

---

## 8. Appendix

### A. Glossary

- **Bridge**: WebSocket server in Chrome Extension that controls browser (receives commands from MCP Server)
- **Bridge Port**: TCP port on localhost where Bridge listens for WebSocket connections
- **Chrome Profile**: Separate Chrome user profile with independent settings and localStorage
- **MCP Server**: Midscene MCP HTTP Server (remote, routes commands to user's Bridge)
- **localStorage**: Browser storage API (per-Profile, persistent)

---

### B. References

- [Main Architecture Design](../202510271749-multi-user-multi-bridge-architecture/design.md)
- [Midscene GitHub Repository](https://github.com/web-infra-dev/midscene)
- [Chrome Extension localStorage API](https://developer.chrome.com/docs/extensions/reference/storage/)
- [Socket.IO Port Configuration](https://socket.io/docs/v4/server-options/#port)

---

### C. Code Review Checklist

**Before Merging:**
- [ ] All TypeScript types are explicit (no `any`)
- [ ] Error handling covers all failure cases
- [ ] localStorage quota exceeded scenario handled
- [ ] Default port fallback tested
- [ ] UI accessibility (ARIA labels, keyboard navigation)
- [ ] Console logs use appropriate levels (info/warn/error)
- [ ] No hardcoded strings (use constants)
- [ ] Comments explain "why" not "what"
- [ ] No security vulnerabilities (input sanitization)
- [ ] Performance profiled (no unnecessary re-renders)

---

## Document End

*Last Updated: 2025-10-28*  
*Review Status: Approved for Implementation*  
*Next Review: After Phase 2 (Core Integration)*

