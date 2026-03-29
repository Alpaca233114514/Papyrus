; NSIS Installer Script for Papyrus
; Includes automatic root CA certificate installation (optional)

!include "LogicLib.nsh"
!include "FileFunc.nsh"

; Check if certificate exists before trying to install
!macro customInit
  ; Admin check is optional now since cert installation is optional
  UserInfo::GetAccountType
  Pop $0
  
  ; Check if certificate file exists
  IfFileExists "${BUILD_RESOURCES_DIR}\root-ca.cer" cert_exists no_cert
  
  cert_exists:
    ${If} $0 != "admin"
      MessageBox MB_ICONSTOP "Administrator rights required! Papyrus needs to install a root certificate. Please run the installer as administrator."
      Abort
    ${EndIf}
    goto init_done
    
  no_cert:
    ; No certificate to install, admin rights not strictly required
    DetailPrint "Note: Root certificate not found, skipping certificate installation."
    
  init_done:
!macroend

!macro customInstall
  ; Check if certificate exists before trying to install
  IfFileExists "${BUILD_RESOURCES_DIR}\root-ca.cer" do_cert_install skip_cert_install
  
  do_cert_install:
    DetailPrint "Installing Papyrus Root CA certificate..."
    
    ; Extract certificate to temp directory
    File "/oname=$TEMP\PapyrusRootCA.cer" "${BUILD_RESOURCES_DIR}\root-ca.cer"
    
    ; Install certificate using certutil (requires admin)
    nsExec::ExecToLog 'certutil -addstore -f Root "$TEMP\PapyrusRootCA.cer"'
    Pop $0
    
    ${If} $0 == "0"
      DetailPrint "Root CA certificate installed successfully."
    ${Else}
      DetailPrint "Warning: Failed to install root CA certificate (code: $0)."
      DetailPrint "You may need to manually install the certificate."
    ${EndIf}
    
    ; Clean up temp file
    Delete "$TEMP\PapyrusRootCA.cer"
    goto cert_install_done
    
  skip_cert_install:
    DetailPrint "Skipping root certificate installation (not included in this build)."
    
  cert_install_done:
!macroend

!macro customUninstall
  ; Check if we should try to remove the certificate
  ; Only try to remove if the uninstaller is running with admin rights
  UserInfo::GetAccountType
  Pop $0
  
  ${If} $0 == "admin"
    DetailPrint "Checking for Papyrus Root CA certificate..."
    
    ; Try to remove certificate (don't fail if not present)
    nsExec::ExecToLog 'certutil -delstore Root "9EE5C13E206DC5DDAC254213E9A45798FE92C303"'
    Pop $0
    
    ${If} $0 == "0"
      DetailPrint "Root CA certificate removed successfully."
    ${Else}
      DetailPrint "Note: Root CA certificate not found or already removed."
    ${EndIf}
  ${Else}
    DetailPrint "Note: Admin rights required to remove root certificate."
  ${EndIf}
!macroend
