import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Tank, Product, StockMovement } from "@shared/schema";
import { insertStockMovementSchema } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/api";
import { Combobox } from "@/components/ui/combobox";
import { useLocation } from "wouter";
import { BarChart3, Package, ArrowRightLeft, ClipboardList, Filter, Printer } from "lucide-react";
import { printReport } from "@/lib/printUtils";

export default function StockManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [open, setOpen] = useState(false);

  const form = useForm({
    resolver: zodResolver(insertStockMovementSchema.omit({ id: true })),
    defaultValues: {
      tankId: "",
      movementType: "in",
      quantity: "0",
      previousStock: "0",
      newStock: "0",
      referenceType: "adjustment",
      notes: "",
      stationId: user?.stationId || "",
      userId: user?.id || "",
    },
  });

  const transferForm = useForm({
    resolver: zodResolver(insertStockMovementSchema.pick({ 
      quantity: true 
    }).extend({
      sourceTankId: insertStockMovementSchema.shape.tankId,
      destinationTankId: insertStockMovementSchema.shape.tankId,
      notes: insertStockMovementSchema.shape.notes,
    })),
    defaultValues: {
      sourceTankId: "",
      destinationTankId: "",
      quantity: "",
      notes: "",
    },
  });

  const auditForm = useForm({
    defaultValues: {},
  });

  // Regular stock movement mutation with success handling
  const createStockMovementMutation = useMutation({
    mutationFn: async (data: any) => {
      const movementData = {
        ...data,
        stationId: user?.stationId || data.stationId,
        userId: user?.id || data.userId,
      };
      const response = await apiRequest("POST", "/api/stock-movements", movementData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Stock entry recorded",
        description: "Stock movement has been recorded successfully",
      });
      setOpen(false);
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/stock-movements", user?.stationId] });
      queryClient.invalidateQueries({ queryKey: ["/api/tanks", user?.stationId] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to record stock movement",
        variant: "destructive",
      });
    },
  });

  // Batch stock movement mutation without success callbacks (for transfers and audits)
  const batchStockMovementMutation = useMutation({
    mutationFn: async (data: any) => {
      const movementData = {
        ...data,
        stationId: user?.stationId || data.stationId,
        userId: user?.id || data.userId,
      };
      const response = await apiRequest("POST", "/api/stock-movements", movementData);
      return response.json();
    },
  });

  const onSubmit = (data: any) => {
    createStockMovementMutation.mutate(data);
  };

  // Quick Actions handlers
  const handleStockReport = () => {
    toast({
      title: "Stock Report",
      description: "Generating comprehensive stock report...",
    });
    // Navigate to reports or open print dialog
    setLocation('/financial-reports');
  };

  const handleNewPurchase = () => {
    setLocation('/purchase-orders');
  };

  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [auditDialogOpen, setAuditDialogOpen] = useState(false);

  const handleStockTransfer = () => {
    transferForm.reset({
      sourceTankId: "",
      destinationTankId: "",
      quantity: "",
      notes: "",
    });
    setTransferDialogOpen(true);
  };

  const handleStockAudit = () => {
    // Initialize audit form with current stock values for all tanks
    const initialAuditData = tanks.reduce((acc, tank) => {
      acc[tank.id] = tank.currentStock || "0";
      return acc;
    }, {} as {[tankId: string]: string});
    auditForm.reset(initialAuditData);
    setAuditDialogOpen(true);
  };

  const executeStockTransfer = async () => {
    const { sourceTankId, destinationTankId, quantity, notes } = transferForm.getValues();

    if (!sourceTankId || !destinationTankId || !quantity || parseFloat(quantity) <= 0) {
      toast({
        title: "Error",
        description: "Please fill all fields with valid values",
        variant: "destructive",
      });
      return;
    }

    if (sourceTankId === destinationTankId) {
      toast({
        title: "Error", 
        description: "Source and destination tanks cannot be the same",
        variant: "destructive",
      });
      return;
    }

    const sourceTank = tanks.find(t => t.id === sourceTankId);
    const destTank = tanks.find(t => t.id === destinationTankId);
    const transferQty = parseFloat(quantity);

    if (!sourceTank || !destTank) {
      toast({
        title: "Error",
        description: "Invalid tank selection",
        variant: "destructive",
      });
      return;
    }

    // Validate source has enough stock
    if (parseFloat(sourceTank.currentStock || "0") < transferQty) {
      toast({
        title: "Error",
        description: "Insufficient stock in source tank",
        variant: "destructive",
      });
      return;
    }

    // Validate destination has capacity
    const destCurrentStock = parseFloat(destTank.currentStock || "0");
    const destCapacity = parseFloat(destTank.capacity || "0");
    if (destCurrentStock + transferQty > destCapacity) {
      toast({
        title: "Error", 
        description: "Not enough capacity in destination tank",
        variant: "destructive",
      });
      return;
    }

    try {
      // Generate single reference ID for atomicity
      const transferRef = `TXF-${Date.now()}`;

      // Create OUT movement from source
      await batchStockMovementMutation.mutateAsync({
        tankId: sourceTankId,
        movementType: "out",
        quantity: quantity,
        unitPrice: "0",
        notes: `Transfer OUT to ${destTank.name} - ${notes}`,
        referenceType: "transfer",
        referenceId: transferRef
      });

      // Create IN movement to destination  
      await batchStockMovementMutation.mutateAsync({
        tankId: destinationTankId,
        movementType: "in", 
        quantity: quantity,
        unitPrice: "0",
        notes: `Transfer IN from ${sourceTank.name} - ${notes}`,
        referenceType: "transfer",
        referenceId: transferRef
      });

      toast({
        title: "Transfer Completed",
        description: `Successfully transferred ${transferQty}L from ${sourceTank.name} to ${destTank.name}`,
      });

      setTransferDialogOpen(false);
      transferForm.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/tanks", user?.stationId] });
      queryClient.invalidateQueries({ queryKey: ["/api/stock-movements", user?.stationId] });
    } catch (error) {
      toast({
        title: "Transfer Failed",
        description: "Failed to complete stock transfer",
        variant: "destructive",
      });
    }
  };

  const executeStockAudit = async () => {
    const auditEntries = Object.entries(auditForm.getValues());
    let adjustmentsMade = 0;
    const auditRef = `AUD-${Date.now()}`;

    try {
      for (const [tankId, physicalCount] of auditEntries) {
        const tank = tanks.find(t => t.id === tankId);
        if (!tank) continue;

        const currentStock = parseFloat(tank.currentStock || "0");
        const physicalStock = parseFloat(physicalCount);
        const difference = physicalStock - currentStock;

        // Only create movement if there's a difference
        if (Math.abs(difference) >= 0.01) {
          await batchStockMovementMutation.mutateAsync({
            tankId: tankId,
            movementType: difference > 0 ? "in" : "out",
            quantity: Math.abs(difference).toString(),
            unitPrice: "0",
            notes: `Stock audit adjustment - Physical: ${physicalStock}L, System: ${currentStock}L`,
            referenceType: "audit",
            referenceId: auditRef
          });
          adjustmentsMade++;
        }
      }

      toast({
        title: "Audit Completed",
        description: `Stock audit completed. ${adjustmentsMade} adjustments made.`,
      });

      setAuditDialogOpen(false);
      auditForm.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/tanks", user?.stationId] });
      queryClient.invalidateQueries({ queryKey: ["/api/stock-movements", user?.stationId] });
    } catch (error) {
      toast({
        title: "Audit Failed",
        description: "Failed to complete stock audit",
        variant: "destructive",
      });
    }
  };

  const handleCreatePurchaseOrder = (tankId: string) => {
    setLocation(`/purchase-orders?tank=${tankId}`);
  };

  const { data: tanks = [], isLoading: tanksLoading } = useQuery<Tank[]>({
    queryKey: ["/api/tanks", user?.stationId],
    enabled: !!user?.stationId,
  });

  const { data: products = [], isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const { data: stockMovements = [], isLoading: movementsLoading } = useQuery<StockMovement[]>({
    queryKey: ["/api/stock-movements", user?.stationId],
    enabled: !!user?.stationId,
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [movements, setMovements] = useState([]);
  const [filteredMovements, setFilteredMovements] = useState([]);


  const handleFilter = () => {
    let filtered = stockMovements.filter((movement: any) => {
      const matchesSearch = movement.product?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        movement.referenceNumber?.toLowerCase().includes(searchTerm.toLowerCase());

      let matchesDate = true;
      if (fromDate && toDate) {
        const movementDate = new Date(movement.movementDate).toDateString();
        const from = new Date(fromDate).toDateString();
        const to = new Date(toDate).toDateString();
        matchesDate = movementDate >= from && movementDate <= to;
      }

      return matchesSearch && matchesDate;
    });
    setFilteredMovements(filtered);
  };

  const handlePrintReport = () => {
    const reportData = filteredMovements.map((movement: any) => ({
      'Product': movement.product?.name || 'N/A',
      'Type': movement.movementType,
      'Quantity': `${movement.quantity} ${movement.product?.unit || ''}`,
      'Reference': movement.referenceNumber || 'N/A',
      'Date': new Date(movement.movementDate).toLocaleDateString(),
      'Notes': movement.notes || 'N/A'
    }));

    const dateRange = fromDate && toDate ? `${fromDate} to ${toDate}` : 'All Records';

    printReport({
      title: 'Stock Movements Report',
      subtitle: `Period: ${dateRange}`,
      data: reportData,
      summary: [
        { label: 'Total Movements', value: filteredMovements.length.toString() },
        { label: 'In Movements', value: filteredMovements.filter((m: any) => m.movementType === 'in').length.toString() },
        { label: 'Out Movements', value: filteredMovements.filter((m: any) => m.movementType === 'out').length.toString() }
      ]
    });
  };

  useEffect(() => {
    setFilteredMovements(stockMovements);
  }, [stockMovements]);

  useEffect(() => {
    handleFilter();
  }, [searchTerm, fromDate, toDate, stockMovements]);


  if (tanksLoading || productsLoading || movementsLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-32 bg-muted rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const getProductName = (productId: string) => {
    const product = products.find(p => p.id === productId);
    return product?.name || 'Unknown Product';
  };

  const getTankStatus = (currentStock: number, capacity: number, minimumLevel: number) => {
    const percentage = (currentStock / capacity) * 100;
    if (currentStock <= minimumLevel) return { status: 'critical', color: 'bg-red-600', textColor: 'text-red-600' };
    if (percentage < 30) return { status: 'low', color: 'bg-orange-600', textColor: 'text-orange-600' };
    return { status: 'normal', color: 'bg-green-600', textColor: 'text-green-600' };
  };

  return (
    <div className="space-y-8 fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-semibold text-card-foreground">Stock & Inventory Management</h3>
          <p className="text-muted-foreground">Real-time tank monitoring and inventory control</p>
        </div>
        <div className="flex items-center space-x-3">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-new-stock-entry">
                + New Stock Entry
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add Stock Movement</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="tankId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tank *</FormLabel>
                        <FormControl>
                          <Combobox
                            options={tanks.map(t => ({ value: t.id, label: `${t.name} - ${getProductName(t.productId)}` }))}
                            value={field.value}
                            onValueChange={field.onChange}
                            placeholder="Select tank"
                            emptyMessage="No tanks found"
                            data-testid="select-tank"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="movementType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Movement Type *</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-movement-type">
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="in">Stock In</SelectItem>
                              <SelectItem value="out">Stock Out</SelectItem>
                              <SelectItem value="adjustment">Adjustment</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="quantity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Quantity (L) *</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.001" placeholder="0.000" {...field} data-testid="input-quantity" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="previousStock"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Previous Stock (L) *</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.001" placeholder="0.000" {...field} data-testid="input-previous-stock" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="newStock"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>New Stock (L) *</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.001" placeholder="0.000" {...field} data-testid="input-new-stock" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="referenceType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Reference Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-reference-type">
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="sale">Sale</SelectItem>
                            <SelectItem value="purchase">Purchase</SelectItem>
                            <SelectItem value="adjustment">Adjustment</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Additional details about the stock movement" {...field} data-testid="input-stock-notes" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex justify-end space-x-2 pt-4">
                    <Button type="button" variant="outline" onClick={() => setOpen(false)} data-testid="button-cancel">
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createStockMovementMutation.isPending} data-testid="button-submit-stock">
                      {createStockMovementMutation.isPending ? "Recording..." : "Record Stock Movement"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
          <Button 
            variant="outline" 
            size="sm"
            className="p-2"
            onClick={handleStockReport}
            data-testid="button-stock-report"
            title="View Stock Report"
          >
            <BarChart3 className="w-4 h-4 mr-2" />
            Stock Report
          </Button>
        </div>
      </div>

      {/* Tank Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tanks.map((tank: Tank, index: number) => {
          const currentStock = parseFloat(tank.currentStock || '0');
          const capacity = parseFloat(tank.capacity || '1');
          const minimumLevel = parseFloat(tank.minimumLevel || '0');
          const percentage = Math.round((currentStock / capacity) * 100);
          const available = capacity - currentStock;
          const { status, color, textColor } = getTankStatus(currentStock, capacity, minimumLevel);

          return (
            <Card key={tank.id} className="shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-semibold text-card-foreground" data-testid={`tank-name-${index}`}>
                    {tank.name} - {getProductName(tank.productId)}
                  </h4>
                  <Badge 
                    variant={status === 'normal' ? 'default' : 'destructive'}
                    className={status === 'normal' ? 'bg-green-100 text-green-800' : 
                              status === 'low' ? 'bg-yellow-100 text-yellow-800' : 
                              'bg-red-100 text-red-800'}
                    data-testid={`tank-status-${index}`}
                  >
                    {status === 'critical' ? 'Low Stock' : status === 'low' ? 'Low Stock' : 'Normal'}
                  </Badge>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Current Stock:</span>
                    <span className={`font-semibold ${textColor}`} data-testid={`current-stock-${index}`}>
                      {currentStock.toLocaleString()} L
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Capacity:</span>
                    <span data-testid={`capacity-${index}`}>{capacity.toLocaleString()} L</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Available:</span>
                    <span className="text-green-600 font-medium" data-testid={`available-${index}`}>
                      {available.toLocaleString()} L
                    </span>
                  </div>

                  <div className="space-y-2">
                    <Progress value={percentage} className="h-3" />
                    <div className="text-center text-sm text-muted-foreground" data-testid={`percentage-${index}`}>
                      {percentage}% filled
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Stock Movements and Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Stock Movements */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle>Stock Movements</CardTitle>
            <div className="flex items-center space-x-4">
              <Input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                placeholder="From Date"
                className="h-8 px-2 text-xs"
              />
              <Input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                placeholder="To Date"
                className="h-8 px-2 text-xs"
              />
              <Button variant="outline" onClick={handleFilter} className="h-8 px-2">
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
              <Button variant="outline" onClick={handlePrintReport} className="h-8 px-2">
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="relative flex-1 mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search by product or reference..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-8 px-2"
              />
            </div>

            {movementsLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="animate-pulse p-4 bg-muted rounded-md h-20"></div>
                ))}
              </div>
            ) : (
              <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                {filteredMovements.length > 0 ? filteredMovements.map((movement: StockMovement, index: number) => {
                  const tank = tanks.find(t => t.id === movement.tankId);
                  const product = products.find(p => p.id === tank?.productId);
                  const isPositive = movement.movementType === 'in';
                  const quantity = parseFloat(movement.quantity || '0');
                  const movementDate = movement.movementDate ? new Date(movement.movementDate).toLocaleString('en-GB') : 'Unknown';

                  return (
                    <div key={movement.id} className="p-4 border border-border rounded-md">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className={`font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                            Stock {movement.movementType === 'in' ? 'In' : movement.movementType === 'out' ? 'Out' : 'Adjustment'} - {product?.name || 'Unknown'}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {tank?.name} | {movement.referenceType || 'Manual'} #{movement.referenceId || 'N/A'}
                          </div>
                          <div className="text-xs text-muted-foreground">{movementDate}</div>
                        </div>
                        <div className="text-right">
                          <div className={`font-semibold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                            {isPositive ? '+' : ''}{Math.abs(quantity).toLocaleString()} L
                          </div>
                          <div className="text-sm text-muted-foreground">Movement</div>
                        </div>
                      </div>
                    </div>
                  );
                }) : (
                  <div className="p-4 text-center text-muted-foreground">
                    No stock movements found for the selected criteria.
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Low Stock Alerts */}
        <Card>
          <CardHeader>
            <CardTitle>Stock Alerts & Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Generate real alerts based on tank data */}
              {tanks.filter(tank => {
                const currentStock = parseFloat(tank.currentStock || '0');
                const minimumLevel = parseFloat(tank.minimumLevel || '0');
                return currentStock <= minimumLevel;
              }).slice(0, 2).map((tank, index) => {
                const currentStock = parseFloat(tank.currentStock || '0');
                const capacity = parseFloat(tank.capacity || '1');
                const percentage = Math.round((currentStock / capacity) * 100);
                const product = products.find(p => p.id === tank.productId);

                return (
                  <div key={tank.id} className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                    <div className="flex items-start">
                      <span className="text-yellow-500 mr-2">⚠️</span>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-yellow-800">Low Stock Alert</div>
                        <div className="text-xs text-yellow-600 mt-1">
                          {tank.name} ({product?.name}) - Only {currentStock.toLocaleString()}L remaining ({percentage}% capacity)
                        </div>
                        <Button 
                          size="sm" 
                          className="mt-2 bg-yellow-600 hover:bg-yellow-700 text-white"
                          onClick={() => handleCreatePurchaseOrder(tank.id)}
                          data-testid="button-create-purchase-order"
                        >
                          Create Purchase Order
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Show info message if no critical alerts */}
              {tanks.filter(tank => parseFloat(tank.currentStock || '0') <= parseFloat(tank.minimumLevel || '0')).length === 0 && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                  <div className="flex items-start">
                    <span className="text-green-500 mr-2">✓</span>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-green-800">All Stock Levels Normal</div>
                      <div className="text-xs text-green-600 mt-1">
                        No critical stock alerts at this time
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Stock Actions */}
            <div className="mt-6 pt-4 border-t border-border">
              <h5 className="font-medium text-card-foreground mb-3">Quick Actions</h5>
              <div className="grid grid-cols-2 gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  className="p-2"
                  onClick={handleStockReport}
                  data-testid="button-stock-report-quick"
                  title="View Stock Report"
                >
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Stock Report
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="p-2"
                  onClick={handleNewPurchase}
                  data-testid="button-new-purchase"
                  title="Create New Purchase"
                >
                  <Package className="w-4 h-4 mr-2" />
                  New Purchase
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="p-2"
                  onClick={handleStockTransfer}
                  data-testid="button-stock-transfer"
                  title="Transfer Stock"
                >
                  <ArrowRightLeft className="w-4 h-4 mr-2" />
                  Stock Transfer
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="p-2"
                  onClick={handleStockAudit}
                  data-testid="button-stock-audit"
                  title="Conduct Stock Audit"
                >
                  <ClipboardList className="w-4 h-4 mr-2" />
                  Stock Audit
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stock Transfer Dialog */}
      <Dialog open={transferDialogOpen} onOpenChange={setTransferDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Stock Transfer</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Source Tank</label>
              <Select onValueChange={(value) => transferForm.setValue("sourceTankId", value)} defaultValue={transferForm.getValues().sourceTankId}>
                <SelectTrigger className="mt-2" data-testid="select-source-tank">
                  <SelectValue placeholder="Choose source tank" />
                </SelectTrigger>
                <SelectContent>
                  {tanks.map(tank => {
                    const product = products.find(p => p.id === tank.productId);
                    return (
                      <SelectItem key={tank.id} value={tank.id}>
                        {tank.name} - {product?.name} ({parseFloat(tank.currentStock || '0').toLocaleString()}L available)
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Destination Tank</label>
              <Select onValueChange={(value) => transferForm.setValue("destinationTankId", value)} defaultValue={transferForm.getValues().destinationTankId}>
                <SelectTrigger className="mt-2" data-testid="select-destination-tank">
                  <SelectValue placeholder="Choose destination tank" />
                </SelectTrigger>
                <SelectContent>
                  {tanks.filter(tank => tank.id !== transferForm.getValues().sourceTankId).map(tank => {
                    const product = products.find(p => p.id === tank.productId);
                    const available = parseFloat(tank.capacity || "0") - parseFloat(tank.currentStock || "0");
                    return (
                      <SelectItem key={tank.id} value={tank.id}>
                        {tank.name} - {product?.name} ({available.toLocaleString()}L capacity)
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Quantity (Liters)</label>
              <Input
                type="number"
                placeholder="Enter quantity to transfer"
                {...transferForm.register("quantity")}
                className="mt-2"
                data-testid="input-transfer-quantity"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Notes</label>
              <Input
                placeholder="Transfer notes (optional)"
                {...transferForm.register("notes")}
                className="mt-2"
                data-testid="input-transfer-notes"
              />
            </div>
            <div className="flex justify-end space-x-3">
              <Button variant="outline" onClick={() => setTransferDialogOpen(false)} data-testid="button-cancel-transfer">
                Cancel
              </Button>
              <Button 
                onClick={executeStockTransfer} 
                disabled={batchStockMovementMutation.isPending}
                data-testid="button-execute-transfer"
              >
                {batchStockMovementMutation.isPending ? "Transferring..." : "Execute Transfer"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Stock Audit Dialog */}
      <Dialog open={auditDialogOpen} onOpenChange={setAuditDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Stock Audit</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Enter the physical count for each tank. The system will automatically calculate adjustments based on the difference between physical and system stock.
            </div>
            <div className="border rounded-lg p-4 bg-muted/50">
              <h4 className="font-medium mb-3">Physical Stock Count:</h4>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {tanks.map(tank => {
                  const product = products.find(p => p.id === tank.productId);
                  const systemStock = parseFloat(tank.currentStock || '0');
                  const physicalStockValue = auditForm.watch(tank.id);
                  const physicalStock = parseFloat(physicalStockValue || '0');
                  const difference = physicalStock - systemStock;

                  return (
                    <div key={tank.id} className="grid grid-cols-12 gap-2 items-center text-sm">
                      <div className="col-span-4">
                        <div className="font-medium">{tank.name}</div>
                        <div className="text-xs text-muted-foreground">{product?.name}</div>
                      </div>
                      <div className="col-span-2 text-center">
                        <div className="text-xs text-muted-foreground">System</div>
                        <div>{systemStock.toLocaleString()}L</div>
                      </div>
                      <div className="col-span-3">
                        <Input
                          type="number"
                          placeholder="Physical count"
                          {...auditForm.register(tank.id)}
                          className="text-center"
                          data-testid={`input-audit-${tank.id}`}
                        />
                      </div>
                      <div className="col-span-3 text-center">
                        <div className="text-xs text-muted-foreground">Difference</div>
                        <div className={`font-medium ${Math.abs(difference) < 0.01 ? 'text-green-600' : difference > 0 ? 'text-blue-600' : 'text-red-600'}`}>
                          {Math.abs(difference) < 0.01 ? '✓' : (difference > 0 ? '+' : '') + difference.toFixed(1)}L
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="flex justify-end space-x-3">
              <Button variant="outline" onClick={() => setAuditDialogOpen(false)} data-testid="button-cancel-audit">
                Cancel
              </Button>
              <Button 
                onClick={executeStockAudit} 
                disabled={batchStockMovementMutation.isPending}
                data-testid="button-execute-audit"
              >
                {batchStockMovementMutation.isPending ? "Processing..." : "Complete Audit"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}