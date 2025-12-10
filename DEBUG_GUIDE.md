# Complete Guide: Running App in Debug Mode with Breakpoints

## 🚀 Step 1: Start Metro Bundler

Open a terminal in VS Code and run:
```bash
npm start
```

Wait until you see:
```
Metro waiting on port 8081
Welcome to Metro
Dev server ready
```

**Keep this terminal running!**

---

## 🏃 Step 2: Run the Windows App

Open a **new terminal** (Terminal → New Terminal) and run:
```bash
npm run windows
```

This will:
- Build your app in Debug mode
- Launch the Windows app
- Connect to Metro bundler

---

## 🐛 Step 3: Enable Remote Debugging

Once the app window opens:

1. **Press `Ctrl+M`** (or `Shift+F10`) in the app window
2. Click **"Debug JS Remotely"** or **"Open Debugger"**
3. Chrome will automatically open with the debugger UI at `http://localhost:8081/debugger-ui/`

**Important:** Bring the Chrome DevTools tab to the foreground to avoid performance warnings.

---

## 📍 Step 4: Add Breakpoints in Your Code

Since you're not using extensions, use `debugger;` statements to create breakpoints.

### How to Add Breakpoints:

#### Method 1: In JavaScript code (outside JSX)
```javascript
function App() {
  const isDarkMode = useColorScheme() === 'dark';
  
  debugger; // Breakpoint: Pauses here when function executes
  
  const backgroundStyle = {
    backgroundColor: isDarkMode ? '#1a1a1a' : '#ffffff',
    flex: 1,
  };
  
  useEffect(() => {
    console.log('App mounted');
    debugger; // Breakpoint: Pauses when useEffect runs
  }, []);
}
```

#### Method 2: In JSX (using curly braces)
```javascript
return (
  <SafeAreaView>
    {debugger} {/* Breakpoint: Pauses when rendering this component */}
    <View style={styles.header}>
      <Text>Welcome to Defendly</Text>
    </View>
  </SafeAreaView>
);
```

### Example Breakpoints Already Added:

1. **Line 22**: `debugger;` in `useEffect` - pauses when component mounts
2. **Line 35**: `{debugger}` in JSX - pauses when rendering the header

---

## 🔍 Step 5: Use the Debugger

When execution pauses at a `debugger;` statement:

### In Chrome DevTools:

1. **Sources Tab**: See your code with the current line highlighted
2. **Console Tab**: 
   - Type variable names to inspect their values
   - Execute JavaScript commands
3. **Debug Controls**:
   - **F8** or **▶️**: Resume execution
   - **F10**: Step over (execute current line, don't go into functions)
   - **F11**: Step into (go into function calls)
   - **Shift+F11**: Step out (exit current function)
4. **Scope Panel**: See all variables in current scope
5. **Call Stack**: See the function call chain

### Example Debugging Session:

```javascript
function App() {
  const isDarkMode = useColorScheme() === 'dark';
  debugger; // Execution pauses here
  
  // In Chrome DevTools Console, you can now:
  // - Type: isDarkMode (to see its value)
  // - Type: console.log(isDarkMode) (to log it)
  // - Press F10 to step to next line
}
```

---

## 📝 Step 6: Add More Breakpoints

You can add `debugger;` statements anywhere:

```javascript
// Breakpoint in a function
const handleClick = () => {
  debugger; // Pauses when button is clicked
  console.log('Button clicked');
};

// Breakpoint in conditional logic
if (someCondition) {
  debugger; // Pauses only if condition is true
  // do something
}

// Breakpoint in a loop
for (let i = 0; i < items.length; i++) {
  debugger; // Pauses on each iteration
  console.log(items[i]);
}
```

---

## 🔄 Step 7: Reload to Test Breakpoints

After adding or modifying breakpoints:

1. **Save your file** (Ctrl+S)
2. **Reload the app**:
   - Press `r` in the Metro terminal, OR
   - Press `Ctrl+M` in the app → Click "Reload"
3. Execution will pause at your `debugger;` statements

---

## ✅ Quick Checklist

- [ ] Metro bundler is running (`npm start`)
- [ ] App is running (`npm run windows`)
- [ ] Remote debugging is enabled (Chrome DevTools open)
- [ ] Added `debugger;` statements where you want breakpoints
- [ ] Reloaded the app to test breakpoints

---

## 💡 Tips

1. **Remove breakpoints when done**: Comment out or delete `debugger;` statements before production
2. **Use console.log for quick checks**: `console.log(variable)` is faster than breakpoints for simple debugging
3. **Conditional breakpoints**: Use `if` statements with `debugger;`
   ```javascript
   if (someCondition) {
     debugger; // Only pauses if condition is true
   }
   ```
4. **Multiple breakpoints**: You can have as many `debugger;` statements as you need

---

## 🎯 Current Breakpoints in Your Code

- **Line 22**: Pauses when the component mounts (in `useEffect`)
- **Line 35**: Pauses when rendering the header section

Try reloading the app now - it should pause at these breakpoints!

