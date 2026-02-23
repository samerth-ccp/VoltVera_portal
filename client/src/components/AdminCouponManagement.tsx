import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Tag, Plus, Pencil, Trash2, Percent, IndianRupee } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface Coupon {
  id: string;
  code: string;
  description?: string;
  discountType: "percentage" | "fixed";
  discountValue: string;
  minOrderAmount?: string;
  maxDiscount?: string;
  usageLimit?: number;
  usedCount: number;
  expiresAt?: string;
  isActive: boolean;
  createdAt: string;
}

const emptyCouponForm = {
  code: "",
  description: "",
  discountType: "percentage" as "percentage" | "fixed",
  discountValue: "",
  minOrderAmount: "",
  maxDiscount: "",
  usageLimit: "",
  expiresAt: "",
};

function getCouponStatus(coupon: Coupon): "active" | "expired" | "exhausted" {
  if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
    return "expired";
  }
  if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
    return "exhausted";
  }
  return "active";
}

function StatusBadge({ status }: { status: "active" | "expired" | "exhausted" }) {
  if (status === "active") {
    return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Active</Badge>;
  }
  if (status === "expired") {
    return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Expired</Badge>;
  }
  return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Exhausted</Badge>;
}

export default function AdminCouponManagement() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ ...emptyCouponForm });
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [editFormData, setEditFormData] = useState({ ...emptyCouponForm });

  const { data: coupons = [], isLoading } = useQuery<Coupon[]>({
    queryKey: ["/api/admin/coupons"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const payload: any = {
        code: data.code.toUpperCase(),
        discountType: data.discountType,
        discountValue: parseFloat(data.discountValue),
      };
      if (data.description) payload.description = data.description;
      if (data.minOrderAmount) payload.minOrderAmount = parseFloat(data.minOrderAmount);
      if (data.discountType === "percentage" && data.maxDiscount) payload.maxDiscount = parseFloat(data.maxDiscount);
      if (data.usageLimit) payload.usageLimit = parseInt(data.usageLimit);
      if (data.expiresAt) payload.expiresAt = data.expiresAt;
      const response = await apiRequest("POST", "/api/admin/coupons", payload);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Coupon Created", description: "The coupon has been created successfully." });
      setIsCreateDialogOpen(false);
      setFormData({ ...emptyCouponForm });
      qc.invalidateQueries({ queryKey: ["/api/admin/coupons"] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to create coupon", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof editFormData }) => {
      const payload: any = {
        code: data.code.toUpperCase(),
        discountType: data.discountType,
        discountValue: parseFloat(data.discountValue),
      };
      if (data.description) payload.description = data.description;
      if (data.minOrderAmount) payload.minOrderAmount = parseFloat(data.minOrderAmount);
      if (data.discountType === "percentage" && data.maxDiscount) payload.maxDiscount = parseFloat(data.maxDiscount);
      if (data.usageLimit) payload.usageLimit = parseInt(data.usageLimit);
      if (data.expiresAt) payload.expiresAt = data.expiresAt;
      const response = await apiRequest("PATCH", `/api/admin/coupons/${id}`, payload);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Coupon Updated", description: "The coupon has been updated successfully." });
      setIsEditDialogOpen(false);
      setEditingCoupon(null);
      qc.invalidateQueries({ queryKey: ["/api/admin/coupons"] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to update coupon", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/admin/coupons/${id}`);
    },
    onSuccess: () => {
      toast({ title: "Coupon Deleted", description: "The coupon has been deleted successfully." });
      qc.invalidateQueries({ queryKey: ["/api/admin/coupons"] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to delete coupon", variant: "destructive" });
    },
  });

  const handleEdit = (coupon: Coupon) => {
    setEditingCoupon(coupon);
    setEditFormData({
      code: coupon.code,
      description: coupon.description || "",
      discountType: coupon.discountType,
      discountValue: coupon.discountValue || "",
      minOrderAmount: coupon.minOrderAmount || "",
      maxDiscount: coupon.maxDiscount || "",
      usageLimit: coupon.usageLimit ? String(coupon.usageLimit) : "",
      expiresAt: coupon.expiresAt ? coupon.expiresAt.split("T")[0] : "",
    });
    setIsEditDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Are you sure you want to delete this coupon?")) {
      deleteMutation.mutate(id);
    }
  };

  const formatCurrency = (value?: string | number) => {
    if (value === undefined || value === null) return "—";
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return "—";
    return `₹${num.toLocaleString("en-IN")}`;
  };

  if (isLoading) {
    return <div className="flex items-center justify-center p-8">Loading coupons...</div>;
  }

  const renderForm = (
    data: typeof formData,
    setData: (d: typeof formData) => void,
    onSubmit: () => void,
    isPending: boolean,
    submitLabel: string
  ) => (
    <div className="grid gap-4 py-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="coupon-code">Code</Label>
          <Input
            id="coupon-code"
            value={data.code}
            onChange={(e) => setData({ ...data, code: e.target.value.toUpperCase() })}
            placeholder="e.g. SAVE20"
            style={{ textTransform: "uppercase" }}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="discount-type">Discount Type</Label>
          <Select
            value={data.discountType}
            onValueChange={(value: "percentage" | "fixed") => setData({ ...data, discountType: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="percentage">Percentage (%)</SelectItem>
              <SelectItem value="fixed">Fixed (₹)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="coupon-description">Description (optional)</Label>
        <Textarea
          id="coupon-description"
          value={data.description}
          onChange={(e) => setData({ ...data, description: e.target.value })}
          placeholder="Enter coupon description"
          rows={2}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="discount-value">Discount Value</Label>
          <Input
            id="discount-value"
            type="number"
            value={data.discountValue}
            onChange={(e) => setData({ ...data, discountValue: e.target.value })}
            placeholder={data.discountType === "percentage" ? "e.g. 10" : "e.g. 500"}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="min-order">Min Order Amount (optional)</Label>
          <Input
            id="min-order"
            type="number"
            value={data.minOrderAmount}
            onChange={(e) => setData({ ...data, minOrderAmount: e.target.value })}
            placeholder="e.g. 1000"
          />
        </div>
      </div>
      {data.discountType === "percentage" && (
        <div className="space-y-2">
          <Label htmlFor="max-discount">Max Discount (optional)</Label>
          <Input
            id="max-discount"
            type="number"
            value={data.maxDiscount}
            onChange={(e) => setData({ ...data, maxDiscount: e.target.value })}
            placeholder="e.g. 200"
          />
        </div>
      )}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="usage-limit">Usage Limit (optional)</Label>
          <Input
            id="usage-limit"
            type="number"
            value={data.usageLimit}
            onChange={(e) => setData({ ...data, usageLimit: e.target.value })}
            placeholder="e.g. 100"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="expiry-date">Expiry Date (optional)</Label>
          <Input
            id="expiry-date"
            type="date"
            value={data.expiresAt}
            onChange={(e) => setData({ ...data, expiresAt: e.target.value })}
          />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={() => { setIsCreateDialogOpen(false); setIsEditDialogOpen(false); }}>
          Cancel
        </Button>
        <Button onClick={onSubmit} disabled={isPending || !data.code || !data.discountValue}>
          {isPending ? "Saving..." : submitLabel}
        </Button>
      </DialogFooter>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Tag className="h-6 w-6" />
            Coupon Management
          </h2>
          <p className="text-gray-600">Create and manage discount coupon codes</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Coupon
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create New Coupon</DialogTitle>
              <DialogDescription>Add a new discount coupon code</DialogDescription>
            </DialogHeader>
            {renderForm(
              formData,
              setFormData,
              () => createMutation.mutate(formData),
              createMutation.isPending,
              "Create Coupon"
            )}
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">All Coupons ({coupons.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {coupons.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Tag className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>No coupons created yet. Click "Create Coupon" to get started.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left p-3 font-medium text-gray-700">Code</th>
                    <th className="text-left p-3 font-medium text-gray-700">Description</th>
                    <th className="text-left p-3 font-medium text-gray-700">Discount Type</th>
                    <th className="text-left p-3 font-medium text-gray-700">Value</th>
                    <th className="text-left p-3 font-medium text-gray-700">Min Order</th>
                    <th className="text-left p-3 font-medium text-gray-700">Max Discount</th>
                    <th className="text-left p-3 font-medium text-gray-700">Usage</th>
                    <th className="text-left p-3 font-medium text-gray-700">Status</th>
                    <th className="text-left p-3 font-medium text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {coupons.map((coupon) => {
                    const status = getCouponStatus(coupon);
                    return (
                      <tr key={coupon.id} className="border-b hover:bg-gray-50">
                        <td className="p-3 font-mono font-semibold">{coupon.code}</td>
                        <td className="p-3 text-gray-600 max-w-[200px] truncate">{coupon.description || "—"}</td>
                        <td className="p-3">
                          <span className="flex items-center gap-1">
                            {coupon.discountType === "percentage" ? (
                              <><Percent className="h-3 w-3" /> Percentage</>
                            ) : (
                              <><IndianRupee className="h-3 w-3" /> Fixed</>
                            )}
                          </span>
                        </td>
                        <td className="p-3 font-semibold">
                          {coupon.discountType === "percentage"
                            ? `${parseFloat(coupon.discountValue)}%`
                            : formatCurrency(coupon.discountValue)}
                        </td>
                        <td className="p-3">{formatCurrency(coupon.minOrderAmount)}</td>
                        <td className="p-3">{coupon.discountType === "percentage" ? formatCurrency(coupon.maxDiscount) : "—"}</td>
                        <td className="p-3">
                          {coupon.usedCount}/{coupon.usageLimit ?? "∞"}
                        </td>
                        <td className="p-3">
                          <StatusBadge status={status} />
                        </td>
                        <td className="p-3">
                          <div className="flex gap-1">
                            <Button variant="outline" size="sm" onClick={() => handleEdit(coupon)}>
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(coupon.id)}
                              disabled={deleteMutation.isPending}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Coupon</DialogTitle>
            <DialogDescription>Update coupon details</DialogDescription>
          </DialogHeader>
          {editingCoupon &&
            renderForm(
              editFormData,
              setEditFormData,
              () => updateMutation.mutate({ id: editingCoupon.id, data: editFormData }),
              updateMutation.isPending,
              "Update Coupon"
            )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
