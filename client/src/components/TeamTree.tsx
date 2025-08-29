import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight, Search, Users } from "lucide-react";
import { User } from "@shared/schema";

interface TeamTreeProps {
  userId?: string;
}

interface TreeNode extends User {
  children?: TreeNode[];
  isExpanded?: boolean;
}

export default function TeamTree({ userId }: TeamTreeProps) {
  const [search, setSearch] = useState('');
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  // Fetch downline data
  const { data: downline = [], isLoading } = useQuery<User[]>({
    queryKey: ["/api/team/downline"],
    enabled: !!userId,
  });

  // Build tree structure
  const buildTree = (users: User[]): TreeNode[] => {
    const userMap = new Map<string, TreeNode>();
    const roots: TreeNode[] = [];

    // Initialize all users
    users.forEach(user => {
      userMap.set(user.id, { ...user, children: [], isExpanded: expandedNodes.has(user.id) });
    });

    // Build relationships
    users.forEach(user => {
      const node = userMap.get(user.id);
      if (!node) return;

      if (user.sponsorId && userMap.has(user.sponsorId)) {
        const parent = userMap.get(user.sponsorId);
        if (parent) {
          parent.children = parent.children || [];
          parent.children.push(node);
        }
      } else if (user.sponsorId === userId) {
        roots.push(node);
      }
    });

    return roots;
  };

  const toggleExpanded = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  const renderTreeNode = (node: TreeNode, level: number = 0) => {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expandedNodes.has(node.id);
    const shouldShow = !search || 
      node.firstName?.toLowerCase().includes(search.toLowerCase()) ||
      node.lastName?.toLowerCase().includes(search.toLowerCase()) ||
      node.email?.toLowerCase().includes(search.toLowerCase());

    if (!shouldShow) return null;

    const getStatusColor = (status: string) => {
      switch (status) {
        case 'active': return 'bg-green-500';
        case 'pending': return 'bg-yellow-500';
        case 'inactive': return 'bg-red-500';
        default: return 'bg-gray-500';
      }
    };

    return (
      <div key={node.id} className="w-full">
        <div 
          className={`flex items-center gap-2 p-3 border rounded-lg bg-white dark:bg-gray-800 shadow-sm hover:shadow-md transition-shadow ml-${level * 6}`}
        >
          {hasChildren && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => toggleExpanded(node.id)}
              className="p-1 h-6 w-6"
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
          )}
          
          {!hasChildren && <div className="w-6" />}
          
          <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-teal-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
            {node.firstName?.[0]}{node.lastName?.[0]}
          </div>
          
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-sm">{node.firstName} {node.lastName}</h3>
              <Badge className={`${getStatusColor(node.status)} text-white text-xs`}>
                {node.status}
              </Badge>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400">{node.email}</p>
          </div>
          
          {hasChildren && (
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <Users className="h-3 w-3" />
              {node.children?.length}
            </div>
          )}
        </div>
        
        {hasChildren && isExpanded && (
          <div className="ml-6 mt-2 space-y-2 border-l-2 border-gray-200 dark:border-gray-700 pl-4">
            {node.children?.map(child => renderTreeNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  const treeData = buildTree(downline);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Team Hierarchy Tree
          </CardTitle>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search team members..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8">Loading team tree...</div>
        ) : treeData.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No team members found. Start recruiting to build your network!
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {treeData.map(node => renderTreeNode(node))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}