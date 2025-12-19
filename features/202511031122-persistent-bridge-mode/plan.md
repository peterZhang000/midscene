# Implementation Plan - Persistent Bridge Mode
**Created**: 2025-11-03 11:22  
**Feature**: Add Persistent mode support for BigTestAgent integration  
**Target Project**: /Users/peter/Documents/automation-test/midscene

---

## Source Analysis

### Problem Statement
BigTestAgent needs to reuse Bridge Server and Chrome Extension connections across multiple test executions (LOCAL mode). Currently, Midscene's `destroy()` always disconnects the Chrome Extension, causing subsequent tests to fail.

### Root Cause
- Midscene was designed with "ephemeral session" model (each test is independent)
- `destroy()` semantics: "clean up everything including connections"
- No concept of "cleanup state but keep connection alive"

### Solution Approach
Introduce a **Persistent Mode** that separates state cleanup from connection teardown:
- Add `persistent?: boolean` option
- Implement `cleanup()` method (close temp tabs, reset state, keep connection)
- Modify `destroy()` to call `cleanup()` + disconnect in persistent mode
- Remove temporary workaround (destroy interception in io-server.ts)

---

## Target Integration

### Affected Files
1. `packages/web-integration/src/bridge-mode/agent-cli-side.ts`
   - Add `persistent` option to `GetBridgePageOptions`
   - Modify `destroy` proxy logic
2. `packages/web-integration/src/bridge-mode/page-browser-side.ts`
   - Implement `cleanup()` method
   - Refactor `destroy()` to use `cleanup()`
3. `packages/web-integration/src/bridge-mode/common.ts`
   - Add `Cleanup` event to `BridgeEvent` enum (if needed)
4. `packages/web-integration/src/bridge-mode/io-server.ts`
   - Remove temporary destroy interception code (lines 186-196)

### Integration Points
- `getBridgePageInCliSide()`: Entry point for creating bridge page
- `ExtensionBridgePageBrowserSide.destroy()`: Chrome Extension lifecycle
- `BridgeEvent` enum: Communication protocol between MCP and Chrome

---

## Implementation Tasks

### ✅ Phase 1: Add Persistent Option (agent-cli-side.ts)
- [x] **Task 1.1**: Add `persistent` field to `GetBridgePageOptions` interface
  - **Location**: Line 26-31 in `agent-cli-side.ts`
  - **Change**: Add `persistent?: boolean` to interface
  - **Test**: TypeScript compilation passes
  - **Rationale**: This is the foundational type change that enables all subsequent logic

### 🔄 Phase 2: Implement cleanup() Method (page-browser-side.ts)
- [ ] **Task 2.1**: Add `cleanup()` method to `ExtensionBridgePageBrowserSide` class
  - **Test**: Write unit test for `cleanup()` method
    - Given: A page with `destroyOptions.closeTab=true` and 2 newly created tabs
    - When: `cleanup()` is called
    - Then: Both tabs should be removed, `newlyCreatedTabIds` array should be empty, `bridgeClient` should still be connected
  - **Implementation Steps**:
    1. Add `async cleanup()` method before `destroy()` (around line 169)
    2. Move tab closing logic from `destroy()` to `cleanup()`:
       ```typescript
       async cleanup() {
         // Close newly created tabs
         if (this.destroyOptions?.closeTab && this.newlyCreatedTabIds.length > 0) {
           this.onLogMessage('Closing all newly created tabs by bridge...', 'log');
           for (const tabId of this.newlyCreatedTabIds) {
             await chrome.tabs.remove(tabId);
           }
           this.newlyCreatedTabIds = [];
         }
         
         // Call parent cleanup
         await super.destroy();
         
         // Reset destroy options
         this.destroyOptions = undefined;
         
         // NOTE: bridgeClient stays connected
       }
       ```
    3. Add console log for debugging: `console.log('🔄 Cleanup completed (connection maintained)')`

- [ ] **Task 2.2**: Refactor `destroy()` to use `cleanup()`
  - **Test**: Write unit test for `destroy()` method
    - Given: A page with active `bridgeClient` connection
    - When: `destroy()` is called
    - Then: `cleanup()` should be called first, then `bridgeClient.disconnect()` should be called
  - **Implementation Steps**:
    1. Modify `destroy()` method (line 169-185):
       ```typescript
       async destroy() {
         // First cleanup state
         await this.cleanup();
         
         // Then disconnect bridge
         if (this.bridgeClient) {
           this.bridgeClient.disconnect();
           this.bridgeClient = null;
           this.onDisconnect();
         }
       }
       ```

