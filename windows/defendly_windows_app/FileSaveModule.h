#pragma once

#include "pch.h"
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
        void Initialize(winrt::Microsoft::ReactNative::ReactContext const& reactContext) noexcept
        {
            m_reactContext = reactContext;
        }

        REACT_METHOD(SaveFile, L"saveFile")
        void SaveFile(
            winrt::hstring const& base64Data,
            winrt::hstring const& fileName,
            winrt::Microsoft::ReactNative::ReactPromise<winrt::hstring> promise) noexcept
        {
            auto capturedBase64 = base64Data;
            auto capturedFileName = fileName;
            
            // Run async operation
            SaveFileAsync(capturedBase64, capturedFileName, promise);
        }

    private:
        winrt::Windows::Foundation::IAsyncAction SaveFileAsync(
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

    private:
        winrt::Microsoft::ReactNative::ReactContext m_reactContext{ nullptr };
    };
}

