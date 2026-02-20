import { useState } from 'react';
import { ChevronRight, ChevronDown, File, Folder, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { MOCK_FILE_TREE } from '@/lib/mock-data';
import type { FileNode } from '@/lib/types';

interface FileExplorerProps {
  onFileSelect: (path: string) => void;
  selectedFile: string | null;
}

const FileExplorer = ({ onFileSelect, selectedFile }: FileExplorerProps) => {
  const [search, setSearch] = useState('');
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['/src', '/src/components', '/src/lib']));

  const toggleFolder = (path: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const filterTree = (nodes: FileNode[], query: string): FileNode[] => {
    if (!query) return nodes;
    return nodes.reduce<FileNode[]>((acc, node) => {
      if (node.type === 'file' && node.name.toLowerCase().includes(query.toLowerCase())) {
        acc.push(node);
      } else if (node.type === 'folder' && node.children) {
        const filtered = filterTree(node.children, query);
        if (filtered.length > 0) acc.push({ ...node, children: filtered });
      }
      return acc;
    }, []);
  };

  const tree = filterTree(MOCK_FILE_TREE, search);

  return (
    <div className="flex h-full flex-col bg-card">
      <div className="border-b border-border p-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search files..."
            className="h-8 pl-8 text-xs bg-secondary/50 border-border"
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto scrollbar-thin p-1">
        {tree.map(node => (
          <TreeNode
            key={node.path}
            node={node}
            depth={0}
            expanded={expandedFolders}
            onToggle={toggleFolder}
            onSelect={onFileSelect}
            selectedFile={selectedFile}
          />
        ))}
      </div>
    </div>
  );
};

const TreeNode = ({
  node,
  depth,
  expanded,
  onToggle,
  onSelect,
  selectedFile,
}: {
  node: FileNode;
  depth: number;
  expanded: Set<string>;
  onToggle: (path: string) => void;
  onSelect: (path: string) => void;
  selectedFile: string | null;
}) => {
  const isExpanded = expanded.has(node.path);
  const isSelected = node.path === selectedFile;
  const isFolder = node.type === 'folder';

  const langColor: Record<string, string> = {
    tsx: 'text-blue-400',
    ts: 'text-blue-300',
    json: 'text-yellow-400',
    md: 'text-muted-foreground',
  };

  return (
    <>
      <button
        onClick={() => isFolder ? onToggle(node.path) : onSelect(node.path)}
        className={`flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-xs transition-default hover:bg-secondary/50 ${
          isSelected ? 'bg-primary/10 text-primary' : 'text-muted-foreground'
        }`}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
      >
        {isFolder ? (
          isExpanded ? <ChevronDown className="h-3.5 w-3.5 shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0" />
        ) : (
          <span className="w-3.5" />
        )}
        {isFolder ? (
          <Folder className="h-3.5 w-3.5 shrink-0 text-primary/60" />
        ) : (
          <File className={`h-3.5 w-3.5 shrink-0 ${langColor[node.language || ''] || 'text-muted-foreground'}`} />
        )}
        <span className="truncate font-mono">{node.name}</span>
      </button>
      {isFolder && isExpanded && node.children?.map(child => (
        <TreeNode
          key={child.path}
          node={child}
          depth={depth + 1}
          expanded={expanded}
          onToggle={onToggle}
          onSelect={onSelect}
          selectedFile={selectedFile}
        />
      ))}
    </>
  );
};

export default FileExplorer;
