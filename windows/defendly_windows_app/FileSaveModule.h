#pragma once

#include "pch.h"
#include "NativeModules.h"
#include "winrt/Microsoft.ReactNative.h"
#include "winrt/Windows.Storage.h"
#include "winrt/Windows.Storage.Pickers.h"
#include "winrt/Windows.Foundation.h"
#include "winrt/Windows.Security.Cryptography.h"
#include "winrt/Windows.UI.Core.h"
#include "winrt/Windows.ApplicationModel.Core.h"
#include <string>
#include <vector>
#include <sstream>

namespace winrt::defendly_windows_app::implementation
{
    REACT_MODULE(FileSaveModule)
    struct FileSaveModule
    {
        REACT_INIT(Initialize)
        void Initialize(winrt::Microsoft::ReactNative::ReactContext const& reactContext) noexcept;

        REACT_METHOD(SaveFile, L"saveFile")
        void SaveFile(
            winrt::hstring const& base64Data,
            winrt::hstring const& fileName,
            winrt::Microsoft::ReactNative::ReactPromise<winrt::hstring> promise) noexcept;

    private:
        winrt::Windows::Foundation::IAsyncAction SaveFileAsync(
            winrt::hstring const& base64Data,
            winrt::hstring const& fileName,
            winrt::Microsoft::ReactNative::ReactPromise<winrt::hstring> promise) noexcept;

        winrt::Microsoft::ReactNative::ReactContext m_reactContext{ nullptr };
    };
    
    // Explicit module registration function to ensure it's linked in release builds
    // This function is called from ReactPackageProvider to force module registration
    void RegisterFileSaveModule(winrt::Microsoft::ReactNative::IReactPackageBuilder const& packageBuilder) noexcept;
    
    // Global instance pointer to prevent WholeProgramOptimization from removing the module
    extern FileSaveModule* g_fileSaveModuleInstance;
}

