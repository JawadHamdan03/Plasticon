import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { createUserSocket } from "../lib/socket";
import {
  LayoutDashboard, Users, ClipboardList, DollarSign, Settings,
  Camera, Zap, Cpu, BarChart3, FileText, ShoppingCart, TrendingUp,
  Bell, MessageSquare, LogOut, Menu, X, ChevronRight,
  Wrench, CheckSquare, AlertTriangle, Lightbulb, Activity, Target,
  Factory, Shield, Calendar, Boxes, Receipt, ClipboardCheck,
  UserCheck, Layers, Search, Package, PieChart, CreditCard, Percent, Wallet, CheckCircle,
  Truck, Award, UserPlus, Sun, Moon, Briefcase, Sparkles, Bot,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useLocale } from "../context/LocaleContext";
import { useTheme } from "../context/ThemeContext";
import { API_BASE_URL } from "../lib/api";
import logo from "../assets/plasticonLogo.png";
import { DateTimeBadge } from "./DateTimeBadge";

type SearchItem = { labelAr: string; labelEn: string; to: string };

const ALL_SEARCH_ITEMS: SearchItem[] = [
  { labelAr: "لوحة التحكم", labelEn: "Dashboard", to: "/dashboard" },
  { labelAr: "الإنتاج", labelEn: "Production", to: "/production" },
  { labelAr: "الإشعارات", labelEn: "Notifications", to: "/notifications" },
  { labelAr: "الدردشة", labelEn: "Chat", to: "/chat" },
  { labelAr: "المخزون", labelEn: "Inventory", to: "/inventory" },
  { labelAr: "المشتريات", labelEn: "Purchases", to: "/purchases" },
  { labelAr: "المبيعات", labelEn: "Sales", to: "/sales" },
  { labelAr: "التقارير", labelEn: "Reports", to: "/reports" },
  { labelAr: "الحضور", labelEn: "My Attendance", to: "/attendance" },
  { labelAr: "الرواتب", labelEn: "My Payroll", to: "/my-payroll" },
  { labelAr: "المستخدمون", labelEn: "Users", to: "/admin/users" },
  { labelAr: "طلبات التسجيل", labelEn: "Registration Requests", to: "/admin/registration-requests" },
  { labelAr: "حضور الموظفين", labelEn: "Attendance Admin", to: "/admin/attendance" },
  { labelAr: "رواتب الموظفين", labelEn: "Payroll Admin", to: "/admin/payroll" },
  { labelAr: "الورديات", labelEn: "Shifts", to: "/admin/shifts" },
  { labelAr: "الآلات", labelEn: "Machines", to: "/admin/machines" },
  { labelAr: "سجلات التدقيق", labelEn: "Audit Logs", to: "/admin/audit-logs" },
  { labelAr: "الإعدادات", labelEn: "Settings", to: "/admin/settings" },
  { labelAr: "الكهرباء", labelEn: "Electricity", to: "/admin/settings/electricity" },
  { labelAr: "قراءات العامل", labelEn: "Worker Snapshots", to: "/worker/snapshots" },
  { labelAr: "أدوات العامل", labelEn: "Worker Tools", to: "/worker/tools" },
  { labelAr: "التحليلات", labelEn: "Analytics", to: "/admin/dashboard-analytics" },
  // Engineer Phase 1 Features
  { labelAr: "صحة الآلات", labelEn: "Machine Health", to: "/engineer/machines" },
  { labelAr: "جدول الصيانة", labelEn: "Maintenance Schedule", to: "/engineer/maintenance-schedule" },
  { labelAr: "القطع الغيار", labelEn: "Spare Parts", to: "/engineer/spare-parts" },
  // Engineer Phase 2 Features
  { labelAr: "دورة حياة المعدات", labelEn: "Equipment Lifecycle", to: "/engineer/equipment-lifecycle" },
  { labelAr: "تحليل الإنتاج", labelEn: "Production Analytics", to: "/engineer/production-analytics" },
  { labelAr: "الوثائق التقنية", labelEn: "Technical Documentation", to: "/engineer/documentation" },
  { labelAr: "أوامر العمل", labelEn: "Work Orders", to: "/engineer/work-orders" },
  { labelAr: "سجل نقل المعدات", labelEn: "Equipment Transfer", to: "/engineer/equipment-transfer" },
  // Accountant Phase 1 Features
  { labelAr: "لوحة المالية", labelEn: "Financial Dashboard", to: "/accountant/financial-dashboard" },
  { labelAr: "المصروفات", labelEn: "Expenses", to: "/accountant/expenses" },
  { labelAr: "الفواتير", labelEn: "Invoices", to: "/accountant/invoices" },
  // Accountant Phase 2 Features
  { labelAr: "التقارير المالية", labelEn: "Financial Reports", to: "/accountant/financial-reports" },
  { labelAr: "مستحقات الموردين", labelEn: "Supplier Payables", to: "/accountant/payables" },
  { labelAr: "المستقبلات من الزبائن", labelEn: "Customer Receivables", to: "/accountant/receivables" },
  { labelAr: "خطة الميزانية", labelEn: "Budget Planning", to: "/accountant/budgets" },
  { labelAr: "التوفيق البنكي", labelEn: "Bank Reconciliation", to: "/accountant/reconciliation" },
  { labelAr: "تحليل التكاليف", labelEn: "Cost Analysis", to: "/accountant/cost-analysis" },
  { labelAr: "سير العمل للموافقة", labelEn: "Approval Workflows", to: "/accountant/approvals" },
  // New Phase 3 Features
  { labelAr: "قراءات المهندس", labelEn: "Engineer Readings", to: "/engineer/snapshots" },
  { labelAr: "قراءات الماكينات الداعمة", labelEn: "Support Machine Readings", to: "/engineer/support-machines" },
  { labelAr: "قراءات الداعم (مدير)", labelEn: "Support Machines (Admin)", to: "/admin/support-machines" },
  { labelAr: "تنبيهات المواد الخام", labelEn: "Raw Material Alerts", to: "/engineer/raw-material-alerts" },
  { labelAr: "تكاليف الصيانة", labelEn: "Maintenance Costs", to: "/engineer/maintenance-costs" },
  { labelAr: "إدارة الموردين", labelEn: "Supplier Management", to: "/accountant/suppliers" },
  { labelAr: "أداء الموظفين", labelEn: "Employee Performance", to: "/accountant/performance" },
  // Sales Rep
  { labelAr: "لوحة المندوب",    labelEn: "Sales Dashboard",  to: "/sales-rep" },
  { labelAr: "عملاء المندوب",   labelEn: "My Customers",     to: "/sales-rep/customers" },
  { labelAr: "عروض الأسعار",    labelEn: "Quotations",       to: "/sales-rep/quotations" },
  { labelAr: "سجل الزيارات",    labelEn: "Visit Log",        to: "/sales-rep/visits" },
  { labelAr: "أهداف المبيعات",  labelEn: "Sales Targets",    to: "/sales-rep/targets" },
  { labelAr: "طلبات المندوبين", labelEn: "Rep Requests",     to: "/sales-rep/review" },
  // AI Tools
  { labelAr: "أدوات الذكاء الاصطناعي", labelEn: "AI Tools Hub", to: "/ai" },
  { labelAr: "استخراج الفواتير بالذكاء الاصطناعي", labelEn: "AI Invoice Extraction", to: "/ai/invoice-extract" },
  { labelAr: "مساعد المصنع الذكي", labelEn: "AI Factory Assistant", to: "/ai/assistant" },
  { labelAr: "كشف شذوذ الإنتاج", labelEn: "Anomaly Detection", to: "/ai/anomaly-detection" },
  { labelAr: "مولد تقرير الصيانة", labelEn: "Maintenance Report", to: "/ai/maintenance-report" },
  { labelAr: "ملخص تسليم الشفت", labelEn: "Shift Handover", to: "/ai/shift-handover" },
  { labelAr: "تدريب أداء العامل", labelEn: "Worker Coaching", to: "/ai/worker-coaching" },
];

