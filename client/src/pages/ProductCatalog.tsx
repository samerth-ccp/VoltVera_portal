import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { ShoppingCart, Package, Zap, Tv, Fan, Droplets, IndianRupee, Star } from "lucide-react";

interface Product {
  id: string;
  name: string;
  description: string;
  price: string;
  bv: string;
  gst: string;
  category: string;
  purchaseType: 'first_purchase' | 'second_purchase';
  imageUrl?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface PurchaseData {
  productId: string;
  quantity: number;
  paymentMethod: string;
  deliveryAddress: string;
}

const getCategoryIcon = (category: string) => {
  switch (category) {
    case 'water_purifier': return <Droplets className="h-4 w-4" />;
    case 'led_tv': return <Tv className="h-4 w-4" />;
    case 'ceiling_fan': return <Fan className="h-4 w-4" />;
    default: return <Package className="h-4 w-4" />;
  }
};

const getCategoryColor = (category: string) => {
  switch (category) {
    case 'water_purifier': return 'bg-blue-100 text-blue-800';
    case 'led_tv': return 'bg-purple-100 text-purple-800';
    case 'ceiling_fan': return 'bg-green-100 text-green-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

const formatPrice = (price: string) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
  }).format(parseFloat(price));
};

export default function ProductCatalog() {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedPurchaseType, setSelectedPurchaseType] = useState<string>('all');
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [purchaseForm, setPurchaseForm] = useState<PurchaseData>({
    productId: '',
    quantity: 1,
    paymentMethod: '',
    deliveryAddress: ''
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all products
  const { data: products = [], isLoading } = useQuery<Product[]>({
    queryKey: ['/api/products'],
    enabled: true,
  });

  // Create purchase mutation
  const createPurchaseMutation = useMutation({
    mutationFn: async (data: PurchaseData) => {
      const response = await fetch('/api/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create purchase');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Purchase Successful!",
        description: "Your order has been placed successfully. You will receive confirmation shortly.",
      });
      setIsPurchaseModalOpen(false);
      setPurchaseForm({
        productId: '',
        quantity: 1,
        paymentMethod: '',
        deliveryAddress: ''
      });
      queryClient.invalidateQueries({ queryKey: ['/api/purchases'] });
      queryClient.invalidateQueries({ queryKey: ['/api/wallet'] });
    },
    onError: (error: any) => {
      toast({
        title: "Purchase Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Filter products based on selected category and purchase type
  const filteredProducts = products.filter(product => {
    const categoryMatch = selectedCategory === 'all' || product.category === selectedCategory;
    const typeMatch = selectedPurchaseType === 'all' || product.purchaseType === selectedPurchaseType;
    return categoryMatch && typeMatch && product.isActive;
  });

  // Get unique categories from products
  const categories = Array.from(new Set(products.map(p => p.category)));

  const handlePurchase = (product: Product) => {
    setSelectedProduct(product);
    setPurchaseForm(prev => ({
      ...prev,
      productId: product.id
    }));
    setIsPurchaseModalOpen(true);
  };

  const handleSubmitPurchase = () => {
    if (!purchaseForm.paymentMethod || !purchaseForm.deliveryAddress.trim()) {
      toast({
        title: "Incomplete Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    createPurchaseMutation.mutate(purchaseForm);
  };

  const calculateTotal = () => {
    if (!selectedProduct) return { amount: 0, bv: 0, gst: 0 };
    
    const baseAmount = parseFloat(selectedProduct.price) * purchaseForm.quantity;
    const gstAmount = (baseAmount * parseFloat(selectedProduct.gst)) / 100;
    const totalAmount = baseAmount + gstAmount;
    const totalBV = parseFloat(selectedProduct.bv) * purchaseForm.quantity;

    return {
      amount: totalAmount,
      bv: totalBV,
      gst: gstAmount
    };
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
              </CardContent>
              <CardFooter>
                <div className="h-10 bg-gray-200 rounded w-full"></div>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6" data-testid="product-catalog">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2" data-testid="catalog-title">
          Voltvera Product Catalog
        </h1>
        <p className="text-gray-600">
          Discover our premium range of products with exclusive Business Volume benefits
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        <Tabs value={selectedPurchaseType} onValueChange={setSelectedPurchaseType} className="w-auto">
          <TabsList>
            <TabsTrigger value="all" data-testid="filter-all">All Products</TabsTrigger>
            <TabsTrigger value="first_purchase" data-testid="filter-first">First Purchase</TabsTrigger>
            <TabsTrigger value="second_purchase" data-testid="filter-second">Second Purchase</TabsTrigger>
          </TabsList>
        </Tabs>

        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-48" data-testid="category-filter">
            <SelectValue placeholder="Select Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map(category => (
              <SelectItem key={category} value={category}>
                <div className="flex items-center gap-2">
                  {getCategoryIcon(category)}
                  {category.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Product Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProducts.map(product => {
          const total = calculateTotal();
          
          return (
            <Card key={product.id} className="overflow-hidden hover:shadow-lg transition-shadow" data-testid={`product-card-${product.id}`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg line-clamp-2" data-testid={`product-name-${product.id}`}>
                      {product.name}
                    </CardTitle>
                    <CardDescription className="mt-1 line-clamp-2">
                      {product.description}
                    </CardDescription>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-2 mt-2">
                  <Badge className={getCategoryColor(product.category)} data-testid={`product-category-${product.id}`}>
                    {getCategoryIcon(product.category)}
                    <span className="ml-1">{product.category.replace('_', ' ')}</span>
                  </Badge>
                  <Badge variant={product.purchaseType === 'first_purchase' ? 'default' : 'secondary'}>
                    {product.purchaseType === 'first_purchase' ? '1st Purchase' : '2nd Purchase'}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="pb-3">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Price:</span>
                    <span className="font-semibold text-lg text-green-600" data-testid={`product-price-${product.id}`}>
                      {formatPrice(product.price)}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Business Volume:</span>
                    <span className="font-medium text-blue-600" data-testid={`product-bv-${product.id}`}>
                      {parseFloat(product.bv).toLocaleString()} BV
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">GST:</span>
                    <span className="text-sm">{product.gst}%</span>
                  </div>
                </div>
              </CardContent>

              <CardFooter>
                <Button 
                  onClick={() => handlePurchase(product)}
                  className="w-full bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700"
                  data-testid={`purchase-button-${product.id}`}
                >
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Purchase Now
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>

      {filteredProducts.length === 0 && (
        <div className="text-center py-12">
          <Package className="h-16 w-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No products found</h3>
          <p className="text-gray-600">Try adjusting your filters to see more products.</p>
        </div>
      )}

      {/* Purchase Modal */}
      <Dialog open={isPurchaseModalOpen} onOpenChange={setIsPurchaseModalOpen}>
        <DialogContent className="sm:max-w-md" data-testid="purchase-modal">
          <DialogHeader>
            <DialogTitle>Purchase Product</DialogTitle>
            <DialogDescription>
              Complete your purchase for {selectedProduct?.name}
            </DialogDescription>
          </DialogHeader>

          {selectedProduct && (
            <div className="space-y-4">
              {/* Product Summary */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium mb-2">{selectedProduct.name}</h4>
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span>Unit Price:</span>
                    <span>{formatPrice(selectedProduct.price)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Unit BV:</span>
                    <span>{parseFloat(selectedProduct.bv).toLocaleString()} BV</span>
                  </div>
                  <div className="flex justify-between">
                    <span>GST:</span>
                    <span>{selectedProduct.gst}%</span>
                  </div>
                </div>
              </div>

              {/* Purchase Form */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="quantity">Quantity</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="1"
                    value={purchaseForm.quantity}
                    onChange={(e) => setPurchaseForm(prev => ({
                      ...prev,
                      quantity: parseInt(e.target.value) || 1
                    }))}
                    data-testid="purchase-quantity"
                  />
                </div>

                <div>
                  <Label htmlFor="paymentMethod">Payment Method *</Label>
                  <Select value={purchaseForm.paymentMethod} onValueChange={(value) => 
                    setPurchaseForm(prev => ({ ...prev, paymentMethod: value }))
                  }>
                    <SelectTrigger data-testid="payment-method">
                      <SelectValue placeholder="Select payment method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="upi">UPI</SelectItem>
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                      <SelectItem value="card">Credit/Debit Card</SelectItem>
                      <SelectItem value="wallet">Wallet</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="deliveryAddress">Delivery Address *</Label>
                  <Textarea
                    id="deliveryAddress"
                    placeholder="Enter complete delivery address..."
                    value={purchaseForm.deliveryAddress}
                    onChange={(e) => setPurchaseForm(prev => ({
                      ...prev,
                      deliveryAddress: e.target.value
                    }))}
                    data-testid="delivery-address"
                  />
                </div>

                {/* Order Summary */}
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium mb-2">Order Summary</h4>
                  <div className="text-sm space-y-1">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span>{formatPrice((parseFloat(selectedProduct.price) * purchaseForm.quantity).toString())}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>GST ({selectedProduct.gst}%):</span>
                      <span>{formatPrice(((parseFloat(selectedProduct.price) * purchaseForm.quantity * parseFloat(selectedProduct.gst)) / 100).toString())}</span>
                    </div>
                    <div className="flex justify-between font-medium text-lg">
                      <span>Total:</span>
                      <span className="text-green-600">
                        {formatPrice(((parseFloat(selectedProduct.price) * purchaseForm.quantity) * (1 + parseFloat(selectedProduct.gst) / 100)).toString())}
                      </span>
                    </div>
                    <div className="flex justify-between text-blue-600 font-medium">
                      <span>Total BV Earned:</span>
                      <span>{(parseFloat(selectedProduct.bv) * purchaseForm.quantity).toLocaleString()} BV</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPurchaseModalOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmitPurchase}
              disabled={createPurchaseMutation.isPending}
              className="bg-gradient-to-r from-green-600 to-blue-600"
              data-testid="confirm-purchase"
            >
              {createPurchaseMutation.isPending ? 'Processing...' : 'Confirm Purchase'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}