'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  HomeIcon,
  UsersIcon,
  BookOpenIcon,
  CreditCardIcon,
  SettingsIcon,
  ClipboardIcon,
  CalendarCheckIcon,
  GraduationCapIcon,
  LibraryIcon,
  BusIcon,
  CalendarDaysIcon,
  Users2Icon,
  MegaphoneIcon,
  BookIcon,
  BuildingIcon,
  CalendarIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { BranchSelector } from '@/components/branch-selector';

const navGroups = [
  {
    title: 'Academics',
    items: [
      { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
      { name: 'Admissions', href: '/dashboard/admissions', icon: ClipboardIcon },
      { name: 'Students', href: '/dashboard/students', icon: UsersIcon },
      { name: 'Parents', href: '/dashboard/parents', icon: Users2Icon },
      { name: 'Teachers', href: '/dashboard/teachers', icon: UsersIcon },
      { name: 'Academic Year', href: '/dashboard/academic-year', icon: CalendarIcon },
      { name: 'Classes', href: '/dashboard/classes', icon: BookOpenIcon },
      { name: 'Subjects', href: '/dashboard/subjects', icon: BookIcon },
      { name: 'Class Routine', href: '/dashboard/class-routine', icon: CalendarDaysIcon },
      { name: 'Attendance', href: '/dashboard/attendance', icon: CalendarCheckIcon },
      { name: 'Exams', href: '/dashboard/exams', icon: GraduationCapIcon },
    ],
  },
  {
    title: 'Management',
    items: [
      { name: 'Branches', href: '/dashboard/branches', icon: BuildingIcon },
      { name: 'Announcements', href: '/dashboard/announcements', icon: MegaphoneIcon },
      { name: 'Accounts', href: '/dashboard/accounts', icon: CreditCardIcon },
      { name: 'Library', href: '/dashboard/library', icon: LibraryIcon },
      { name: 'Transport', href: '/dashboard/transport', icon: BusIcon },
      { name: 'Staff', href: '/dashboard/staff', icon: UsersIcon },
    ],
  },
  {
    title: 'Administration',
    items: [{ name: 'Settings', href: '/dashboard/settings', icon: SettingsIcon }],
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex flex-col w-64 bg-card border-r h-screen">
      {/* Fixed Header */}
      <div className="h-16 flex items-center px-6 border-b bg-card shrink-0">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">AS</span>
          </div>
          <span className="text-primary">Aamar</span>
          <span className="text-foreground">School</span>
        </Link>
      </div>

      
      
      {/* Scrollable Navigation */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-6 space-y-6 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent hover:scrollbar-thumb-gray-400">
        {navGroups.map((group) => (
          <div key={group.title}>
            <h3 className="px-3 mb-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {group.title}
            </h3>
            <div className="space-y-1">
              {group.items.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-all duration-200",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-sm font-medium"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    )}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    <span className="truncate">{item.name}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}
