'use client';

import { useState, memo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle, SheetClose } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

function FileIcon({ name, type }: { name: string; type: string }) {
  if (type === 'dir') return <span className="mr-1">📁</span>;
  const ext = name.split('.').pop()?.toLowerCase();
  const icons: Record<string, string> = { ts: '🔷', tsx: '⚛️', js: '🟨', jsx: '⚛️', json: '📋', md: '📝', css: '🎨', html: '🌐', py: '🐍', go: '🔵', rs: '🦀', sql: '🗄️', yaml: '📄', yml: '📄', toml: '📄' };
  return <span className="mr-1">{icons[ext || ''] || '📄'}</span>;
}

const FileTree = memo(function FileTree({
  items, currentDir, selectedFile, dirStack, onNavigate, onGoBack, onOpenFile, dirName,
}: {
  items: any; currentDir: string; selectedFile: string | null; dirStack: string[];
  onNavigate: (dir: string) => void; onGoBack: () => void; onOpenFile: (file: string) => void;
  dirName: string;
}) {
  return (
    <>
      <div className="p-3 border-b border-border flex items-center gap-2">
        <span>📂</span>
        <span className="text-sm font-semibold truncate">{dirName}</span>
      </div>
      <ScrollArea className="flex-1 p-2">
        {currentDir && (
          <Button variant="ghost" size="sm" className="w-full justify-start mb-1 text-muted-foreground" onClick={onGoBack}>
            ← Kembali
          </Button>
        )}
        {items?.items?.map((item: any) => (
          <button
            key={item.path}
            onClick={() => item.type === 'dir' ? onNavigate(item.path) : onOpenFile(item.path)}
            className={cn('flex items-center gap-1 w-full px-2 py-1 rounded text-sm text-left hover:bg-accent',
              selectedFile === item.path ? 'bg-accent text-accent-foreground' : '')}
          >
            <FileIcon name={item.name} type={item.type} />
            <span className="truncate flex-1">{item.name}</span>
            {item.type === 'file' && item.size > 0 && (
              <span className="text-xs text-muted-foreground">{item.size > 1024 ? `${(item.size / 1024).toFixed(1)}KB` : `${item.size}B`}</span>
            )}
          </button>
        ))}
        {items?.items?.length === 0 && <p className="text-xs text-muted-foreground px-2 py-4 text-center">Kosong</p>}
      </ScrollArea>
    </>
  );
});

const MobileFileSheet = memo(function MobileFileSheet({
  items, currentDir, selectedFile, dirStack, onNavigate, onGoBack, onOpenFile, dirName,
}: {
  items: any; currentDir: string; selectedFile: string | null; dirStack: string[];
  onNavigate: (dir: string) => void; onGoBack: () => void; onOpenFile: (file: string) => void;
  dirName: string;
}) {
  return (
    <Sheet>
      <SheetTrigger
        render={
          <Button variant="outline" size="sm" className="flex items-center gap-1">
            <span>📂</span>
            Files
          </Button>
        }
      />
      <SheetContent side="left" className="w-72 p-0">
        <div className="p-3 border-b border-border flex items-center gap-2">
          <span>📂</span>
          <span className="text-sm font-semibold truncate">{dirName}</span>
        </div>
        <ScrollArea className="flex-1 p-2">
          {currentDir && (
            <Button variant="ghost" size="sm" className="w-full justify-start mb-1 text-muted-foreground" onClick={onGoBack}>
              ← Kembali
            </Button>
          )}
          {items?.items?.map((item: any) => (
            <SheetClose key={item.path} onClick={() => item.type === 'dir' ? onNavigate(item.path) : onOpenFile(item.path)}
              className={cn('flex items-center gap-1 w-full px-2 py-1 rounded text-sm text-left hover:bg-accent',
                selectedFile === item.path ? 'bg-accent text-accent-foreground' : '')}
            >
              <FileIcon name={item.name} type={item.type} />
              <span className="truncate flex-1">{item.name}</span>
              {item.type === 'file' && item.size > 0 && (
                <span className="text-xs text-muted-foreground">{item.size > 1024 ? `${(item.size / 1024).toFixed(1)}KB` : `${item.size}B`}</span>
              )}
            </SheetClose>
          ))}
          {items?.items?.length === 0 && <p className="text-xs text-muted-foreground px-2 py-4 text-center">Kosong</p>}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
});

export default function FilesPage() {
  const { data: dirInfo } = useQuery({ queryKey: ['project-dir'], queryFn: api.projectDir.info });
  const [currentDir, setCurrentDir] = useState('');
  const [dirStack, setDirStack] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [loadingContent, setLoadingContent] = useState(false);

  const { data: items, refetch: refetchDir } = useQuery({
    queryKey: ['project-dir-list', currentDir],
    queryFn: () => api.projectDir.list(currentDir || undefined),
  });

  const navigate = (dir: string) => {
    setDirStack((prev) => [...prev, currentDir]);
    setCurrentDir(dir);
    setSelectedFile(null);
    setFileContent(null);
  };

  const goBack = () => {
    const prev = dirStack[dirStack.length - 1];
    setDirStack((prev) => prev.slice(0, -1));
    setCurrentDir(prev);
    setSelectedFile(null);
    setFileContent(null);
  };

  const openFile = async (file: string) => {
    setSelectedFile(file);
    setLoadingContent(true);
    try {
      const res = await api.projectDir.read(file);
      setFileContent(res.content);
    } catch {
      setFileContent('// Error reading file');
    } finally {
      setLoadingContent(false);
    }
  };

  const dirName = dirInfo?.path?.split('/').pop() || 'Workspace';

  return (
    <div className="flex h-full">
      {/* Desktop sidebar */}
      <div className="hidden md:flex w-72 border-r border-border flex-col shrink-0">
        <FileTree
          items={items}
          currentDir={currentDir}
          selectedFile={selectedFile}
          dirStack={dirStack}
          onNavigate={navigate}
          onGoBack={goBack}
          onOpenFile={openFile}
          dirName={dirName}
        />
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        {!selectedFile ? (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-4">
            <div className="md:hidden">
              <MobileFileSheet
                items={items}
                currentDir={currentDir}
                selectedFile={selectedFile}
                dirStack={dirStack}
                onNavigate={navigate}
                onGoBack={goBack}
                onOpenFile={openFile}
                dirName={dirName}
              />
            </div>
            <p className="text-sm">Pilih file untuk dilihat</p>
          </div>
        ) : (
          <>
            <div className="p-3 border-b border-border text-sm text-muted-foreground flex items-center gap-2">
              <div className="md:hidden">
                <MobileFileSheet
                  items={items}
                  currentDir={currentDir}
                  selectedFile={selectedFile}
                  dirStack={dirStack}
                  onNavigate={navigate}
                  onGoBack={goBack}
                  onOpenFile={openFile}
                  dirName={dirName}
                />
              </div>
              <span className="truncate">📄 {selectedFile}</span>
            </div>
            <ScrollArea className="flex-1 p-4">
              {loadingContent ? (
                <div className="space-y-2">
                  {[...Array(10)].map((_, i) => <Skeleton key={i} className="h-4 w-full" />)}
                </div>
              ) : (
                <pre className="text-sm text-foreground whitespace-pre-wrap font-mono leading-relaxed">
                  {fileContent}
                </pre>
              )}
            </ScrollArea>
          </>
        )}
      </div>
    </div>
  );
}