/* ── Types ─────────────────────────────────────────────────── */
type NotificationItem = {
  id: number;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
};

/* ── Nav label helpers ─────────────────────────────────────── */
type BiLabel = { en: string; ar: string };
type NavSectionBi = { label: BiLabel; items: NavItemBi[] };
type NavItemBi = { to: string; icon: ReactNode; label: BiLabel };

function nav(en: string, ar: string): BiLabel { return { en, ar }; }

function getNavSectionsBi(role: string): NavSectionBi[] {
  if (role === "ADMIN") {
    return [
      {
        label: nav("Overview", "نظرة عامة"),
        items: [
          { to: "/dashboard", icon: <LayoutDashboard size={17} />, label: nav("Dashboard", "لوحة التحكم") },
          { to: "/admin/dashboard-analytics", icon: <BarChart3 size={17} />, label: nav("Analytics", "التحليلات") },
        ],
      },
      {
        label: nav("Management", "الإدارة"),
        items: [
          { to: "/admin/users", icon: <Users size={17} />, label: nav("Users", "المستخدمون") },
          { to: "/admin/registration-requests", icon: <UserPlus size={17} />, label: nav("Requests", "الطلبات") },
          { to: "/admin/shifts", icon: <Calendar size={17} />, label: nav("Shifts", "الشفتات") },
          { to: "/admin/machines", icon: <Cpu size={17} />, label: nav("Machines", "الماكينات") },
        ],
      },
      {
        label: nav("Operations", "العمليات"),
        items: [
          { to: "/production", icon: <Factory size={17} />, label: nav("Production", "الإنتاج") },
          { to: "/admin/attendance", icon: <UserCheck size={17} />, label: nav("Attendance", "الحضور") },
          { to: "/admin/payroll", icon: <DollarSign size={17} />, label: nav("Payroll", "الرواتب") },
          { to: "/admin/snapshots", icon: <Camera size={17} />, label: nav("Snapshots", "القراءات") },
          { to: "/admin/support-machines", icon: <Activity size={17} />, label: nav("Support Machines", "ماكينات الدعم") },
          { to: "/admin/worker-records", icon: <Briefcase size={17} />, label: nav("Worker Hub", "مركز العمال") },
          { to: "/admin/settings/electricity", icon: <Zap size={17} />, label: nav("Electricity", "الكهرباء") },
          { to: "/admin/machine-stops", icon: <AlertTriangle size={17} />, label: nav("Machine Stops", "توقفات الآلات") },
        ],
      },
      {
        label: nav("Finance", "المالية"),
        items: [
          { to: "/accountant/financial-dashboard", icon: <PieChart size={17} />, label: nav("Fin. Dashboard", "لوحة المالية") },
          { to: "/accountant/invoices", icon: <FileText size={17} />, label: nav("Invoices", "الفواتير") },
          { to: "/accountant/expenses", icon: <DollarSign size={17} />, label: nav("Expenses", "المصروفات") },
          { to: "/accountant/payables", icon: <CreditCard size={17} />, label: nav("Payables", "مستحقات") },
          { to: "/accountant/receivables", icon: <Wallet size={17} />, label: nav("Receivables", "مستقبلات") },
          { to: "/accountant/budgets", icon: <Target size={17} />, label: nav("Budgets", "ميزانيات") },
          { to: "/accountant/reconciliation", icon: <CheckCircle size={17} />, label: nav("Reconciliation", "توفيق") },
          { to: "/accountant/cost-analysis", icon: <Percent size={17} />, label: nav("Cost Analysis", "التكاليف") },
          { to: "/accountant/approvals", icon: <Zap size={17} />, label: nav("Approvals", "موافقات") },
          { to: "/inventory", icon: <Boxes size={17} />, label: nav("Inventory", "المخزون") },
          { to: "/purchases", icon: <ShoppingCart size={17} />, label: nav("Purchases", "المشتريات") },
          { to: "/sales", icon: <TrendingUp size={17} />, label: nav("Sales", "المبيعات") },
          { to: "/reports", icon: <FileText size={17} />, label: nav("Reports", "التقارير") },
          { to: "/accountant/suppliers", icon: <Truck size={17} />, label: nav("Suppliers", "الموردون") },
          { to: "/accountant/performance", icon: <Award size={17} />, label: nav("Performance", "الأداء") },
          { to: "/accountant/customer-returns", icon: <Package size={17} />, label: nav("Cust. Returns", "مرتجعات العملاء") },
        ],
      },
      {
        label: nav("Sales Reps", "مندوبو المبيعات"),
        items: [
          { to: "/sales-rep/customers",  icon: <Users         size={17} />, label: nav("Customers",      "العملاء") },
          { to: "/sales-rep/quotations", icon: <FileText      size={17} />, label: nav("All Quotations", "كل العروض") },
          { to: "/sales-rep/visits",     icon: <ClipboardList size={17} />, label: nav("All Visits",     "كل الزيارات") },
          { to: "/sales-rep/targets",    icon: <Target        size={17} />, label: nav("All Targets",    "كل الأهداف") },
        ],
      },
      {
        label: nav("Engineering", "الهندسة"),
        items: [
          { to: "/quality-checks", icon: <CheckSquare size={17} />, label: nav("Quality Checks", "فحص الجودة") },
          { to: "/maintenance", icon: <Wrench size={17} />, label: nav("Maintenance", "الصيانة") },
          { to: "/engineer/machines", icon: <Activity size={17} />, label: nav("Machine Health", "صحة الآلات") },
          { to: "/engineer/maintenance-schedule", icon: <Calendar size={17} />, label: nav("Work Orders", "أوامر العمل") },
          { to: "/engineer/spare-parts", icon: <Package size={17} />, label: nav("Spare Parts", "القطع الغيار") },
          { to: "/engineer/equipment-lifecycle", icon: <Zap size={17} />, label: nav("Equipment Lifecycle", "دورة المعدات") },
          { to: "/engineer/production-analytics", icon: <BarChart3 size={17} />, label: nav("Prod. Analytics", "تحليل الإنتاج") },
          { to: "/engineer/documentation", icon: <FileText size={17} />, label: nav("Tech. Docs", "وثائق تقنية") },
          { to: "/engineer/equipment-transfer", icon: <Layers size={17} />, label: nav("Equip. Transfer", "نقل معدات") },
          { to: "/engineer/raw-material-alerts", icon: <AlertTriangle size={17} />, label: nav("Raw Mat. Alerts", "تنبيهات المواد") },
          { to: "/engineer/maintenance-costs", icon: <DollarSign size={17} />, label: nav("Maint. Costs", "تكاليف الصيانة") },
        ],
      },
      {
        label: nav("AI Tools", "أدوات الذكاء الاصطناعي"),
        items: [
          { to: "/ai", icon: <Sparkles size={17} />, label: nav("AI Hub", "مركز الذكاء") },
          { to: "/ai/assistant", icon: <Bot size={17} />, label: nav("AI Assistant", "المساعد الذكي") },
          { to: "/ai/invoice-extract", icon: <Sparkles size={17} />, label: nav("Invoice Extraction", "استخراج الفواتير") },
          { to: "/ai/anomaly-detection", icon: <AlertTriangle size={17} />, label: nav("Anomaly Detection", "كشف الشذوذ") },
          { to: "/ai/maintenance-report", icon: <Wrench size={17} />, label: nav("Maint. Report", "تقرير الصيانة") },
          { to: "/ai/shift-handover", icon: <ClipboardList size={17} />, label: nav("Shift Handover", "تسليم الشفت") },
          { to: "/ai/worker-coaching", icon: <Award size={17} />, label: nav("Worker Coaching", "تدريب العامل") },
        ],
      },
      {
        label: nav("System", "النظام"),
        items: [
          { to: "/admin/audit-logs", icon: <Shield size={17} />, label: nav("Audit Logs", "سجل التدقيق") },
          { to: "/admin/settings", icon: <Settings size={17} />, label: nav("Settings", "الإعدادات") },
          { to: "/notifications", icon: <Bell size={17} />, label: nav("Notifications", "الإشعارات") },
          { to: "/chat", icon: <MessageSquare size={17} />, label: nav("Chat", "الدردشة") },
        ],
      },
    ];
  }

  if (role === "ENGINEER") {
    return [
      {
        label: nav("Overview", "نظرة عامة"),
        items: [
          { to: "/dashboard", icon: <LayoutDashboard size={17} />, label: nav("Dashboard", "لوحة التحكم") },
        ],
      },
      {
        label: nav("Engineering", "الهندسة"),
        items: [
          { to: "/production", icon: <Factory size={17} />, label: nav("Production", "الإنتاج") },
          { to: "/engineer/snapshots", icon: <Camera size={17} />, label: nav("Meter Readings", "قراءات العدادات") },
          { to: "/engineer/support-machines", icon: <Activity size={17} />, label: nav("Support Machines", "ماكينات الدعم") },
          { to: "/quality-checks", icon: <CheckSquare size={17} />, label: nav("Quality Checks", "فحص الجودة") },
          { to: "/maintenance", icon: <Wrench size={17} />, label: nav("Maintenance", "الصيانة") },
          { to: "/engineer/inventory", icon: <ClipboardList size={17} />, label: nav("Parts Inventory", "مخزون القطع") },
          { to: "/engineer/machines", icon: <Activity size={17} />, label: nav("Machine Health", "صحة الآلات") },
          { to: "/engineer/maintenance-schedule", icon: <Calendar size={17} />, label: nav("Work Orders", "أوامر العمل") },
          { to: "/engineer/spare-parts", icon: <Package size={17} />, label: nav("Spare Parts", "القطع الغيار") },
          { to: "/engineer/equipment-lifecycle", icon: <Zap size={17} />, label: nav("Equipment Lifecycle", "دورة المعدات") },
          { to: "/engineer/production-analytics", icon: <BarChart3 size={17} />, label: nav("Prod. Analytics", "تحليل الإنتاج") },
          { to: "/engineer/documentation", icon: <FileText size={17} />, label: nav("Tech. Docs", "وثائق تقنية") },
          { to: "/engineer/equipment-transfer", icon: <Layers size={17} />, label: nav("Equip. Transfer", "نقل معدات") },
          { to: "/engineer/raw-material-alerts", icon: <AlertTriangle size={17} />, label: nav("Raw Mat. Alerts", "تنبيهات المواد") },
          { to: "/engineer/maintenance-costs", icon: <DollarSign size={17} />, label: nav("Maint. Costs", "تكاليف الصيانة") },
          { to: "/electricity", icon: <Zap size={17} />, label: nav("Electricity", "الكهرباء") },
        ],
      },
      {
        label: nav("AI Tools", "أدوات الذكاء الاصطناعي"),
        items: [
          { to: "/ai", icon: <Sparkles size={17} />, label: nav("AI Hub", "مركز الذكاء") },
          { to: "/ai/assistant", icon: <Bot size={17} />, label: nav("AI Assistant", "المساعد الذكي") },
          { to: "/ai/anomaly-detection", icon: <AlertTriangle size={17} />, label: nav("Anomaly Detection", "كشف الشذوذ") },
          { to: "/ai/maintenance-report", icon: <Wrench size={17} />, label: nav("Maint. Report", "تقرير الصيانة") },
        ],
      },
      {
        label: nav("Personal", "الشخصية"),
        items: [
          { to: "/attendance", icon: <UserCheck size={17} />, label: nav("My Attendance", "حضوري") },
          { to: "/my-payroll", icon: <DollarSign size={17} />, label: nav("My Payroll", "راتبي") },
          { to: "/notifications", icon: <Bell size={17} />, label: nav("Notifications", "الإشعارات") },
          { to: "/chat", icon: <MessageSquare size={17} />, label: nav("Chat", "الدردشة") },
        ],
      },
    ];
  }

  if (role === "ACCOUNTANT") {
    return [
      {
        label: nav("Overview", "نظرة عامة"),
        items: [
          { to: "/dashboard", icon: <LayoutDashboard size={17} />, label: nav("Dashboard", "لوحة التحكم") },
          { to: "/reports", icon: <BarChart3 size={17} />, label: nav("Reports", "التقارير") },
        ],
      },
      {
        label: nav("Finance", "المالية"),
        items: [
          { to: "/accountant/financial-dashboard", icon: <PieChart size={17} />, label: nav("Fin. Dashboard", "لوحة المالية") },
          { to: "/accountant/invoices", icon: <FileText size={17} />, label: nav("Invoices", "الفواتير") },
          { to: "/accountant/expenses", icon: <DollarSign size={17} />, label: nav("Expenses", "المصروفات") },
          { to: "/accountant/financial-reports", icon: <BarChart3 size={17} />, label: nav("Fin. Reports", "تقارير مالية") },
          { to: "/accountant/payables", icon: <CreditCard size={17} />, label: nav("Payables", "مستحقات") },
          { to: "/accountant/receivables", icon: <Wallet size={17} />, label: nav("Receivables", "مستقبلات") },
          { to: "/accountant/budgets", icon: <Target size={17} />, label: nav("Budgets", "ميزانيات") },
          { to: "/accountant/reconciliation", icon: <CheckCircle size={17} />, label: nav("Reconciliation", "توفيق") },
          { to: "/accountant/cost-analysis", icon: <Percent size={17} />, label: nav("Cost Analysis", "تحليل التكاليف") },
          { to: "/accountant/approvals", icon: <Zap size={17} />, label: nav("Approvals", "موافقات") },
          { to: "/inventory", icon: <Boxes size={17} />, label: nav("Inventory", "المخزون") },
          { to: "/purchases", icon: <ShoppingCart size={17} />, label: nav("Purchases", "المشتريات") },
          { to: "/sales", icon: <TrendingUp size={17} />, label: nav("Sales", "المبيعات") },
          { to: "/accountant/parts-pricing", icon: <Receipt size={17} />, label: nav("Parts Pricing", "تسعير القطع") },
          { to: "/accountant/suppliers", icon: <Truck size={17} />, label: nav("Suppliers", "الموردون") },
          { to: "/accountant/performance", icon: <Award size={17} />, label: nav("Performance", "الأداء") },
          { to: "/accountant/customer-returns", icon: <Package size={17} />, label: nav("Cust. Returns", "مرتجعات العملاء") },
          { to: "/engineer/maintenance-costs", icon: <DollarSign size={17} />, label: nav("Maint. Costs", "تكاليف الصيانة") },
        ],
      },
      {
        label: nav("Sales Reps", "مندوبو المبيعات"),
        items: [
          { to: "/sales-rep/review",         icon: <CheckCircle   size={17} />, label: nav("Rep Requests",   "طلبات المندوبين") },
          { to: "/sales-rep/quotations", icon: <FileText      size={17} />, label: nav("All Quotations", "كل العروض") },
          { to: "/sales-rep/visits",     icon: <ClipboardList size={17} />, label: nav("All Visits",     "كل الزيارات") },
          { to: "/sales-rep/targets",    icon: <Target        size={17} />, label: nav("All Targets",    "كل الأهداف") },
        ],
      },
      {
        label: nav("HR", "الموارد البشرية"),
        items: [
          { to: "/admin/attendance", icon: <UserCheck size={17} />, label: nav("Attendance", "الحضور") },
          { to: "/admin/payroll", icon: <DollarSign size={17} />, label: nav("Payroll", "الرواتب") },
        ],
      },
      {
        label: nav("AI Tools", "أدوات الذكاء الاصطناعي"),
        items: [
          { to: "/ai", icon: <Sparkles size={17} />, label: nav("AI Hub", "مركز الذكاء") },
          { to: "/ai/assistant", icon: <Bot size={17} />, label: nav("AI Assistant", "المساعد الذكي") },
          { to: "/ai/invoice-extract", icon: <Sparkles size={17} />, label: nav("Invoice Extraction", "استخراج الفواتير") },
        ],
      },
      {
        label: nav("Personal", "الشخصية"),
        items: [
          { to: "/attendance", icon: <ClipboardCheck size={17} />, label: nav("My Attendance", "حضوري") },
          { to: "/my-payroll", icon: <Receipt size={17} />, label: nav("My Payroll", "راتبي") },
          { to: "/notifications", icon: <Bell size={17} />, label: nav("Notifications", "الإشعارات") },
          { to: "/chat", icon: <MessageSquare size={17} />, label: nav("Chat", "الدردشة") },
        ],
      },
    ];
  }

  // SALES_REP
  if (role === "SALES_REP") {
    return [
      {
        label: nav("Overview", "نظرة عامة"),
        items: [
          { to: "/sales-rep",                    icon: <LayoutDashboard size={17} />, label: nav("Dashboard",    "لوحة المندوب") },
        ],
      },
      {
        label: nav("Sales", "المبيعات"),
        items: [
          { to: "/sales-rep/customers",  icon: <Users         size={17} />, label: nav("My Customers", "عملائي") },
          { to: "/sales-rep/quotations", icon: <FileText      size={17} />, label: nav("Quotations",   "عروض الأسعار") },
          { to: "/sales-rep/visits",     icon: <ClipboardList size={17} />, label: nav("Visit Log",    "سجل الزيارات") },
          { to: "/sales-rep/targets",    icon: <Target        size={17} />, label: nav("Targets",      "الأهداف") },
          { to: "/sales",                    icon: <TrendingUp    size={17} />, label: nav("Sales Orders", "طلبات المبيعات") },
        ],
      },
      {
        label: nav("Personal", "الشخصية"),
        items: [
          { to: "/attendance",    icon: <UserCheck     size={17} />, label: nav("My Attendance", "حضوري") },
          { to: "/my-payroll",    icon: <DollarSign    size={17} />, label: nav("My Payroll",    "راتبي") },
          { to: "/notifications", icon: <Bell          size={17} />, label: nav("Notifications", "الإشعارات") },
          { to: "/chat",          icon: <MessageSquare size={17} />, label: nav("Chat",          "الدردشة") },
        ],
      },
    ];
  }

  // WORKER
  return [
    {
      label: nav("Overview", "نظرة عامة"),
      items: [
        { to: "/dashboard", icon: <LayoutDashboard size={17} />, label: nav("Dashboard", "لوحة التحكم") },
      ],
    },
    {
      label: nav("Work", "العمل"),
      items: [
        { to: "/production", icon: <Factory size={17} />, label: nav("Production", "الإنتاج") },
        { to: "/worker/snapshots", icon: <Camera size={17} />, label: nav("Readings", "القراءات") },
        { to: "/worker/tools?tab=stops", icon: <AlertTriangle size={17} />, label: nav("Machine Stops", "توقف الماكينات") },
        { to: "/worker/tools?tab=checklist", icon: <CheckSquare size={17} />, label: nav("Daily Checklist", "قائمة اليوم") },
        { to: "/worker/tools?tab=waste", icon: <Layers size={17} />, label: nav("Material Waste", "هدر المواد") },
        { to: "/worker/tools?tab=target", icon: <Target size={17} />, label: nav("Daily Targets", "الأهداف اليومية") },
        { to: "/worker/tools?tab=quality", icon: <Activity size={17} />, label: nav("Quality Issues", "مشاكل الجودة") },
        { to: "/worker/tools?tab=micro", icon: <Cpu size={17} />, label: nav("Micro Stops", "توقفات مايكرو") },
        { to: "/worker/tools?tab=anomaly", icon: <Zap size={17} />, label: nav("Electricity Alerts", "تنبيهات الكهرباء") },
        { to: "/electricity", icon: <Zap size={17} />, label: nav("Electricity Record", "تسجيل الكهرباء") },
      ],
    },
    {
      label: nav("AI Tools", "أدوات الذكاء الاصطناعي"),
      items: [
        { to: "/ai/assistant", icon: <Bot size={17} />, label: nav("AI Assistant", "المساعد الذكي") },
      ],
    },
    {
      label: nav("Personal", "الشخصية"),
      items: [
        { to: "/attendance", icon: <UserCheck size={17} />, label: nav("My Attendance", "حضوري") },
        { to: "/my-payroll", icon: <DollarSign size={17} />, label: nav("My Payroll", "راتبي") },
        { to: "/notifications", icon: <Bell size={17} />, label: nav("Notifications", "الإشعارات") },
        { to: "/chat", icon: <MessageSquare size={17} />, label: nav("Chat", "الدردشة") },
      ],
    },
  ];
}