### 🔄 Phase 3: Modify destroy Logic in agent-cli-side.ts
- [ ] **Task 3.1**: Modify `destroy` proxy to support persistent mode
  - **Test**: Write integration test
    - **Scenario 1 (Persistent mode)**:
      - Given: `getBridgePageInCliSide({ bridgeUrl: '...', persistent: true })`
      - When: `page.destroy()` is called
      - Then: Should call `bridgeCaller('cleanup')` instead of `bridgeCaller('destroy')`
      - And: `server` (BridgeRemoteClient) should NOT be closed
    - **Scenario 2 (Traditional mode)**:
      - Given: `getBridgePageInCliSide({ bridgeUrl: '...', persistent: false })` or no persistent option
      - When: `page.destroy()` is called
      - Then: Should call `bridgeCaller('destroy')`
      - And: `server` should be closed (if exists)
  - **Implementation Steps**:
    1. Modify the `destroy` proxy logic (lines 161-174):
       ```typescript
       if (prop === 'destroy') {
         return async (...args: any[]) => {
           try {
             // 🆕 In persistent mode, call cleanup instead of destroy
             if (isRemoteMode && options?.persistent) {
               console.log('🔄 Persistent mode: calling cleanup() instead of destroy()');
               const caller = bridgeCaller('cleanup');
               await caller(...args);
             } else {
               // Original behavior: full destroy
               console.log('🗑️ Traditional mode: calling destroy()');
               const caller = bridgeCaller('destroy');
               await caller(...args);
             }
           } catch (e) {
             console.error('error calling destroy/cleanup', e);
           }
           
           // Only close server in MCP_MANAGED mode or non-persistent remote mode
           if (server && !(isRemoteMode && options?.persistent)) {
             console.log('📡 Closing server connection');
             if (server instanceof BridgeRemoteClient) {
               await server.close();
             } else if (typeof server.close === 'function') {
               server.close();
             }
           } else if (isRemoteMode && options?.persistent) {
             console.log('✅ Persistent mode: keeping server connection alive');
           }
         };
       }
       ```
    2. Add TypeScript type guard if needed

### 🔄 Phase 4: Add Cleanup Event (common.ts) - CONDITIONAL
- [ ] **Task 4.1**: Determine if Cleanup event is needed
  - **Analysis**: Check if `bridgeCaller('cleanup')` requires explicit event definition
  - **Decision**:
    - If `BridgeEvent.Call` handles arbitrary method names → NO ACTION NEEDED
    - If methods must be predefined in enum → ADD to enum
  - **Test**: Try calling `cleanup` without adding to enum first
  - **If needed**, add to `BridgeEvent` enum (after line 16):
    ```typescript
    export enum BridgeEvent {
      Call = 'bridge-call',
      CallResponse = 'bridge-call-response',
      UpdateAgentStatus = 'bridge-update-agent-status',
      Message = 'bridge-message',
      Connected = 'bridge-connected',
      Refused = 'bridge-refused',
      ConnectNewTabWithUrl = 'connectNewTabWithUrl',
      ConnectCurrentTab = 'connectCurrentTab',
      GetBrowserTabList = 'getBrowserTabList',
      SetDestroyOptions = 'setDestroyOptions',
      SetActiveTabId = 'setActiveTabId',
      Cleanup = 'cleanup',  // 🆕 Added
    }
    ```

### 🔄 Phase 5: Remove Temporary Workaround (io-server.ts)
- [ ] **Task 5.1**: Remove destroy interception code
  - **Test**: Write integration test
    - Given: Persistent mode enabled
    - When: MCP Server calls `cleanup` (not `destroy`)
    - Then: `cleanup` should be forwarded to Chrome Extension
    - And: Chrome Extension should execute cleanup without disconnecting
  - **Implementation Steps**:
    1. Read the current code around lines 183-212
    2. Identify the exact location of the interception (lines 186-196):
       ```typescript
       // 🔧 FIX: Intercept 'destroy' calls...
       if (params.method === 'destroy') {
         logMsg(`Intercepting 'destroy' call...`);
         socket.emit(BridgeEvent.CallResponse, {...});
         return;
       }
       ```
    3. **DELETE** the entire `if (params.method === 'destroy')` block
    4. Ensure the normal forwarding logic remains:
       ```typescript
       // Forward the call to Chrome Extension
       if (this.socket && this.socket.connected) {
         this.socket.emit(BridgeEvent.Call, params);
         logMsg(`Forwarded call to Chrome Extension: ${params.method}`);
       }
       ```
    5. Add a console log to verify:
       ```typescript
       logMsg(`Forwarding call from MCP Server: ${params.method} (id: ${params.id})`);
       ```

