# Complete Step-by-Step Debugging Guide for React Native Windows

## 🎯 Goal: Debug your app with breakpoints

---

## ✅ Step 1: Run the App from VS Code

1. **Open VS Code** in your project folder
2. **Press `Ctrl+Shift+D`** (or click Run and Debug icon in sidebar)
3. **Select "🚀 Run Windows App"** from the dropdown at the top
4. **Press `F5`** (or click the green play button)
5. **Wait for the app to build and launch** - you'll see output in the terminal
6. The app window should open automatically

**What you'll see:**
- Terminal output showing build progress
- Checkmarks (✓) for successful steps
- "Starting the app" message
- Your app window opens

---

## ✅ Step 2: Enable Remote Debugging

1. **Look at your app window** (the Windows app that just opened)
2. **Press `Ctrl+M`** (or `Shift+F10`) in the app window
3. A **Developer Menu** will appear
4. **Click "Debug JS Remotely"** or **"Open Debugger"**
5. **Chrome browser will open automatically** with DevTools

**What you'll see:**
- Developer menu popup in the app
- Chrome opens with `http://localhost:8081/debugger-ui/`
- Chrome DevTools interface

---

## ✅ Step 3: Bring Chrome DevTools to Foreground

1. **Switch to the Chrome tab** that just opened
2. **Click on the Chrome tab** with the debugger UI
3. This removes the warning about background tab
4. You should see the Chrome DevTools interface

**Why this matters:**
- If DevTools is in background, debugging is slow
- Foreground tab makes breakpoints work properly

---

## ✅ Step 4: Set Breakpoints Using `debugger;` Statements

### Current Breakpoint:
You already have a breakpoint on **line 22** in `src/App.js`:
```javascript
useEffect(() => {
  console.log('App mounted');
  debugger; // Breakpoint: Will pause in Chrome DevTools
}, []);
```

### Add More Breakpoints:

**Option A: Add in JavaScript code**
```javascript
function App() {
  const isDarkMode = useColorScheme() === 'dark';
  
  debugger; // Breakpoint here - pauses when function runs
  
  const backgroundStyle = {
    // ...
  };
}
```

**Option B: Add in functions**
```javascript
const handleClick = () => {
  debugger; // Breakpoint - pauses when button is clicked
  console.log('Button clicked');
};
```

**Option C: Add before return**
```javascript
// Before JSX return
debugger; // Pauses before rendering
return (
  <SafeAreaView>
    ...
  </SafeAreaView>
);
```

---

## ✅ Step 5: Reload the App to Hit Breakpoints

1. **Go to the Metro terminal** in VS Code (bottom panel)
2. **Press `r`** (lowercase) to reload
3. **OR** in the app window: Press `Ctrl+M` → Click "Reload"

**What happens:**
- App reloads
- When execution reaches `debugger;` statement, it **pauses**
- Chrome DevTools will show the pause
- Your code will be highlighted in Chrome DevTools

---

## ✅ Step 6: Debug in Chrome DevTools

When execution pauses at a `debugger;` statement:

### A. Inspect Variables
- **Hover** over variables in the code to see their values
- **Type in Console tab**: Type variable names to see values
  - Example: Type `isDarkMode` to see its value
  - Example: Type `backgroundStyle` to see the object

### B. Step Through Code
- **F8** or **▶️ Resume**: Continue execution
- **F10**: Step over (execute current line, don't go into functions)
- **F11**: Step into (go into function calls)
- **Shift+F11**: Step out (exit current function)

### C. View Call Stack
- See the **Call Stack** panel on the right
- Shows how you got to this point in the code

### D. Use Console
- Type JavaScript expressions
- Example: `console.log(isDarkMode)`
- Example: `backgroundStyle.backgroundColor`

---

## ✅ Step 7: Add More Breakpoints as Needed

### Example: Breakpoint in a Button Click Handler

```javascript
<Button 
  title="Click Me"
  onPress={() => {
    debugger; // Pauses when button is clicked
    console.log('Button pressed');
  }}
/>
```

### Example: Conditional Breakpoint

```javascript
if (someCondition) {
  debugger; // Only pauses if condition is true
  // do something
}
```

### Example: Breakpoint in a Loop

```javascript
for (let i = 0; i < items.length; i++) {
  debugger; // Pauses on each iteration
  console.log(items[i]);
}
```

---

## 📋 Complete Checklist

Use this checklist every time you debug:

- [ ] App is running (launched from VS Code)
- [ ] Remote debugging enabled (`Ctrl+M` → "Debug JS Remotely")
- [ ] Chrome DevTools is open and in foreground
- [ ] `debugger;` statements added where needed
- [ ] App reloaded (`r` in Metro terminal)
- [ ] Execution paused at breakpoint in Chrome DevTools
- [ ] Can inspect variables and step through code

---

## 🔄 Daily Workflow

### Starting a Debug Session:
1. Press `F5` in VS Code (Run and Debug)
2. Wait for app to launch
3. Press `Ctrl+M` in app → "Debug JS Remotely"
4. Switch to Chrome DevTools tab
5. Start debugging!

### During Development:
1. Add `debugger;` where you want to pause
2. Save file (`Ctrl+S`)
3. Reload app (`r` in Metro terminal)
4. Debug in Chrome DevTools

### Ending Debug Session:
1. Close Chrome DevTools (optional)
2. Stop Metro: Press `Ctrl+C` in Metro terminal (optional)
3. Close app window (optional)

---

## 🎯 Quick Reference

| Action | Command |
|--------|---------|
| Run app from VS Code | `F5` (Run and Debug) |
| Enable remote debugging | `Ctrl+M` in app → "Debug JS Remotely" |
| Reload app | `r` in Metro terminal |
| Resume execution | `F8` in Chrome DevTools |
| Step over | `F10` in Chrome DevTools |
| Step into | `F11` in Chrome DevTools |
| Step out | `Shift+F11` in Chrome DevTools |

---

## ⚠️ Important Notes

1. **VS Code red dots don't work** - Only `debugger;` statements work
2. **Breakpoints pause in Chrome DevTools**, not VS Code
3. **You must enable remote debugging** for breakpoints to work
4. **Reload app** after adding new `debugger;` statements
5. **Remove `debugger;` statements** before production builds

---

## 🐛 Troubleshooting

### Breakpoint not hitting?
- ✅ Make sure remote debugging is enabled
- ✅ Check Chrome DevTools is in foreground
- ✅ Reload the app after adding `debugger;`
- ✅ Check the `debugger;` statement is in code that actually runs

### Chrome DevTools not opening?
- ✅ Check Metro is running (should see "Metro waiting on port 8081")
- ✅ Try `Ctrl+M` again in the app
- ✅ Manually open: `http://localhost:8081/debugger-ui/`

### App not reloading?
- ✅ Make sure Metro terminal is focused
- ✅ Press `r` (lowercase, not uppercase)
- ✅ Or use `Ctrl+M` → "Reload" in app

---

## ✅ You're Ready!

Follow these steps and you'll be debugging successfully. The key is:
- Use `debugger;` statements (not VS Code red dots)
- Enable remote debugging
- Debug in Chrome DevTools

Happy debugging! 🎉

