"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { PlusIcon, EditIcon, TrashIcon, FileTextIcon, CalendarIcon, ClockIcon, CheckCircleIcon, MoreVerticalIcon, EyeIcon, Loader2Icon, ChevronDownIcon, ChevronRightIcon, PrinterIcon } from "lucide-react";
import { getExams, createExam, updateExam, deleteExam, getTermsFromAcademicYear, getSubjectsByClass } from "@/app/actions/exam";
import { getClasses } from "@/app/actions/classes";
import { getAcademicYears } from "@/app/actions/academicYear";
import { useToast } from "@/components/ui/use-toast";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import React from "react";
import { getSchool } from "@/app/actions/school";

// Function to calculate exam status based on dates
function calculateExamStatus(startDate: Date | string, endDate: Date | string): 'SCHEDULED' | 'ONGOING' | 'COMPLETED' {
  const now = new Date();
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  if (now < start) {
    return 'SCHEDULED';
  } else if (now >= start && now <= end) {
    return 'ONGOING';
  } else {
    return 'COMPLETED';
  }
}

interface Exam {
  id: string;
  term: string;
  startDate: Date | string;
  endDate: Date | string;
  status: 'SCHEDULED' | 'ONGOING' | 'COMPLETED';
  classId: string;
  academicYearId: string;
  class?: {
    id: string;
    name: string;
  };
  academicYear?: {
    id: string;
    displayName: string;
  };
  subjects?: any[];
  _count?: {
    subjects: number;
    results: number;
  };
}

