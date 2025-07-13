"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  PlusIcon,
  SearchIcon,
  MoreVerticalIcon,
  EyeIcon,
  EditIcon,
  CalendarIcon,
  CheckIcon,
  TrashIcon,
  LoaderIcon,
  AlertTriangleIcon,
  XIcon,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

// Import actions
import {
  getAcademicYears,
  createAcademicYear,
  updateAcademicYear,
  deleteAcademicYear,
  getAcademicYearStats,
} from "@/app/actions/academicYear";

interface AcademicYearData {
  id: string;
  aamarId: string;
  startingYear: number;
  displayName: string;
  status: boolean;
  terms: any;
  userId: string;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

interface StatsData {
  totalYears: number;
  activeYear: AcademicYearData | null;
  yearsList: Array<{
    id: string;
    displayName: string;
    startingYear: number;
    status: boolean;
    createdAt: Date;
  }>;
}

export default function AcademicYearPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [reloading, setReloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Data states
  const [academicYears, setAcademicYears] = useState<AcademicYearData[]>([]);
  const [stats, setStats] = useState<StatsData | null>(null);

  // Dialog states
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [selectedYear, setSelectedYear] = useState<AcademicYearData | null>(null);

  // Form states
  const [addForm, setAddForm] = useState({
    startingYear: new Date().getFullYear(),
    displayName: "",
    status: false,
    terms: [
      { id: "1", name: "First Term", startDate: "", endDate: "" }
    ],
  });

  const [editForm, setEditForm] = useState({
    id: "",
    startingYear: 0,
    displayName: "",
    status: false,
    terms: [
      { id: "1", name: "First Term", startDate: "", endDate: "" }
    ],
  });

  const [formError, setFormError] = useState<string | null>(null);
  const { toast } = useToast();

  // Helper functions for managing terms
  const addTerm = (formType: 'add' | 'edit') => {
    const newTerm = {
      id: Date.now().toString(),
      name: `Term ${formType === 'add' ? addForm.terms.length + 1 : editForm.terms.length + 1}`,
      startDate: "",
      endDate: ""
    };

    if (formType === 'add') {
      setAddForm(prev => ({
        ...prev,
        terms: [...prev.terms, newTerm]
      }));
    } else {
      setEditForm(prev => ({
        ...prev,
        terms: [...prev.terms, newTerm]
      }));
    }
  };

  const removeTerm = (formType: 'add' | 'edit', termId: string) => {
    if (formType === 'add') {
      setAddForm(prev => ({
        ...prev,
        terms: prev.terms.filter(term => term.id !== termId)
      }));
    } else {
      setEditForm(prev => ({
        ...prev,
        terms: prev.terms.filter(term => term.id !== termId)
      }));
    }
  };

  const updateTerm = (formType: 'add' | 'edit', termId: string, field: string, value: any) => {
    if (formType === 'add') {
      setAddForm(prev => ({
        ...prev,
        terms: prev.terms.map(term => 
          term.id === termId ? { ...term, [field]: value } : term
        )
      }));
    } else {
      setEditForm(prev => ({
        ...prev,
        terms: prev.terms.map(term => 
          term.id === termId ? { ...term, [field]: value } : term
        )
      }));
    }
  };

  // Load data on component mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async (isReload = false) => {
    try {
      setLoading(!isReload);
      setReloading(isReload);
      setError(null);

      const [yearsResult, statsResult] = await Promise.all([
        getAcademicYears(),
        getAcademicYearStats(),
      ]);

      if (yearsResult.success && statsResult.success) {
        setAcademicYears(yearsResult.data as AcademicYearData[]);
        setStats(statsResult.data as StatsData);
      } else {
        setError(yearsResult.error || statsResult.error || 'Failed to load data');
        toast({
          title: "Error",
          description: yearsResult.message || statsResult.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error loading data:', error);
      setError('Failed to load data');
      toast({
        title: "Error",
        description: "An unexpected error occurred while loading data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setReloading(false);
    }
  };

  const filteredYears = academicYears.filter((year) =>
    year.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    year.startingYear.toString().includes(searchTerm)
  );

  const handleAddYear = () => {
    const currentYear = new Date().getFullYear();
    setAddForm({
      startingYear: currentYear,
      displayName: "",
      status: false, // Will be set by backend based on year
      terms: [
        { id: "1", name: "First Term", startDate: "", endDate: "" }
      ],
    });
    setFormError(null);
    setShowAddDialog(true);
  };

  const handleEditYear = (year: AcademicYearData) => {
    // Convert terms from object to array format if needed
    let termsArray = [];
    if (Array.isArray(year.terms)) {
      termsArray = year.terms;
    } else if (year.terms && typeof year.terms === 'object') {
      // Convert old object format to array format
      termsArray = Object.entries(year.terms).map(([key, term]: [string, any]) => ({
        id: key,
        name: term.name || key,
        startDate: term.startDate || "",
        endDate: term.endDate || ""
      }));
    } else {
      termsArray = [{ id: "1", name: "First Term", startDate: "", endDate: "" }];
    }

    setEditForm({
      id: year.id,
      startingYear: year.startingYear,
      displayName: year.displayName,
      status: year.status,
      terms: termsArray,
    });
    setFormError(null);
    setShowEditDialog(true);
  };

  const handleViewYear = (year: AcademicYearData) => {
    setSelectedYear(year);
    setShowViewDialog(true);
  };

  const handleDeleteYear = (year: AcademicYearData) => {
    setSelectedYear(year);
    setShowDeleteDialog(true);
  };



  const handleSaveAdd = async () => {
    try {
      setFormError(null);

      if (!addForm.displayName.trim()) {
        setFormError("Display name is required");
        return;
      }

      if (addForm.startingYear < 2000 || addForm.startingYear > 2100) {
        setFormError("Starting year must be between 2000 and 2100");
        return;
      }

      // Remove id fields from terms before saving
      const termsWithoutId = addForm.terms.map((term: any) => ({
        name: term.name,
        startDate: term.startDate,
        endDate: term.endDate
      }));

      const formDataToSave = {
        ...addForm,
        terms: termsWithoutId
      };

      const result = await createAcademicYear(formDataToSave);
      if (result.success) {
        toast({
          title: "Success",
          description: "Academic year created successfully",
        });
        setShowAddDialog(false);
        loadData(true);
      } else {
        setFormError(result.message);
        toast({
          title: "Error",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error creating academic year:', error);
      toast({
        title: "Error",
        description: "Failed to create academic year",
        variant: "destructive",
      });
    }
  };

  const handleSaveEdit = async () => {
    try {
      setFormError(null);

      if (!editForm.displayName.trim()) {
        setFormError("Display name is required");
        return;
      }

      if (editForm.startingYear < 2000 || editForm.startingYear > 2100) {
        setFormError("Starting year must be between 2000 and 2100");
        return;
      }

      // Remove id fields from terms before saving
      const termsWithoutId = editForm.terms.map((term: any) => ({
        name: term.name,
        startDate: term.startDate,
        endDate: term.endDate
      }));

      const formDataToSave = {
        ...editForm,
        terms: termsWithoutId
      };

      const result = await updateAcademicYear(editForm.id, formDataToSave);
      if (result.success) {
        toast({
          title: "Success",
          description: "Academic year updated successfully",
        });
        setShowEditDialog(false);
        loadData(true);
      } else {
        setFormError(result.message);
        toast({
          title: "Error",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error updating academic year:', error);
      toast({
        title: "Error",
        description: "Failed to update academic year",
        variant: "destructive",
      });
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedYear) return;

    try {
      const result = await deleteAcademicYear(selectedYear.id);
      if (result.success) {
        toast({
          title: "Success",
          description: "Academic year deleted successfully",
        });
        setShowDeleteDialog(false);
        loadData(true);
      } else {
        toast({
          title: "Error",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error deleting academic year:', error);
      toast({
        title: "Error",
        description: "Failed to delete academic year",
        variant: "destructive",
      });
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoaderIcon className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Academic Year</h1>
          <p className="text-muted-foreground">
            Manage academic years and their terms
          </p>
        </div>
        <Button onClick={handleAddYear}>
          <PlusIcon className="h-4 w-4 mr-2" />
          Add Academic Year
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Years</CardTitle>
              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalYears}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Year</CardTitle>
              <CheckIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.activeYear ? stats.activeYear.displayName : "None"}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Status</CardTitle>
              <AlertTriangleIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.activeYear ? "Current" : "Previous"}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Academic Years</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 mb-4">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search academic years..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => loadData(true)}
              disabled={reloading}
            >
              {reloading ? (
                <LoaderIcon className="h-4 w-4 animate-spin" />
              ) : (
                "Refresh"
              )}
            </Button>
          </div>

          {/* Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Display Name</TableHead>
                  <TableHead>Starting Year</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredYears.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      {searchTerm ? "No academic years found matching your search." : "No academic years found."}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredYears.map((year) => (
                    <TableRow key={year.id}>
                      <TableCell className="font-medium">
                        {year.displayName}
                      </TableCell>
                      <TableCell>{year.startingYear}</TableCell>
                      <TableCell>
                        <Badge variant={year.status ? "default" : "secondary"}>
                          {year.status ? "Current" : "Previous"}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDate(year.createdAt)}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreVerticalIcon className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleViewYear(year)}>
                              <EyeIcon className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEditYear(year)}>
                              <EditIcon className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDeleteYear(year)}
                              className="text-red-600"
                            >
                              <TrashIcon className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Add Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Academic Year</DialogTitle>
            <DialogDescription>
              Create a new academic year with its terms.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startingYear">Starting Year</Label>
                <Input
                  id="startingYear"
                  type="number"
                  value={addForm.startingYear}
                  onChange={(e) =>
                    setAddForm({ ...addForm, startingYear: parseInt(e.target.value) })
                  }
                  min="2000"
                  max="2100"
                />
              </div>
              <div>
                <Label htmlFor="displayName">Display Name</Label>
                <Input
                  id="displayName"
                  placeholder="e.g., 2024-2025"
                  value={addForm.displayName}
                  onChange={(e) =>
                    setAddForm({ ...addForm, displayName: e.target.value })
                  }
                />
              </div>
            </div>
            


            {/* Terms Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-medium">Terms</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addTerm('add')}
                >
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Add Term
                </Button>
              </div>
              
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {addForm.terms.map((term, index) => (
                  <div key={term.id} className="p-4 border rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <Label htmlFor={`term-name-${term.id}`}>Name</Label>
                            <Input
                              id={`term-name-${term.id}`}
                              value={term.name}
                              onChange={(e) => updateTerm('add', term.id, 'name', e.target.value)}
                              placeholder="e.g., First Term"
                            />
                          </div>
                          <div>
                            <Label htmlFor={`term-start-${term.id}`}>Start Date</Label>
                            <Input
                              id={`term-start-${term.id}`}
                              type="date"
                              value={term.startDate}
                              onChange={(e) => updateTerm('add', term.id, 'startDate', e.target.value)}
                            />
                          </div>
                          <div>
                            <Label htmlFor={`term-end-${term.id}`}>End Date</Label>
                            <Input
                              id={`term-end-${term.id}`}
                              type="date"
                              value={term.endDate}
                              onChange={(e) => updateTerm('add', term.id, 'endDate', e.target.value)}
                            />
                          </div>
                        </div>
                      </div>
                      {addForm.terms.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeTerm('add', term.id)}
                          className="ml-3"
                        >
                          <XIcon className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {formError && (
              <p className="text-sm text-red-600">{formError}</p>
            )}
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveAdd}>Create</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Academic Year</DialogTitle>
            <DialogDescription>
              Update the academic year details.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="editStartingYear">Starting Year</Label>
                <Input
                  id="editStartingYear"
                  type="number"
                  value={editForm.startingYear}
                  onChange={(e) =>
                    setEditForm({ ...editForm, startingYear: parseInt(e.target.value) })
                  }
                  min="2000"
                  max="2100"
                />
              </div>
              <div>
                <Label htmlFor="editDisplayName">Display Name</Label>
                <Input
                  id="editDisplayName"
                  placeholder="e.g., 2024-2025"
                  value={editForm.displayName}
                  onChange={(e) =>
                    setEditForm({ ...editForm, displayName: e.target.value })
                  }
                />
              </div>
            </div>
            


            {/* Terms Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-medium">Terms</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addTerm('edit')}
                >
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Add Term
                </Button>
              </div>
              
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {editForm.terms.map((term, index) => (
                  <div key={term.id} className="p-4 border rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <Label htmlFor={`edit-term-name-${term.id}`}>Name</Label>
                            <Input
                              id={`edit-term-name-${term.id}`}
                              value={term.name}
                              onChange={(e) => updateTerm('edit', term.id, 'name', e.target.value)}
                              placeholder="e.g., First Term"
                            />
                          </div>
                          <div>
                            <Label htmlFor={`edit-term-start-${term.id}`}>Start Date</Label>
                            <Input
                              id={`edit-term-start-${term.id}`}
                              type="date"
                              value={term.startDate}
                              onChange={(e) => updateTerm('edit', term.id, 'startDate', e.target.value)}
                            />
                          </div>
                          <div>
                            <Label htmlFor={`edit-term-end-${term.id}`}>End Date</Label>
                            <Input
                              id={`edit-term-end-${term.id}`}
                              type="date"
                              value={term.endDate}
                              onChange={(e) => updateTerm('edit', term.id, 'endDate', e.target.value)}
                            />
                          </div>
                        </div>
                      </div>
                      {editForm.terms.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeTerm('edit', term.id)}
                          className="ml-3"
                        >
                          <XIcon className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {formError && (
              <p className="text-sm text-red-600">{formError}</p>
            )}
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveEdit}>Update</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Academic Year Details</DialogTitle>
          </DialogHeader>
          {selectedYear && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Display Name</Label>
                  <p className="text-sm text-muted-foreground">
                    {selectedYear.displayName}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Starting Year</Label>
                  <p className="text-sm text-muted-foreground">
                    {selectedYear.startingYear}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Status</Label>
                  <Badge variant={selectedYear.status ? "default" : "secondary"}>
                    {selectedYear.status ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <div>
                  <Label className="text-sm font-medium">Created</Label>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(selectedYear.createdAt)}
                  </p>
                </div>
              </div>
              {selectedYear.terms && (
                <div>
                  <Label className="text-sm font-medium">Terms</Label>
                  <div className="mt-2 space-y-2">
                    {Array.isArray(selectedYear.terms) ? (
                      selectedYear.terms.map((term: any, index: number) => (
                        <div key={term.id || index} className="p-3 border rounded-lg">
                          <p className="font-medium">{term.name}</p>
                          {term.startDate && term.endDate && (
                            <p className="text-sm text-muted-foreground">
                              {term.startDate} - {term.endDate}
                            </p>
                          )}
                        </div>
                      ))
                    ) : (
                      Object.entries(selectedYear.terms).map(([key, term]: [string, any]) => (
                        <div key={key} className="p-3 border rounded-lg">
                          <p className="font-medium">{term.name}</p>
                          {term.startDate && term.endDate && (
                            <p className="text-sm text-muted-foreground">
                              {term.startDate} - {term.endDate}
                            </p>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Academic Year</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{selectedYear?.displayName}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete}>
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 