Set oWS = WScript.CreateObject("WScript.Shell")
strDesktop = oWS.SpecialFolders("Desktop")

'Create the shortcut
Set oLink = oWS.CreateShortcut(strDesktop & "\LyP Gestion.lnk")

'Path to the batch file
Dim scriptDir
scriptDir = Left(WScript.ScriptFullName, InStrRev(WScript.ScriptFullName, "\"))
oLink.TargetPath = scriptDir & "start_app.bat"
oLink.WorkingDirectory = scriptDir

'Icon — use the server node_modules icon or fallback to system
oLink.IconLocation = "%SystemRoot%\System32\imageres.dll, 20"

oLink.Description = "LyP Gestion Juridica — Iniciar la aplicacion"
oLink.WindowStyle = 1
oLink.Save

MsgBox "Acceso directo 'LyP Gestion' creado en el Escritorio.", 64, "LyP Gestion"
