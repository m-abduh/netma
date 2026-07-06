'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

function FileIcon({ name, type }: { name: string; type: string }) {
  if (type === 'dir') return <span className="mr-1">📁</span>;
  const ext = name.split('.').pop()?.toLowerCase();
  const icons: Record<string, string> = { ts: '🔷', tsx: '⚛️', js: '🟨', jsx: '⚛️', json: '📋', md: '📝', css: '🎨', html: '🌐', py: '🐍', go: '🔵', rs: '🦀', sql: '🗄️', yaml: '📄', yml: '📄', toml: '📄' };
  return <span className="mr-1">{icons[ext || ''] || '📄'}</span>;
}

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

  const breadcrumbs = [{ name: dirInfo?.path?.split('/').pop() || 'workspace', dir: '' }, ...dirStack.map((d, i) => ({ name: d.split('/').pop() || d, dir: dirStack.slice(0, i + 1).join('/') }))];

  return (
    <div className="flex h-full">
      <div className="w-72 border-r border-slate-700 flex flex-col shrink-0">
        <div className="p-3 border-b border-slate-700 flex items-center gap-2">
          <span>📂</span>
          <span className="text-sm font-semibold truncate">{dirInfo?.path?.split('/').pop() || 'Workspace'}</span>
        </div>
        <div className="flex-1 overflow-auto p-2 space-y-0.5">
          {currentDir && (
            <button onClick={goBack} className="flex items-center gap-1 w-full px-2 py-1 rounded text-sm text-slate-400 hover:text-white hover:bg-slate-700">
              ← Kembali
            </button>
          )}
          {items?.items?.map((item: any) => (
            <button
              key={item.path}
              onClick={() => item.type === 'dir' ? navigate(item.path) : openFile(item.path)}
              className={`flex items-center gap-1 w-full px-2 py-1 rounded text-sm text-left hover:bg-slate-700 ${
                selectedFile === item.path ? 'bg-slate-700 text-blue-400' : 'text-slate-300'
              }`}
            >
              <FileIcon name={item.name} type={item.type} />
              <span className="truncate">{item.name}</span>
              {item.type === 'file' && item.size > 0 && (
                <span className="ml-auto text-xs text-slate-600">{item.size > 1024 ? `${(item.size / 1024).toFixed(1)}KB` : `${item.size}B`}</span>
              )}
            </button>
          ))}
          {items?.items?.length === 0 && <p className="text-xs text-slate-500 px-2 py-4 text-center">Kosong</p>}
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        {!selectedFile ? (
          <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">
            Pilih file dari sidebar
          </div>
        ) : (
          <>
            <div className="p-3 border-b border-slate-700 text-sm text-slate-400 truncate">
              📄 {selectedFile}
            </div>
            <div className="flex-1 overflow-auto p-4">
              {loadingContent ? (
                <div className="text-slate-500 italic">Loading...</div>
              ) : (
                <pre className="text-sm text-slate-200 whitespace-pre-wrap font-mono leading-relaxed">
                  {fileContent}
                </pre>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
