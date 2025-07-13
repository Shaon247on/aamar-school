'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import {
  BuildingIcon,
  PlusIcon,
  SearchIcon,
  EditIcon,
  TrashIcon,
  MoreVerticalIcon,
  PhoneIcon,
  MailIcon,
  MapPinIcon,
  UsersIcon,
  BookOpenIcon,
  CalendarIcon,
  BarChartIcon,
  EyeIcon,
  SettingsIcon,
  Loader2Icon,
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { 
  getBranches, 
  createBranch, 
  updateBranch, 
  deleteBranch, 
  getBranchStats 
} from '@/app/actions/branches';

interface Branch {
  id: string;
  name: string;
  code: string;
  address: string;
  phone: string;
  email: string;
  isActive: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
  totalStudents?: number;
  totalTeachers?: number;
  totalClasses?: number;
  school?: {
    name: string;
  };
}

interface BranchFormData {
  name: string;
  code: string;
  address: string;
  phone: string;
  email: string;
  isActive: boolean;
}

export default function BranchesPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalBranches: 0,
    activeBranches: 0,
    totalStudents: 0,
    totalTeachers: 0,
  });
  const [selectedTab, setSelectedTab] = useState('branches');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('All Status');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [formData, setFormData] = useState<BranchFormData>({
    name: '',
    code: '',
    address: '',
    phone: '',
    email: '',
    isActive: true,
  });
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [branchesRes, statsRes] = await Promise.all([
        getBranches(),
        getBranchStats(),
      ]);

      if (branchesRes.success) {
        setBranches(branchesRes.data || []);
      } else {
        toast({
          title: "Error",
          description: branchesRes.message,
          variant: "destructive",
        });
      }

      if (statsRes.success) {
        setStats(statsRes.data || {
          totalBranches: 0,
          activeBranches: 0,
          totalStudents: 0,
          totalTeachers: 0,
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  const filteredBranches = branches.filter(branch => {
    const matchesSearch = branch.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         branch.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = selectedStatus === 'All Status' || 
                         (selectedStatus === 'Active' && branch.isActive) ||
                         (selectedStatus === 'Inactive' && !branch.isActive);
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (isActive: boolean) => {
    return isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
  };

  const getStatusText = (isActive: boolean) => {
    return isActive ? 'Active' : 'Inactive';
  };

  function openAddDialog() {
    setSelectedBranch(null); // Clear selected branch for new creation
    setFormData({
      name: '',
      code: '',
      address: '',
      phone: '',
      email: '',
      isActive: true,
    });
    setShowAddDialog(true);
  }

  function openEditDialog(branch: Branch) {
    setSelectedBranch(branch);
    setFormData({
      name: branch.name,
      code: branch.code,
      address: branch.address,
      phone: branch.phone,
      email: branch.email,
      isActive: branch.isActive,
    });
    setShowEditDialog(true);
  }

  function openViewDialog(branch: Branch) {
    setSelectedBranch(branch);
    setShowViewDialog(true);
  }

  function openDeleteDialog(branch: Branch) {
    setSelectedBranch(branch);
    setShowDeleteDialog(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    try {
      let result;
      if (selectedBranch) {
        result = await updateBranch(selectedBranch.id, formData);
      } else {
        result = await createBranch(formData);
      }

      if (result.success) {
        toast({
          title: selectedBranch ? "Branch Updated" : "Branch Created",
          description: result.message,
        });
        setShowAddDialog(false);
        setShowEditDialog(false);
        setSelectedBranch(null); // Clear selected branch after successful operation
        loadData();
      } else {
        toast({
          title: "Error",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!selectedBranch) return;

    setSubmitting(true);
    try {
      const result = await deleteBranch(selectedBranch.id);
      
      if (result.success) {
        toast({
          title: "Branch Deleted",
          description: result.message,
        });
        setShowDeleteDialog(false);
        setSelectedBranch(null); // Clear selected branch after successful operation
        loadData();
      } else {
        toast({
          title: "Error",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleStatus(branch: Branch) {
    setSubmitting(true);
    try {
      const result = await updateBranch(branch.id, {
        isActive: !branch.isActive
      });
      
      if (result.success) {
        toast({
          title: "Status Updated",
          description: `Branch ${branch.name} is now ${!branch.isActive ? 'Active' : 'Inactive'}`,
        });
        loadData();
      } else {
        toast({
          title: "Error",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  }

  const statusOptions = ['All Status', 'Active', 'Inactive'];

  return (
    <div className="space-y-6 pb-[150px] p-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Branch Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage school branches, facilities, and campus information
          </p>
        </div>
        <Button onClick={openAddDialog} className="gap-2">
          <PlusIcon className="h-4 w-4" />
          Add Branch
        </Button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Branches</p>
                <p className="text-xl font-bold">{stats.totalBranches}</p>
              </div>
              <div className="p-2 rounded-lg bg-blue-100">
                <BuildingIcon className="h-4 w-4 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Active Branches</p>
                <p className="text-xl font-bold">{stats.activeBranches}</p>
              </div>
              <div className="p-2 rounded-lg bg-green-100">
                <BuildingIcon className="h-4 w-4 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                <p className="text-xs text-muted-foreground">Total Students</p>
                <p className="text-xl font-bold">{stats.totalStudents.toLocaleString()}</p>
              </div>
              <div className="p-2 rounded-lg bg-purple-100">
                <UsersIcon className="h-4 w-4 text-purple-600" />
              </div>
                </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Teachers</p>
                <p className="text-xl font-bold">{stats.totalTeachers}</p>
              </div>
              <div className="p-2 rounded-lg bg-orange-100">
                <BookOpenIcon className="h-4 w-4 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search branches..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((status) => (
                  <SelectItem key={status} value={status}>{status}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="branches">Branches</TabsTrigger>
          <TabsTrigger value="facilities">Facilities</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="branches" className="space-y-4">
          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2Icon className="h-6 w-6 animate-spin" />
                  <span className="ml-2">Loading branches...</span>
                </div>
              ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Branch</TableHead>
                      <TableHead>Branch Code</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Students</TableHead>
                    <TableHead>Teachers</TableHead>
                      <TableHead>Classes</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                    {filteredBranches.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          {searchTerm || selectedStatus !== 'All Status' 
                            ? 'No branches found matching your criteria' 
                            : 'No branches found. Create your first branch to get started.'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredBranches.map((branch) => (
                    <TableRow key={branch.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-blue-100 rounded-lg">
                            <BuildingIcon className="h-4 w-4 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-medium">{branch.name}</p>
                                <p className="text-sm text-muted-foreground">{branch.address}</p>
                          </div>
                        </div>
                      </TableCell>
                          <TableCell className="font-mono text-sm">{branch.code}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p className="flex items-center gap-1">
                            <PhoneIcon className="h-3 w-3" />
                            {branch.phone}
                          </p>
                          <p className="flex items-center gap-1 text-muted-foreground">
                            <MailIcon className="h-3 w-3" />
                            {branch.email}
                          </p>
                        </div>
                      </TableCell>
                          <TableCell className="text-center font-semibold">{branch.totalStudents || 0}</TableCell>
                          <TableCell className="text-center font-semibold">{branch.totalTeachers || 0}</TableCell>
                          <TableCell className="text-center font-semibold">{branch.totalClasses || 0}</TableCell>
                      <TableCell>
                            <Badge className={getStatusColor(branch.isActive)}>
                              {branch.isActive ? (
                                <div className="flex items-center gap-1">
                                  <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                                  {getStatusText(branch.isActive)}
                                </div>
                              ) : (
                                <div className="flex items-center gap-1">
                                  <div className="w-2 h-2 bg-red-600 rounded-full"></div>
                                  {getStatusText(branch.isActive)}
                                </div>
                              )}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVerticalIcon className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => openViewDialog(branch)}>
                              <EyeIcon className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => openEditDialog(branch)}>
                              <EditIcon className="h-4 w-4 mr-2" />
                              Edit Branch
                            </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => handleToggleStatus(branch)}
                                  disabled={submitting}
                                  className={branch.isActive ? "text-orange-600" : "text-green-600"}
                                >
                                  {submitting ? (
                                    <Loader2Icon className="h-4 w-4 mr-2 animate-spin" />
                                  ) : (
                              <SettingsIcon className="h-4 w-4 mr-2" />
                                  )}
                                  {branch.isActive ? "Deactivate" : "Activate"}
                            </DropdownMenuItem>
                                <DropdownMenuItem className="text-red-600" onClick={() => openDeleteDialog(branch)}>
                              <TrashIcon className="h-4 w-4 mr-2" />
                                  Delete Branch
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                      ))
                    )}
                </TableBody>
              </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="facilities" className="space-y-4">
          <div className="grid gap-4">
            {filteredBranches.map((branch) => (
              <Card key={branch.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-blue-100 rounded-lg">
                        <BuildingIcon className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold">{branch.name}</h4>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <MapPinIcon className="h-3 w-3" />
                          {branch.address}
                        </p>
                      </div>
                    </div>
                    <Badge className={getStatusColor(branch.isActive)}>
                      {getStatusText(branch.isActive)}
                    </Badge>
                  </div>
                  <div>
                    <h5 className="font-medium mb-2">Branch Information</h5>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p><strong>Phone:</strong> {branch.phone}</p>
                        <p><strong>Email:</strong> {branch.email}</p>
                      </div>
                      <div>
                        <p><strong>Students:</strong> {branch.totalStudents || 0}</p>
                        <p><strong>Teachers:</strong> {branch.totalTeachers || 0}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredBranches.map((branch) => (
              <Card key={branch.id}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <BuildingIcon className="h-4 w-4 text-blue-600" />
                    </div>
                    {branch.name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-3 bg-blue-50 rounded-lg">
                        <p className="text-xs text-muted-foreground">Students</p>
                        <p className="text-lg font-bold text-blue-600">{branch.totalStudents || 0}</p>
                      </div>
                      <div className="text-center p-3 bg-green-50 rounded-lg">
                        <p className="text-xs text-muted-foreground">Teachers</p>
                        <p className="text-lg font-bold text-green-600">{branch.totalTeachers || 0}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-3 bg-purple-50 rounded-lg">
                        <p className="text-xs text-muted-foreground">Classes</p>
                        <p className="text-lg font-bold text-purple-600">{branch.totalClasses || 0}</p>
                      </div>
                      <div className="text-center p-3 bg-orange-50 rounded-lg">
                        <p className="text-xs text-muted-foreground">Status</p>
                        <p className="text-lg font-bold text-orange-600">{getStatusText(branch.isActive)}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Branch Status Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span>Active</span>
                    <span className="font-semibold text-green-600">{stats.activeBranches}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Inactive</span>
                    <span className="font-semibold text-red-600">{stats.totalBranches - stats.activeBranches}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Student Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {branches.slice(0, 4).map((branch) => (
                    <div key={branch.id} className="flex justify-between">
                      <span>{branch.name}</span>
                      <span className="font-semibold">{branch.totalStudents || 0}</span>
                  </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Branch Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span>Total Branches</span>
                    <span className="font-semibold">{stats.totalBranches}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Students</span>
                    <span className="font-semibold">{stats.totalStudents}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Teachers</span>
                    <span className="font-semibold">{stats.totalTeachers}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Add Branch Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add New Branch</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Branch Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter branch name"
                  required
                />
              </div>
                <div className="space-y-2">
                <Label htmlFor="code">Branch Code</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="e.g., MAIN"
                  required
                />
              </div>
                </div>
                <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Enter complete address"
                required
              />
                </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="Phone number"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="Branch email"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select 
                value={formData.isActive ? "active" : "inactive"} 
                onValueChange={(value) => setFormData({ ...formData, isActive: value === "active" })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2Icon className="h-4 w-4 mr-2 animate-spin" />}
                Add Branch
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Branch Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Branch</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                <Label htmlFor="edit-name">Branch Name</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter branch name"
                  required
                />
                </div>
                <div className="space-y-2">
                <Label htmlFor="edit-code">Branch Code</Label>
                <Input
                  id="edit-code"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="e.g., MAIN"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-address">Address</Label>
              <Textarea
                id="edit-address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Enter complete address"
                required
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-phone">Phone</Label>
                <Input
                  id="edit-phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="Phone number"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="Branch email"
                  required
                />
              </div>
              </div>
              <div className="space-y-2">
              <Label htmlFor="edit-status">Status</Label>
              <Select 
                value={formData.isActive ? "active" : "inactive"} 
                onValueChange={(value) => setFormData({ ...formData, isActive: value === "active" })}
              >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setShowEditDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2Icon className="h-4 w-4 mr-2 animate-spin" />}
                Update Branch
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Branch Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Branch Details</DialogTitle>
          </DialogHeader>
          {selectedBranch && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Branch Name</Label>
                  <p className="text-sm text-muted-foreground">{selectedBranch.name}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Branch Code</Label>
                  <p className="text-sm text-muted-foreground font-mono">{selectedBranch.code}</p>
                </div>
                <div className="md:col-span-2">
                  <Label className="text-sm font-medium">Address</Label>
                  <p className="text-sm text-muted-foreground">{selectedBranch.address}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Phone</Label>
                  <p className="text-sm text-muted-foreground">{selectedBranch.phone}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Email</Label>
                  <p className="text-sm text-muted-foreground">{selectedBranch.email}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Status</Label>
                  <Badge className={getStatusColor(selectedBranch.isActive)}>
                    {getStatusText(selectedBranch.isActive)}
                  </Badge>
                </div>
                <div>
                  <Label className="text-sm font-medium">Created</Label>
                  <p className="text-sm text-muted-foreground">
                    {new Date(selectedBranch.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">{selectedBranch.totalStudents || 0}</p>
                  <p className="text-xs text-muted-foreground">Students</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">{selectedBranch.totalTeachers || 0}</p>
                  <p className="text-xs text-muted-foreground">Teachers</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-purple-600">{selectedBranch.totalClasses || 0}</p>
                  <p className="text-xs text-muted-foreground">Classes</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Branch</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-muted-foreground">
              Are you sure you want to delete <strong>{selectedBranch?.name}</strong>? This action cannot be undone.
            </p>
            <p className="text-sm text-red-600">
              Note: You can only delete branches that have no associated classes or users.
            </p>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
              <Button type="button" variant="destructive" onClick={handleDelete} disabled={submitting}>
                {submitting && <Loader2Icon className="h-4 w-4 mr-2 animate-spin" />}
                Delete Branch
            </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 