; NSIS Installer Script for Papyrus
; Includes automatic root CA certificate installation

!macro customInit
  ; Check for admin rights (required for certificate installation)
  UserInfo::GetAccountType
  Pop $0
  ${If} $0 != "admin"
    MessageBox MB_ICONSTOP "Administrator rights required!$
$
Papyrus needs to install a root certificate to verify the application signature. Please run the installer as administrator."
    Abort
  ${EndIf}
!macroend

!macro customInstall
  ; Install root CA certificate to Trusted Root Certification Authorities
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
    DetailPrint "You may need to manually install the certificate from:"
    DetailPrint "$TEMP\PapyrusRootCA.cer"
  ${EndIf}
  
  ; Clean up temp file
  Delete "$TEMP\PapyrusRootCA.cer"
!macroend

!macro customUninstall
  ; Optional: Remove root CA certificate on uninstall
  ; Comment out this section if you want to keep the certificate after uninstall
  
  DetailPrint "Removing Papyrus Root CA certificate..."
  
  ; Get the certificate hash (thumbprint) - hardcoded from generation
  ; Thumbprint: 9EE5C13E206DC5DDAC254213E9A45798FE92C303
  nsExec::ExecToLog 'certutil -delstore Root "9EE5C13E206DC5DDAC254213E9A45798FE92C303"'
  Pop $0
  
  ${If} $0 == "0"
    DetailPrint "Root CA certificate removed successfully."
  ${Else}
    DetailPrint "Note: Could not remove root CA certificate (it may have been removed already)."
  ${EndIf}
!macroend
