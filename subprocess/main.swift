// main.swift

/*
* What is this for?
This subprocess offers some additional functions so the AI can operate even better than normal computer use.
For example: open_application. This allows the AI to open applications directly instead of using "Spotlight Search".
Note: Anthropic computer use will not call any of these functions. But OpenAI's computer use will.

--
Lastly: We have a "lock" function which is not working yet. The idea is to lock the input (keyboard and mouse) but offer an emergency unlock function. This will allow the AI to work without being accidentally interrupted. 
For now, its fine to leave as is.
*/
import Foundation
import AppKit
import ApplicationServices
import CoreGraphics
import IOKit.pwr_mgt

struct AppResponse: Codable {
    let success: Bool
    let result: String?
    let error: String?
}

func getActiveApplication() -> AppResponse {
    let workspace = NSWorkspace.shared
    if let activeApp = workspace.frontmostApplication {
        return AppResponse(success: true, result: activeApp.localizedName, error: nil)
    }
    return AppResponse(success: false, result: nil, error: "No active application found")
}

func switchToApplication(_ appName: String) -> AppResponse {
    let workspace = NSWorkspace.shared
    let apps = workspace.runningApplications
    
    for app in apps {
        if app.localizedName?.lowercased() == appName.lowercased() {
            app.activate(options: [.activateIgnoringOtherApps])
            return AppResponse(success: true, result: "Switched to \(appName)", error: nil)
        }
    }
    return AppResponse(success: false, result: nil, error: "Application '\(appName)' not found or not running")
}

func openApplication(_ appName: String) -> AppResponse {
    let workspace = NSWorkspace.shared
    
    // Try direct launch first
    if workspace.launchApplication(appName) {
        return AppResponse(success: true, result: "Opened \(appName)", error: nil)
    }
    
    // Fallback to open command
    let process = Process()
    process.launchPath = "/usr/bin/open"
    process.arguments = ["-a", appName]
    
    do {
        try process.run()
        // Don't wait for the process to exit, just check if it launched successfully
        // The app will launch in the background
        return AppResponse(success: true, result: "Opened \(appName)", error: nil)
    } catch {
        return AppResponse(success: false, result: nil, error: "Failed to open \(appName): \(error.localizedDescription)")
    }
}

// MARK: - Input Blocking and Sleep Prevention

class InputBlocker {
    static let shared = InputBlocker()
    
    private var eventTap: CFMachPort?
    private var runLoopSource: CFRunLoopSource?
    private var isBlocking = false
    
    private init() {}
    
    func startBlocking() -> Bool {
        guard !isBlocking else { return true }
        guard checkAccessibilityPermissions(promptUser: true) else { return false }
        
        // Only listen for keyboard events
        let keyDownMask = UInt64(1) << CGEventType.keyDown.rawValue
        let keyUpMask   = UInt64(1) << CGEventType.keyUp.rawValue
        let eventMask   = keyDownMask | keyUpMask
        
        eventTap = CGEvent.tapCreate(
            tap: .cgSessionEventTap,
            place: .headInsertEventTap,
            options: .defaultTap,
            eventsOfInterest: CGEventMask(eventMask),
            callback: { proxy, type, event, _ in
                
                // Let our *own* synthetic events through
                let srcPID: pid_t
                if #available(macOS 10.15, *) {
                    // The preferred API
                    srcPID = pid_t(event.getIntegerValueField(.eventSourceUnixProcessID))
                } else {
                    // Fallback for < 10.15 (raw value 7 = eventSourceUnixProcessID)
                    let field = CGEventField(rawValue: 7)!
                    srcPID = pid_t(event.getIntegerValueField(field))
                }
                if srcPID == getpid() {
                    return Unmanaged.passUnretained(event)
                }
                
                // Fail-safe: allow ⌘Q to quit the Electron host
                if type == .keyDown {
                    let keyCode = event.getIntegerValueField(.keyboardEventKeycode)
                    if keyCode == 12 && event.flags.contains(.maskCommand) { // Q
                        return Unmanaged.passUnretained(event)
                    }
                }
                
                // Swallow every other *hardware* keystroke
                return nil
            },
            userInfo: nil
        )
        
        guard let eventTap else { return false }
        
        runLoopSource = CFMachPortCreateRunLoopSource(kCFAllocatorDefault,
                                                      eventTap, 0)
        guard let runLoopSource else { return false }
        
        CFRunLoopAddSource(CFRunLoopGetCurrent(),
                           runLoopSource,
                           .commonModes)
        CGEvent.tapEnable(tap: eventTap, enable: true)
        isBlocking = true
        return true
    }
    
    func stopBlocking() -> Bool {
        guard isBlocking else { return true }
        
        if let eventTap {
            CGEvent.tapEnable(tap: eventTap, enable: false)
        }
        if let runLoopSource {
            CFRunLoopRemoveSource(CFRunLoopGetCurrent(),
                                  runLoopSource,
                                  .commonModes)
        }
        eventTap       = nil
        runLoopSource  = nil
        isBlocking     = false
        return true
    }
    
    func isCurrentlyBlocking() -> Bool { isBlocking }
}
class SleepPreventer {
    static let shared = SleepPreventer()
    private var displaySleepAssertionID: IOPMAssertionID = 0
    private var systemSleepAssertionID: IOPMAssertionID = 0
    private var isPreventingDisplaySleep = false
    private var isPreventingSystemSleep = false
    
