#include "pch.h"
#include "FileSaveModule.h"
#include "NativeModules.h"

namespace winrt::defendly_windows_app::implementation
{
    // Implement the Initialize method
    void FileSaveModule::Initialize(winrt::Microsoft::ReactNative::ReactContext const& reactContext) noexcept
    {
        m_reactContext = reactContext;
    }
    
    // Global instance to prevent WholeProgramOptimization from removing the module
    // This is referenced in ReactPackageProvider to ensure it's always linked
    FileSaveModule* g_fileSaveModuleInstance = nullptr;
    
    // Explicit registration function - forces the module to be registered
    void RegisterFileSaveModule(winrt::Microsoft::ReactNative::IReactPackageBuilder const& /*packageBuilder*/) noexcept
    {
        // Create a persistent instance to prevent WPO from optimizing away the module
        // This ensures the module's vtable and all methods are preserved
        static FileSaveModule s_instance{};
        g_fileSaveModuleInstance = &s_instance;
        
        // Explicitly reference all methods to prevent optimization
        // This ensures the module code is always linked, even with WholeProgramOptimization
        (void)static_cast<void(FileSaveModule::*)(winrt::Microsoft::ReactNative::ReactContext const&)>(&FileSaveModule::Initialize);
        (void)static_cast<void(FileSaveModule::*)(winrt::hstring const&, winrt::hstring const&, winrt::Microsoft::ReactNative::ReactPromise<winrt::hstring>)>(&FileSaveModule::SaveFile);
    }

    // Implement the SaveFile method
    void FileSaveModule::SaveFile(
        winrt::hstring const& base64Data,
        winrt::hstring const& fileName,
        winrt::Microsoft::ReactNative::ReactPromise<winrt::hstring> promise) noexcept
    {
        auto capturedBase64 = base64Data;
        auto capturedFileName = fileName;
        
        // Run async operation
        SaveFileAsync(capturedBase64, capturedFileName, promise);
    }

    // Implement the async helper method
    winrt::Windows::Foundation::IAsyncAction FileSaveModule::SaveFileAsync(
        winrt::hstring const& base64Data,
        winrt::hstring const& fileName,
        winrt::Microsoft::ReactNative::ReactPromise<winrt::hstring> promise) noexcept
    {
        auto capturedBase64 = base64Data;
        auto capturedFileName = fileName;
        
        try
        {
            // Ensure we're on the UI thread for FileSavePicker
            auto dispatcher = winrt::Windows::ApplicationModel::Core::CoreApplication::MainView().CoreWindow().Dispatcher();
            co_await winrt::resume_foreground(dispatcher);
            
            // Use FileSavePicker to let user choose location (defaults to Downloads)
            // Note: FileSavePicker must run on UI thread
            winrt::Windows::Storage::Pickers::FileSavePicker picker;
            picker.SuggestedStartLocation(winrt::Windows::Storage::Pickers::PickerLocationId::Downloads);
            picker.SuggestedFileName(capturedFileName);
            
            // Allow both PDF and CSV to be saved
            {
                auto pdfTypes = winrt::single_threaded_vector<winrt::hstring>();
                pdfTypes.Append(L".pdf");
                picker.FileTypeChoices().Insert(L"PDF", pdfTypes);
            }
            {
                auto csvTypes = winrt::single_threaded_vector<winrt::hstring>();
                csvTypes.Append(L".csv");
                picker.FileTypeChoices().Insert(L"CSV", csvTypes);
            }
            
            // Show the picker (runs on UI thread)
            auto file = co_await picker.PickSaveFileAsync();
            
            if (file != nullptr)
            {
                // Decode base64 string to bytes using Windows APIs
                auto buffer = winrt::Windows::Security::Cryptography::CryptographicBuffer::DecodeFromBase64String(capturedBase64);
                
                // Write buffer to file (can run on background thread)
                co_await winrt::resume_background();
                co_await winrt::Windows::Storage::FileIO::WriteBufferAsync(file, buffer);
                
                promise.Resolve(winrt::to_hstring(file.Path()));
            }
            else
            {
                // Resolve with error indicator instead of rejecting
                promise.Resolve(winrt::to_hstring(L"ERROR:User cancelled file save"));
            }
        }
        catch (winrt::hresult_error const& ex)
        {
            auto errorMsg = L"ERROR:" + ex.message();
            promise.Resolve(winrt::to_hstring(errorMsg));
        }
        catch (...)
        {
            promise.Resolve(winrt::to_hstring(L"ERROR:Unknown error saving file"));
        }
    }
}

