; NSIS Installer Script for Papyrus
; Placeholder for future custom installation steps

!macro customInit
  ; Runs at installer initialization
!macroend

!macro customInstall
  ; Override DisplayName to ensure it never includes version number
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${UNINSTALL_REGISTRY_KEY}" "DisplayName" "Papyrus Desktop"
!macroend

!macro customUninstall
  ; Runs during uninstallation
!macroend
