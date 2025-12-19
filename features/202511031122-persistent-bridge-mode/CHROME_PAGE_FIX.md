# Chrome:// Page Detection & Auto-Fix

## Issue
When BigTestAgent starts a test, if the Chrome Extension is connected to a chrome:// page (like chrome://newtab/), the test fails with:
```
Error: Cannot attach debugger to chrome:// pages
```

## Solution
Modified initAgentByBridgeMode to automatically detect chrome:// pages and open about:blank instead.

## Code Changes
File: packages/mcp/src/midscene.ts (Lines 153-172)

Now checks current tab URL before connecting. If it's a chrome:// page, automatically opens about:blank.

## Testing
- Compiled successfully
- Chrome Extension rebuilt
- Ready for testing
