---
title: swift-spm
type: note
permalink: ram/04-ai-toolkit/skills/test/storymap/references/swift-spm
---

# Swift / SPM Extraction Reference

## Route Discovery

Swift SPM projects don't have traditional route files. Instead, discover user-facing capabilities from:

### CLI Commands (swift-argument-parser)
```
Sources/*/Commands/*.swift
```
Look for structs conforming to `ParsableCommand` or `AsyncParsableCommand`. Each command = a user task.
Subcommands = subtasks. Arguments/options = variations.

### Menu Bar Apps (SwiftUI MenuBarExtra)
```
Sources/*/Views/MenuBarView.swift
Sources/*App.swift
```
Look for `MenuBarExtra`, `Menu`, `Button` in the body. Each menu item = a user task.
Keyboard shortcuts (`keyboardShortcut`) = additional entry points.

### GUI Actions
```
Sources/*/Views/*.swift
Sources/*/ShortcutManager.swift
```
Look for `Button`, `.onTapGesture`, keyboard shortcut registrations. Each = a user action.

## Controller/Handler Discovery

In Swift SPM, there are no controllers. Instead:

- **Engine classes** (`*Engine.swift`) = the core logic handlers
- **Manager classes** (`*Manager.swift`) = service orchestrators  
- **Public methods** on these = individual tasks

Map: `Engine.publicMethod()` → user task

### Filtering Internal vs User-Facing

Not every public method is a user task. Filter out:
- Methods that start with `_` or are marked `internal`
- Lifecycle methods (init, deinit, setup, configure)
- Delegate/callback methods (didChange, willUpdate)
- Helper/utility methods (validate, parse, convert)

Keep only methods that a USER would recognize as something THEY do:
- "switch workspace" -- user action, KEEP
- "resolveMonitorAlias" -- internal helper, SKIP
- "tile windows" -- user action, KEEP
- "nsFlagsToCGFlags" -- internal conversion, SKIP

## Auth / Actor Discovery

Desktop macOS apps typically have:
- **Accessibility permissions** (`AXIsProcessTrusted`) = system-level gate
- **No user auth** (single-user app)
- **Configuration-based modes** (focus mode, workspace-specific behavior)

If no auth: single actor ("power user"). Variations come from configuration, not roles.

## Model / Entity Discovery

```
Sources/*/Config/ConfigModels.swift
Sources/*/Window/WindowModel.swift
```
Look for structs with `Codable` conformance. These are the nouns.
YAML config files (`.milayout.yml`) define the user's workspace setup.

## Test Discovery

```
Tests/*Tests/*.swift
```
XCTestCase subclasses. Each `test_` method = one tested behavior.
Map test file names to source files: `ConfigTests.swift` → `ConfigModels.swift`.

## Git Co-Change Patterns

Swift projects often have tighter coupling than web apps:
- Config model + config manager change together = config feature
- Engine + command change together = feature boundary
- GUI views + app state change together = UI feature

## Example: milayout

```
Activities (from Commands/ + MenuBarView):
├── Workspace Management (WorkspaceCommands, WorkspaceEngine)
├── Window Tiling (TileCommands, TileEngine) 
├── Window Snapping (WindowCommands, SnapEngine)
├── Browser Automation (BrowserCommands, ChromeManager)
├── Monitor Management (MonitorCommands, MonitorManager)
└── Configuration (ConfigCommands, ConfigManager)

Tasks (from public methods):
├── workspace switch, workspace create, workspace list...
├── tile columns-2, tile main-stack, tile custom...
├── snap leftHalf, snap center, snap maximize...
└── ...
```