# Diff Viewer Guide

The playground includes a **side-by-side diff viewer** to help you understand exactly what your beforeSend code changed.

## Features

- **Toggle Views**: Switch between "Full Output" and "Diff View"
- **Color-Coded Changes**:
  - 🟢 **Green**: Added lines or modified values
  - 🔴 **Red**: Removed lines or original values
- **Split View**: Original event on the left, transformed event on the right
- **Line-by-Line Comparison**: Clean, easy-to-read line differences
- **JSON Formatting**: Both views show properly formatted JSON

## How to Use

### 1. Transform an Event

1. Paste an event JSON (or load an example)
2. Write or modify your beforeSend code
3. Click **"Transform"**

### 2. View Results

After transformation succeeds, you'll see two tabs:

#### Full Output Tab (Default)

Shows the complete transformed event as formatted JSON.

**When to use:**
- Copy the complete transformed event
- Verify the entire event structure
- See all properties in one place

#### Diff View Tab

Shows a side-by-side comparison of what changed.

**When to use:**
- Understand what your beforeSend code modified
- Debug unexpected changes
- Verify only intended properties were changed
- Learn how beforeSend affects events

### 3. Switch Between Views

Click the tabs to toggle between Full Output and Diff View.

## Example

### PII Scrubbing Transformation

**Original Event:**
```json
{
  "user": {
    "email": "user@example.com",
    "ip_address": "192.168.1.1"
  }
}
```

**Transformed Event:**
```json
{
  "user": {
    "email": "[REDACTED]",
    "ip_address": null
  }
}
```

**Diff View shows:**
```diff
  "user": {
-   "email": "user@example.com"     ← Original (red)
+   "email": "[REDACTED]"            ← Modified (green)
-   "ip_address": "192.168.1.1"
+   "ip_address": null
  }
```

This makes it immediately clear that:
- Email was redacted to `[REDACTED]`
- IP address was set to `null`

## When Tabs Appear

Tabs only appear when **both** original and transformed events exist:

✅ **Tabs shown:**
- Successful transformation with result
- Original event available from API

❌ **Tabs hidden:**
- Event was dropped (beforeSend returned null)
- No transformation performed yet
- Error occurred during transformation

In these cases, you'll see the simple output view without tabs.

## Tips

### Understanding Changes

- **Entire lines highlighted**: The line was added or removed
- **Side-by-side comparison**: Easy to spot differences
- **JSON structure preserved**: See changes in context

### Debugging

Use the diff view to:
1. Verify your beforeSend logic works as expected
2. Catch unintended modifications
3. Understand SDK-specific behavior differences
4. Learn from example transformations

### Performance

The diff viewer:
- Works with events of any size
- Handles deeply nested objects
- Shows accurate line-by-line changes
- Updates instantly when switching tabs

## Accessibility

The diff viewer includes full accessibility support:

- Keyboard navigation between tabs
- ARIA roles for screen readers
- Proper focus management
- Semantic HTML structure

Press `Tab` to navigate between the "Full Output" and "Diff View" tabs.

## Technical Details

- Uses `react-diff-viewer-continued` library
- Character-level diff disabled for cleaner view
- Line-by-line comparison only
- Split view mode for side-by-side comparison
- Light theme for better readability
