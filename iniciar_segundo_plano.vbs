Set WshShell = CreateObject("WScript.Shell")
strCurrentDir = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName)
WshShell.CurrentDirectory = strCurrentDir
WshShell.Run "cmd /c """ & strCurrentDir & "\iniciar_bot.bat""", 0, False
