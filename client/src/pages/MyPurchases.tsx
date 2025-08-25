import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Package, Calendar, Truck, IndianRupee, Star } from "lucide-react";
import { format } from "date-fns";

interface Purchase {
  id: string;
  userId: string;
  productId: string;
  quantity: number;
  totalAmount: string;
  totalBV: string;
  paymentMethod: string;
  paymentStatus: string;
  transactionId?: string;
  deliveryAddress: string;
  deliveryStatus: string;
  trackingId?: string;
  createdAt: string;
  updatedAt: string;
}

const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case 'completed': return 'bg-green-100 text-green-800';
    case 'pending': return 'bg-yellow-100 text-yellow-800';
    case 'failed': return 'bg-red-100 text-red-800';
    case 'processing': return 'bg-blue-100 text-blue-800';
    case 'delivered': return 'bg-green-100 text-green-800';
    case 'shipped': return 'bg-blue-100 text-blue-800';
    case 'cancelled': return 'bg-red-100 text-red-800';
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

export default function MyPurchases() {
  const { data: purchases = [], isLoading } = useQuery<Purchase[]>({
    queryKey: ['/api/purchases'],
    enabled: true,
  });

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="h-20 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6" data-testid="my-purchases">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2" data-testid="purchases-title">
          My Purchases
        </h1>
        <p className="text-gray-600">
          Track all your orders and purchase history
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Total Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-blue-600" />
              <span className="text-2xl font-bold">{purchases.length}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Total Spent</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <IndianRupee className="h-5 w-5 text-green-600" />
              <span className="text-2xl font-bold">
                {formatPrice(purchases.reduce((sum, p) => sum + parseFloat(p.totalAmount), 0).toString())}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Total BV Earned</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-600" />
              <span className="text-2xl font-bold">
                {purchases.reduce((sum, p) => sum + parseFloat(p.totalBV), 0).toLocaleString()} BV
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Completed Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-purple-600" />
              <span className="text-2xl font-bold">
                {purchases.filter(p => p.paymentStatus === 'completed').length}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Purchases Table */}
      {purchases.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Purchase History</CardTitle>
            <CardDescription>
              Your complete purchase history with payment and delivery status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order ID</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>BV Earned</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Delivery</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {purchases.map((purchase) => (
                  <TableRow key={purchase.id} data-testid={`purchase-row-${purchase.id}`}>
                    <TableCell className="font-medium">
                      <div className="text-sm">
                        <div data-testid={`purchase-id-${purchase.id}`}>#{purchase.id.slice(0, 8)}</div>
                        <div className="text-gray-500">Qty: {purchase.quantity}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span className="text-sm">
                          {format(new Date(purchase.createdAt), 'MMM dd, yyyy')}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-green-600" data-testid={`purchase-amount-${purchase.id}`}>
                        {formatPrice(purchase.totalAmount)}
                      </div>
                      <div className="text-sm text-gray-500">
                        {purchase.paymentMethod.replace('_', ' ')}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-blue-600" data-testid={`purchase-bv-${purchase.id}`}>
                        {parseFloat(purchase.totalBV).toLocaleString()} BV
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(purchase.paymentStatus)} data-testid={`payment-status-${purchase.id}`}>
                        {purchase.paymentStatus}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(purchase.deliveryStatus)} data-testid={`delivery-status-${purchase.id}`}>
                        {purchase.deliveryStatus}
                      </Badge>
                      {purchase.trackingId && (
                        <div className="text-xs text-gray-500 mt-1">
                          Track: {purchase.trackingId}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <Badge 
                          variant={purchase.paymentStatus === 'completed' ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {purchase.paymentStatus === 'completed' ? 'Active' : 'Pending'}
                        </Badge>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="text-center py-12">
            <Package className="h-16 w-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No purchases yet</h3>
            <p className="text-gray-600 mb-4">
              Start shopping to see your purchase history here.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}