$action = New-ScheduledTaskAction -Execute "wsl.exe" -Argument "-d Ubuntu -u root service cron start"
$trigger = New-ScheduledTaskTrigger -AtLogOn
$settings = New-ScheduledTaskSettingsSet -ExecutionTimeLimit (New-TimeSpan -Minutes 1)
Register-ScheduledTask -TaskName "WSL-Cron-AutoStart" -Action $action -Trigger $trigger -Settings $settings -RunLevel Highest -Force
Write-Output "WSL cron 自動啟動設定完成"
