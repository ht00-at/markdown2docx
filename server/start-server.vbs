Set WshShell = CreateObject("WScript.Shell")
WshShell.CurrentDirectory = "D:\exporteplugin\plugin\server"
WshShell.Run "cmd /c node index.js >> logs\server.log 2>&1", 0, False
