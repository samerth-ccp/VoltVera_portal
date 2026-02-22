import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  Package,
  IndianRupee,
  Truck,
  CreditCard,
  ChevronLeft,
  ChevronRight,
  Download,
  Clock,
} from "lucide-react";

interface DailyReportOrder {
  id: string;
  userId: string;
  productId: string;
  quantity: number;
  totalAmount: string;
  paymentMethod: string;
  paymentStatus: string;
  deliveryStatus: string;
  createdAt: string;
  couponCode: string | null;
  discountAmount: string | null;
  userName?: string;
  productName?: string;
}

interface DailyReportData {
  date: string;
  totalOrders: number;
  totalRevenue: number;
  codOrders: number;
  walletOrders: number;
  razorpayOrders: number;
  pendingPayments: number;
  completedPayments: number;
  orders: DailyReportOrder[];
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(amount);

const formatTime = (dateStr: string) =>
  new Date(dateStr).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false });

const formatDateForInput = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const getPaymentMethodBadge = (method: string) => {
  const styles: Record<string, string> = {
    wallet: "bg-blue-100 text-blue-800 border-blue-200",
    cod: "bg-orange-100 text-orange-800 border-orange-200",
    razorpay: "bg-purple-100 text-purple-800 border-purple-200",
  };
  return (
    <Badge className={styles[method] || "bg-gray-100 text-gray-800 border-gray-200"}>
      {method.toUpperCase()}
    </Badge>
  );
};

const getPaymentStatusBadge = (status: string) => {
  const styles: Record<string, string> = {
    completed: "bg-green-100 text-green-800 border-green-200",
    pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
    cod_pending: "bg-orange-100 text-orange-800 border-orange-200",
  };
  return (
    <Badge className={styles[status] || "bg-gray-100 text-gray-800 border-gray-200"}>
      {status.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())}
    </Badge>
  );
};

const getDeliveryStatusBadge = (status: string) => {
  const styles: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
    shipped: "bg-blue-100 text-blue-800 border-blue-200",
    delivered: "bg-green-100 text-green-800 border-green-200",
  };
  return (
    <Badge className={styles[status] || "bg-gray-100 text-gray-800 border-gray-200"}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
};

export default function AdminDailyReport() {
  const [selectedDate, setSelectedDate] = useState<string>(formatDateForInput(new Date()));

  const { data, isLoading } = useQuery<DailyReportData>({
    queryKey: ["/api/admin/daily-report", selectedDate],
    queryFn: async () => {
      const res = await fetch(`/api/admin/daily-report?date=${selectedDate}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch daily report");
      return res.json();
    },
  });

  const goToPreviousDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(formatDateForInput(d));
  };

  const goToNextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    setSelectedDate(formatDateForInput(d));
  };

  const exportCSV = () => {
    if (!data || !data.orders.length) return;
    const headers = ["Order ID", "Customer", "Product", "Qty", "Amount", "Payment Method", "Payment Status", "Delivery Status", "Time"];
    const rows = data.orders.map((o) => [
      o.id.substring(0, 8),
      o.userName || o.userId,
      o.productName || o.productId,
      o.quantity,
      parseFloat(o.totalAmount).toFixed(2),
      o.paymentMethod,
      o.paymentStatus,
      o.deliveryStatus,
      formatTime(o.createdAt),
    ]);
    const csvContent = [headers.join(","), ...rows.map((r) => r.map((v) => `"${v}"`).join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `daily-report-${selectedDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const summaryCards = [
    { title: "Total Orders", value: data?.totalOrders ?? 0, icon: Package, color: "blue" },
    { title: "Total Revenue", value: formatCurrency(data?.totalRevenue ?? 0), icon: IndianRupee, color: "green" },
    { title: "COD Orders", value: data?.codOrders ?? 0, icon: Truck, color: "orange" },
    { title: "Wallet Orders", value: data?.walletOrders ?? 0, icon: CreditCard, color: "blue" },
    { title: "Pending Payments", value: data?.pendingPayments ?? 0, icon: Clock, color: "yellow" },
    { title: "Completed Payments", value: data?.completedPayments ?? 0, icon: Package, color: "green" },
  ];

  const colorMap: Record<string, { bg: string; text: string; icon: string }> = {
    blue: { bg: "from-blue-50 to-blue-100 border-blue-200", text: "text-blue-900", icon: "text-blue-600" },
    green: { bg: "from-green-50 to-green-100 border-green-200", text: "text-green-900", icon: "text-green-600" },
    orange: { bg: "from-orange-50 to-orange-100 border-orange-200", text: "text-orange-900", icon: "text-orange-600" },
    yellow: { bg: "from-yellow-50 to-yellow-100 border-yellow-200", text: "text-yellow-900", icon: "text-yellow-600" },
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Daily Order Report
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={goToPreviousDay}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-44"
              />
              <Button variant="outline" size="icon" onClick={goToNextDay}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button variant="outline" onClick={exportCSV} disabled={!data?.orders?.length}>
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
            {summaryCards.map((card) => {
              const colors = colorMap[card.color];
              const Icon = card.icon;
              return (
                <Card key={card.title} className={`bg-gradient-to-br ${colors.bg}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className={`text-xs font-medium ${colors.icon}`}>{card.title}</p>
                        <p className={`text-xl font-bold ${colors.text}`}>{card.value}</p>
                      </div>
                      <Icon className={`h-6 w-6 ${colors.icon} opacity-50`} />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4" />
              <p className="text-gray-600">Loading report...</p>
            </div>
          ) : !data?.orders?.length ? (
            <div className="text-center py-12">
              <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">No Orders Found</h3>
              <p className="text-gray-500">No orders were placed on {selectedDate}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b-2 border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Order ID</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Customer</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Product</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Qty</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Amount (₹)</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Payment Method</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Payment Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Delivery Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {data.orders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-mono text-gray-900">
                        {order.id.substring(0, 8)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {order.userName || order.userId}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {order.productName || order.productId}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {order.quantity}
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-green-600">
                        {formatCurrency(parseFloat(order.totalAmount))}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {getPaymentMethodBadge(order.paymentMethod)}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {getPaymentStatusBadge(order.paymentStatus)}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {getDeliveryStatusBadge(order.deliveryStatus)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatTime(order.createdAt)}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
