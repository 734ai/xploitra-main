import { Shield, Search, List, BarChart3, Settings, AlertTriangle } from "lucide-react";

export function Sidebar() {
  return (
    <aside className="w-64 bg-card shadow-lg border-r border-border flex-shrink-0 relative">
      <div className="p-6">
        {/* Logo */}
        <div className="flex items-center space-x-2 mb-8">
          <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary/80 rounded-lg flex items-center justify-center">
            <Shield className="text-primary-foreground text-sm" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Xploitra</h1>
            <p className="text-xs text-muted-foreground">AI Security Scanner</p>
          </div>
        </div>
        
        {/* Navigation */}
        <nav className="space-y-2">
          <a href="#" className="flex items-center space-x-3 px-3 py-2 bg-primary/10 text-primary rounded-lg font-medium">
            <Search className="w-4 h-4" />
            <span>New Scan</span>
          </a>
          <a href="#" className="flex items-center space-x-3 px-3 py-2 text-muted-foreground hover:bg-muted rounded-lg">
            <List className="w-4 h-4" />
            <span>Scan History</span>
          </a>
          <a href="#" className="flex items-center space-x-3 px-3 py-2 text-muted-foreground hover:bg-muted rounded-lg">
            <BarChart3 className="w-4 h-4" />
            <span>Reports</span>
          </a>
          <a href="#" className="flex items-center space-x-3 px-3 py-2 text-muted-foreground hover:bg-muted rounded-lg">
            <Settings className="w-4 h-4" />
            <span>Settings</span>
          </a>
        </nav>
      </div>
      
      {/* Ethical Use Disclaimer */}
      <div className="absolute bottom-0 w-64 p-4 bg-amber-50 dark:bg-amber-950/30 border-t border-amber-200 dark:border-amber-800/30">
        <div className="flex items-start space-x-2">
          <AlertTriangle className="text-amber-600 dark:text-amber-400 text-sm mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-xs text-amber-800 dark:text-amber-200 font-medium">Ethical Use Only</p>
            <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">Only scan systems you own or have explicit permission to test.</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
