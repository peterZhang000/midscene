# 🧪 Chrome Extension Bridge Port Configuration - Testing Guide

**Feature ID:** 202510281350-chrome-extension-port-config  
**Version:** 1.0  
**Date:** 2025-10-28

---

## 📋 Table of Contents

1. [Quick Start](#quick-start)
2. [Installation](#installation)
3. [Test Scenarios](#test-scenarios)
4. [Expected Results](#expected-results)
5. [Troubleshooting](#troubleshooting)

---

## 🚀 Quick Start

### Prerequisites
- Chrome browser installed
- Midscene Extension built (located in: `/Users/peter/Documents/automation-test/midscene/apps/chrome-extension/dist/`)
- **Optional**: Multiple Chrome Profiles set up for multi-Profile testing

### Extension Location
```bash
# Built Extension directory
/Users/peter/Documents/automation-test/midscene/apps/chrome-extension/dist/

# Packaged Extension
/Users/peter/Documents/automation-test/midscene/apps/chrome-extension/midscene-extension-v0.30.2.zip
```

---

## 📥 Installation

### Method 1: Load Unpacked (Recommended for Testing)

1. Open Chrome and navigate to:
   ```
   chrome://extensions/
   ```

2. Enable **Developer mode** (toggle in top-right corner)

3. Click **"Load unpacked"**

4. Select directory:
   ```
   /Users/peter/Documents/automation-test/midscene/apps/chrome-extension/dist/
   ```

5. Verify Extension loaded successfully:
   - ✅ Midscene icon appears in extensions toolbar
   - ✅ No errors displayed

### Method 2: Install from ZIP (For Distribution)

1. Unzip the packaged extension:
   ```bash
   unzip /Users/peter/Documents/automation-test/midscene/apps/chrome-extension/midscene-extension-v0.30.2.zip
   ```

2. Follow Method 1 steps with the unzipped directory

---

## 🧪 Test Scenarios

### Test 1: Default Behavior (Backward Compatibility)

**Objective**: Verify default port 3766 is used when no configuration exists

**Steps**:
1. Install Extension (fresh install, no previous config)
2. Click Extension icon
3. Navigate to **Bridge Mode** tab
4. Observe the Port Configuration section

**Expected Results**:
- ✅ Port input field shows `3766`
- ✅ No error messages
- ✅ "Active: 3766" indicator NOT shown (Bridge not running yet)

**Actual Results**:
- [ ] Port field value: ____________
- [ ] Any errors?: ____________
- [ ] Pass/Fail: ____________

---

### Test 2: Port Configuration & Persistence

**Objective**: Verify port can be configured and persists across browser restarts

**Steps**:
1. In Bridge Mode tab, change port to `3767`
2. Click outside the input field (triggers save on blur)
3. Observe success message
4. Restart Chrome browser
5. Reopen Extension → Bridge Mode tab
6. Check port value

**Expected Results**:
- ✅ After step 2: "✓ Port saved successfully" message appears (green)
- ✅ After step 5: Port input still shows `3767`
- ✅ Configuration persisted across restart

**Actual Results**:
- [ ] Success message shown?: ____________
- [ ] Port after restart: ____________
- [ ] Pass/Fail: ____________

---

### Test 3: Port Validation - Invalid Range

**Objective**: Verify port validation prevents invalid port numbers

**Test Cases**:

#### 3a. Port Too Low
**Steps**:
1. Enter port `500` (below 1024)
2. Click outside input field

**Expected Results**:
- ✅ Error message: "Port must be between 1024 and 65535" (red text)
- ✅ Port NOT saved

**Actual Results**:
- [ ] Error shown?: ____________
- [ ] Pass/Fail: ____________

#### 3b. Port Too High
**Steps**:
1. Enter port `70000` (above 65535)
2. Click outside input field

**Expected Results**:
- ✅ Error message: "Port must be between 1024 and 65535" (red text)
- ✅ Port NOT saved

**Actual Results**:
- [ ] Error shown?: ____________
- [ ] Pass/Fail: ____________

#### 3c. Non-Integer Port
**Steps**:
1. Enter port `3766.5` (decimal)
2. Click outside input field

**Expected Results**:
- ✅ Error message displayed
- ✅ Port NOT saved

**Actual Results**:
- [ ] Error shown?: ____________
- [ ] Pass/Fail: ____________

---

### Test 4: Bridge Connection with Custom Port

**Objective**: Verify Bridge connects on configured port

**Steps**:
1. Configure port to `3767`
2. Wait for "Port saved successfully" message
3. Click **"Allow Connection"** button in Bridge Mode
4. Observe console logs (Chrome DevTools → Console)
5. Check Bridge status

**Expected Results**:
- ✅ Console log: `🔧 Starting Bridge on port 3767`
- ✅ Console log: `Bridge started successfully on port 3767`
- ✅ Bridge status changes to "Connected" (green indicator)
- ✅ "● Active: 3767" indicator shown in Port Configuration section

**Actual Results**:
- [ ] Console logs correct?: ____________
- [ ] Bridge status: ____________
- [ ] Active port indicator: ____________
- [ ] Pass/Fail: ____________

---

### Test 5: Input Disabled When Bridge Running

**Objective**: Verify port cannot be changed while Bridge is active

**Steps**:
1. Start Bridge (status: "Connected")
2. Try to click on port input field
3. Try to click Reset button

**Expected Results**:
- ✅ Port input field is **disabled** (grayed out, not clickable)
- ✅ Reset button is **disabled** (grayed out)
- ✅ If Bridge was running when port changed → "⚠️ Restart Bridge to apply new port" warning shown

**Actual Results**:
- [ ] Input disabled?: ____________
- [ ] Reset disabled?: ____________
- [ ] Pass/Fail: ____________

---

### Test 6: Port Conflict Detection (CRITICAL)

**Objective**: Verify port conflict error message and suggestions

**Steps**:
1. **Profile 1**:
   - Configure port `3766`
   - Start Bridge (status: "Connected")
   - Note: Bridge is now listening on port 3766

2. **Profile 2** (open in new Chrome window/profile):
   - Configure port `3766` (same as Profile 1)
   - Try to start Bridge

**Expected Results (Profile 2)**:
- ✅ Bridge connection fails
- ✅ Error message in Bridge log: `❌ Port 3766 is already in use. Try: 3767, 3768, 3769`
- ✅ Bridge status remains "Listening" or "Disconnected" (not "Connected")

**Actual Results**:
- [ ] Error message shown?: ____________
- [ ] Suggested ports displayed?: ____________
- [ ] Pass/Fail: ____________

**Note**: This test requires two Chrome Profiles or two separate Chrome instances running simultaneously.

---

### Test 7: Reset to Default Functionality

**Objective**: Verify Reset button restores default port

**Steps**:
1. Configure port to `3768`
2. Verify "Port saved successfully"
3. Click **"Reset"** button
4. Observe port value and messages

**Expected Results**:
- ✅ Port input value changes to `3766`
- ✅ Configuration saved (can verify by restarting browser)
- ✅ If Bridge is running: "⚠️ Restart Bridge to apply new port" warning shown

**Actual Results**:
- [ ] Port reset to 3766?: ____________
- [ ] Restart warning shown?: ____________
- [ ] Pass/Fail: ____________

---

### Test 8: Multiple Profiles Concurrent Execution (CRITICAL)

**Objective**: Verify multiple Chrome Profiles can run Bridges simultaneously on different ports

**Prerequisites**:
- 3 Chrome Profiles set up:
  - Profile 1 (Default)
  - Profile 2 (named "Test1")
  - Profile 3 (named "Test2")

**Steps**:

1. **Profile 1**:
   - Load Extension
   - Configure port `3766`
   - Start Bridge → Status: "Connected"

2. **Profile 2** (open in separate window):
   - Load Extension
   - Configure port `3767`
   - Start Bridge → Status: "Connected"

3. **Profile 3** (open in separate window):
   - Load Extension
   - Configure port `3768`
   - Start Bridge → Status: "Connected"

4. Verify all 3 Bridges are running simultaneously:
   - Check console logs for each Profile
   - Check Bridge status indicators

**Expected Results**:
- ✅ Profile 1: Bridge connected on port 3766
- ✅ Profile 2: Bridge connected on port 3767
- ✅ Profile 3: Bridge connected on port 3768
- ✅ All 3 Bridges running concurrently without conflicts
- ✅ Each Profile shows "● Active: {port}" indicator

**Actual Results**:
- [ ] Profile 1 status: ____________
- [ ] Profile 2 status: ____________
- [ ] Profile 3 status: ____________
- [ ] All connected simultaneously?: ____________
- [ ] Pass/Fail: ____________

---

### Test 9: Restart Required Warning

**Objective**: Verify restart warning when port changed while Bridge is running

**Steps**:
1. Configure port `3766` and start Bridge (status: "Connected")
2. Try to change port to `3767` (input should be disabled)
3. Stop Bridge
4. Change port to `3767`
5. Observe warning message

**Expected Results**:
- ✅ Step 2: Port input is disabled, cannot change
- ✅ Step 4: Port change successful
- ✅ Step 4: "Port saved successfully" message shown
- ✅ Step 5: If Bridge was still running at step 4 → "⚠️ Restart Bridge to apply new port" warning (orange text)

**Actual Results**:
- [ ] Input disabled when running?: ____________
- [ ] Warning shown?: ____________
- [ ] Pass/Fail: ____________

---

### Test 10: Real-Time Validation

**Objective**: Verify validation feedback appears as user types

**Steps**:
1. Click in port input field
2. Type `5` (incomplete, invalid)
3. Type `00` (now "500", too low)
4. Observe error message appearing in real-time
5. Delete and type `3767` (valid)
6. Observe error disappearing

**Expected Results**:
- ✅ While typing invalid value: Error message appears immediately
- ✅ When typing becomes valid: Error message disappears immediately
- ✅ No delay or lag in validation feedback

**Actual Results**:
- [ ] Real-time validation works?: ____________
- [ ] Error appears/disappears correctly?: ____________
- [ ] Pass/Fail: ____________

---

## ✅ Test Results Summary

| Test ID | Test Name | Status | Notes |
|---------|-----------|--------|-------|
| 1 | Default Behavior | ⬜ | |
| 2 | Port Configuration & Persistence | ⬜ | |
| 3a | Validation - Port Too Low | ⬜ | |
| 3b | Validation - Port Too High | ⬜ | |
| 3c | Validation - Non-Integer | ⬜ | |
| 4 | Bridge Connection | ⬜ | |
| 5 | Input Disabled When Running | ⬜ | |
| 6 | Port Conflict Detection | ⬜ | Critical |
| 7 | Reset Functionality | ⬜ | |
| 8 | Multiple Profiles Concurrent | ⬜ | Critical |
| 9 | Restart Warning | ⬜ | |
| 10 | Real-Time Validation | ⬜ | |

**Legend**: ⬜ Not Started | 🔄 In Progress | ✅ Passed | ❌ Failed

---

## 🔍 Verification Checklist

### Console Logs to Check

When starting Bridge, verify console logs show:
```javascript
[BridgeConfig] Loaded port: 3767
🔧 Starting Bridge on port 3767
Bridge started successfully on port 3767
```

### localStorage Inspection

To manually verify port storage:
1. Open Chrome DevTools (F12)
2. Go to **Application** tab → **Storage** → **Local Storage**
3. Select the Extension's origin
4. Look for key: `midscene-bridge-port`
5. Value should match configured port (e.g., `"3767"`)

---

## 🐛 Troubleshooting

### Issue: Port not saving

**Symptoms**: "Port saved successfully" message doesn't appear

**Possible Causes**:
1. Port value is invalid (check validation message)
2. localStorage is full (unlikely, but possible)
3. Browser has disabled localStorage for Extension

**Solutions**:
1. Verify port is in valid range (1024-65535)
2. Check Chrome DevTools → Console for errors
3. Try clearing Extension's localStorage and retry

---

### Issue: Port conflict not detected

**Symptoms**: Two Bridges connect on same port without error

**Possible Causes**:
1. Bridges are on different machines/VMs (not a conflict)
2. One Bridge didn't actually start (check console logs)
3. Error message not displayed in UI

**Solutions**:
1. Verify both Bridges show "Connected" status
2. Check console logs for each Profile
3. Use `lsof` command to verify ports:
   ```bash
   lsof -i :3766
   ```

---

### Issue: Configuration not persisting

**Symptoms**: Port resets to 3766 after browser restart

**Possible Causes**:
1. Browser is in Incognito mode (localStorage doesn't persist)
2. Chrome Profile is corrupted
3. localStorage was cleared by Chrome

**Solutions**:
1. Ensure using regular Chrome window (not Incognito)
2. Try creating a new Chrome Profile
3. Check Chrome settings → Privacy → Clear browsing data (ensure localStorage not being auto-cleared)

---

### Issue: "Active: {port}" not displayed

**Symptoms**: Active port indicator doesn't show even when Bridge is connected

**Possible Causes**:
1. Bridge status is not "connected" (check status in UI)
2. React state not updating
3. UI rendering issue

**Solutions**:
1. Verify Bridge status shows green "Connected" indicator
2. Check console for React errors
3. Try stopping and restarting Bridge

---

## 📞 Support & Reporting Issues

### How to Report a Bug

If you encounter a test failure, please provide:
1. **Test ID**: (e.g., Test 6 - Port Conflict Detection)
2. **Steps Taken**: Detailed sequence of actions
3. **Expected Result**: What should have happened
4. **Actual Result**: What actually happened
5. **Screenshots**: Of the Extension UI and console logs
6. **Environment**:
   - Chrome version: `chrome://version/`
   - Extension version: 0.30.2
   - OS: macOS/Windows/Linux

### Console Log Collection

To collect console logs:
1. Open Chrome DevTools (F12)
2. Go to Console tab
3. Right-click in console → "Save as..."
4. Attach log file to bug report

---

## ✅ Final Acceptance Criteria

For the feature to be considered "Ready for Production", ALL critical tests must pass:

**Critical Tests** (Must Pass):
- ✅ Test 6: Port Conflict Detection
- ✅ Test 8: Multiple Profiles Concurrent Execution

**Important Tests** (Should Pass):
- ✅ Test 2: Port Configuration & Persistence
- ✅ Test 4: Bridge Connection with Custom Port
- ✅ All validation tests (3a, 3b, 3c)

**Nice-to-Have Tests** (Can have minor issues):
- Test 9: Restart Warning
- Test 10: Real-Time Validation

---

## 🎯 Next Steps After Testing

1. **If All Tests Pass**:
   - Update `IMPLEMENTATION_COMPLETE.md` with test results
   - Mark feature as "Ready for Production"
   - Create user documentation
   - Deploy to production

2. **If Tests Fail**:
   - Document failures in issue tracker
   - Prioritize fixes based on severity
   - Re-run failed tests after fixes
   - Repeat until all critical tests pass

---

*Last Updated: 2025-10-28 13:50*  
*Testing Status: Ready for Manual Testing*  
*Next Review: After Test Execution*

