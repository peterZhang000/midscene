# Implementation Plan - Midscene Remote Bridge Support

**Session ID**: 202510281132-midscene-remote-bridge-support  
**Created**: 2025-10-28 11:32  
**Target Project**: `/Users/peter/Documents/automation-test/midscene`  
**Status**: Planning

---

## Source Analysis

### Source Type
- **Primary Source**: `features/202510271749-multi-user-multi-bridge-architecture/design.md` (Section 4.3.2)
- **Secondary Source**: `features/202510281037-multi-bridge-implementation/MIDSCENE_MODIFICATIONS.md`
- **Context**: BigTestAgent multi-user multi-browser architecture

### Core Features to Implement
1. **MidsceneManager**: Accept remote `bridgeUrl` via constructor options
2. **AgentOverChromeBridge**: Support connecting to remote bridges without starting local BridgeServer
3. **HTTP Server**: Extract `X-Bridge-URL` from request headers and pass to MidsceneManager

### Complexity
**Estimated Effort**: 4-6 hours (Medium complexity)
- TypeScript modifications in 3 core files
- Backward compatibility required
- No breaking changes to existing functionality

---

## Target Integration

### Integration Points
1. **MCP Session Creation**: HTTP server receives request → extracts headers → creates MidsceneManager with bridgeUrl
2. **Bridge Connection**: MidsceneManager → AgentOverChromeBridge (with bridgeUrl) → connects to remote WebSocket
3. **Backward Compatibility**: If no bridgeUrl provided → default local mode behavior

### Affected Files
| File | Path | Changes |
|------|------|---------|
| MidsceneManager | `packages/mcp/src/midscene.ts` | Add `MidsceneManagerOptions` interface, modify constructor |
| AgentOverChromeBridge | `packages/web-integration/src/bridge-mode/agent-cli-side.ts` | Add `bridgeUrl` to options, conditional BridgeServer creation |
| HTTP Server | `packages/mcp/src/transport/http-server.ts` or similar | Extract `X-Bridge-URL` header, pass to MidsceneManager |

### Pattern Matching
- **Existing Pattern**: Local BridgeServer on fixed port (3766)
- **New Pattern**: Remote or Local mode based on `bridgeUrl` presence
- **Logging**: Add console.log for debugging (existing Midscene pattern)
- **Error Handling**: Try-catch with descriptive error messages (existing pattern)

---

## Implementation Tasks

### Phase 1: Code Structure Analysis
- [ ] **Task 1.1**: Locate and analyze HTTP server entry point
  - **Step 1**: Search for HTTP request handler in `packages/mcp/src/`
  - **Step 2**: Identify where MidsceneManager is instantiated
  - **Step 3**: Document current session management approach
  - **Reference**: Check `packages/mcp/src/transport/` directory

- [ ] **Task 1.2**: Analyze AgentOverChromeBridge current implementation
  - **Step 1**: Read `packages/web-integration/src/bridge-mode/agent-cli-side.ts`
  - **Step 2**: Understand BridgeServer creation logic
  - **Step 3**: Identify BridgeClient connection process
  - **Step 4**: Document constructor parameters and their usage

- [ ] **Task 1.3**: Review MidsceneManager initialization flow
  - **Step 1**: Read `packages/mcp/src/midscene.ts`
  - **Step 2**: Trace how `initAgentByBridgeMode()` is called
  - **Step 3**: Identify current AgentOverChromeBridge instantiation
  - **Step 4**: Document any existing options or configuration

### Phase 2: MidsceneManager Modifications (TDD)
- [ ] **Task 2.1**: Add MidsceneManagerOptions interface
  - **RED**: Create a test file `packages/mcp/src/__tests__/midscene.test.ts` (if not exists)
  - **RED**: Write test: `should accept bridgeUrl in constructor options`
  - **GREEN**: Add `MidsceneManagerOptions` interface with `bridgeUrl?: string`
  - **GREEN**: Modify constructor: `constructor(server: McpServer, options?: MidsceneManagerOptions)`
  - **GREEN**: Store bridgeUrl: `this.bridgeUrl = options?.bridgeUrl`
  - **REFACTOR**: Add JSDoc comments for the interface

- [ ] **Task 2.2**: Pass bridgeUrl to AgentOverChromeBridge
  - **RED**: Write test: `initAgentByBridgeMode should pass bridgeUrl to AgentOverChromeBridge`
  - **GREEN**: Modify `initAgentByBridgeMode()`:
    ```typescript
    agent = new AgentOverChromeBridge({
      closeConflictServer: false,  // Don't close for remote
      bridgeUrl: this.bridgeUrl,   // Pass custom Bridge URL
    });
    ```
  - **GREEN**: Add console.log for debugging: `console.log('[MidsceneManager] Initializing with bridge:', this.bridgeUrl || 'local')`
  - **REFACTOR**: Update error messages to include bridge mode information

