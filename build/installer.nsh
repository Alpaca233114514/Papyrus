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
  ; Prompt user to delete user data
  !insertmacro MUI_UNPAGE_CONFIRM
  Var /GLOBAL DELETE_USER_DATA

  ; Custom page to ask about deleting user data
  !define MUI_PAGE_CUSTOMFUNCTION_PRE un.ConfirmDataDelete
  !insertmacro MUI_UNPAGE_INSTFILES

  !macro un.ConfirmDataDelete
    MessageBox MB_YESNO|MB_ICONQUESTION "是否要删除所有用户数据（笔记、卡片、配置等）？$\r$\n注意：此操作不可恢复！" /SD IDNO IDYES un.DeleteData IDNO un.SkipDataDelete
  !macroend

  !macro un.DeleteData
    StrCpy $DELETE_USER_DATA "1"
  !macroend

  !macro un.SkipDataDelete
    StrCpy $DELETE_USER_DATA "0"
  !macroend

  Section "Cleanup User Data" SEC02
    ${If} $DELETE_USER_DATA == "1"
      ; Delete user data from %APPDATA%\Papyrus or %USERPROFILE%\PapyrusData
      RMDir /r "$APPDATA\Papyrus"
      RMDir /r "$USERPROFILE\PapyrusData"
      Delete "$APPDATA\papyrus.db"
    ${EndIf}
  SectionEnd
!macroend
