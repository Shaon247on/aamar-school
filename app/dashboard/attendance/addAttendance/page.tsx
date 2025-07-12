"use client";
import React, { useState, useEffect } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { toast } from "@/components/ui/use-toast";
import { upsertStudentAttendance, getSectionAttendanceByDate } from "@/app/actions/attendance";
import { getClasses } from "@/app/actions/classes";
import { getSectionsByClass } from "@/app/actions/sections";
import { DatePicker } from "@/components/ui/date-picker";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { AttendanceStatus } from "@prisma/client";

// Types for attendance data
interface StudentWithAttendance {
  id: string;
  rollNumber: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    [key: string]: any;
  };
  attendanceStatus: AttendanceStatus | null;
}
interface ClassSectionOption {
  value: string;
  label: string;
  classId: string;
  sectionId: string;
}

export default function AttendancePage() {
  const [tab, setTab] = useState<string>("students");
  const [classSectionOptions, setClassSectionOptions] = useState<ClassSectionOption[]>([]);
  const [selectedClassSection, setSelectedClassSection] = useState<string>("");
  const [students, setStudents] = useState<StudentWithAttendance[]>([]);
  const [attendance, setAttendance] = useState<Record<string, AttendanceStatus | "">>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [date, setDate] = useState<Date>(new Date());
  const [filterApplied, setFilterApplied] = useState(false);

  // Fetch classes and sections on mount
  useEffect(() => {
    getClasses().then(async (res) => {
      if (res && res.data) {
        const allOptions = [];
        for (const cls of res.data) {
          const secRes = await getSectionsByClass(cls.id);
          if (secRes && secRes.data) {
            for (const sec of secRes.data) {
              allOptions.push({
                value: `${cls.id}__${sec.id}`,
                label: `${cls.name} (${sec.name})`,
                classId: cls.id,
                sectionId: sec.id,
              });
            }
          }
        }
        setClassSectionOptions(allOptions);
      }
    });
  }, []);

  // Fetch students and their attendance status only when filter is applied
  useEffect(() => {
    if (filterApplied && selectedClassSection && date) {
      const [classId, sectionId] = selectedClassSection.split("__");
      getSectionAttendanceByDate(sectionId, date.toISOString().slice(0, 10)).then((res) => {
        if (res && res.data) {
          setStudents(res.data);
          // Always reset attendance state to match loaded data for this date
          const att: Record<string, AttendanceStatus | ""> = {};
          res.data.forEach((student: StudentWithAttendance) => {
            att[student.id] = student.attendanceStatus !== null && student.attendanceStatus !== undefined
              ? student.attendanceStatus
              : "";
          });
          setAttendance(att);
        } else {
          setStudents([]);
          setAttendance({});
        }
      });
    } else {
      setStudents([]);
      setAttendance({});
    }
  }, [filterApplied, selectedClassSection, date]);

  // Handle attendance status change
  const handleAttendanceChange = (studentId: string, status: AttendanceStatus) => {
    setAttendance((prev) => ({ ...prev, [studentId]: status }));
  };

  // Submit attendance
  const handleSubmit = async () => {
    setLoading(true);
    const [classId, sectionId] = selectedClassSection.split("__");
    const attendanceList = students.map((student) => ({
      studentId: student.id,
      status: (attendance[student.id] as AttendanceStatus) || "PRESENT",
      date: date.toISOString().slice(0, 10),
    }));
    const res = await upsertStudentAttendance(
      attendanceList,
      classId,
      sectionId,
      date.toISOString().slice(0, 10)
    );
    setLoading(false);
    if (res.success) {
      toast({ title: "Attendance saved!" });
    } else {
      toast({
        title: "Error",
        description: res.error || "Failed to save attendance",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="p-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Attendance</h1>
          <p className="text-muted-foreground">
            Mark daily attendance for students
          </p>
        </div>
      </div>
      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="students">Students</TabsTrigger>
          <TabsTrigger value="teachers">Teachers</TabsTrigger>
          <TabsTrigger value="staffs">Staffs</TabsTrigger>
        </TabsList>
        <TabsContent value="students">
          <Card>
            <CardHeader>
              <CardTitle>Student Attendance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 mb-4 items-end">
                <Select
                  value={selectedClassSection}
                  onValueChange={val => { setSelectedClassSection(val); setFilterApplied(false); }}
                >
                  <SelectTrigger className="w-64">
                    <SelectValue placeholder="Select Class & Section" />
                  </SelectTrigger>
                  <SelectContent>
                    {classSectionOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <DatePicker
                  date={date}
                  onChange={(d: Date) => { setDate(d); setFilterApplied(false); }}
                  className="w-48"
                />
                <Button
                  onClick={() => setFilterApplied(true)}
                  disabled={!selectedClassSection || !date}
                  className="ml-2"
                  variant="secondary"
                >
                  Apply Filter
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={loading || !students.length || !selectedClassSection}
                  className="ml-auto"
                >
                  {loading ? "Saving..." : "Save Attendance"}
                </Button>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Roll</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {students.map((student) => (
                      <TableRow key={student.id}>
                        <TableCell>{student.rollNumber}</TableCell>
                        <TableCell>
                          {student.user.firstName} {student.user.lastName}
                        </TableCell>
                        <TableCell>
                          <RadioGroup
                            value={attendance[student.id] || ""}
                            onValueChange={(val) => handleAttendanceChange(student.id, val as AttendanceStatus)}
                            className="flex gap-4"
                          >
                            <RadioGroupItem value="PRESENT" label="Present" />
                            <RadioGroupItem value="ABSENT" label="Absent" />
                            <RadioGroupItem value="LATE" label="Late" />
                            <RadioGroupItem value="EXCUSED" label="Excused" />
                          </RadioGroup>
                        </TableCell>
                      </TableRow>
                    ))}
                    {!students.length && (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center">
                          No students found.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="teachers">
          <Card>
            <CardHeader>
              <CardTitle>Teacher Attendance</CardTitle>
            </CardHeader>
            <CardContent>Coming soon.</CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="staffs">
          <Card>
            <CardHeader>
              <CardTitle>Staff Attendance</CardTitle>
            </CardHeader>
            <CardContent>Coming soon.</CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