function roleLabel(role: string, locale: string) {
  const map: Record<string, { en: string; ar: string }> = {
    ADMIN: { en: "Administrator", ar: "مدير" },
    ENGINEER: { en: "Engineer", ar: "مهندس" },
    ACCOUNTANT: { en: "Accountant", ar: "محاسب" },
    WORKER: { en: "Worker", ar: "عامل" },
    SALES_REP: { en: "Sales Rep", ar: "مندوب مبيعات" },
  };
  const entry = map[role];
  if (!entry) return role;
  return locale === "ar" ? entry.ar : entry.en;
}

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? "")
    .join("");
}

/* ── Component ─────────────────────────────────────────────── */
export function AppScaffold({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { locale, setLocale } = useLocale();
  const { theme, setTheme } = useTheme();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pendingRequests, setPendingRequests] = useState(0);
  const [unread, setUnread] = useState(0);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifLoading, setNotifLoading] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  /* search state */
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const role = String(user?.role ?? "WORKER").toUpperCase();
  const isAr = locale === "ar";

  const filteredSearch = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const allowed = ALL_SEARCH_ITEMS.filter((item) => {
      if (item.to.startsWith("/admin")) return role === "ADMIN" || role === "ACCOUNTANT";
      if (item.to === "/inventory" || item.to === "/purchases" || item.to === "/reports")
        return role === "ADMIN" || role === "ACCOUNTANT";
      if (item.to === "/sales") return role === "ADMIN" || role === "ACCOUNTANT" || role === "SALES_REP";
      if (item.to.startsWith("/worker/")) return role === "WORKER";
      if (item.to === "/engineer/snapshots") return role === "ENGINEER";
      if (item.to === "/engineer/support-machines") return role === "ENGINEER" || role === "WORKER";
      if (item.to === "/admin/support-machines") return role === "ADMIN";
      if (item.to === "/accountant/financial-reports") return role === "ACCOUNTANT";
      if (item.to.startsWith("/accountant/")) return role === "ACCOUNTANT" || role === "ADMIN";
      if (item.to.startsWith("/engineer/")) return role === "ENGINEER" || role === "ADMIN";
      if (item.to === "/sales-rep/review") return role === "ACCOUNTANT" || role === "ADMIN";
      if (item.to.startsWith("/sales-rep")) return role === "SALES_REP" || role === "ADMIN";
      return true;
    });
    if (!q) return allowed.slice(0, 6);
    return allowed.filter((i) =>
      `${i.labelAr} ${i.labelEn}`.toLowerCase().includes(q)
    ).slice(0, 8);
  }, [searchQuery, role]);

  const sectionsBi = getNavSectionsBi(role);

  /* fetch notifications */
  const fetchNotif = async () => {
    setNotifLoading(true);
    try {
      const [r1, r2] = await Promise.all([
        fetch(`${API_BASE_URL}/notifications?limit=10&page=1`, { credentials: "include" }),
        fetch(`${API_BASE_URL}/notifications/unread-count`, { credentials: "include" }),
      ]);
      if (r1.ok) setNotifications(((await r1.json()) as any).items ?? []);
      if (r2.ok) {
        const d = (await r2.json()) as any;
        setUnread(d.unreadCount ?? d.count ?? 0);
      }
    } catch {
      /* ignore */
    } finally {
      setNotifLoading(false);
    }
  };

  useEffect(() => {
    if (role !== "ADMIN") return;
    fetch(`${API_BASE_URL}/registration-requests?status=PENDING`, { credentials: "include" })
      .then((r) => r.ok ? r.json() : [])
      .then((data: unknown[]) => setPendingRequests(Array.isArray(data) ? data.length : 0))
      .catch(() => { /* ignore */ });
  }, [role]);

  useEffect(() => { void fetchNotif(); }, [role]);
  useEffect(() => { if (notifOpen) void fetchNotif(); }, [notifOpen]);
  useEffect(() => { setNotifOpen(false); setSidebarOpen(false); setSearchOpen(false); setSearchQuery(""); }, [location.pathname]);

  // Request browser notification permission on first render
  useEffect(() => {
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      Notification.requestPermission().catch(() => undefined);
    }
  }, []);

  // Real-time notifications via socket.io
  useEffect(() => {
    const socket = createUserSocket();
    if (!socket) return;

    const handleNewNotification = (notification: NotificationItem) => {
      setNotifications((prev) => [notification, ...prev].slice(0, 20));
      setUnread((c) => c + 1);

      // Show browser notification when tab is not focused
      if (typeof Notification !== "undefined" && Notification.permission === "granted" && document.hidden) {
        try {
          new Notification(notification.title, {
            body: notification.message,
            icon: "/favicon.svg",
            tag: `notif-${notification.id}`,
          });
        } catch { /* ignore */ }
      }
    };

    const handleUnreadCountUpdate = () => {
      fetch(`${API_BASE_URL}/notifications/unread-count`, { credentials: "include" })
        .then((r) => r.ok ? r.json() : null)
        .then((d: any) => { if (d) setUnread(d.unreadCount ?? d.count ?? 0); })
        .catch(() => undefined);
    };

    socket.on("notification:new", handleNewNotification);
    socket.on("notification:unread-count-updated", handleUnreadCountUpdate);

    return () => {
      socket.off("notification:new", handleNewNotification);
      socket.off("notification:unread-count-updated", handleUnreadCountUpdate);
      socket.disconnect();
    };
  }, [role]);

  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node))
        setNotifOpen(false);
      if (searchRef.current && !searchRef.current.contains(e.target as Node))
        setSearchOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setNotifOpen(false); setSearchOpen(false); }
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const isActive = (to: string) => {
    const path = to.split("?")[0].split("#")[0];
    const exactOnly = ["/dashboard", "/sales-rep"];
    if (exactOnly.includes(path)) return location.pathname === path;
    return location.pathname === path || location.pathname.startsWith(path + "/");
  };

  const fmt = (v: string) =>
    new Intl.DateTimeFormat("en-US", {
      month: "short", day: "numeric",
      hour: "numeric", minute: "2-digit",
    }).format(new Date(v));

  return (
    <div className="app-root">
      {/* ── Sidebar overlay (mobile) ── */}
      <div
        className={`sidebar-overlay${sidebarOpen ? " sidebar-overlay--visible" : ""}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* ── SIDEBAR ── */}
      <aside className={`app-sidebar${sidebarOpen ? " app-sidebar--mobile-open" : ""}`}>
        {/* Brand */}
        <div className="app-sidebar__brand">
          <img src={logo} alt="Plasticon" className="app-sidebar__logo" />
          <div className="app-sidebar__brand-text">
            <span className="app-sidebar__brand-name">Plasticon</span>
            <span className="app-sidebar__brand-sub">{isAr ? "إدارة المصنع" : "Factory Management"}</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="app-sidebar__nav">
          {sectionsBi.map((section) => (
            <div key={section.label.en}>
              <p className="app-sidebar__section-label">
                {isAr ? section.label.ar : section.label.en}
              </p>
              {section.items.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`app-sidebar__link${isActive(item.to) ? " app-sidebar__link--active" : ""}`}
                >
                  <span className="app-sidebar__link-icon">{item.icon}</span>
                  <span className="app-sidebar__link-label">
                    {isAr ? item.label.ar : item.label.en}
                  </span>
                  {item.to === "/admin/registration-requests" && pendingRequests > 0 && (
                    <span style={{ marginInlineStart: "auto", background: "var(--orange-500,#f97316)", color: "#fff", fontSize: ".6rem", fontWeight: 800, borderRadius: 999, minWidth: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 4px" }}>
                      {pendingRequests > 9 ? "9+" : pendingRequests}
                    </span>
                  )}
                  {isActive(item.to) && (
                    <ChevronRight size={14} style={{ marginInlineStart: item.to === "/admin/registration-requests" ? ".25rem" : "auto", opacity: 0.5 }} />
                  )}
                </Link>
              ))}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="app-sidebar__footer">
          <div className="app-sidebar__user">
            <div className="app-sidebar__user-avatar">
              {initials(user?.name ?? "U")}
            </div>
            <div className="app-sidebar__user-info">
              <p className="app-sidebar__user-name">{user?.name ?? "User"}</p>
              <p className="app-sidebar__user-role">{roleLabel(role, locale)}</p>
            </div>
          </div>

          <button
            className="app-sidebar__signout"
            onClick={() => { signOut(); navigate("/login"); }}
          >
            <LogOut size={15} />
            <span>{isAr ? "تسجيل الخروج" : "Sign Out"}</span>
          </button>
        </div>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <div className="app-content">
        {/* Topbar */}
        <header className="app-topbar">
          {/* Mobile menu toggle */}
          <button
            className="btn btn--ghost btn--icon sidebar-toggle-btn"
            id="sidebar-toggle"
            onClick={() => setSidebarOpen((v) => !v)}
            aria-label="Toggle sidebar"
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          {/* Search */}
          <div className="topbar-search" ref={searchRef}>
            <Search size={15} className="topbar-search__icon" />
            <input
              className="topbar-search__input"
              placeholder={locale === "ar" ? "بحث سريع..." : "Quick search..."}
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setSearchOpen(true); }}
              onFocus={() => setSearchOpen(true)}
              aria-label="Search"
            />
            {searchOpen && (
              <div className="topbar-search__dropdown">
                {filteredSearch.length > 0 ? filteredSearch.map((item) => (
                  <button
                    key={item.to}
                    className="topbar-search__item"
                    type="button"
                    onClick={() => { navigate(item.to); setSearchQuery(""); setSearchOpen(false); }}
                  >
                    <span>{locale === "ar" ? item.labelAr : item.labelEn}</span>
                    <span style={{ fontSize: ".72rem", color: "var(--text-secondary)", opacity: .7 }}>{item.to}</span>
                  </button>
                )) : (
                  <div style={{ padding: ".75rem 1rem", fontSize: ".84rem", color: "var(--text-secondary)" }}>
                    {locale === "ar" ? "لا نتائج" : "No results"}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="app-topbar__actions">
            {/* Date & time */}
            <DateTimeBadge />

            {/* Locale switch */}
            <div className="locale-switch-topbar">
              <button
                type="button"
                className={`locale-switch-topbar__btn${locale === "en" ? " locale-switch-topbar__btn--active" : ""}`}
                onClick={() => setLocale("en")}
              >EN</button>
              <button
                type="button"
                className={`locale-switch-topbar__btn${locale === "ar" ? " locale-switch-topbar__btn--active" : ""}`}
                onClick={() => setLocale("ar")}
              >ع</button>
            </div>

            {/* Dark mode toggle */}
            <button
              type="button"
              className="topbar-theme-btn"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              aria-label="Toggle dark mode"
              title={theme === "dark"
                ? (isAr ? "الوضع الفاتح" : "Switch to light mode")
                : (isAr ? "الوضع الداكن" : "Switch to dark mode")}
            >
              {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
              <span className="topbar-theme-btn__label">
                {theme === "dark" ? (isAr ? "فاتح" : "Light") : (isAr ? "داكن" : "Dark")}
              </span>
            </button>
            {/* Notifications */}
            <div style={{ position: "relative" }} ref={notifRef}>
              <button
                className="btn btn--ghost btn--icon"
                style={{ position: "relative" }}
                onClick={() => setNotifOpen((v) => !v)}
                aria-label="Notifications"
              >
                <Bell size={19} />
                {unread > 0 && (
                  <span
                    style={{
                      position: "absolute",
                      top: "-2px",
                      right: "-2px",
                      background: "var(--orange-500)",
                      color: "#fff",
                      fontSize: ".62rem",
                      fontWeight: 700,
                      borderRadius: "999px",
                      minWidth: "16px",
                      height: "16px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: "0 3px",
                    }}
                  >
                    {unread > 9 ? "9+" : unread}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div
                  style={{
                    position: "absolute",
                    right: 0,
                    top: "calc(100% + 8px)",
                    width: "340px",
                    maxWidth: "calc(100vw - 1rem)",
                    background: "var(--bg-card)",
                    border: "1px solid var(--border-default)",
                    borderRadius: "var(--radius-xl)",
                    boxShadow: "var(--shadow-lg)",
                    zIndex: 50,
                  }}
                >
                  <div
                    style={{
                      padding: ".875rem 1rem",
                      borderBottom: "1px solid var(--border-default)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <div>
                      <p style={{ margin: 0, fontSize: ".88rem", fontWeight: 700, color: "var(--text-primary)" }}>
                        {isAr ? "الإشعارات" : "Notifications"}
                      </p>
                      <p style={{ margin: 0, fontSize: ".75rem", color: "var(--text-secondary)" }}>
                        {unread > 0
                          ? isAr ? `${unread} غير مقروء` : `${unread} unread`
                          : isAr ? "لا يوجد جديد" : "All caught up"}
                      </p>
                    </div>
                    <button
                      className="btn btn--ghost btn--sm"
                      onClick={() => { setNotifOpen(false); navigate("/notifications"); }}
                    >
                      {isAr ? "عرض الكل" : "View all"}
                    </button>
                  </div>

                  <div style={{ padding: ".75rem", display: "flex", flexDirection: "column", gap: ".5rem", maxHeight: "380px", overflowY: "auto" }}>
                    {notifLoading ? (
                      <div style={{ padding: "1.5rem", textAlign: "center" }}>
                        <div className="spinner" style={{ margin: "0 auto" }} />
                      </div>
                    ) : notifications.length > 0 ? (
                      notifications.slice(0, 6).map((n) => (
                        <button
                          key={n.id}
                          type="button"
                          className={`notif-item${!n.isRead ? " notif-item--unread" : ""}`}
                          onClick={() => { setNotifOpen(false); navigate("/notifications"); }}
                        >
                          <span className="notif-dot" style={{ marginTop: "4px", flexShrink: 0 }} />
                          <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
                            <p style={{ margin: 0, fontSize: ".82rem", fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {n.title}
                            </p>
                            <p style={{ margin: "2px 0 0", fontSize: ".77rem", color: "var(--text-secondary)", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                              {n.message}
                            </p>
                            <p style={{ margin: "4px 0 0", fontSize: ".7rem", color: "var(--gray-400)" }}>
                              {fmt(n.createdAt)}
                            </p>
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="empty-state" style={{ padding: "1.5rem" }}>
                        <Bell size={28} style={{ color: "var(--gray-300)" }} />
                        <p className="empty-state__title" style={{ fontSize: ".88rem" }}>{isAr ? "لا توجد إشعارات" : "No notifications"}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User avatar → profile */}
            <Link
              to="/profile"
              title={isAr ? "الملف الشخصي" : "My Profile"}
              style={{
                width: "34px",
                height: "34px",
                borderRadius: "50%",
                background: "var(--blue-800)",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: ".72rem",
                fontWeight: 700,
                border: "2px solid var(--border-default)",
                textDecoration: "none",
                flexShrink: 0,
                cursor: "pointer",
                overflow: "hidden",
              }}
            >
              {initials(user?.name ?? "U")}
            </Link>
          </div>
        </header>

        {/* Profile completion banner */}
        {user && !user.profileCompleted && (
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: ".65rem 1.25rem",
            background: "linear-gradient(90deg, rgba(249,115,22,.12), rgba(251,191,36,.1))",
            borderBottom: "1px solid rgba(249,115,22,.2)",
            gap: "1rem", flexWrap: "wrap",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: ".6rem", fontSize: ".84rem" }}>
              <span style={{ fontSize: "1rem" }}>👋</span>
              <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                {isAr ? "أكمل ملفك الشخصي" : "Complete your profile"}
              </span>
              <span style={{ color: "var(--text-secondary)" }}>
                {isAr
                  ? "— أضف معلوماتك الشخصية وصورتك ووثائقك لمساعدة فريقك على التعرف عليك."
                  : "— Add your personal info, photo, and documents to help your team know you better."}
              </span>
            </div>
            <Link
              to="/profile"
              style={{
                padding: ".35rem .9rem", borderRadius: 8,
                background: "var(--orange-500, #f97316)", color: "#fff",
                textDecoration: "none", fontSize: ".8rem", fontWeight: 700,
                whiteSpace: "nowrap", flexShrink: 0,
              }}
            >
              {isAr ? "أكمل الآن ←" : "Complete Now →"}
            </Link>
          </div>
        )}

        {/* Page content */}
        <main className="app-page">{children}</main>
      </div>

      {/* Mobile sidebar toggle (always visible on small screens via CSS) */}
      <style>{`
        @media (max-width: 1024px) {
          #sidebar-toggle { display: flex !important; }
        }
      `}</style>
    </div>
  );
}
