"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { PlusIcon, EditIcon, TrashIcon, FileTextIcon, CalendarIcon, ClockIcon, CheckCircleIcon } from "lucide-react";
import { getExams, createExam, updateExam, deleteExam } from "@/app/actions/exam";
import { getClasses } from "@/app/actions/classes";
import { getAcademicYears } from "@/app/actions/academicYear";
import { getSubjectsForClass } from "@/app/actions/subjects";
import { ExamType } from "@prisma/client";
import { useToast } from "@/components/ui/use-toast";

export default function ExamsPage() {
  const [exams, setExams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteExamId, setDeleteExamId] = useState<string | null>(null);
  const [editExam, setEditExam] = useState<any | null>(null);
  const [form, setForm] = useState<any>({
    name: "",
    examType: "MIDTERM",
    description: "",
    startDate: "",
    endDate: "",
    classId: "",
    academicYearId: "",
    subjects: [],
  });
  const [classes, setClasses] = useState<any[]>([]);
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [subjectRows, setSubjectRows] = useState<any[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const [examsRes, classesRes, yearsRes] = await Promise.all([
      getExams(),
      getClasses(),
      getAcademicYears(),
    ]);
    setExams(Array.isArray(examsRes.data) ? examsRes.data : []);
    setClasses(Array.isArray(classesRes.data) ? classesRes.data : []);
    setAcademicYears(Array.isArray(yearsRes.data) ? yearsRes.data : []);
    setLoading(false);
  }

  async function handleClassChange(classId: string) {
    setForm((f: any) => ({ ...f, classId }));
    if (classId) {
      const res = await getSubjectsForClass(classId);
      setSubjects(res.data || []);
    } else {
      setSubjects([]);
    }
  }

  function handleAddSubjectRow() {
    setSubjectRows([...subjectRows, { subjectId: "", fullMarks: 100, passMarks: 40, examDate: "", duration: 120 }]);
  }

  function handleSubjectRowChange(idx: number, field: string, value: any) {
    setSubjectRows(rows => rows.map((row, i) => i === idx ? { ...row, [field]: value } : row));
  }

  function handleRemoveSubjectRow(idx: number) {
    setSubjectRows(rows => rows.filter((_, i) => i !== idx));
  }

  function openCreateDialog() {
    setEditExam(null);
    setForm({
      name: "",
      examType: "MIDTERM",
      description: "",
      startDate: "",
      endDate: "",
      classId: "",
      academicYearId: "",
      subjects: [],
    });
    setSubjectRows([]);
    setShowDialog(true);
  }

  function openEditDialog(exam: any) {
    setEditExam(exam);
    setForm({
      name: exam.name,
      examType: exam.examType,
      description: exam.description,
      startDate: exam.startDate ? new Date(exam.startDate).toISOString().slice(0, 10) : '',
      endDate: exam.endDate ? new Date(exam.endDate).toISOString().slice(0, 10) : '',
      classId: exam.classId,
      academicYearId: exam.academicYearId,
      subjects: exam.subjects.map((s: any) => ({
        subjectId: s.subjectId,
        fullMarks: s.fullMarks,
        passMarks: s.passMarks,
        examDate: s.examDate ? new Date(s.examDate).toISOString().slice(0, 10) : '',
        duration: s.duration,
      })),
    });
    setSubjectRows(exam.subjects.map((s: any) => ({
      subjectId: s.subjectId,
      fullMarks: s.fullMarks,
      passMarks: s.passMarks,
      examDate: s.examDate ? new Date(s.examDate).toISOString().slice(0, 10) : '',
      duration: s.duration,
    })));
    setShowDialog(true);
    handleClassChange(exam.classId);
  }

  async function handleSubmit(e: any) {
    e.preventDefault();
    const payload = { ...form, subjects: subjectRows };
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
  }

  function openDeleteDialog(id: string) {
    setDeleteExamId(id);
    setShowDeleteDialog(true);
  }

  async function handleDelete() {
    if (!deleteExamId) return;
    
    const res = await deleteExam(deleteExamId);
    if (res.success) {
      toast({ title: "Exam deleted", description: res.message });
      loadData();
    } else {
      toast({ title: "Error", description: res.message, variant: "destructive" });
    }
    setShowDeleteDialog(false);
    setDeleteExamId(null);
  }

  // Stats
  const stats = [
    { title: "Total Exams", value: exams.length, icon: FileTextIcon, color: "blue" },
    { title: "Scheduled", value: exams.filter(e => new Date(e.startDate) > new Date()).length, icon: CalendarIcon, color: "yellow" },
    { title: "Ongoing", value: exams.filter(e => new Date(e.startDate) <= new Date() && new Date(e.endDate) >= new Date()).length, icon: ClockIcon, color: "green" },
    { title: "Completed", value: exams.filter(e => new Date(e.endDate) < new Date()).length, icon: CheckCircleIcon, color: "purple" },
  ];

  return (
    <div className="flex-1 space-y-4 p-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Exams</h1>
          <p className="text-muted-foreground">Manage all exams, schedules, and results</p>
        </div>
        <Button onClick={openCreateDialog}>
          <PlusIcon className="h-4 w-4 mr-2" /> Add Exam
        </Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {stats.map(stat => (
          <Card key={stat.title} className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className={`h-5 w-5 text-${stat.color}-600`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Exam List</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div>Loading...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Academic Year</TableHead>
                  <TableHead>Start</TableHead>
                  <TableHead>End</TableHead>
                  <TableHead>Subjects</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {exams.map(exam => (
                  <TableRow key={exam.id}>
                    <TableCell>{exam.name}</TableCell>
                    <TableCell>{exam.examType}</TableCell>
                    <TableCell>{exam.class?.name}</TableCell>
                    <TableCell>{exam.academicYear?.displayName}</TableCell>
                    <TableCell>{exam.startDate ? new Date(exam.startDate).toISOString().slice(0, 10) : ''}</TableCell>
                    <TableCell>{exam.endDate ? new Date(exam.endDate).toISOString().slice(0, 10) : ''}</TableCell>
                    <TableCell>
                      {exam.subjects?.map((s: any) => s.subject?.name).join(", ")}
                    </TableCell>
                    <TableCell>
                      <Button size="icon" variant="ghost" onClick={() => openEditDialog(exam)}><EditIcon className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => openDeleteDialog(exam.id)}><TrashIcon className="h-4 w-4 text-red-500" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-3xl max-h-[98%]">
          <DialogHeader>
            <DialogTitle>{editExam ? "Edit Exam" : "Add Exam"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Name</Label>
                <Input value={form.name} onChange={e => setForm((f: any) => ({ ...f, name: e.target.value }))} required />
              </div>
              <div>
                <Label>Type</Label>
                <Select value={form.examType} onValueChange={val => setForm((f: any) => ({ ...f, examType: val }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.keys(ExamType).map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Class</Label>
                <Select value={form.classId || undefined} onValueChange={val => handleClassChange(val)}>
                  <SelectTrigger><SelectValue placeholder="Select Class" /></SelectTrigger>
                  <SelectContent>
                    {classes.map(cls => (
                      <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Academic Year</Label>
                <Select value={form.academicYearId || undefined} onValueChange={val => setForm((f: any) => ({ ...f, academicYearId: val }))}>
                  <SelectTrigger><SelectValue placeholder="Select Year" /></SelectTrigger>
                  <SelectContent>
                    {academicYears.map(ay => (
                      <SelectItem key={ay.id} value={ay.id}>{ay.displayName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label>Description</Label>
                <Textarea value={form.description} onChange={e => setForm((f: any) => ({ ...f, description: e.target.value }))} />
              </div>
              <div>
                <Label>Start Date</Label>
                <Input type="date" value={form.startDate} onChange={e => setForm((f: any) => ({ ...f, startDate: e.target.value }))} required />
              </div>
              <div>
                <Label>End Date</Label>
                <Input type="date" value={form.endDate} onChange={e => setForm((f: any) => ({ ...f, endDate: e.target.value }))} required />
              </div>
            </div>
            <div>
              <Label>Subjects</Label>
              <div className="space-y-2">
                {subjectRows.map((row, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <Select value={row.subjectId || undefined} onValueChange={val => handleSubjectRowChange(idx, "subjectId", val)}>
                      <SelectTrigger className="w-40"><SelectValue placeholder="Subject" /></SelectTrigger>
                      <SelectContent>
                        {subjects.map((s: any) => (
                          <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input type="number" className="w-24" value={row.fullMarks} onChange={e => handleSubjectRowChange(idx, "fullMarks", Number(e.target.value))} placeholder="Full Marks" min={1} />
                    <Input type="number" className="w-24" value={row.passMarks} onChange={e => handleSubjectRowChange(idx, "passMarks", Number(e.target.value))} placeholder="Pass Marks" min={0} />
                    <Input type="date" className="w-36" value={row.examDate} onChange={e => handleSubjectRowChange(idx, "examDate", e.target.value)} />
                    <Input type="number" className="w-24" value={row.duration} onChange={e => handleSubjectRowChange(idx, "duration", Number(e.target.value))} placeholder="Duration (min)" min={1} />
                    <Button type="button" size="icon" variant="ghost" onClick={() => handleRemoveSubjectRow(idx)}><TrashIcon className="h-4 w-4 text-red-500" /></Button>
                  </div>
                ))}
                <Button type="button" variant="outline" onClick={handleAddSubjectRow} className="mt-2"><PlusIcon className="h-4 w-4 mr-2" /> Add Subject</Button>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
              <Button type="submit">{editExam ? "Update" : "Create"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Exam</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-muted-foreground">
              Are you sure you want to delete this exam? This action cannot be undone and will also delete all related exam subjects and results.
            </p>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowDeleteDialog(false)}>
                Cancel
              </Button>
              <Button type="button" variant="destructive" onClick={handleDelete}>
                Delete Exam
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
