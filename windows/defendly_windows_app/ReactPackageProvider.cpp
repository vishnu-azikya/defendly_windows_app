#include "pch.h"
#include "ReactPackageProvider.h"
#include "NativeModules.h"
#include "FileSaveModule.h"

using namespace winrt::Microsoft::ReactNative;
using namespace winrt::defendly_windows_app::implementation;

namespace winrt::defendly_windows_app::implementation
{

void ReactPackageProvider::CreatePackage(IReactPackageBuilder const &packageBuilder) noexcept
{
    // STEP 1: Force the module to be linked by creating a global instance
    // This prevents WholeProgramOptimization from removing the module
    RegisterFileSaveModule(packageBuilder);
    
    // STEP 2: Reference the global instance to ensure it's not optimized away
    // This is critical for WholeProgramOptimization in Release builds
    if (g_fileSaveModuleInstance != nullptr) {
        (void)g_fileSaveModuleInstance;
    }
    
    // STEP 3: Call AddAttributedModules to register all REACT_MODULE decorated modules
    // The explicit references above ensure the module registration metadata
    // is preserved even with WholeProgramOptimization enabled
    AddAttributedModules(packageBuilder);
}

} // namespace winrt::defendly_windows_app::implementation