### 🔄 Phase 6: Integration Testing
- [ ] **Task 6.1**: Compile Midscene
  - **Command**: `cd /Users/peter/Documents/automation-test/midscene && npm run build`
  - **Verify**: No TypeScript errors, build succeeds

- [ ] **Task 6.2**: Test persistent mode in BigTestAgent
  - **Setup**: 
    1. Modify BigTestAgent's `MidsceneWebExecutor` to pass `persistent: true`
    2. Ensure Bridge Server is running on port 3766
    3. Ensure Chrome Extension is connected
  - **Test Case 1**: Single test execution
    - Run 1 test → should succeed
    - Verify Chrome Extension stays connected
  - **Test Case 2**: Sequential test execution
    - Run test 1 → verify success
    - Run test 2 → verify success (connection reused)
    - Run test 3 → verify success
    - Check Bridge Server logs: Chrome should still be connected
  - **Test Case 3**: Tab cleanup verification
    - Run test that creates new tabs
    - After test completes, verify tabs are closed
    - Verify Chrome Extension connection is maintained

- [ ] **Task 6.3**: Test traditional mode (backward compatibility)
  - **Setup**: Create test with `persistent: false` or undefined
  - **Test**: Run test → should work as before (disconnect after each test)
  - **Verify**: Original behavior unchanged

### 🔄 Phase 7: Documentation
- [ ] **Task 7.1**: Add inline code comments
  - Mark all persistent-mode-related code with `// 🔄 Persistent Mode:` prefix
  - Explain the design decision in key locations

- [ ] **Task 7.2**: Update ARCHITECTURE_ANALYSIS.md in BigTestAgent
  - Document that Midscene now supports persistent mode
  - Mark temporary fixes as REMOVED
  - Update the solution status

- [ ] **Task 7.3**: Create completion summary in feature folder
  - List all modified files
  - Describe the behavioral changes
  - Provide usage examples for both modes

---

## Success Criteria

### Functional Requirements
- ✅ Persistent mode (`persistent: true`) keeps connections alive across tests
- ✅ Traditional mode (`persistent: false` or undefined) maintains original behavior
- ✅ `cleanup()` closes temp tabs and resets state without disconnecting
- ✅ `destroy()` performs full cleanup including disconnection

### Quality Requirements
- ✅ All TypeScript compilation passes with no errors
- ✅ No breaking changes to existing API
- ✅ Code follows existing Midscene conventions and style
- ✅ Adequate logging for debugging

### Integration Requirements
- ✅ BigTestAgent can run 10+ sequential tests without Bridge restart
- ✅ Chrome Extension maintains stable connection in persistent mode
- ✅ No memory leaks (tabs are properly closed)
- ✅ Bridge Server remains stable under continuous testing

---

## Progress Tracking

- [x] Phase 1: Add Persistent Option ✅
- [ ] Phase 2: Implement cleanup() Method
- [ ] Phase 3: Modify destroy Logic
- [ ] Phase 4: Add Cleanup Event (conditional)
- [ ] Phase 5: Remove Temporary Workaround
- [ ] Phase 6: Integration Testing
- [ ] Phase 7: Documentation

**Current Status**: Phase 1 Complete → Starting Phase 2

---

## Notes

### Design Decisions
1. **Why separate cleanup() and destroy()?**
   - Allows explicit control over connection lifecycle
   - Makes the code intent clearer (cleanup state vs teardown connection)
   - Follows single responsibility principle

2. **Why make persistent optional (default false)?**
   - Ensures backward compatibility
   - Existing users don't need to change anything
   - Only users who explicitly need persistent connections opt-in

3. **Why remove the io-server.ts interception?**
   - It was a hack/temporary fix
   - With proper cleanup() method, we don't need to intercept
   - Makes the codebase more maintainable

### Related Files
- `/Users/peter/PycharmProjects/BigTestAgent/ARCHITECTURE_ANALYSIS.md` (root cause analysis)
- `/Users/peter/Documents/automation-test/midscene/packages/web-integration/src/bridge-mode/` (implementation directory)

---

**Last Updated**: 2025-11-03 11:22