### Phase 3: AgentOverChromeBridge Modifications (TDD)
- [ ] **Task 3.1**: Update ChromeBridgeOptions interface
  - **RED**: Write test: `ChromeBridgeOptions should support bridgeUrl parameter`
  - **GREEN**: Add `bridgeUrl?: string` to `ChromeBridgeOptions` interface
  - **REFACTOR**: Add JSDoc comments explaining remote vs local mode

- [ ] **Task 3.2**: Implement remote/local mode detection in constructor
  - **RED**: Write test: `constructor should detect remote mode when bridgeUrl is provided`
  - **GREEN**: Add instance variable: `private isRemoteMode: boolean = false`
  - **GREEN**: Implement mode detection:
    ```typescript
    if (options.bridgeUrl) {
      this.bridgeUrl = options.bridgeUrl;
      this.isRemoteMode = true;
      console.log(`🌐 [AgentOverChromeBridge] Using REMOTE bridge: ${this.bridgeUrl}`);
    } else {
      const port = options.port || DefaultBridgeServerPort;
      this.bridgeUrl = `ws://localhost:${port}`;
      this.isRemoteMode = false;
      this.server = new BridgeServer(...);
      console.log(`🏠 [AgentOverChromeBridge] Using LOCAL bridge: ${this.bridgeUrl}`);
    }
    ```
  - **REFACTOR**: Extract mode-specific logging to helper method

- [ ] **Task 3.3**: Modify connectCurrentTab to support remote mode
  - **RED**: Write test: `connectCurrentTab should not start BridgeServer in remote mode`
  - **GREEN**: Update `connectCurrentTab()`:
    ```typescript
    if (!this.isRemoteMode && this.server) {
      await this.server.start();
      console.log('✅ [AgentOverChromeBridge] Local BridgeServer started');
    }
    ```
  - **GREEN**: Ensure BridgeClient connects to correct URL (local or remote)
  - **REFACTOR**: Add error handling for remote connection failures

- [ ] **Task 3.4**: Update close/destroy method for remote mode
  - **RED**: Write test: `close should only stop BridgeServer in local mode`
  - **GREEN**: Modify close logic:
    ```typescript
    if (!this.isRemoteMode && this.server) {
      await this.server.stop();
      console.log('✅ [AgentOverChromeBridge] Local BridgeServer stopped');
    }
    ```
  - **REFACTOR**: Ensure all cleanup is mode-aware

### Phase 4: HTTP Server Modifications
- [ ] **Task 4.1**: Locate HTTP request handler
  - **Step 1**: Search for Express/HTTP server setup in `packages/mcp/src/transport/`
  - **Step 2**: Identify POST `/mcp` endpoint or similar
  - **Step 3**: Document current session creation flow
  - **Checkpoint**: Confirm location before proceeding

- [ ] **Task 4.2**: Extract X-Bridge-URL header
  - **RED**: Write integration test: `should extract X-Bridge-URL from request headers`
  - **GREEN**: Add header extraction:
    ```typescript
    const bridgeUrl = req.headers['x-bridge-url'] as string | undefined;
    const userId = req.headers['x-user-id'] as string | undefined;
    const sessionId = req.headers['x-session-id'] as string | undefined;
    ```
  - **GREEN**: Add logging:
    ```typescript
    if (bridgeUrl) {
      console.log(`[MCP HTTP Server] Bridge URL: ${bridgeUrl}`);
      console.log(`[MCP HTTP Server] User ID: ${userId}`);
    }
    ```
  - **REFACTOR**: Extract header parsing to utility function

- [ ] **Task 4.3**: Pass bridgeUrl to MidsceneManager
  - **RED**: Write test: `should create MidsceneManager with bridgeUrl when header present`
  - **GREEN**: Modify MidsceneManager instantiation:
    ```typescript
    const midsceneManager = new MidsceneManager(mcpServer, {
      bridgeUrl: bridgeUrl
    });
    ```
  - **REFACTOR**: Document the session-level bridge configuration

### Phase 5: Integration Testing
- [ ] **Task 5.1**: Test local mode (backward compatibility)
  - **Test**: Start Midscene MCP server without X-Bridge-URL header
  - **Expected**: Local BridgeServer starts on port 3766
  - **Expected**: Existing tests pass without modification

- [ ] **Task 5.2**: Test remote mode
  - **Setup**: Mock or use actual remote Bridge on different port
  - **Test**: Send request with `X-Bridge-URL: ws://192.168.1.100:3766`
  - **Expected**: No local BridgeServer starts
  - **Expected**: Connection to remote bridge succeeds
  - **Expected**: MCP tools execute correctly via remote bridge

- [ ] **Task 5.3**: Test error handling
  - **Test**: Provide invalid bridgeUrl (e.g., `http://invalid`)
  - **Expected**: Clear error message, no crash
  - **Test**: Remote bridge unreachable
  - **Expected**: Timeout with descriptive error message

