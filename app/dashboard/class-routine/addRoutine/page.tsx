"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { getSettings } from "@/app/actions/settings";
import { getSubjectsForClass, getClasses } from "@/app/actions/classes";
import { getAllTeachers } from "@/app/actions/teachers";
import { ArrowLeft, Calendar, Pencil, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  upsertClassRoutine,
  getClassRoutine,
} from "@/app/actions/classRoutine";
import { useToast } from "@/components/ui/use-toast";
import Link from "next/link";

// Assignment type for slot assignments
type Assignment = {
  subject: string;
  teacher: string;
  classType: string;
  endTime?: string;
};

// Helper to convert time string to minutes
function toMinutes(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}
// Helper to convert minutes to time string
function toTime(m: number) {
  const h = Math.floor(m / 60);
  const min = m % 60;
  return `${h.toString().padStart(2, "0")}:${min.toString().padStart(2, "0")}`;
}

// Returns array of [start, end] time strings for regular slots
function getTimeSlots(start: string, end: string, duration: number) {
  const slots = [];
  let cur = toMinutes(start);
  const endM = toMinutes(end);
  while (cur < endM) {
    const next = Math.min(cur + duration, endM);
    slots.push(`${toTime(cur)}-${toTime(next)}`);
    cur = next;
  }
  return slots;
}

// Generate dynamic time slots for a day based on assignments and custom end times
function getDynamicTimeSlotsForDay(
  day: string,
  start: string,
  end: string,
  duration: number,
  assignments: Record<string, Assignment>,
): string[] {
  const slots: string[] = [];
  let cur = toMinutes(start);
  const endM = toMinutes(end);
  while (cur < endM) {
    let next: number;
    const curTimeStr = toTime(cur);
    // Find any assignment for this day and start time
    const foundKey = Object.keys(assignments).find((k) =>
      k.startsWith(`${day}|${curTimeStr}-`),
    );
    const assigned: Assignment | undefined = foundKey
      ? assignments[foundKey]
      : undefined;
    let slotEnd: string;
    if (assigned && assigned.classType !== "regular" && assigned.endTime) {
      slotEnd = assigned.endTime;
      next = toMinutes(slotEnd);
      slots.push(`${curTimeStr}-${slotEnd}`);
      cur = next;
    } else {
      const defaultEnd = Math.min(cur + duration, endM);
      slotEnd = toTime(defaultEnd);
      next = defaultEnd;
      slots.push(`${curTimeStr}-${slotEnd}`);
      cur = next;
    }
  }
  return slots;
}

function parseSchedule(
  raw: any,
): { open: boolean; start: string; end: string }[] {
  if (Array.isArray(raw)) {
    return raw.map((item) => {
      if (
        typeof item === "object" &&
        item !== null &&
        "open" in item &&
        "start" in item &&
        "end" in item
      ) {
        return {
          open: !!item.open,
          start: String(item.start),
          end: String(item.end),
        };
      }
      return { open: false, start: "08:00", end: "14:00" };
    });
  }
  return [
    { open: false, start: "08:00", end: "14:00" },
    { open: false, start: "08:00", end: "14:00" },
    { open: false, start: "08:00", end: "14:00" },
    { open: false, start: "08:00", end: "14:00" },
    { open: false, start: "08:00", end: "14:00" },
    { open: false, start: "08:00", end: "14:00" },
    { open: false, start: "08:00", end: "14:00" },
  ];
}

