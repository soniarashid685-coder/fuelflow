import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/api";
import { Users, Settings, Building2, Shield, Plus, Edit, Trash2 } from "lucide-react";

interface User {
  id: string;
  username: string;
  fullName: string;
  role: string;
  stationId?: string;
  isActive: boolean;
  createdAt: string;
}

interface Station {
  id: string;
  name: string;
  address: string;
  contactPhone: string;
  isActive: boolean;
}

export default function AdminPanel() {
  const { user } = useAuth();
  const { toast } = useToast();

  // Redirect if not admin
  useEffect(() => {
    if (user?.role !== 'admin') {
      toast({
        title: "Access Denied",
        description: "Only administrators can access this panel",
        variant: "destructive"
      });
      return;
    }
  }, [user, toast]);

  const [users, setUsers] = useState<User[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'users' | 'stations' | 'system'>('users');

  // User form state
  const [userForm, setUserForm] = useState({
    username: '',
    password: '',
    fullName: '',
    role: 'cashier' as const,
    stationId: '',
    isActive: true
  });
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userDialogOpen, setUserDialogOpen] = useState(false);

  // Station form state
  const [stationForm, setStationForm] = useState({
    name: '',
    address: '',
    contactPhone: '',
    isActive: true
  });
  const [editingStation, setEditingStation] = useState<Station | null>(null);
  const [stationDialogOpen, setStationDialogOpen] = useState(false);

  // System settings
  const [systemSettings, setSystemSettings] = useState({
    maintenanceMode: false,
    allowNewRegistrations: true,
    sessionTimeout: 24,
    backupFrequency: 'daily'
  });

  // Load data
  useEffect(() => {
    if (user?.role === 'admin') {
      loadUsers();
      loadStations();
      loadSystemSettings();
    }
  }, [user]);

  const loadUsers = async () => {
    try {
      const response = await apiRequest('GET', '/api/admin/users');
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const loadStations = async () => {
    try {
      const response = await apiRequest('GET', '/api/stations');
      if (response.ok) {
        const data = await response.json();
        setStations(data);
      }
    } catch (error) {
      console.error('Error loading stations:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSystemSettings = () => {
    // Load from localStorage for now
    const saved = localStorage.getItem('systemSettings');
    if (saved) {
      try {
        setSystemSettings(JSON.parse(saved));
      } catch (error) {
        console.error('Error loading system settings:', error);
      }
    }
  };

  const handleCreateUser = async () => {
    try {
      const response = await apiRequest('POST', '/api/admin/users', userForm);
      if (response.ok) {
        const newUser = await response.json();
        setUsers(prev => [...prev, newUser]);
        setUserForm({ username: '', password: '', fullName: '', role: 'cashier', stationId: '', isActive: true });
        setUserDialogOpen(false);
        toast({ title: "User created successfully" });
      }
    } catch (error) {
      toast({ title: "Failed to create user", variant: "destructive" });
    }
  };

  const updateUser = async (userId: string, updates: any) => {
    try {
      await apiRequest("PUT", `/api/admin/users/${userId}`, updates);
      toast({
        title: "Success",
        description: "User updated successfully",
      });

      // If deactivating a user, notify them via a broadcast channel (for same-browser sessions)
      if (updates.isActive === false) {
        const broadcastChannel = new BroadcastChannel('user-status');
        broadcastChannel.postMessage({ 
          type: 'USER_DEACTIVATED', 
          userId 
        });
      }

      // Refetch users
      const response = await apiRequest("GET", "/api/admin/users");
      const updatedUsers = await response.json();
      setUsers(updatedUsers);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update user",
        variant: "destructive",
      });
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;

    try {
      const response = await apiRequest('DELETE', `/api/admin/users/${userId}`);
      if (response.ok) {
        setUsers(prev => prev.filter(u => u.id !== userId));
        toast({ title: "User deleted successfully" });
      }
    } catch (error) {
      toast({ title: "Failed to delete user", variant: "destructive" });
    }
  };

  const handleApproveUser = async (userId: string) => {
    updateUser(userId, { isActive: true });
  };

  const handleRejectUser = async (userId: string) => {
    updateUser(userId, { isActive: false });
  };

  const handleCreateStation = async () => {
    try {
      const response = await apiRequest('POST', '/api/stations', stationForm);
      if (response.ok) {
        const newStation = await response.json();
        setStations(prev => [...prev, newStation]);
        setStationForm({ name: '', address: '', contactPhone: '', isActive: true });
        setStationDialogOpen(false);
        toast({ title: "Station created successfully" });
      }
    } catch (error) {
      toast({ title: "Failed to create station", variant: "destructive" });
    }
  };

  const saveSystemSettings = () => {
    localStorage.setItem('systemSettings', JSON.stringify(systemSettings));
    toast({ title: "System settings saved" });
  };

  if (user?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Shield className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
          <p className="text-muted-foreground">Only administrators can access this panel</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return <div className="flex items-center justify-center h-96">Loading...</div>;
  }

  return (
    <div className="space-y-6 fade-in">
      <div className="mb-6">
        <h3 className="text-2xl font-semibold text-card-foreground mb-2">Admin Panel</h3>
        <p className="text-muted-foreground">
          Manage users, stations, and system settings
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-muted p-1 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'users' 
              ? 'bg-background text-foreground shadow-sm' 
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Users className="w-4 h-4 inline mr-2" />
          Users
        </button>
        <button
          onClick={() => setActiveTab('stations')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'stations' 
              ? 'bg-background text-foreground shadow-sm' 
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Building2 className="w-4 h-4 inline mr-2" />
          Stations
        </button>
        <button
          onClick={() => setActiveTab('system')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'system' 
              ? 'bg-background text-foreground shadow-sm' 
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Settings className="w-4 h-4 inline mr-2" />
          System
        </button>
      </div>

      {/* Users Tab */}
      {activeTab === 'users' && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>User Management</CardTitle>
            <Dialog open={userDialogOpen} onOpenChange={setUserDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => {
                  setEditingUser(null);
                  setUserForm({ username: '', password: '', fullName: '', role: 'cashier', stationId: '', isActive: true });
                }}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add User
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingUser ? 'Edit User' : 'Create New User'}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Username</Label>
                    <Input
                      value={userForm.username}
                      onChange={(e) => setUserForm(prev => ({ ...prev, username: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>Password</Label>
                    <Input
                      type="password"
                      value={userForm.password}
                      onChange={(e) => setUserForm(prev => ({ ...prev, password: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>Full Name</Label>
                    <Input
                      value={userForm.fullName}
                      onChange={(e) => setUserForm(prev => ({ ...prev, fullName: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>Role</Label>
                    <Select 
                      value={userForm.role} 
                      onValueChange={(value: 'admin' | 'manager' | 'cashier') => 
                        setUserForm(prev => ({ ...prev, role: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="manager">Manager</SelectItem>
                        <SelectItem value="cashier">Cashier</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Station</Label>
                    <Select 
                      value={userForm.stationId} 
                      onValueChange={(value) => setUserForm(prev => ({ ...prev, stationId: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select station" />
                      </SelectTrigger>
                      <SelectContent>
                        {stations.map(station => (
                          <SelectItem key={station.id} value={station.id}>
                            {station.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setUserDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={editingUser ? () => updateUser(editingUser.id, userForm) : handleCreateUser}>
                      {editingUser ? 'Update' : 'Create'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Username</TableHead>
                  <TableHead>Full Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Station</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map(user => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.username}</TableCell>
                    <TableCell>{user.fullName}</TableCell>
                    <TableCell>
                      <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {stations.find(s => s.id === user.stationId)?.name || 'N/A'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.isActive ? 'default' : 'destructive'}>
                        {user.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        {!user.isActive && (
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => handleApproveUser(user.id)}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            Approve
                          </Button>
                        )}
                        {user.isActive && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRejectUser(user.id)}
                            className="text-orange-600 border-orange-600 hover:bg-orange-50"
                          >
                            Revoke
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingUser(user);
                            setUserForm({
                              username: user.username,
                              password: '',
                              fullName: user.fullName,
                              role: user.role as 'admin' | 'manager' | 'cashier',
                              stationId: user.stationId || '',
                              isActive: user.isActive
                            });
                            setUserDialogOpen(true);
                          }}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeleteUser(user.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Stations Tab */}
      {activeTab === 'stations' && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Station Management</CardTitle>
            <Dialog open={stationDialogOpen} onOpenChange={setStationDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => {
                  setEditingStation(null);
                  setStationForm({ name: '', address: '', contactPhone: '', isActive: true });
                }}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Station
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Station</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Station Name</Label>
                    <Input
                      value={stationForm.name}
                      onChange={(e) => setStationForm(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>Address</Label>
                    <Input
                      value={stationForm.address}
                      onChange={(e) => setStationForm(prev => ({ ...prev, address: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>Contact Phone</Label>
                    <Input
                      value={stationForm.contactPhone}
                      onChange={(e) => setStationForm(prev => ({ ...prev, contactPhone: e.target.value }))}
                    />
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setStationDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleCreateStation}>
                      Create Station
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stations.map(station => (
                  <TableRow key={station.id}>
                    <TableCell className="font-medium">{station.name}</TableCell>
                    <TableCell>{station.address}</TableCell>
                    <TableCell>{station.contactPhone}</TableCell>
                    <TableCell>
                      <Badge variant={station.isActive ? 'default' : 'destructive'}>
                        {station.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* System Settings Tab */}
      {activeTab === 'system' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>System Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Maintenance Mode</Label>
                  <p className="text-sm text-muted-foreground">
                    Disable user access for system maintenance
                  </p>
                </div>
                <Switch
                  checked={systemSettings.maintenanceMode}
                  onCheckedChange={(checked) => 
                    setSystemSettings(prev => ({ ...prev, maintenanceMode: checked }))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Allow New Registrations</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow users to create new accounts
                  </p>
                </div>
                <Switch
                  checked={systemSettings.allowNewRegistrations}
                  onCheckedChange={(checked) => 
                    setSystemSettings(prev => ({ ...prev, allowNewRegistrations: checked }))
                  }
                />
              </div>

              <div>
                <Label>Session Timeout (hours)</Label>
                <Input
                  type="number"
                  value={systemSettings.sessionTimeout}
                  onChange={(e) => 
                    setSystemSettings(prev => ({ ...prev, sessionTimeout: parseInt(e.target.value) }))
                  }
                  className="mt-2"
                />
              </div>

              <div>
                <Label>Backup Frequency</Label>
                <Select 
                  value={systemSettings.backupFrequency} 
                  onValueChange={(value) => 
                    setSystemSettings(prev => ({ ...prev, backupFrequency: value }))
                  }
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hourly">Hourly</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button onClick={saveSystemSettings} className="w-full">
                Save System Settings
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>System Statistics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-2xl font-bold">{users.length}</div>
                  <div className="text-sm text-muted-foreground">Total Users</div>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-2xl font-bold">{stations.length}</div>
                  <div className="text-sm text-muted-foreground">Active Stations</div>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-2xl font-bold">{users.filter(u => u.isActive).length}</div>
                  <div className="text-sm text-muted-foreground">Active Users</div>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-2xl font-bold">{users.filter(u => u.role === 'admin').length}</div>
                  <div className="text-sm text-muted-foreground">Admin Users</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}