### Phase 6: Documentation & Cleanup
- [ ] **Task 6.1**: Update code comments
  - Add JSDoc comments for new interfaces
  - Document remote vs local mode behavior
  - Add examples in comments

- [ ] **Task 6.2**: Update README/documentation
  - Document new `X-Bridge-URL` header
  - Provide usage examples for remote mode
  - Add troubleshooting section

- [ ] **Task 6.3**: Verify backward compatibility
  - Run existing test suite
  - Ensure no breaking changes
  - Document any behavioral changes

---

## Quality Assurance Checklist

### Code Quality
- [ ] All new code follows TypeScript best practices
- [ ] No `any` types without justification
- [ ] Proper error handling in all async operations
- [ ] Meaningful variable and function names

### Testing
- [ ] Unit tests for MidsceneManager options
- [ ] Unit tests for AgentOverChromeBridge mode detection
- [ ] Integration tests for HTTP server header extraction
- [ ] Integration tests for end-to-end remote bridge connection
- [ ] Test coverage > 80% for modified code

### Documentation
- [ ] Inline code comments for complex logic
- [ ] JSDoc for all public interfaces and methods
- [ ] README updated with remote bridge usage
- [ ] Migration guide for existing users

### Compatibility
- [ ] Backward compatible (local mode still works)
- [ ] No breaking changes to public APIs
- [ ] Existing tests pass without modification

---

## Technical Specifications

### Interface Definitions

#### MidsceneManagerOptions
```typescript
export interface MidsceneManagerOptions {
  /**
   * Optional remote Bridge WebSocket URL.
   * If provided, connects to remote bridge instead of starting local BridgeServer.
   * Format: ws://host:port or wss://host:port
   * 
   * @example
   * // Remote mode
   * { bridgeUrl: 'ws://192.168.1.100:3766' }
   * 
   * // Local mode (default)
   * { } or undefined
   */
  bridgeUrl?: string;
}
```

#### Enhanced ChromeBridgeOptions
```typescript
export interface ChromeBridgeOptions {
  closeConflictServer?: boolean;
  
  /**
   * Custom Bridge WebSocket URL for remote connection.
   * If provided, AgentOverChromeBridge will connect to this URL
   * instead of starting a local BridgeServer.
   * 
   * @example
   * { bridgeUrl: 'ws://192.168.1.100:3766' }
   */
  bridgeUrl?: string;
  
  /**
   * Port for local BridgeServer (ignored if bridgeUrl is provided).
   * @deprecated Use bridgeUrl for remote connections
   */
  port?: number;
}
```

### HTTP Headers

| Header | Type | Description | Example |
|--------|------|-------------|---------|
| `X-Bridge-URL` | string | Remote Bridge WebSocket URL | `ws://192.168.1.100:3766` |
| `X-User-ID` | string | User identifier (for logging) | `user_001` |
| `X-Session-ID` | string | Session identifier | `session_abc123` |

### Logging Format

```
# Local Mode
🏠 [AgentOverChromeBridge] Using LOCAL bridge: ws://localhost:3766
✅ [AgentOverChromeBridge] Local BridgeServer started

# Remote Mode
[MCP HTTP Server] Bridge URL: ws://192.168.1.100:3766
[MCP HTTP Server] User ID: user_001
🌐 [AgentOverChromeBridge] Using REMOTE bridge: ws://192.168.1.100:3766
✅ [AgentOverChromeBridge] Connected to bridge: ws://192.168.1.100:3766
```

---

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Breaking existing functionality | Low | High | Comprehensive backward compatibility tests |
| Remote connection timeout | Medium | Medium | Add configurable timeout, clear error messages |
| Session management issues | Medium | High | Use session ID for proper isolation |
| WebSocket protocol mismatch | Low | Medium | Validate bridgeUrl format, version checking |

---

## Success Criteria

✅ **Functional Requirements:**
- MidsceneManager accepts `bridgeUrl` option
- AgentOverChromeBridge supports remote mode
- HTTP server extracts and forwards `X-Bridge-URL`
- Local mode works without any changes (backward compatible)
- Remote mode successfully connects to specified bridge

✅ **Non-Functional Requirements:**
- All existing tests pass
- New tests achieve > 80% coverage
- Code is well-documented
- No performance regression
- Clear error messages for common failure modes

✅ **Integration Requirements:**
- Works with BigTestAgent's enhanced MCP client
- Supports multi-user concurrent execution
- Proper session isolation

---

## Next Steps

1. **Get User Confirmation**: Present this plan for approval
2. **Phase 1 Execution**: Begin code analysis phase
3. **Iterative Implementation**: Follow TDD cycle for each task
4. **Regular Checkpoints**: Confirm progress after each phase

---

**Plan Status**: ✅ READY FOR REVIEW  
**Estimated Total Time**: 4-6 hours  
**Confidence Level**: High (clear requirements, well-documented source)

