export function EmptyState() {
  return (
    <div className="bg-background flex min-h-screen flex-1 items-center justify-center">
      <div className="mx-auto max-w-lg px-8 py-12 text-center">
        {/* Main Message */}
        <div className="mb-8 space-y-4">
          <h1 className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-2xl leading-tight font-bold text-transparent">
            Ready to capture your thoughts?
          </h1>
          <p className="text-muted-foreground leading-relaxed">
            Select a note from the sidebar or create a new one to start writing
            your next big idea!
          </p>
        </div>

        {/* Action Hints */}
        <div className="mb-8 space-y-6">
          <div className="flex flex-wrap justify-center gap-4">
            <div className="group bg-card border-border flex items-center gap-3 rounded-xl border px-4 py-3 shadow-md transition-all hover:shadow-lg">
              <div className="flex items-center gap-1">
                <kbd className="bg-muted text-muted-foreground rounded-md px-2 py-1 font-mono text-xs">
                  Ctrl
                </kbd>
                <span className="text-muted-foreground">+</span>
                <kbd className="bg-muted text-muted-foreground rounded-md px-2 py-1 font-mono text-xs">
                  N
                </kbd>
              </div>
              <span className="text-muted-foreground text-sm font-medium">
                New note
              </span>
            </div>
            <div className="group bg-card border-border flex items-center gap-3 rounded-xl border px-4 py-3 shadow-md transition-all hover:shadow-lg">
              <div className="flex items-center gap-1">
                <kbd className="bg-muted text-muted-foreground rounded-md px-2 py-1 font-mono text-xs">
                  Ctrl
                </kbd>
                <span className="text-muted-foreground">+</span>
                <kbd className="bg-muted text-muted-foreground rounded-md px-2 py-1 font-mono text-xs">
                  F
                </kbd>
              </div>
              <span className="text-muted-foreground text-sm font-medium">
                Search
              </span>
            </div>
          </div>
        </div>

        {/* Motivational Quote */}
        <div className="border-border border-t pt-8">
          <blockquote className="text-md text-muted-foreground mb-3 italic">
            &ldquo;The best time to plant a tree was 20 years ago. The second
            best time is now.&rdquo;
          </blockquote>
          <p className="text-muted-foreground/80 text-sm">
            — Ancient Proverb <span className="text-lg">📝</span> (applies to
            note-taking too!)
          </p>
        </div>

        {/* Decorative Elements */}
        <div className="absolute top-1/2 left-1/2 -z-10 -translate-x-1/2 -translate-y-1/2 transform">
          <div className="bg-primary/5 h-96 w-96 rounded-full blur-3xl"></div>
        </div>
      </div>
    </div>
  );
}