export default function ExamsPage() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [deleteExamId, setDeleteExamId] = useState<string | null>(null);
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [editExam, setEditExam] = useState<Exam | null>(null);
  const [form, setForm] = useState<any>({
    term: "",
    classId: "",
    academicYearId: "",
    subjects: [],
  });
  const [classes, setClasses] = useState<any[]>([]);
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [terms, setTerms] = useState<string[]>([]);
  const [subjectRows, setSubjectRows] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>("");
  const [collapsedTerms, setCollapsedTerms] = useState<Set<string>>(new Set());
  const [showRoutineDialog, setShowRoutineDialog] = useState(false);
  const [selectedTerm, setSelectedTerm] = useState<string>("");
  const { toast } = useToast();

  const [printRoutineData, setPrintRoutineData] = useState({
    schoolName: "",
    schoolAddress: "",
    academicYear: "",
    term: "",
    rows: [], // dates
    columns: [], // time slots
    cellMap: {}, // { [date]: { [timeKey]: [subjectClassStr, ...] } }
  });

  // Add state for school info
  const [schoolInfo, setSchoolInfo] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, []);

  // Refresh data every 5 minutes to keep statuses updated
  useEffect(() => {
    const interval = setInterval(() => {
      loadData();
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, []);

  // Fetch school info on mount
  useEffect(() => {
    async function fetchSchool() {
      // Try to get schoolId from session (if available)
      let schoolId = null;
      try {
        const res = await fetch("/api/auth/session");
        const session = await res.json();
        schoolId = session?.user?.schoolId;
      } catch {}
      // Fallback: use first exam's schoolId if available
      if (!schoolId && exams.length > 0) {
        schoolId = exams[0]?.schoolId;
      }
      if (schoolId) {
        const schoolRes = await getSchool(schoolId);
        if (schoolRes.success) setSchoolInfo(schoolRes.data);
      }
    }
    fetchSchool();
    // eslint-disable-next-line
  }, [exams]);

  async function loadData() {
    setLoading(true);
    const [examsRes, classesRes, yearsRes] = await Promise.all([
      getExams(),
      getClasses(),
      getAcademicYears(),
    ]);
    
    // Sort classes by name (numeric order)
    const sortedClasses = Array.isArray(classesRes.data) ? classesRes.data.sort((a: any, b: any) => {
      const aNum = parseInt(a.name.match(/\d+/)?.[0] || '0');
      const bNum = parseInt(b.name.match(/\d+/)?.[0] || '0');
      return aNum - bNum;
    }) : [];
    
    const academicYearsData = Array.isArray(yearsRes.data) ? yearsRes.data : [];
    setClasses(sortedClasses);
    setAcademicYears(academicYearsData);
    
    // Set default academic year to current year
    const currentYear = academicYearsData.find((year: any) => year.status === true);
    let examsToSet: Exam[] = [];
    
    if (currentYear && !selectedAcademicYear) {
      setSelectedAcademicYear(currentYear.id);
      // Filter exams for current academic year
      examsToSet = Array.isArray(examsRes.data) ? examsRes.data.filter((exam: Exam) => 
        exam.academicYearId === currentYear.id
      ).sort((a: Exam, b: Exam) => 
        new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
      ) : [];
    } else if (selectedAcademicYear) {
      // Filter exams for selected academic year
      examsToSet = Array.isArray(examsRes.data) ? examsRes.data.filter((exam: Exam) => 
        exam.academicYearId === selectedAcademicYear
      ).sort((a: Exam, b: Exam) => 
        new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
      ) : [];
    } else {
      examsToSet = Array.isArray(examsRes.data) ? examsRes.data : [];
    }
    
    setExams(examsToSet);
    
    // Set all terms as collapsed by default
    const allTerms = new Set(Object.keys(groupExamsByTerm(examsToSet)));
    setCollapsedTerms(allTerms);
    
    setLoading(false);
  }

  // Handle academic year filter change
  async function handleAcademicYearChange(academicYearId: string) {
    setSelectedAcademicYear(academicYearId);
    setLoading(true);
    
    const examsRes = await getExams();
    const filteredExams = Array.isArray(examsRes.data) ? examsRes.data.filter((exam: Exam) => 
      exam.academicYearId === academicYearId
    ).sort((a: Exam, b: Exam) => 
      new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
    ) : [];
    
    setExams(filteredExams);
    // Set all terms as collapsed by default
    const allTerms = new Set(Object.keys(groupExamsByTerm(filteredExams)));
    setCollapsedTerms(allTerms);
    setLoading(false);
  }

  // Toggle term collapse
  function toggleTermCollapse(term: string) {
    const newCollapsed = new Set(collapsedTerms);
    if (newCollapsed.has(term)) {
      newCollapsed.delete(term);
    } else {
      newCollapsed.add(term);
    }
    setCollapsedTerms(newCollapsed);
  }

  // Group exams by term
  function groupExamsByTerm(exams: Exam[]) {
    const grouped: { [key: string]: Exam[] } = {};
    exams.forEach(exam => {
      if (!grouped[exam.term]) {
        grouped[exam.term] = [];
      }
      grouped[exam.term].push(exam);
    });
    
    // Sort exams within each term by class name (numeric order)
    Object.keys(grouped).forEach(term => {
      grouped[term].sort((a, b) => {
        const aNum = parseInt(a.class?.name?.match(/\d+/)?.[0] || '0');
        const bNum = parseInt(b.class?.name?.match(/\d+/)?.[0] || '0');
        return aNum - bNum;
      });
    });
    
    return grouped;
  }

  // Sort terms by their index in the terms array
  function sortTermsByIndex(terms: string[]) {
    const termOrder = ['First Term', 'Mid Term', 'Final Term'];
    return terms.sort((a, b) => {
      const aIndex = termOrder.indexOf(a);
      const bIndex = termOrder.indexOf(b);
      return aIndex - bIndex;
    });
  }

  async function handleClassChange(classId: string) {
    setForm((f: any) => ({ ...f, classId }));
    if (classId) {
      // Get subjects for the selected class
      const subjectsRes = await getSubjectsByClass(classId);
      const classSubjects = subjectsRes.data || [];
      setSubjects(classSubjects);
      
      // Get current academic year and its terms
      const currentYear = academicYears.find((year: any) => year.status === true);
      if (currentYear) {
        setForm((f: any) => ({ ...f, academicYearId: currentYear.id }));
        const termsRes = await getTermsFromAcademicYear(currentYear.id);
        setTerms(termsRes.data || []);
      }
      
      // If editing, preserve existing subject data, otherwise auto-populate
      if (editExam) {
        // Keep existing subject rows with their data
        setSubjectRows(prevRows => {
          if (prevRows.length > 0) return prevRows;
          
          // If no existing rows, populate with subjects from the class
          return classSubjects.map((subject: any) => ({
            subjectId: subject.id,
            subjectName: subject.name,
            examDate: null,
            startTime: "09:00",
            endTime: "11:00",
          }));
        });
      } else {
        // Auto-populate subject rows with all subjects from the class
        const autoSubjectRows = classSubjects.map((subject: any) => ({
          subjectId: subject.id,
          subjectName: subject.name,
          examDate: null,
          startTime: "09:00",
          endTime: "11:00",
        }));
        setSubjectRows(autoSubjectRows);
      }
    } else {
      setSubjects([]);
      setSubjectRows([]);
      setTerms([]);
    }
  }

  function handleSubjectRowChange(idx: number, field: string, value: any) {
    setSubjectRows(rows => rows.map((row, i) => i === idx ? { ...row, [field]: value } : row));
  }

  function openCreateDialog() {
    setEditExam(null);
    setForm({
      term: "",
      classId: "",
      academicYearId: "",
      subjects: [],
    });
    setSubjectRows([]);
    setTerms([]);
    setSubjects([]);
    setShowDialog(true);
  }

  async function openEditDialog(exam: Exam) {
    setEditExam(exam);
    
    // First set the form data
    setForm({
      term: exam.term,
      classId: exam.classId,
      academicYearId: exam.academicYearId,
      subjects: exam.subjects || [],
    });
    
    // Load subjects for the class first
    const subjectsRes = await getSubjectsByClass(exam.classId);
    const classSubjects = subjectsRes.data || [];
    setSubjects(classSubjects);
    
    // Get terms for the academic year
    const termsRes = await getTermsFromAcademicYear(exam.academicYearId);
    setTerms(termsRes.data || []);
    
    // Map existing exam subjects to subject rows
    const existingSubjectRows = exam.subjects?.map((s: any) => {
      const subject = classSubjects.find((cs: any) => cs.id === s.subjectId);
      return {
        subjectId: s.subjectId,
        subjectName: subject?.name || '',
        examDate: s.examDate ? new Date(s.examDate) : null,
        startTime: s.startTime || "09:00",
        endTime: s.endTime || "11:00",
      };
    }) || [];
    
    setSubjectRows(existingSubjectRows);
    setShowDialog(true);
  }

  async function handleSubmit(e: any) {
    e.preventDefault();
    setSubmitting(true);
    
    // Convert Date objects to ISO strings for submission
    const subjectsForSubmission = subjectRows.map(row => ({
      ...row,
      examDate: row.examDate ? row.examDate.toISOString() : null
    }));
    
    const payload = { ...form, subjects: subjectsForSubmission };
    let res;
    if (editExam) {
      res = await updateExam(editExam.id, payload);
    } else {
      res = await createExam(payload);
    }
    if (res.success) {
      toast({ title: editExam ? "Exam updated" : "Exam created", description: res.message });
      setShowDialog(false);
      loadData();
    } else {
      toast({ title: "Error", description: res.message, variant: "destructive" });
    }
    setSubmitting(false);
  }

  async function handleDelete() {
    if (!deleteExamId) return;
    
    setSubmitting(true);
    const res = await deleteExam(deleteExamId);
    if (res.success) {
      toast({ title: "Exam deleted", description: res.message });
      loadData();
    } else {
      toast({ title: "Error", description: res.message, variant: "destructive" });
    }
    setShowDeleteDialog(false);
    setDeleteExamId(null);
    setSubmitting(false);
  }

  function openViewDialog(exam: Exam) {
    setSelectedExam(exam);
    setShowViewDialog(true);
  }

  function openDeleteDialog(id: string) {
    setDeleteExamId(id);
    setShowDeleteDialog(true);
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SCHEDULED': return 'bg-yellow-100 text-yellow-800';
      case 'ONGOING': return 'bg-green-100 text-green-800';
      case 'COMPLETED': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'SCHEDULED': return CalendarIcon;
      case 'ONGOING': return ClockIcon;
      case 'COMPLETED': return CheckCircleIcon;
      default: return FileTextIcon;
    }
  };

  // Stats - now using the calculated status from the backend
  const stats = [
    { title: "Total Exams", value: exams.length, icon: FileTextIcon, color: "blue" },
    { title: "Scheduled", value: exams.filter(e => e.status === 'SCHEDULED').length, icon: CalendarIcon, color: "yellow" },
    { title: "Ongoing", value: exams.filter(e => e.status === 'ONGOING').length, icon: ClockIcon, color: "green" },
    { title: "Completed", value: exams.filter(e => e.status === 'COMPLETED').length, icon: CheckCircleIcon, color: "purple" },
  ];

  // Helper to format time range
  function formatTimeRange(start, end) {
    const to12 = (t) => {
      const [h, m] = t.split(":");
      const hour = parseInt(h, 10);
      const min = m.padStart(2, "0");
      const ampm = hour >= 12 ? "PM" : "AM";
      const hour12 = hour % 12 === 0 ? 12 : hour % 12;
      return `${hour12}:${min} ${ampm}`;
    };
    return `${to12(start)} – ${to12(end)}`;
  }

  async function handleOpenPrintRoutine(term) {
    setSelectedTerm(term);
    // Filter exams for selected academic year and term
    const examsRes = await getExams();
    const filtered = Array.isArray(examsRes.data)
      ? examsRes.data.filter(e => e.term === term && e.academicYearId === selectedAcademicYear)
      : [];
    // Gather all ExamSubjects
    let allSubjects = [];
    filtered.forEach(exam => {
      if (Array.isArray(exam.subjects)) {
        exam.subjects.forEach(subj => {
          allSubjects.push({
            ...subj,
            className: exam.class?.name || "",
          });
        });
      }
    });
    // Unique sorted dates
    const dateSet = new Set(allSubjects.map(s => s.examDate && new Date(s.examDate).toISOString().slice(0,10)));
    const rows = Array.from(dateSet).sort();
    // Unique sorted time slots
    const timeSet = new Set(allSubjects.map(s => `${s.startTime}-${s.endTime}`));
    const columns = Array.from(timeSet).sort();
    // Build cell map
    const cellMap = {};
    rows.forEach(date => {
      cellMap[date] = {};
      columns.forEach(timeKey => {
        cellMap[date][timeKey] = allSubjects
          .filter(s => (s.examDate && new Date(s.examDate).toISOString().slice(0,10) === date) && `${s.startTime}-${s.endTime}` === timeKey)
          .map(s => `${s.subject?.name || ""} - ${s.className}`);
      });
    });
    // School info from first exam
    let schoolName = "", schoolAddress = "", academicYear = "";
    if (filtered[0]) {
      schoolName = filtered[0].class?.branch?.school?.name || "";
      schoolAddress = filtered[0].class?.branch?.school?.address || "";
      academicYear = filtered[0].academicYear?.displayName || "";
    }
    setPrintRoutineData({
      schoolName,
      schoolAddress,
      academicYear,
      term,
      rows,
      columns,
      cellMap
    });
    setShowRoutineDialog(true);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2Icon className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const groupedExams = groupExamsByTerm(exams);
  const selectedYear = academicYears.find(year => year.id === selectedAcademicYear);

  return (
    <div className="space-y-6 p-3">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">All Exams</h1>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Label htmlFor="academicYear">Academic Year:</Label>
            <Select value={selectedAcademicYear} onValueChange={handleAcademicYearChange}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select academic year" />
              </SelectTrigger>
              <SelectContent>
                {academicYears.map((year) => (
                  <SelectItem key={year.id} value={year.id}>
                    {year.displayName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={openCreateDialog}>
            <PlusIcon className="h-4 w-4 mr-2" />
            Add Exam
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <Card key={index}>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <stat.icon className={`h-8 w-8 text-${stat.color}-600`} />
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Exams by Term */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">
            {selectedYear ? `${selectedYear.displayName} Exams` : 'All Exams'}
          </h2>
          <p className="text-sm text-gray-500">
            {exams.length} exam{exams.length !== 1 ? 's' : ''} found
          </p>
        </div>

        {Object.keys(groupedExams).length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <FileTextIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No exams found for the selected academic year.</p>
            </CardContent>
          </Card>
        ) : (
          sortTermsByIndex(Object.keys(groupedExams)).map((term) => {
            const termExams = groupedExams[term];
            return (
            <Card key={term} className="overflow-hidden">
              <CardHeader className="hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div 
                    className="flex items-center space-x-2 cursor-pointer flex-1"
                    onClick={() => toggleTermCollapse(term)}
                  >
                    {collapsedTerms.has(term) ? (
                      <ChevronRightIcon className="h-5 w-5" />
                    ) : (
                      <ChevronDownIcon className="h-5 w-5" />
                    )}
                    <span className="font-semibold">{term}</span>
                    <Badge variant="secondary">{termExams.length} exam{termExams.length !== 1 ? 's' : ''}</Badge>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenPrintRoutine(term);
                    }}
                  >
                    <PrinterIcon className="h-4 w-4 mr-2" />
                    Print
                  </Button>
                </div>
              </CardHeader>
              
              {!collapsedTerms.has(term) && (
                <CardContent className="pt-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Class</TableHead>
                        <TableHead>Academic Year</TableHead>
                        <TableHead>Start Date</TableHead>
                        <TableHead>End Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Subjects</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {termExams.map((exam) => {
                        const StatusIcon = getStatusIcon(exam.status);
                        return (
                          <TableRow key={exam.id}>
                            <TableCell className="font-medium">{exam.class?.name}</TableCell>
                            <TableCell>{exam.academicYear?.displayName}</TableCell>
                            <TableCell>{new Date(exam.startDate).toLocaleDateString()}</TableCell>
                            <TableCell>{new Date(exam.endDate).toLocaleDateString()}</TableCell>
                            <TableCell>
                              <Badge className={getStatusColor(exam.status)}>
                                <StatusIcon className="h-3 w-3 mr-1" />
                                {exam.status}
                              </Badge>
                            </TableCell>
                            <TableCell>{exam._count?.subjects || 0} subjects</TableCell>
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <MoreVerticalIcon className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => openViewDialog(exam)}>
                                    <EyeIcon className="h-4 w-4 mr-2" />
                                    View
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => openEditDialog(exam)}>
                                    <EditIcon className="h-4 w-4 mr-2" />
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => openDeleteDialog(exam.id)} className="text-red-600">
                                    <TrashIcon className="h-4 w-4 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              )}
            </Card>
          );
        })
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editExam ? "Edit Exam" : "Create New Exam"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="classId">Class</Label>
                <Select value={form.classId} onValueChange={handleClassChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select class" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((cls) => (
                      <SelectItem key={cls.id} value={cls.id}>
                        {cls.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="term">Term</Label>
                <Select value={form.term} onValueChange={(value) => setForm({ ...form, term: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select term" />
                  </SelectTrigger>
                  <SelectContent>
                    {sortTermsByIndex(terms).map((term) => (
                      <SelectItem key={term} value={term}>
                        {term}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Subjects Table */}
            <div>
              <div className="mb-4">
                <Label>Exam Subjects</Label>
                <p className="text-sm text-gray-500 mt-1">All subjects from the selected class will be included in this exam</p>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Subject</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Start Time</TableHead>
                    <TableHead>End Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subjectRows.map((row, idx) => (
                    <TableRow key={idx}>
                      <TableCell>
                        <Input
                          value={row.subjectName || ''}
                          readOnly
                          className="bg-gray-50"
                        />
                      </TableCell>
                      <TableCell>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full justify-start text-left font-normal",
                                !row.examDate && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {row.examDate ? format(row.examDate, "PPP") : <span>Pick a date</span>}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={row.examDate}
                              onSelect={(date) => handleSubjectRowChange(idx, 'examDate', date)}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="time"
                          step="900"
                          value={row.startTime}
                          onChange={(e) => handleSubjectRowChange(idx, 'startTime', e.target.value)}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="time"
                          step="900"
                          value={row.endTime}
                          onChange={(e) => handleSubjectRowChange(idx, 'endTime', e.target.value)}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2Icon className="h-4 w-4 mr-2 animate-spin" />}
                {editExam ? "Update" : "Create"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-4xl max-h-[98%] overflow-scroll">
          <DialogHeader>
            <DialogTitle>Exam Details</DialogTitle>
          </DialogHeader>
          {selectedExam && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="font-semibold">Term</Label>
                  <p>{selectedExam.term}</p>
                </div>
                <div>
                  <Label className="font-semibold">Class</Label>
                  <p>{selectedExam.class?.name}</p>
                </div>
                <div>
                  <Label className="font-semibold">Academic Year</Label>
                  <p>{selectedExam.academicYear?.displayName}</p>
                </div>
                <div className="flex flex-col justify-start gap-4 max-w-28">
                  <Label className="font-semibold">Status</Label>
                  <Badge className={getStatusColor(selectedExam.status)}>
                    {selectedExam.status}
                  </Badge>
                </div>
                <div>
                  <Label className="font-semibold">Start Date</Label>
                  <p>{new Date(selectedExam.startDate).toLocaleDateString()}</p>
                </div>
                <div>
                  <Label className="font-semibold">End Date</Label>
                  <p>{new Date(selectedExam.endDate).toLocaleDateString()}</p>
                </div>
              </div>
              
              <div>
                <Label className="font-semibold">Subjects</Label>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Subject</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Start Time</TableHead>
                      <TableHead>End Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedExam.subjects?.map((subject: any) => (
                      <TableRow key={subject.id}>
                        <TableCell>{subject.subject?.name}</TableCell>
                        <TableCell>{new Date(subject.examDate).toLocaleDateString()}</TableCell>
                        <TableCell>{subject.startTime}</TableCell>
                        <TableCell>{subject.endTime}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Exam</DialogTitle>
          </DialogHeader>
          <p>Are you sure you want to delete this exam? This action cannot be undone.</p>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={submitting}>
              {submitting && <Loader2Icon className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Routine Dialog */}
      <Dialog open={showRoutineDialog} onOpenChange={setShowRoutineDialog}>
        <DialogContent className="max-w-4xl max-h-[95%] overflow-scroll print-dialog">
          <DialogHeader>
            <DialogTitle className="no-print">Exam Routine - {printRoutineData.term}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-center">
              {schoolInfo && (
                <>
                  {/* {schoolInfo.logo && (
                    <img src={schoolInfo.logo} alt="School Logo" className="mx-auto mb-2 h-16" />
                  )} */}
                  <div className="font-bold text-lg">{schoolInfo.name}</div>
                  <div className="text-sm">{schoolInfo.address}</div>
                  <div className="text-sm">{schoolInfo.phone} | {schoolInfo.email}</div>
                  {/* {schoolInfo.website && (
                    <div className="text-sm"><a href={schoolInfo.website} target="_blank" rel="noopener noreferrer" className="underline text-blue-600">{schoolInfo.website}</a></div>
                  )} */}
                </>
              )}
              <div className="text-sm mt-1">Academic Year: {printRoutineData.academicYear} | Term: {printRoutineData.term}</div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full border text-center">
                <thead>
                  <tr>
                    <th className="border px-2 py-1 text-sm font-medium">Date</th>
                    {printRoutineData.columns.map(timeKey => (
                      <th key={timeKey} className="border px-2 py-1 text-sm font-medium">{formatTimeRange(...timeKey.split("-"))}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {printRoutineData.rows.map(date => (
                    <tr key={date}>
                      <td className="border px-1 py-1 text-sm">{date}</td>
                      {printRoutineData.columns.map(timeKey => (
                        <td key={timeKey} className="border px-2 py-1 text-xs">
                          {printRoutineData.cellMap[date][timeKey].map((str, i) => (
                            <div key={i}>{str}</div>
                          ))}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-center space-x-4 mt-4 no-print">
              <Button variant="outline" onClick={() => window.print()}>
                <PrinterIcon className="h-4 w-4 mr-2" />
                Print
              </Button>
              <Button variant="outline" onClick={() => setShowRoutineDialog(false)}>
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
