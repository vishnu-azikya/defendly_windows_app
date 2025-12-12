#include "pch.h"
#include "ReactPackageProvider.h"
#include "NativeModules.h"
#include "FileSaveModule.h"

using namespace winrt::Microsoft::ReactNative;

namespace winrt::defendly_windows_app::implementation
{

void ReactPackageProvider::CreatePackage(IReactPackageBuilder const &packageBuilder) noexcept
{
    AddAttributedModules(packageBuilder, true);
}

} // namespace winrt::defendly_windows_app::implementation
