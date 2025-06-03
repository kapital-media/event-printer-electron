  :: START OF SCRIPT

:: Retrieve list of MOF, MFL files excluding any that contain "Uninstall" "Remove" or "AutoRecover", and retrieve DLL File List 

dir /b /s %systemroot%\system32\wbem\*.mof | findstr /vi "Uninstall" | findstr /vi "Remove" | findstr /vi "AutoRecover" > %temp%\MOF-list.txt
dir /b /s %systemroot%\system32\wbem\*.mfl | findstr /vi "Uninstall" | findstr /vi "Remove" > %temp%\MFL-List.txt
dir /b /s %systemroot%\system32\wbem\*.dll > %temp%\DLL-List.txt

:: Set Services to manual and stopped state for Microsoft Storage Spaces (SMPHost)  and Volume Shadow Copy (VSS) prior to repository reset
:: If these are not set to manual and are not stopped, could have volume issues on some WMI queries in the future such as bitlock Volume Status
sc config vss start= demand
sc config smphost start= demand
sc stop SMPHost
sc stop vss

:: Disable and Stop winmgmt service (Windows Management Instrumentation)
sc config winmgmt start= disabled
net stop winmgmt /y

:: This line resets the WMI repository, which renames current repository folder %systemroot%\system32\wbem\Repository to Repository.001 
:: Repository will automatically be recreated and rebuilt
winmgmt /resetrepository

:: These DLL Registers will help fix broken GPUpdate 
regsvr32 /s %systemroot%\system32\scecli.dll
regsvr32 /s %systemroot%\system32\userenv.dll

:: These dll registers help ensure all DLLs for WMI are registered:
for /F "tokens=*" %%t in (%temp%\DLL-List.txt) do regsvr32 /s %%t

:: Enable winmgmt service (WMI)
sc config winmgmt start= auto

:: Start Windows Management Instrumentation (Winmgmt)

for /F "tokens=3 delims=: " %%H in ('sc query "winmgmt" ^| findstr "        STATE"') do (
if /I "%%H" NEQ "RUNNING" (
net start "winmgmt"
)
)

:: Timeout to let WMI Service start
timeout /t 15 /nobreak > NUL

:: Parse MOF and MFL files to add classes and class instances to WMI repository
for /F "tokens=*" %%A in (%temp%\MOF-List.txt) do mofcomp %%A
for /F "tokens=*" %%B in (%temp%\MFL-List.txt) do mofcomp %%B

:: Cleanup temp files created 
    
if exist %temp%\MOF-List.txt del %temp%\MOF-list.txt
if exist %temp%\MFL-List.txt del %temp%\MFL-list.txt
if exist %temp%\DLL-List.txt del %temp%\DLL-list.txt

:: END OF SCRIPT