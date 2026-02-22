import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Package, Plus, Edit, Trash2, Upload, Image as ImageIcon, FolderPlus } from "lucide-react";
import { ObjectUploader } from "@/components/ObjectUploader";
import { apiRequest } from "@/lib/queryClient";

interface Product {
  id: string;
  name: string;
  description: string;
  price: string;
  bv: string;
  gst: string;
  sponsorIncomePercentage: string;
  category: string;
  purchaseType: 'first_purchase' | 'second_purchase';
  imageUrl?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ProductCategory {
  id: string;
  name: string;
  slug: string;
  description: string;
  isActive: boolean;
}

export default function AdminProductManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [uploadingImageFor, setUploadingImageFor] = useState<string | null>(null);
  const [showCategoriesPanel, setShowCategoriesPanel] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  const { data: categories = [], isLoading: categoriesLoading } = useQuery<ProductCategory[]>({
    queryKey: ['/api/product-categories'],
  });

  const createCategoryMutation = useMutation({
    mutationFn: async (data: { name: string; slug: string; description: string }) => {
      const response = await apiRequest('POST', '/api/admin/product-categories', data);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Category Created", description: "The category has been added." });
      setNewCategoryName('');
      queryClient.invalidateQueries({ queryKey: ['/api/product-categories'] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to create category", variant: "destructive" });
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest('DELETE', `/api/admin/product-categories/${id}`);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Category Deleted", description: "The category has been removed." });
      queryClient.invalidateQueries({ queryKey: ['/api/product-categories'] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to delete category", variant: "destructive" });
    },
  });

  const handleAddCategory = () => {
    if (!newCategoryName.trim()) return;
    const slug = newCategoryName.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    createCategoryMutation.mutate({ name: newCategoryName.trim(), slug, description: '' });
  };

  // Helper function to get the image URL (proxy for Google Cloud Storage URLs)
  const getImageUrl = (imageUrl: string | undefined) => {
    if (!imageUrl) return null;
    
    // If it's a Google Cloud Storage URL, use our proxy
    if (imageUrl.startsWith('https://storage.googleapis.com/')) {
      return `/api/images/proxy?url=${encodeURIComponent(imageUrl)}`;
    }
    
    // For other URLs (like placeholder URLs), use directly
    return imageUrl;
  };

  // Fetch all products
  const { data: products = [], isLoading } = useQuery<Product[]>({
    queryKey: ['/api/products'],
  });

  // Create product form state
  const [newProduct, setNewProduct] = useState({
    name: '',
    description: '',
    price: '',
    bv: '',
    gst: '18',
    sponsorIncomePercentage: '10',
    category: '',
    purchaseType: 'first_purchase' as 'first_purchase' | 'second_purchase',
    isActive: true,
  });

  // Create product mutation
  const createProductMutation = useMutation({
    mutationFn: async (data: typeof newProduct) => {
      const response = await apiRequest('POST', '/api/admin/products', data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Product Created",
        description: "The product has been created successfully.",
      });
      setIsCreateDialogOpen(false);
      setNewProduct({
        name: '',
        description: '',
        price: '',
        bv: '',
        gst: '18',
        sponsorIncomePercentage: '10',
        category: '',
        purchaseType: 'first_purchase',
        isActive: true,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create product",
        variant: "destructive",
      });
    },
  });

  // Update product mutation
  const updateProductMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Product> }) => {
      const response = await apiRequest('PATCH', `/api/admin/products/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Product Updated",
        description: "The product has been updated successfully.",
      });
      setIsEditDialogOpen(false);
      setSelectedProduct(null);
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update product",
        variant: "destructive",
      });
    },
  });

  // Upload product image
  const uploadImageMutation = useMutation({
    mutationFn: async ({ productId, imageUrl }: { productId: string; imageUrl: string }) => {
      const response = await apiRequest('POST', `/api/admin/products/${productId}/image`, { imageUrl });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Image Uploaded",
        description: "Product image has been updated successfully.",
      });
      setUploadingImageFor(null);
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to upload image",
        variant: "destructive",
      });
      setUploadingImageFor(null);
    },
  });

  const handleUploadImage = async (productId: string) => {
    setUploadingImageFor(productId);
  };

  const handleCreateProduct = () => {
    createProductMutation.mutate(newProduct);
  };

  const handleUpdateProduct = () => {
    if (!selectedProduct) return;
    updateProductMutation.mutate({
      id: selectedProduct.id,
      data: selectedProduct,
    });
  };

  if (isLoading) {
    return <div className="flex items-center justify-center p-8">Loading products...</div>;
  }

  return (
    <div className="space-y-6" data-testid="admin-product-management">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Product Management</h2>
          <p className="text-gray-600">Manage products, upload images, and set pricing</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-product">
              <Plus className="h-4 w-4 mr-2" />
              Add Product
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Product</DialogTitle>
              <DialogDescription>Add a new product to the catalog</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Product Name</Label>
                  <Input
                    id="name"
                    data-testid="input-product-name"
                    value={newProduct.name}
                    onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                    placeholder="Enter product name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select
                    value={newProduct.category}
                    onValueChange={(value) => setNewProduct({ ...newProduct, category: value })}
                  >
                    <SelectTrigger data-testid="select-category">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categoriesLoading ? (
                        <SelectItem value="_loading" disabled>Loading categories...</SelectItem>
                      ) : categories.length === 0 ? (
                        <SelectItem value="_empty" disabled>No categories available</SelectItem>
                      ) : (
                        categories.filter(c => c.isActive).map((cat) => (
                          <SelectItem key={cat.id} value={cat.slug}>{cat.name}</SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  data-testid="input-description"
                  value={newProduct.description}
                  onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                  placeholder="Enter product description"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price">Price (₹)</Label>
                  <Input
                    id="price"
                    type="number"
                    data-testid="input-price"
                    value={newProduct.price}
                    onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bv">BV</Label>
                  <Input
                    id="bv"
                    type="number"
                    data-testid="input-bv"
                    value={newProduct.bv}
                    onChange={(e) => setNewProduct({ ...newProduct, bv: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gst">GST (%)</Label>
                  <Input
                    id="gst"
                    type="number"
                    data-testid="input-gst"
                    value={newProduct.gst}
                    onChange={(e) => setNewProduct({ ...newProduct, gst: e.target.value })}
                    placeholder="18"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sponsorIncome">Sponsor Income (%)</Label>
                  <Input
                    id="sponsorIncome"
                    type="number"
                    data-testid="input-sponsor-income"
                    value={newProduct.sponsorIncomePercentage}
                    onChange={(e) => setNewProduct({ ...newProduct, sponsorIncomePercentage: e.target.value })}
                    placeholder="10"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="purchaseType">Purchase Type</Label>
                  <Select
                    value={newProduct.purchaseType}
                    onValueChange={(value: 'first_purchase' | 'second_purchase') => 
                      setNewProduct({ ...newProduct, purchaseType: value })
                    }
                  >
                    <SelectTrigger data-testid="select-purchase-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="first_purchase">First Purchase</SelectItem>
                      <SelectItem value="second_purchase">Second Purchase</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreateProduct}
                disabled={createProductMutation.isPending}
                data-testid="button-submit-product"
              >
                {createProductMutation.isPending ? "Creating..." : "Create Product"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowCategoriesPanel(!showCategoriesPanel)}
        >
          <FolderPlus className="h-4 w-4 mr-2" />
          Manage Categories
        </Button>
        {showCategoriesPanel && (
          <Card className="mt-3">
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-base">Product Categories</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-3">
              {categoriesLoading ? (
                <p className="text-sm text-gray-500">Loading categories...</p>
              ) : (
                <div className="space-y-2">
                  {categories.map((cat) => (
                    <div key={cat.id} className="flex items-center justify-between bg-gray-50 rounded px-3 py-2">
                      <span className="text-sm">{cat.name}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-red-500 hover:text-red-700"
                        onClick={() => deleteCategoryMutation.mutate(cat.id)}
                        disabled={deleteCategoryMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  {categories.length === 0 && (
                    <p className="text-sm text-gray-500">No categories yet.</p>
                  )}
                </div>
              )}
              <div className="flex gap-2">
                <Input
                  placeholder="New category name"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
                  className="h-8 text-sm"
                />
                <Button
                  size="sm"
                  className="h-8"
                  onClick={handleAddCategory}
                  disabled={createCategoryMutation.isPending || !newCategoryName.trim()}
                >
                  <FolderPlus className="h-4 w-4 mr-1" />
                  Add
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map((product) => {
          // Capture product ID to prevent closure issues
          const productId = product.id;
          
          return (
            <Card key={product.id} data-testid={`card-product-${product.id}`}>
              <CardHeader>
                <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden mb-4 relative">
                  {product.imageUrl ? (
                    <>
                      <img
                        src={getImageUrl(product.imageUrl) || ''}
                        alt={product.name}
                        className="w-full h-full object-cover image-element"
                        data-testid={`img-product-${product.id}`}
                        onError={(e) => {
                          console.log('Image failed to load:', getImageUrl(product.imageUrl));
                          e.currentTarget.style.display = 'none';
                          const placeholder = e.currentTarget.nextElementSibling as HTMLElement;
                          if (placeholder?.classList.contains('image-placeholder')) {
                            placeholder.classList.remove('hidden');
                            placeholder.classList.add('flex');
                          }
                        }}
                      />
                      <div className="image-placeholder absolute inset-0 hidden items-center justify-center bg-gray-100">
                        <ImageIcon className="h-16 w-16 text-gray-300" />
                      </div>
                    </>
                  ) : (
                    <ImageIcon className="h-16 w-16 text-gray-300" />
                  )}
                </div>
                <CardTitle className="text-lg">{product.name}</CardTitle>
                <CardDescription className="line-clamp-2">{product.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Price:</span>
                    <span className="font-semibold">₹{parseFloat(product.price).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">BV:</span>
                    <span className="font-semibold">{product.bv}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Sponsor Income:</span>
                    <span className="font-semibold">{product.sponsorIncomePercentage}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Category:</span>
                    <span className="capitalize">{product.category.replace('_', ' ')}</span>
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <ObjectUploader
                    maxNumberOfFiles={1}
                    maxFileSize={5 * 1024 * 1024} // 5MB
                    buttonClassName="flex-1"
                    onGetUploadParameters={async () => {
                      try {
                        console.log('Getting upload parameters for product:', productId);
                        const response = await fetch(`/api/admin/products/${productId}/upload-url`, {
                          credentials: 'include',
                        });
                        
                        if (!response.ok) {
                          const errorData = await response.json();
                          throw new Error(`Failed to get upload URL: ${errorData.message || response.statusText}`);
                        }
                        
                        const data = await response.json();
                        console.log('Upload parameters received:', data);
                        return { method: 'PUT' as const, url: data.url };
                      } catch (error) {
                        console.error('Error getting upload parameters:', error);
                        toast({
                          title: "Upload Error",
                          description: `Failed to get upload URL: ${error.message}`,
                          variant: "destructive",
                        });
                        throw error;
                      }
                    }}
                    onComplete={(result) => {
                      console.log('Upload complete result:', result);
                      if (result.successful && result.successful[0]) {
                        const uploadedUrl = result.successful[0].uploadURL;
                        console.log('Uploaded URL:', uploadedUrl);
                        if (uploadedUrl) {
                          // Check if this is a fallback URL (contains direct-upload)
                          if (uploadedUrl.includes('direct-upload')) {
                            // For fallback URLs, we don't need to call the image mutation
                            // as the server already updated the product
                            toast({
                              title: "Image Updated",
                              description: "Product image has been updated successfully.",
                            });
                            queryClient.invalidateQueries({ queryKey: ['/api/products'] });
                          } else {
                            // For real uploads, extract the base URL without signed parameters for permanent storage
                            const baseUrl = uploadedUrl.split('?')[0];
                            console.log('Storing base URL for permanent access:', baseUrl);
                            uploadImageMutation.mutate({ productId, imageUrl: baseUrl });
                          }
                        }
                      } else if (result.failed && result.failed.length > 0) {
                        console.error('Upload failed:', result.failed);
                        toast({
                          title: "Upload Failed",
                          description: "Failed to upload image. Please try again.",
                          variant: "destructive",
                        });
                      }
                    }}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Image
                  </ObjectUploader>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedProduct(product);
                      setIsEditDialogOpen(true);
                    }}
                    data-testid={`button-edit-${product.id}`}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Edit Product Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Product</DialogTitle>
            <DialogDescription>Update product information</DialogDescription>
          </DialogHeader>
          {selectedProduct && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">Product Name</Label>
                  <Input
                    id="edit-name"
                    value={selectedProduct.name}
                    onChange={(e) => setSelectedProduct({ ...selectedProduct, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-category">Category</Label>
                  <Select
                    value={selectedProduct.category}
                    onValueChange={(value) => setSelectedProduct({ ...selectedProduct, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categoriesLoading ? (
                        <SelectItem value="_loading" disabled>Loading categories...</SelectItem>
                      ) : categories.length === 0 ? (
                        <SelectItem value="_empty" disabled>No categories available</SelectItem>
                      ) : (
                        categories.filter(c => c.isActive).map((cat) => (
                          <SelectItem key={cat.id} value={cat.slug}>{cat.name}</SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={selectedProduct.description || ''}
                  onChange={(e) => setSelectedProduct({ ...selectedProduct, description: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-price">Price (₹)</Label>
                  <Input
                    id="edit-price"
                    type="text"
                    inputMode="decimal"
                    value={selectedProduct.price}
                    onChange={(e) => setSelectedProduct({ ...selectedProduct, price: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-bv">BV</Label>
                  <Input
                    id="edit-bv"
                    type="text"
                    inputMode="decimal"
                    value={selectedProduct.bv}
                    onChange={(e) => setSelectedProduct({ ...selectedProduct, bv: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-gst">GST (%)</Label>
                  <Input
                    id="edit-gst"
                    type="text"
                    inputMode="decimal"
                    value={selectedProduct.gst}
                    onChange={(e) => setSelectedProduct({ ...selectedProduct, gst: e.target.value })}
                    placeholder="18"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-sponsor-income">Sponsor Income (%)</Label>
                  <Input
                    id="edit-sponsor-income"
                    type="text"
                    inputMode="decimal"
                    value={selectedProduct.sponsorIncomePercentage}
                    onChange={(e) => setSelectedProduct({ ...selectedProduct, sponsorIncomePercentage: e.target.value })}
                    placeholder="10"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={selectedProduct.isActive ? 'active' : 'inactive'}
                    onValueChange={(value) => setSelectedProduct({ ...selectedProduct, isActive: value === 'active' })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleUpdateProduct}
              disabled={updateProductMutation.isPending}
            >
              {updateProductMutation.isPending ? "Updating..." : "Update Product"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
