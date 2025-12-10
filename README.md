# Defendly Windows App

A React Native Windows application built with React Native Windows.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (version 18 or higher)
- **Visual Studio 2022** with the following workloads:
  - Desktop development with C++
  - Universal Windows Platform development
- **Windows 10 SDK** (10.0.17763.0 or higher)
- **Yarn** or **npm**

## Getting Started

### 1. Install Dependencies

```bash
npm install
# or
yarn install
```

### 2. Run the App

#### Running in Debug Mode (Default)

The app runs in debug mode by default with hot reload, fast refresh, and developer menu enabled.

**Option A: Using npm/yarn (Recommended)**
```bash
npm run windows
# or
yarn windows
```

This will:
- Start the Metro bundler
- Build the app in Debug configuration
- Launch the Windows app with debugging enabled

**Option B: Using Visual Studio (Full Debugging)**

For full debugging with breakpoints in both JavaScript and C++:

1. Start Metro bundler in a terminal:
   ```bash
   npm start
   ```

2. Open `windows/DefendlyApp.sln` in Visual Studio 2022

3. Select **Debug** configuration and **x64** platform

4. Press **F5** or click **Start Debugging**

This gives you:
- JavaScript debugging with React DevTools
- C++ native code debugging with breakpoints
- Full Visual Studio debugging features

#### Debug Features Enabled

- ✅ Hot Reload / Fast Refresh
- ✅ Developer Menu (press `Ctrl+M` or `Shift+F10` in the app)
- ✅ React DevTools support
- ✅ Metro bundler with source maps
- ✅ Error overlays and warnings

### 3. Development

- **Start Metro bundler separately**: `npm start` or `yarn start`
- **Build for production**: `npm run build` or `yarn build`
- **Run without auto-launch**: `npm run windows:debug` (builds but doesn't launch)

## Project Structure

```
.
├── src/
│   └── App.js           # Main React component
├── windows/             # Windows-specific native code
│   └── DefendlyApp/     # Visual Studio project files
├── index.js             # React Native entry point
├── package.json         # Dependencies and scripts
└── README.md           # This file
```

## Building for Production

1. Build the JavaScript bundle:
   ```bash
   npm run build
   ```

2. Open `windows/DefendlyApp.sln` in Visual Studio
3. Select Release configuration
4. Build the solution (Build > Build Solution)

## Troubleshooting

### Metro bundler issues
- Clear Metro cache: `npm start -- --reset-cache`

### Build errors

#### Missing MSBuild/VCTools Error
If you see "Could not find MSBuild with VCTools for Visual Studio", you need to install the required dependencies:

1. **Run the dependency script** (as Administrator):
   - Open PowerShell as Administrator
   - Navigate to your project directory
   - **Bypass execution policy** and run:
     ```powershell
     powershell -ExecutionPolicy Bypass -File .\node_modules\react-native-windows\Scripts\rnw-dependencies.ps1
     ```
   - Or temporarily allow scripts for this session:
     ```powershell
     Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process
     .\node_modules\react-native-windows\Scripts\rnw-dependencies.ps1
     ```
   - This will check and install missing dependencies

2. **Manual installation**:
   - Ensure Visual Studio 2022 is installed with:
     - Desktop development with C++
     - Universal Windows Platform development
   - Check that Windows SDK (10.0.17763.0 or higher) is installed
   - Verify MSBuild tools are available

3. **Alternative**: Install Visual Studio Build Tools separately if you don't have Visual Studio IDE

#### Other build issues
- Ensure all Visual Studio workloads are installed
- Check that Windows SDK is properly installed
- Try cleaning the solution in Visual Studio

### Module not found errors
- Run `npm install` again
- Delete `node_modules` and reinstall

## Resources

- [React Native Windows Documentation](https://microsoft.github.io/react-native-windows/)
- [React Native Documentation](https://reactnative.dev/)

