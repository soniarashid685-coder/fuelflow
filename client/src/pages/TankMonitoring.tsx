import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { useCurrency } from "@/contexts/CurrencyContext";
import { formatAmount } from "@/lib/currency";
import { 
  Gauge, 
  AlertTriangle, 
  AlertCircle, 
  CheckCircle,
  Wrench,
  Droplets,
  Calendar,
  TrendingDown,
  TrendingUp,
  Plus
} from "lucide-react";
import type { Tank, Product, StockMovement } from "@shared/schema";

interface TankWithProduct extends Tank {
  product: Product;
}

export default function TankMonitoring() {
  const { user } = useAuth();
  const { formatCurrency } = useCurrency();
  const [selectedTank, setSelectedTank] = useState<string | null>(null);
  const [addTankDialogOpen, setAddTankDialogOpen] = useState(false);
  const [maintenanceDialogOpen, setMaintenanceDialogOpen] = useState(false);
  const [selectedTankForMaintenance, setSelectedTankForMaintenance] = useState<TankWithProduct | null>(null);

  const handleAddTank = () => {
    setAddTankDialogOpen(true);
  };

  const handleMaintenance = (tank: TankWithProduct) => {
    setSelectedTankForMaintenance(tank);
    setMaintenanceDialogOpen(true);
  };

  const { data: tanks = [], isLoading } = useQuery<TankWithProduct[]>({
    queryKey: [`/api/tanks/${user?.stationId}`],
    enabled: !!user?.stationId,
    refetchInterval: 10000, // Real-time updates every 10 seconds
  });

  const { data: stockMovements = [] } = useQuery<StockMovement[]>({
    queryKey: [`/api/stock-movements/${selectedTank}`],
    enabled: !!selectedTank,
  });

  const getStockPercentage = (tank: Tank): number => {
    const current = parseFloat(tank.currentStock || '0');
    const capacity = parseFloat(tank.capacity || '1');
    return Math.round((current / capacity) * 100);
  };

  const getStockStatus = (tank: Tank): 'critical' | 'low' | 'normal' => {
    const percentage = getStockPercentage(tank);
    const minLevel = parseFloat(tank.minimumLevel || '0');
    const capacity = parseFloat(tank.capacity || '1');
    const minPercentage = (minLevel / capacity) * 100;

    if (percentage <= minPercentage * 0.5) return 'critical';
    if (percentage <= minPercentage) return 'low';
    return 'normal';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'critical':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'low':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'maintenance':
        return <Wrench className="w-5 h-5 text-gray-500" />;
      default:
        return <CheckCircle className="w-5 h-5 text-green-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'critical':
        return 'destructive';
      case 'low':
        return 'secondary';
      case 'maintenance':
        return 'outline';
      default:
        return 'default';
    }
  };

  const getProgressColor = (percentage: number, stockStatus: string) => {
    if (stockStatus === 'critical') return 'bg-red-500';
    if (stockStatus === 'low') return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const alertTanks = tanks.filter(tank => {
    const stockStatus = getStockStatus(tank);
    return stockStatus === 'critical' || stockStatus === 'low' || tank.status === 'maintenance';
  });

  const totalCapacity = tanks.reduce((sum, tank) => sum + parseFloat(tank.capacity || '0'), 0);
  const totalStock = tanks.reduce((sum, tank) => sum + parseFloat(tank.currentStock || '0'), 0);
  const totalStockPercentage = totalCapacity > 0 ? Math.round((totalStock / totalCapacity) * 100) : 0;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-muted rounded"></div>
            ))}
          </div>
          <div className="h-96 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" data-testid="page-title">Tank Monitoring</h1>
          <p className="text-muted-foreground">Monitor fuel tank levels and inventory status</p>
        </div>
        <div className="flex items-center gap-2">
          <Gauge className="w-5 h-5" />
          <span className="text-sm font-medium">Live Monitoring</span>
        </div>
      </div>

      {/* Alerts Section */}
      {alertTanks.length > 0 && (
        <Alert className="border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/20">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertDescription>
            <span className="font-semibold text-yellow-800 dark:text-yellow-200">
              {alertTanks.length} tank{alertTanks.length > 1 ? 's' : ''} require{alertTanks.length === 1 ? 's' : ''} attention:
            </span>
            <span className="text-yellow-700 dark:text-yellow-300 ml-2" data-testid="alert-tanks">
              {alertTanks.map(tank => tank.name).join(', ')}
            </span>
          </AlertDescription>
        </Alert>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Tanks</p>
                <p className="text-3xl font-bold" data-testid="total-tanks">{tanks.length}</p>
              </div>
              <Droplets className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Capacity</p>
                <p className="text-3xl font-bold" data-testid="total-capacity">
                  {totalCapacity.toLocaleString()}L
                </p>
              </div>
              <Gauge className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Current Stock</p>
                <p className="text-3xl font-bold" data-testid="total-stock">
                  {totalStock.toLocaleString()}L
                </p>
                <p className="text-sm text-muted-foreground">({totalStockPercentage}% full)</p>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Alerts</p>
                <p className="text-3xl font-bold text-red-500" data-testid="alert-count">{alertTanks.length}</p>
                <p className="text-sm text-muted-foreground">Require attention</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tank Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {tanks.map((tank) => {
          const percentage = getStockPercentage(tank);
          const stockStatus = getStockStatus(tank);
          const isLowStock = stockStatus === 'critical' || stockStatus === 'low';
          
          return (
            <Card 
              key={tank.id} 
              className={`relative transition-all duration-200 hover:shadow-lg ${
                isLowStock ? 'border-l-4 border-l-red-500' : 
                tank.status === 'maintenance' ? 'border-l-4 border-l-yellow-500' : 
                'border-l-4 border-l-green-500'
              }`}
              data-testid={`tank-card-${tank.name.toLowerCase().replace(/\s+/g, '-')}`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg" data-testid={`tank-name-${tank.name.toLowerCase().replace(/\s+/g, '-')}`}>
                    {tank.name}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(tank.status || 'normal')}
                    <Badge variant={getStatusColor(stockStatus)} data-testid={`tank-status-${tank.name.toLowerCase().replace(/\s+/g, '-')}`}>
                      {stockStatus.toUpperCase()}
                    </Badge>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground" data-testid={`tank-product-${tank.name.toLowerCase().replace(/\s+/g, '-')}`}>
                  {tank.product?.name || 'Unknown Product'}
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Stock Level Progress */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Stock Level</span>
                    <span className="font-medium" data-testid={`tank-percentage-${tank.name.toLowerCase().replace(/\s+/g, '-')}`}>
                      {percentage}%
                    </span>
                  </div>
                  <Progress 
                    value={percentage} 
                    className={`h-2 ${getProgressColor(percentage, stockStatus)}`}
                    data-testid={`tank-progress-${tank.name.toLowerCase().replace(/\s+/g, '-')}`}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span data-testid={`tank-current-stock-${tank.name.toLowerCase().replace(/\s+/g, '-')}`}>
                      {parseFloat(tank.currentStock || '0').toLocaleString()}L
                    </span>
                    <span data-testid={`tank-capacity-${tank.name.toLowerCase().replace(/\s+/g, '-')}`}>
                      {parseFloat(tank.capacity || '0').toLocaleString()}L
                    </span>
                  </div>
                </div>

                {/* Stock Metrics */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Min Level</p>
                    <p className="font-medium" data-testid={`tank-min-level-${tank.name.toLowerCase().replace(/\s+/g, '-')}`}>
                      {parseFloat(tank.minimumLevel || '0').toLocaleString()}L
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Last Refill</p>
                    <p className="font-medium" data-testid={`tank-last-refill-${tank.name.toLowerCase().replace(/\s+/g, '-')}`}>
                      {tank.lastRefillDate ? 
                        new Date(tank.lastRefillDate).toLocaleDateString() : 
                        'Never'
                      }
                    </p>
                  </div>
                </div>

                {/* Stock Value */}
                <div className="pt-2 border-t">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Stock Value</span>
                    <span className="font-semibold" data-testid={`tank-stock-value-${tank.name.toLowerCase().replace(/\s+/g, '-')}`}>
                      {formatAmount(
                        parseFloat(tank.currentStock ?? '0') * parseFloat(tank.product?.currentPrice ?? '0')
                      )}
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => setSelectedTank(selectedTank === tank.id ? null : tank.id)}
                    data-testid={`button-view-details-${tank.name.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    <Calendar className="w-4 h-4 mr-2" />
                    {selectedTank === tank.id ? 'Hide' : 'View'} History
                  </Button>
                  {tank.status === 'maintenance' && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleMaintenance(tank)}
                      data-testid={`button-maintenance-${tank.name.toLowerCase().replace(/\s+/g, '-')}`}
                    >
                      <Wrench className="w-4 h-4" />
                    </Button>
                  )}
                </div>

                {/* Stock Movements (if selected) */}
                {selectedTank === tank.id && (
                  <div className="pt-4 border-t space-y-2">
                    <h4 className="font-medium text-sm flex items-center">
                      <TrendingDown className="w-4 h-4 mr-2" />
                      Recent Activity
                    </h4>
                    {stockMovements.length > 0 ? (
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {stockMovements.slice(0, 5).map((movement, index) => (
                          <div 
                            key={movement.id || index} 
                            className="flex justify-between items-center text-xs p-2 rounded bg-muted/50"
                            data-testid={`stock-movement-${index}`}
                          >
                            <div className="flex items-center gap-2">
                              <span className={`w-2 h-2 rounded-full ${
                                movement.movementType === 'in' ? 'bg-green-500' : 'bg-red-500'
                              }`}></span>
                              <span>{movement.movementType === 'in' ? 'Refill' : 'Sale'}</span>
                            </div>
                            <div className="text-right">
                              <div className="font-medium">
                                {movement.movementType === 'in' ? '+' : '-'}{parseFloat(movement.quantity || '0').toFixed(1)}L
                              </div>
                              <div className="text-muted-foreground">
                                {new Date(movement.movementDate || new Date()).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">No recent activity</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {tanks.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Droplets className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Tanks Found</h3>
            <p className="text-muted-foreground mb-4">
              No fuel tanks are configured for this station.
            </p>
            <Button onClick={handleAddTank} data-testid="button-add-tank">
              <Plus className="w-4 h-4 mr-2" />
              Add Tank
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Add Tank Dialog */}
      <Dialog open={addTankDialogOpen} onOpenChange={setAddTankDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add New Tank</DialogTitle>
          </DialogHeader>
          <div className="p-4">
            <p className="text-muted-foreground">Tank creation functionality will be implemented soon.</p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Maintenance Dialog */}
      <Dialog open={maintenanceDialogOpen} onOpenChange={setMaintenanceDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Tank Maintenance</DialogTitle>
          </DialogHeader>
          {selectedTankForMaintenance && (
            <div className="p-4">
              <p className="mb-4">Tank: {selectedTankForMaintenance.name}</p>
              <p className="text-muted-foreground">Maintenance scheduling functionality will be implemented soon.</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}