export default function ClassRoutingEditPage() {
  const [classValue, setClassValue] = useState("");
  const [yearValue, setYearValue] = useState("");
  const [classOptions, setClassOptions] = useState<
    { value: string; label: string; academicYear: string }[]
  >([]);
  const [academicYearOptions, setAcademicYearOptions] = useState<
    { value: string; label: string }[]
  >([]);
  const [days, setDays] = useState<string[]>([]);
  const [timeSlots, setTimeSlots] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogData, setDialogData] = useState<{
    day: string;
    time: string;
  } | null>(null);
  const [assignments, setAssignments] = useState<Record<string, Assignment>>(
    {},
  );
  // Instead of a single timeSlots array, build a map: day -> slots
  const [dayTimeSlots, setDayTimeSlots] = useState<Record<string, string[]>>(
    {},
  );
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const { toast } = useToast();
  const [classes, setClasses] = useState<any[]>([]);

  // Dialog form state
  const [formClassType, setFormClassType] = useState("regular");
  const [formSubject, setFormSubject] = useState("");
  const [formTeacher, setFormTeacher] = useState("");
  const [formEndTime, setFormEndTime] = useState("");

  const [subjects, setSubjects] = useState<
    { value: string; label: string; teacherId?: string; teacherName?: string }[]
  >([]);
  const [teachers, setTeachers] = useState<{ value: string; label: string }[]>(
    [],
  );
  const [classBranchId, setClassBranchId] = useState<string | null>(null);

  // Add state for selected class-section
  const [selectedClassSection, setSelectedClassSection] = useState<{ classId: string, sectionId: string, academicYear: string } | null>(null);
  const [classSectionOptions, setClassSectionOptions] = useState<{
    value: string;
    label: string;
    classId: string;
    sectionId: string;
    academicYear: string;
  }[]>([]);

  console.log("subjects", subjects);
  const classTypeOptions = [
    { value: "regular", label: "Regular" },
    { value: "special", label: "Special" },
    { value: "break", label: "Break" },
  ];

  useEffect(() => {
    async function loadClassesAndSettings() {
      setLoading(true);
      // Load classes with sections
      const classRes = await getClasses();
      let loadedClasses: any[] = [];
      if (classRes.success && Array.isArray(classRes.data)) {
        loadedClasses = classRes.data;
        setClasses(loadedClasses);
        // Build class-section options
        const options: any[] = [];
        for (const cls of loadedClasses) {
          if (Array.isArray(cls.sections)) {
            for (const section of cls.sections) {
              options.push({
                value: `${cls.id}|${section.id}`,
                label: `${cls.name} (${section.name})`,
                classId: cls.id,
                sectionId: section.id,
                academicYear: cls.academicYear,
              });
            }
          }
        }
        setClassSectionOptions(options);
        if (options.length > 0) {
          setSelectedClassSection({
            classId: options[0].classId,
            sectionId: options[0].sectionId,
            academicYear: options[0].academicYear,
          });
        }
        const years = Array.from(new Set(loadedClasses.map((cls) => cls.academicYear)));
        setAcademicYearOptions(years.map((y) => ({ value: y, label: y })));
      } else {
        setClasses([]);
        setClassSectionOptions([]);
        setSelectedClassSection(null);
        setAcademicYearOptions([]);
      }
      // Load settings
      const res = await getSettings();
      if (res.success && res.data) {
        const schedule = parseSchedule(res.data.weeklySchedule);
        const openDays = [
          "Friday",
          "Saturday",
          "Sunday",
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
        ].filter((_, i) => schedule[i]?.open);
        setDays(openDays);
        // Use the first open day for start/end time
        const firstOpen = schedule.find((d) => d.open);
        if (firstOpen && res.data.subjectDuration) {
          setTimeSlots(
            getTimeSlots(
              firstOpen.start,
              firstOpen.end,
              res.data.subjectDuration,
            ),
          );
        } else {
          setTimeSlots([]);
        }
      } else {
        setDays([]);
        setTimeSlots([]);
      }
      setLoading(false);
    }
    loadClassesAndSettings();
  }, []);

  // Set classBranchId when selectedClassSection changes
  useEffect(() => {
    if (!selectedClassSection) {
      setClassBranchId(null);
      return;
    }
    const foundClass = classes.find((c: any) => c.id === selectedClassSection.classId);
    setClassBranchId(foundClass?.branchId || null);
  }, [selectedClassSection, classes]);

  // Filter class options by selected academic year
  const filteredClassOptions = classOptions.filter(
    (opt) => opt.academicYear === yearValue,
  );

  // When academic year changes, reset classValue to first available class in that year
  useEffect(() => {
    if (filteredClassOptions.length > 0) {
      setClassValue(filteredClassOptions[0].value);
    } else {
      setClassValue("");
    }
  }, [yearValue, classOptions.length]);

  // When classValue changes, fetch subjects and teachers for that class
  useEffect(() => {
    async function fetchSubjectsAndTeachers() {
      if (!selectedClassSection) {
        setSubjects([]);
        setTeachers([]);
        setClassBranchId(null);
        return;
      }
      // Find branchId for this class
      const selectedClass = classOptions.find(
        (opt) => opt.value === selectedClassSection.classId,
      );
      let branchId = null;
      if (selectedClass) {
        const classObj = (await getClasses()).data as any[];
        const foundClass = classObj.find((c: any) => c.id === selectedClassSection.classId);
        branchId = foundClass?.branchId || null;
        setClassBranchId(branchId);
      }
      // Fetch subjects for class
      const subjRes = await getSubjectsForClass(selectedClassSection.classId);
      console.log("subjRes", subjRes);
      if (subjRes.success && Array.isArray(subjRes.data)) {
        setSubjects(
          subjRes.data.map((s: any) => ({
            value: s.id,
            label: s.name,
            teacherId: s.teacherId,
            teacherName: s.teacher?.user?.firstName
              ? `${s.teacher.user.firstName} ${s.teacher.user.lastName}`
              : undefined,
          })),
        );
      } else {
        setSubjects([]);
      }
      // Fetch teachers for branch
      const teacherRes = await getAllTeachers();
      if (teacherRes.success && Array.isArray(teacherRes.data)) {
        setTeachers(
          teacherRes.data.map((t: any) => ({ value: t.id, label: t.name })),
        );
      } else {
        setTeachers([]);
      }
    }
    fetchSubjectsAndTeachers();
  }, [selectedClassSection]);

  // Recompute time slots for each day when assignments or settings change
  useEffect(() => {
    if (!days.length || !subjects.length) return;
    // Find schedule for each day
    const schedule = days.map((day, i) => ({
      day,
      idx: i,
    }));
    // Assume all days use the same start/end/duration for now
    // (could be extended for per-day settings)
    let start = "08:00";
    let end = "14:00";
    let duration = 45;
    if (subjects.length > 0 && timeSlots.length > 0) {
      // Use first slot as base
      const [firstStart, firstEnd] = timeSlots[0].split("-");
      start = firstStart;
      // Use last slot's end as day end
      const lastSlot = timeSlots[timeSlots.length - 1];
      end = lastSlot.split("-")[1];
      // Use default duration
      duration =
        toMinutes(timeSlots[0].split("-")[1]) -
        toMinutes(timeSlots[0].split("-")[0]);
    }
    const newDayTimeSlots: Record<string, string[]> = {};
    for (const { day } of schedule) {
      newDayTimeSlots[day] = getDynamicTimeSlotsForDay(
        day,
        start,
        end,
        duration,
        assignments,
      );
    }
    setDayTimeSlots(newDayTimeSlots);
  }, [days, assignments, timeSlots, subjects.length]);

  // When dialog opens, reset form state
  useEffect(() => {
    if (dialogOpen && dialogData) {
      setFormClassType("regular");
      setFormSubject("");
      setFormTeacher("");
    }
  }, [dialogOpen, dialogData]);

  // Auto-select subject and teacher when editing
  useEffect(() => {
    if (
      dialogOpen &&
      dialogData &&
      assignments[`${dialogData.day}|${dialogData.time}`]
    ) {
      const assigned = assignments[`${dialogData.day}|${dialogData.time}`];
      setFormSubject(assigned.subject);
      setFormTeacher(assigned.teacher);
      setFormClassType(assigned.classType);
      setFormEndTime((assigned as Assignment).endTime || "");
    } else if (dialogOpen && dialogData) {
      setFormSubject("");
      setFormTeacher("");
      setFormClassType("regular");
      setFormEndTime("");
    }
  }, [dialogOpen, dialogData]);

  // Move fetchAndSetRoutine to component scope
  async function fetchAndSetRoutine(
    classId: string,
    subjects: any,
    teachers: any,
  ) {
    if (!selectedClassSection) {
      setAssignments({});
      return;
    }
    const res = await getClassRoutine(selectedClassSection.classId, selectedClassSection.sectionId);
    console.log("getClassRoutine result for classId", selectedClassSection.classId, res); // <-- log the result
    if (
      res.success &&
      res.data &&
      Array.isArray(subjects) &&
      Array.isArray(teachers)
    ) {
      const routine = res.data;
      const newAssignments: Record<string, Assignment> = {};
      for (const slot of routine.slots || []) {
        const key = `${slot.day}|${slot.startTime}-${slot.endTime}`;
        newAssignments[key] = {
          subject: slot.subjectId || "",
          teacher: slot.teacherId || "",
          classType: (slot.classType || "REGULAR").toLowerCase(),
          ...(slot.classType !== "REGULAR" && slot.endTime
            ? { endTime: slot.endTime }
            : {}),
        };
      }
      setAssignments(newAssignments);
    } else {
      setAssignments({});
    }
  }

  // Update useEffect to use the new function
  useEffect(() => {
    fetchAndSetRoutine(selectedClassSection?.classId || "", subjects, teachers);
    // Only run when classValue, subjects, or teachers change
  }, [selectedClassSection, subjects.length, teachers.length]);

  const handleAddSubject = (day: string, time: string) => {
    setDialogData({ day, time });
    setDialogOpen(true);
  };

  const handleDialogSave = () => {
    if (!dialogData) return;
    const startTime = dialogData.time.split("-")[0];
    let endTime = dialogData.time.split("-")[1];
    if (formClassType !== "regular" && formEndTime) {
      endTime = formEndTime;
    }
    const newKey = `${dialogData.day}|${startTime}-${endTime}`;
    setAssignments((prev) => {
      const updated = { ...prev };
      // Remove any assignment for the old slot (if it exists)
      Object.keys(updated).forEach((k) => {
        if (k.startsWith(`${dialogData.day}|${startTime}-`)) {
          delete updated[k];
        }
      });
      updated[newKey] = {
        subject: formSubject,
        teacher: formTeacher,
        classType: formClassType,
        ...(formClassType !== "regular" && endTime ? { endTime } : {}),
      };
      return updated;
    });
    setDialogOpen(false);
    setDialogData(null);
  };

  // Helper to get current class object
  const currentClassObj = classOptions.find((c) => c.value === classValue);

  // Save routine handler
  async function handleSaveRoutine() {
    if (
      !selectedClassSection ||
      !classBranchId ||
      Object.keys(assignments).length === 0
    )
      return;
    setSaveLoading(true);
    // Find the full class object for schoolId/createdBy
    const allClassesRes = await getClasses();
    let schoolId = "";
    let createdBy = "";
    if (allClassesRes.success && Array.isArray(allClassesRes.data)) {
      const found = allClassesRes.data.find((c: any) => c.id === selectedClassSection.classId);
      schoolId = found?.branch?.schoolId || found?.schoolId || "";
      createdBy = found?.teacherId || ""; // fallback, ideally use session user id
    }
    // Map frontend classType to Prisma enum
    const classTypeMap: Record<string, string> = {
      regular: "REGULAR",
      special: "SPECIAL",
      break: "BREAK",
      lab: "LAB",
      practical: "PRACTICAL",
      assignment: "ASSIGNMENT",
    };
    // Prepare slots
    const slots = Object.entries(assignments).map(([key, value]) => {
      const [day, time] = key.split("|");
      const [startTime, endTime] = time.split("-");
      return {
        day,
        startTime,
        endTime: value.endTime || endTime,
        subjectId: value.subject || undefined,
        teacherId: value.teacher || undefined,
        classType: classTypeMap[value.classType] || "REGULAR",
      };
    });
    const res = await upsertClassRoutine({
      classId: selectedClassSection.classId,
      sectionId: selectedClassSection.sectionId,
      academicYear: selectedClassSection.academicYear,
      branchId: classBranchId,
      schoolId,
      createdBy,
      slots,
    });
    setSaveLoading(false);
    if (res.success) {
      toast({
        title: "Routine saved successfully!",
        description: "The class routine has been saved.",
        variant: "default",
      });
      // Fetch and update the table with the latest routine
      await fetchAndSetRoutine(selectedClassSection.classId, subjects, teachers);
    } else {
      toast({
        title: "Failed to save routine",
        description:
          res.message || "An error occurred while saving the routine.",
        variant: "destructive",
      });
    }
  }

  return (
    <div className="flex-1 space-y-4 p-6">
      <div className="space-y-3">
        <Link href={"/dashboard/class-routine"}>
          <Button variant={"outline"} size={"icon"} className="rounded-full">
            <ArrowLeft />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Customize Class Routine
          </h1>
          <p className="text-muted-foreground">
            Manage and view class schedules and timetables
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <Calendar className="h-5 w-5 mr-2" />
            Schedule Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 md:items-end">
            <div>
              <label className="text-sm font-medium mb-2 block">Class</label>
              <Select
                value={selectedClassSection ? `${selectedClassSection.classId}|${selectedClassSection.sectionId}` : ''}
                onValueChange={(val) => {
                  const found = classSectionOptions.find(opt => opt.value === val);
                  if (found) {
                    setSelectedClassSection({
                      classId: found.classId,
                      sectionId: found.sectionId,
                      academicYear: found.academicYear,
                    });
                  }
                }}
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
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">
                Academic Year
              </label>
              <Select value={yearValue ?? ''} onValueChange={setYearValue}>
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Select Year" />
                </SelectTrigger>
                <SelectContent>
                  {academicYearOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Class Routing Table</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div>Loading...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse table-fixed">
                <thead>
                  <tr>
                    <th className="border border-gray-200 p-3 text-sm bg-gray-50 text-left font-medium w-28 min-w-[7rem] max-w-[7rem] h-16 min-h-[4rem]">
                      Time
                    </th>
                    {days.map((day) => (
                      <th
                        key={day}
                        className="border border-gray-200 p-3 text-sm bg-gray-50 text-center font-medium w-32 min-w-[8rem] max-w-[8rem] h-16 min-h-[4rem]"
                      >
                        {day}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {/* Use dynamic slots per day */}
                  {dayTimeSlots[days[0]] &&
                    dayTimeSlots[days[0]].map((slot, slotIdx) => (
                      <tr
                        key={slot}
                        className="hover:bg-gray-50 h-20 min-h-[5rem]"
                      >
                        <td className="border border-gray-200 p-3 font-medium bg-gray-50 text-xs w-28 min-w-[7rem] max-w-[7rem] h-20 min-h-[5rem] align-middle">
                          {slot}
                        </td>
                        {days.map((day) => {
                          const slotsForDay = dayTimeSlots[day] || [];
                          const slotForDay = slotsForDay[slotIdx];
                          const key = `${day}|${slotForDay}`;
                          const assigned = assignments[key];
                          return (
                            <td
                              key={day}
                              className="border relative border-gray-200 p-3 text-center w-32 min-w-[8rem] max-w-[8rem] h-20 min-h-[5rem] align-middle"
                            >
                              {assigned ? (
                                <>
                                  {/* Edit button top left */}
                                  <button
                                    className="absolute top-1 left-1 p-1 text-blue-600 hover:bg-blue-50 rounded-full z-10"
                                    type="button"
                                    onClick={() => {
                                      setFormClassType(assigned.classType);
                                      setFormSubject(assigned.subject);
                                      setFormTeacher(assigned.teacher);
                                      setFormEndTime(
                                        (assigned as Assignment).endTime || "",
                                      );
                                      setDialogData({ day, time: slot });
                                      setDialogOpen(true);
                                    }}
                                    title="Edit"
                                  >
                                    <Pencil size={14} />
                                  </button>
                                  {/* Delete button top right */}
                                  <button
                                    className="absolute top-1 right-1 p-1 text-red-600 hover:bg-red-50 rounded-full z-10"
                                    type="button"
                                    onClick={() => {
                                      setAssignments((prev) => {
                                        const newAssignments = { ...prev };
                                        delete newAssignments[key];
                                        return newAssignments;
                                      });
                                    }}
                                    title="Delete"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                  <div className="pt-5">
                                    {/* Padding top for icons */}
                                    <div className="font-medium text-sm">
                                      {subjects.find(
                                        (s) => s.value === assigned.subject,
                                      )?.label || assigned.subject}
                                    </div>
                                    <div className="text-xs text-gray-600">
                                      {teachers.find(
                                        (t) => t.value === assigned.teacher,
                                      )?.label || assigned.teacher}
                                    </div>
                                    <div
                                      className={[
                                        "text-[0.60rem] capitalize border rounded-full px-2 inline-block",
                                        assigned.classType === "regular"
                                          ? "bg-[#d0eff5]"
                                          : "",
                                        assigned.classType === "special"
                                          ? "bg-[#f0cec5]"
                                          : "",
                                        assigned.classType === "break"
                                          ? "bg-[#f8fac5]"
                                          : "",
                                      ].join(" ")}
                                    >
                                      {assigned.classType}
                                    </div>
                                  </div>
                                </>
                              ) : (
                                <button
                                  className="flex items-center justify-center w-full h-full text-gray-400 hover:text-blue-600"
                                  type="button"
                                  onClick={() => {
                                    setFormClassType("regular");
                                    setFormSubject("");
                                    setFormTeacher("");
                                    setFormEndTime("");
                                    setDialogData({ day, time: slot });
                                    setDialogOpen(true);
                                  }}
                                  title="Add Subject"
                                  aria-label="Add Subject"
                                >
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="h-5 w-5"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    strokeWidth={2}
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      d="M12 4v16m8-8H4"
                                    />
                                  </svg>
                                </button>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                </tbody>
              </table>
              {/* Single Dialog instance for Add/Edit */}
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {dialogData &&
                      assignments[`${dialogData.day}|${dialogData.time}`]
                        ? "Edit Subject"
                        : "Add Subject"}
                    </DialogTitle>
                    <DialogDescription>
                      Assign a subject and teacher to this slot.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-3">
                    <div
                      className={`grid items-center ${formClassType !== "regular" ? "grid-cols-2 gap-4" : "grid-cols-1 gap-0"} `}
                    >
                      <div>
                        <label className="text-xs font-medium block mb-1">
                          Time
                        </label>
                        <input
                          className="w-full px-2 py-1 border rounded bg-gray-100"
                          value={dialogData?.time || ""}
                          readOnly
                        />
                      </div>
                      <div
                        className={`${formClassType !== "regular col-span-1" ? "block" : "hidden"}`}
                      >
                        {formClassType !== "regular" && (
                          <>
                            <label className="text-xs font-medium block mb-1">
                              End Time
                            </label>
                            <input
                              type="time"
                              className="w-full px-2 py-1 border rounded"
                              value={formEndTime}
                              onChange={(e) => setFormEndTime(e.target.value)}
                            />
                          </>
                        )}
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-medium block mb-1">
                        Day
                      </label>
                      <input
                        className="w-full px-2 py-1 border rounded bg-gray-100"
                        value={dialogData?.day || ""}
                        readOnly
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium block mb-1">
                        Class Type
                      </label>
                      <Select
                        value={formClassType}
                        onValueChange={setFormClassType}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {classTypeOptions.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div
                      className={`${formClassType === "break" ? "hidden" : "block"}`}
                    >
                      <label className="text-xs font-medium block mb-1">
                        Subject
                      </label>
                      <Select
                        value={formSubject}
                        onValueChange={setFormSubject}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select Subject" />
                        </SelectTrigger>
                        <SelectContent>
                          {subjects.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div
                      className={`${formClassType === "break" ? "hidden" : "block"}`}
                    >
                      <label className="text-xs font-medium block mb-1">
                        Teacher
                      </label>
                      <Select
                        value={formTeacher}
                        onValueChange={setFormTeacher}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select Teacher" />
                        </SelectTrigger>
                        <SelectContent>
                          {teachers.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setDialogOpen(false)}
                      type="button"
                    >
                      Cancel
                    </Button>
                    <Button onClick={handleDialogSave} type="button">
                      Save
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          )}
        </CardContent>
      </Card>
      <div className="mt-6 flex gap-4 items-center">
        <Button
          onClick={handleSaveRoutine}
          disabled={
            saveLoading ||
            !selectedClassSection ||
            !classBranchId ||
            Object.keys(assignments).length === 0
          }
        >
          {saveLoading ? "Saving..." : "Save Routine"}
        </Button>
      </div>
    </div>
  );
}