    private init() {}
    
    func preventSleep() -> Bool {
        let displayResult = preventDisplaySleep()
        let systemResult = preventSystemSleep()
        return displayResult && systemResult
    }
    
    func allowSleep() -> Bool {
        let displayResult = allowDisplaySleep()
        let systemResult = allowSystemSleep()
        return displayResult && systemResult
    }
    
    private func preventDisplaySleep() -> Bool {
        guard !isPreventingDisplaySleep else { return true }
        
        let result = IOPMAssertionCreateWithName(
            kIOPMAssertPreventUserIdleDisplaySleep as CFString,
            IOPMAssertionLevel(kIOPMAssertionLevelOn),
            "AI computer use - display sleep prevention" as CFString,
            &displaySleepAssertionID
        )
        
        if result == kIOReturnSuccess {
            isPreventingDisplaySleep = true
            return true
        }
        return false
    }
    
    private func allowDisplaySleep() -> Bool {
        guard isPreventingDisplaySleep else { return true }
        
        let result = IOPMAssertionRelease(displaySleepAssertionID)
        if result == kIOReturnSuccess {
            isPreventingDisplaySleep = false
            return true
        }
        return false
    }
    
    private func preventSystemSleep() -> Bool {
        guard !isPreventingSystemSleep else { return true }
        
        let result = IOPMAssertionCreateWithName(
            kIOPMAssertPreventUserIdleSystemSleep as CFString,
            IOPMAssertionLevel(kIOPMAssertionLevelOn),
            "AI computer use - system sleep prevention" as CFString,
            &systemSleepAssertionID
        )
        
        if result == kIOReturnSuccess {
            isPreventingSystemSleep = true
            return true
        }
        return false
    }
    
    private func allowSystemSleep() -> Bool {
        guard isPreventingSystemSleep else { return true }
        
        let result = IOPMAssertionRelease(systemSleepAssertionID)
        if result == kIOReturnSuccess {
            isPreventingSystemSleep = false
            return true
        }
        return false
    }
}

func checkAccessibilityPermissions(promptUser: Bool = false) -> Bool {
    if promptUser {
        let options: NSDictionary = [
            kAXTrustedCheckOptionPrompt.takeUnretainedValue() as String: true
        ]
        return AXIsProcessTrustedWithOptions(options)
    } else {
        return AXIsProcessTrusted()
    }
}

func startScreenLock() -> AppResponse {
    let inputBlocked = InputBlocker.shared.startBlocking()
    let sleepPrevented = SleepPreventer.shared.preventSleep()
    
    if inputBlocked && sleepPrevented {
        return AppResponse(success: true, result: "Screen lock activated", error: nil)
    } else if !inputBlocked && sleepPrevented {
        return AppResponse(success: false, result: nil, error: "Failed to block input - accessibility permissions required")
    } else if inputBlocked && !sleepPrevented {
        // Stop input blocking if sleep prevention failed
        let _ = InputBlocker.shared.stopBlocking()
        return AppResponse(success: false, result: nil, error: "Failed to prevent sleep")
    } else {
        return AppResponse(success: false, result: nil, error: "Failed to activate screen lock")
    }
}

func stopScreenLock() -> AppResponse {
    let inputUnblocked = InputBlocker.shared.stopBlocking()
    let sleepAllowed = SleepPreventer.shared.allowSleep()
    
    if inputUnblocked && sleepAllowed {
        return AppResponse(success: true, result: "Screen lock deactivated", error: nil)
    } else {
        return AppResponse(success: false, result: nil, error: "Failed to fully deactivate screen lock")
    }
}

func checkAccessibilityStatus() -> AppResponse {
    let hasPermission = checkAccessibilityPermissions()
    
    if hasPermission {
        return AppResponse(success: true, result: "Accessibility permissions granted", error: nil)
    } else {
        return AppResponse(success: false, result: nil, error: "Accessibility permissions required for input blocking")
    }
}

// Main execution
let args = CommandLine.arguments
guard args.count >= 2 else {
    let error = AppResponse(success: false, result: nil, error: "Usage: AppSwitcher <command> [args]")
    let data = try! JSONEncoder().encode(error)
    print(String(data: data, encoding: .utf8)!)
    exit(1)
}

let command = args[1]
var response: AppResponse

switch command {
case "getActiveApplication":
    response = getActiveApplication()
case "switchToApplication":
    guard args.count >= 3 else {
        response = AppResponse(success: false, result: nil, error: "App name required")
        break
    }
    response = switchToApplication(args[2])
case "openApplication":
    guard args.count >= 3 else {
        response = AppResponse(success: false, result: nil, error: "App name required")
        break
    }
    response = openApplication(args[2])
case "startScreenLock":
    response = startScreenLock()
case "stopScreenLock":
    response = stopScreenLock()
case "checkAccessibility":
    response = checkAccessibilityStatus()
default:
    response = AppResponse(success: false, result: nil, error: "Unknown command: \(command)")
}

let data = try! JSONEncoder().encode(response)
print(String(data: data, encoding: .utf8)!)

// Flush output and exit cleanly
fflush(stdout)
exit(0)
