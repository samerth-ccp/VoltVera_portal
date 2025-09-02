import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, ChevronDown, TrendingUp, DollarSign } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface BinaryTreeNode {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  packageAmount: string | null;
  idStatus: string | null;
  position: string | null;
  level: string | null;
  leftChild?: BinaryTreeNode;
  rightChild?: BinaryTreeNode;
}

interface TreeNodeProps {
  node: BinaryTreeNode | null;
  position: 'root' | 'left' | 'right';
  onNodeClick?: (node: BinaryTreeNode) => void;
}

const TreeNode = ({ node, position, onNodeClick }: TreeNodeProps) => {
  if (!node) {
    return (
      <div className="flex flex-col items-center">
        <div className="w-32 h-20 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg flex items-center justify-center bg-gray-50 dark:bg-gray-800/50">
          <div className="text-center">
            <Users className="h-6 w-6 text-gray-400 mx-auto mb-1" />
            <p className="text-xs text-gray-500">Open Position</p>
            <Badge variant="outline" className="text-xs mt-1">
              {position === 'left' ? 'Left' : 'Right'}
            </Badge>
          </div>
        </div>
      </div>
    );
  }

  const displayName = `${node.firstName || 'Unknown'} ${node.lastName || ''}`.trim();
  const isActive = node.idStatus === 'Active';

  return (
    <div className="flex flex-col items-center">
      <Card 
        className={`w-32 cursor-pointer transition-all hover:shadow-lg hover:-translate-y-1 ${
          isActive ? 'border-green-500 dark:border-green-400' : 'border-gray-300 dark:border-gray-600'
        }`}
        onClick={() => onNodeClick?.(node)}
      >
        <CardContent className="p-3">
          <div className="text-center">
            <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-teal-600 rounded-full flex items-center justify-center text-white font-semibold text-xs mx-auto mb-2">
              {(node.firstName?.[0] || '?')}{(node.lastName?.[0] || '')}
            </div>
            <h4 className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate">
              {displayName}
            </h4>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
              {node.email}
            </p>
            <div className="mt-2 space-y-1">
              <Badge 
                variant={isActive ? 'default' : 'secondary'}
                className={`text-xs ${isActive ? 'bg-green-600' : ''}`}
              >
                {node.idStatus || 'Inactive'}
              </Badge>
              {node.packageAmount && (
                <div className="flex items-center justify-center text-xs text-green-600 dark:text-green-400">
                  <DollarSign className="h-3 w-3 mr-1" />
                  {node.packageAmount}
                </div>
              )}
              <Badge variant="outline" className="text-xs">
                {position === 'root' ? 'You' : position === 'left' ? 'Left' : 'Right'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const BinaryTreeLevel = ({ 
  leftNode, 
  rightNode, 
  onNodeClick 
}: { 
  leftNode: BinaryTreeNode | null; 
  rightNode: BinaryTreeNode | null;
  onNodeClick?: (node: BinaryTreeNode) => void;
}) => {
  return (
    <div className="flex justify-center items-center space-x-8 md:space-x-16">
      <TreeNode node={leftNode} position="left" onNodeClick={onNodeClick} />
      <TreeNode node={rightNode} position="right" onNodeClick={onNodeClick} />
    </div>
  );
};

export default function BinaryTreeView() {
  const { user } = useAuth();

  const { data: treeData, isLoading } = useQuery<BinaryTreeNode>({
    queryKey: ["/api/binary-tree"],
    enabled: !!user?.id,
  });

  const { data: directRecruits = [] } = useQuery<any[]>({
    queryKey: ["/api/direct-recruits"],
    enabled: !!user?.id,
  });

  const handleNodeClick = (node: BinaryTreeNode) => {
    console.log('Node clicked:', node);
    // Could implement drill-down functionality here
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Binary MLM Tree
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <Users className="h-8 w-8 text-gray-400 mx-auto mb-2 animate-pulse" />
              <p className="text-gray-500">Loading your binary tree...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Binary MLM Tree Structure
        </CardTitle>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Your binary network showing left and right positions. Each member can have maximum 2 direct recruits.
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-8">
          {/* Root Level - You */}
          <div className="flex justify-center">
            <TreeNode 
              node={user ? {
                id: user.id || '',
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email || '',
                packageAmount: (user as any).packageAmount || '0.00',
                idStatus: 'Active',
                position: 'root',
                level: '0'
              } : null} 
              position="root" 
              onNodeClick={handleNodeClick}
            />
          </div>

          {/* Connection Lines */}
          <div className="flex justify-center">
            <div className="relative w-64 h-8">
              <div className="absolute top-0 left-1/2 w-px h-4 bg-gray-300 dark:bg-gray-600 transform -translate-x-1/2"></div>
              <div className="absolute top-4 left-8 right-8 h-px bg-gray-300 dark:bg-gray-600"></div>
              <div className="absolute top-4 left-8 w-px h-4 bg-gray-300 dark:bg-gray-600"></div>
              <div className="absolute top-4 right-8 w-px h-4 bg-gray-300 dark:bg-gray-600"></div>
            </div>
          </div>

          {/* Level 1 - Binary Tree Children */}
          <BinaryTreeLevel 
            leftNode={treeData?.leftChild || null}
            rightNode={treeData?.rightChild || null}
            onNodeClick={handleNodeClick}
          />

          {/* Level 2 - Show grandchildren */}
          {(treeData?.leftChild?.leftChild || treeData?.leftChild?.rightChild || treeData?.rightChild?.leftChild || treeData?.rightChild?.rightChild) && (
            <>
              {/* Connection Lines for Level 2 */}
              <div className="flex justify-center space-x-8 md:space-x-16">
                {/* Left side connections */}
                <div className="relative w-32 h-8">
                  {treeData?.leftChild && (treeData.leftChild.leftChild || treeData.leftChild.rightChild) && (
                    <>
                      <div className="absolute top-0 left-1/2 w-px h-4 bg-gray-300 dark:bg-gray-600 transform -translate-x-1/2"></div>
                      <div className="absolute top-4 left-4 right-4 h-px bg-gray-300 dark:bg-gray-600"></div>
                      <div className="absolute top-4 left-4 w-px h-4 bg-gray-300 dark:bg-gray-600"></div>
                      <div className="absolute top-4 right-4 w-px h-4 bg-gray-300 dark:bg-gray-600"></div>
                    </>
                  )}
                </div>
                {/* Right side connections */}
                <div className="relative w-32 h-8">
                  {treeData?.rightChild && (treeData.rightChild.leftChild || treeData.rightChild.rightChild) && (
                    <>
                      <div className="absolute top-0 left-1/2 w-px h-4 bg-gray-300 dark:bg-gray-600 transform -translate-x-1/2"></div>
                      <div className="absolute top-4 left-4 right-4 h-px bg-gray-300 dark:bg-gray-600"></div>
                      <div className="absolute top-4 left-4 w-px h-4 bg-gray-300 dark:bg-gray-600"></div>
                      <div className="absolute top-4 right-4 w-px h-4 bg-gray-300 dark:bg-gray-600"></div>
                    </>
                  )}
                </div>
              </div>

              {/* Level 2 nodes */}
              <div className="flex justify-center space-x-8 md:space-x-16">
                {/* Left side level 2 */}
                <BinaryTreeLevel 
                  leftNode={treeData?.leftChild?.leftChild || null}
                  rightNode={treeData?.leftChild?.rightChild || null}
                  onNodeClick={handleNodeClick}
                />
                {/* Right side level 2 */}
                <BinaryTreeLevel 
                  leftNode={treeData?.rightChild?.leftChild || null}
                  rightNode={treeData?.rightChild?.rightChild || null}
                  onNodeClick={handleNodeClick}
                />
              </div>
            </>
          )}

          {/* Enhanced Tree Statistics */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <Users className="h-6 w-6 text-blue-500 mx-auto mb-2" />
                <p className="text-2xl font-bold">{directRecruits.length}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Direct Recruits</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4 text-center">
                <div className="w-6 h-6 bg-green-500 rounded-full mx-auto mb-2 flex items-center justify-center">
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                </div>
                <p className="text-2xl font-bold">
                  {treeData?.leftChild ? 1 : 0}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Left Position</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4 text-center">
                <div className="w-6 h-6 bg-teal-500 rounded-full mx-auto mb-2 flex items-center justify-center">
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                </div>
                <p className="text-2xl font-bold">
                  {treeData?.rightChild ? 1 : 0}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Right Position</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 text-center">
                <TrendingUp className="h-6 w-6 text-purple-500 mx-auto mb-2" />
                <p className="text-2xl font-bold">
                  {treeData?.totalBV ? parseFloat(treeData.totalBV).toFixed(2) : '0.00'}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total BV</p>
              </CardContent>
            </Card>
          </div>

          {/* Tree Performance Metrics */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-600">Left Leg Performance</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Members:</span>
                    <span className="font-medium">
                      {treeData?.leftChild ? 
                        (treeData.leftChild.leftChild ? 1 : 0) + (treeData.leftChild.rightChild ? 1 : 0) + 1 
                        : 0
                      }
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>BV:</span>
                    <span className="font-medium text-green-600">
                      ₹{treeData?.leftBV || '0.00'}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Status:</span>
                    <Badge variant={treeData?.leftChild ? 'default' : 'secondary'} className="text-xs">
                      {treeData?.leftChild ? 'Active' : 'Empty'}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-600">Right Leg Performance</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Members:</span>
                    <span className="font-medium">
                      {treeData?.rightChild ? 
                        (treeData.rightChild.leftChild ? 1 : 0) + (treeData.rightChild.rightChild ? 1 : 0) + 1 
                        : 0
                      }
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>BV:</span>
                    <span className="font-medium text-green-600">
                      ₹{treeData?.rightBV || '0.00'}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Status:</span>
                    <Badge variant={treeData?.rightChild ? 'default' : 'secondary'} className="text-xs">
                      {treeData?.rightChild ? 'Active' : 'Empty'}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-600">Tree Balance</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Left/Right Ratio:</span>
                    <span className="font-medium">
                      {treeData?.leftChild && treeData?.rightChild ? '1:1' : 
                       treeData?.leftChild || treeData?.rightChild ? '1:0' : '0:0'
                      }
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Depth:</span>
                    <span className="font-medium">
                      {Math.max(
                        treeData?.leftChild ? 2 : 1,
                        treeData?.rightChild ? 2 : 1
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Growth:</span>
                    <Badge variant="outline" className="text-xs">
                      {treeData?.leftChild && treeData?.rightChild ? 'Balanced' : 
                       treeData?.leftChild || treeData?.rightChild ? 'Growing' : 'Empty'
                      }
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Binary MLM Rules */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-lg">Binary MLM Rules</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <h4 className="font-semibold text-green-600 dark:text-green-400 mb-2">Structure</h4>
                  <ul className="space-y-1 text-gray-600 dark:text-gray-400">
                    <li>• Maximum 2 direct positions (Left & Right)</li>
                    <li>• Additional recruits spill to next available position</li>
                    <li>• Unlimited depth growth potential</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-green-600 dark:text-green-400 mb-2">Benefits</h4>
                  <ul className="space-y-1 text-gray-600 dark:text-gray-400">
                    <li>• Spillover helps fill your downline</li>
                    <li>• Balanced growth on both sides</li>
                    <li>• Team cooperation encouraged</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </CardContent>
    </Card>
  );
}