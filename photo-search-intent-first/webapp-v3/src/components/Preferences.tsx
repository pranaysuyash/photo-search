import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { useElectronBridge } from "@/hooks/useElectronBridge"
import { cn } from "@/lib/utils"

interface PreferencesProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function Preferences({ open, onOpenChange }: PreferencesProps) {
  const { isElectron, getStoreSetting, setStoreSetting } = useElectronBridge()

  const [settings, setSettings] = useState({
    autoStartBackend: false,
    autoIndexing: true,
    enableAnalytics: false,
    theme: 'system' as const,
  })

  const [recentDirectories, setRecentDirectories] = useState<string[]>([])

  // Load settings from Electron store
  useEffect(() => {
    if (!isElectron) return

    const loadSettings = async () => {
      try {
        const autoStart = await getStoreSetting('autoStartBackend')
        const autoIndex = await getStoreSetting('autoIndexing')
        const analytics = await getStoreSetting('enableAnalytics')
        const savedTheme = await getStoreSetting('theme')

        setSettings({
          autoStartBackend: Boolean(autoStart),
          autoIndexing: autoIndex !== false, // default true
          enableAnalytics: Boolean(analytics),
          theme: savedTheme || 'system',
        })
      } catch (error) {
        console.warn('Failed to load settings:', error)
      }
    }

    loadSettings()
  }, [isElectron, getStoreSetting])

  // Load recent directories
  useEffect(() => {
    if (!isElectron) return

    const loadRecent = async () => {
      try {
        const recent = await getStoreSetting('photoDirectories')
        setRecentDirectories(Array.isArray(recent) ? recent : [])
      } catch (error) {
        console.warn('Failed to load recent directories:', error)
      }
    }

    loadRecent()
  }, [isElectron, getStoreSetting])

  const handleSettingChange = async (key: string, value: boolean | string) => {
    try {
      await setStoreSetting(key, value)
      setSettings(prev => ({ ...prev, [key]: value }))
    } catch (error) {
      console.error(`Failed to save setting ${key}:`, error)
    }
  }

  const clearRecentDirectories = async () => {
    try {
      await setStoreSetting('photoDirectories', [])
      setRecentDirectories([])
    } catch (error) {
      console.error('Failed to clear recent directories:', error)
    }
  }

  const removeRecentDirectory = async (dir: string) => {
    const filtered = recentDirectories.filter(d => d !== dir)
    try {
      await setStoreSetting('photoDirectories', filtered)
      setRecentDirectories(filtered)
    } catch (error) {
      console.error('Failed to remove directory:', error)
    }
  }

  if (!isElectron) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Preferences</DialogTitle>
          </DialogHeader>
          <div className="py-4 text-center text-sm text-slate-500">
            Preferences are only available in the desktop application
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Preferences</DialogTitle>
          <DialogDescription>
            Customize your Photo Search experience
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-6 py-4 overflow-auto">
          {/* General Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">General</CardTitle>
              <CardDescription>Basic application settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium">Theme</Label>
                  <p className="text-sm text-slate-500">Choose your preferred theme</p>
                </div>
                <div className="flex gap-2">
                  {(['light', 'dark', 'system'] as const).map((themeOption) => (
                    <Button
                      key={themeOption}
                      variant={settings.theme === themeOption ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleSettingChange('theme', themeOption)}
                      className={cn(
                        "capitalize",
                        settings.theme === themeOption && "bg-slate-900 text-white dark:bg-slate-50 dark:text-slate-900"
                      )}
                    >
                      {themeOption}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-sm font-medium">Auto-start Backend</span>
                  <p className="text-sm text-slate-500">
                    Start backend service when opening the app
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.autoStartBackend}
                  onChange={(e) => handleSettingChange('autoStartBackend', e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-sm font-medium">Auto-indexing</span>
                  <p className="text-sm text-slate-500">
                    Automatically index new photos
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.autoIndexing}
                  onChange={(e) => handleSettingChange('autoIndexing', e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-sm font-medium">Enable Analytics</span>
                  <p className="text-sm text-slate-500">
                    Collect usage analytics
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.enableAnalytics}
                  onChange={(e) => handleSettingChange('enableAnalytics', e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
                />
              </div>
            </CardContent>
          </Card>

          {/* Recent Directories */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Recent Directories</CardTitle>
              <CardDescription>
                Manage your recently opened photo libraries
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-32 overflow-auto">
                {recentDirectories.length === 0 ? (
                  <p className="text-sm text-slate-500 italic">No recent directories</p>
                ) : (
                  <>
                    {recentDirectories.map((dir, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-2 bg-slate-50 rounded dark:bg-slate-800"
                      >
                        <span className="text-sm truncate flex-1" title={dir}>
                          {dir}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeRecentDirectory(dir)}
                          className="ml-2"
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={clearRecentDirectories}
                      className="mt-2"
                    >
                      Clear All
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Export & Backup */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Export & Backup</CardTitle>
              <CardDescription>
                Manage your data and backups
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" className="w-full justify-start">
                Export Library Settings
              </Button>
              <Button variant="outline" className="w-full justify-start">
                Import Library Settings
              </Button>
              <Button variant="outline" className="w-full justify-start">
                Reset to Defaults
              </Button>
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}