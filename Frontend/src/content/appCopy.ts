import type { Locale } from "./authCopy";

type AppCopy = {
  appName: string;
  refresh: string;
  refreshAll: string;
  load: string;
  save: string;
  delete: string;
  signOut: string;
  backToDashboard: string;
  commandCenterLabel: string;
  dashboard: {
    title: string;
    subtitle: string;
    inventory: string;
    production: string;
    reports: string;
    notifications: string;
    adminPanel: string;
    adminShortcutsTitle: string;
    adminShortcutsSubtitle: string;
    settingsShortcut: string;
    userFallback: string;
    emailFallback: string;
    roleFallback: string;
    workspaceStatusLabel: string;
    workspaceStatusValue: string;
    activityLabel: string;
    activityValue: string;
    kpiQualityLabel: string;
    kpiQualityValue: string;
    kpiThroughputLabel: string;
    kpiThroughputValue: string;
  };
  admin: {
    title: string;
    subtitle: string;
    usersTab: string;
    attendanceTab: string;
    payrollTab: string;
    productionTab: string;
    systemTab: string;
    settingsOverviewTab: string;
    shiftsTab: string;
    machinesTab: string;
    auditLogsTab: string;
    dashboardTab: string;
    chatTab: string;
    usersTitle: string;
    attendanceTitle: string;
    payrollTitle: string;
    productionTitle: string;
    systemTitle: string;
    loadingUsers: string;
    loadingAttendance: string;
    loadingPayroll: string;
    loadingProduction: string;
    loadingSystem: string;
    loadingShifts: string;
    loadingMachines: string;
    loadingAuditLogs: string;
    loadingDashboard: string;
    noShifts: string;
    noMachines: string;
    noPayrolls: string;
    noAuditLogs: string;
    addNewMachine: string;
    shiftStart: string;
    shiftEnd: string;
    machineType: string;
    machineStatus: string;
    auditEntity: string;
    auditAction: string;
    totalUsers: string;
    activeUsers: string;
    totalMachines: string;
    operationalMachines: string;
    totalShifts: string;
    todayTotalHours: string;
    thisMonthPayroll: string;
    productionToday: string;
    inventoryItems: string;
    lowStockItems: string;
    openChat: string;
    chatTabDescription: string;
    addNewUser: string;
    id: string;
    name: string;
    username: string;
    email: string;
    role: string;
    status: string;
    actions: string;
    active: string;
    deleted: string;
    inactive: string;
    saveChanges: string;
    productionPiecesPerCarton: string;
    qualityCheckIntervalMinutes: string;
    qualityCheckReminderMinutes: string;
    inventoryAuditFrequency: string;
    shiftEndReminderMinutes: string;
    weeklyReportDayOfWeek: string;
    weeklyReportTime: string;
    monthlyReportDayOfMonth: string;
    monthlyReportTime: string;
    systemSettingLoaded: string;
    dateFrom: string;
    dateTo: string;
    clearFilters: string;
    reportPeriod: string;
    recordsShown: string;
    recordsInRange: string;
    presentEmployees: string;
    absentEmployees: string;
    totalLateMinutes: string;
    totalOvertimeMinutes: string;
    totalHours: string;
    overtimeHours: string;
    workedHours: string;
    baseSalary: string;
    overtimeSalary: string;
    totalPayout: string;
    calculatedAt: string;
    exportPdf: string;
    edit: string;
    cancel: string;
    checkInLabel: string;
    checkOutLabel: string;
    attendanceReportTitle: string;
    payrollReportTitle: string;
    employeeReport: string;
    userUpdated: string;
    userUpdateFailed: string;
    deleteUserConfirm: string;
    deleteUserFailed: string;
    roleLabels: {
      ADMIN: string;
      ENGINEER: string;
      ACCOUNTANT: string;
      WORKER: string;
    };
    productTypeLabels: {
      CAPS: string;
      PREFORM: string;
    };
    auditFrequencyLabels: {
      DAILY: string;
      WEEKLY: string;
      MONTHLY: string;
    };
  };
  inventory: {
    title: string;
    subtitle: string;
    createTransaction: string;
    material: string;
    selectMaterial: string;
    type: string;
    quantity: string;
    referenceType: string;
    referenceId: string;
    saveTransaction: string;
    rawMaterialsStock: string;
    allTransactions: string;
    myTransactions: string;
    loadingMaterials: string;
    loadingTransactions: string;
    lastTransaction: string;
    noTransactions: string;
    totalMaterials: string;
    totalTransactions: string;
    transactionTypeLabels: {
      IN: string;
      OUT: string;
    };
    referenceTypeLabels: {
      PRODUCTION: string;
      ADJUSTMENT: string;
      MANUAL: string;
      OTHER: string;
    };
  };
  production: {
    title: string;
    subtitle: string;
    newEntry: string;
    productionDate: string;
    shiftId: string;
    machineId: string;
    cartons: string;
    notes: string;
    saveProduction: string;
    myRecords: string;
    allRecords: string;
    loading: string;
    totalMine: string;
    totalAll: string;
  };
  reports: {
    title: string;
    subtitle: string;
    summaryLabel: string;
    dailyProduction: string;
    weeklyProduction: string;
    monthlySales: string;
    yearlySales: string;
    inventorySnapshot: string;
    week: string;
    day: string;
    month: string;
    year: string;
    period: string;
    generatedAt: string;
    threshold: string;
    load: string;
    downloadPdf: string;
    pdfNoData: string;
    pdfDownloadFailed: string;
    adminNotice: string;
    loadingWeekly: string;
    loadingDaily: string;
    loadingMonthly: string;
    loadingYearly: string;
    loadingInventory: string;
    loadingInventoryActivity: string;
    loadingAttendanceActivity: string;
    loadingPayrollActivity: string;
    inventoryActivity: string;
    attendanceActivity: string;
    payrollActivity: string;
    noReport: string;
    loaded: string;
    yes: string;
    no: string;
    items: string;
  };
  notifications: {
    title: string;
    subtitle: string;
    summaryLabel: string;
    inbox: string;
    unread: string;
    markAllRead: string;
    loading: string;
    read: string;
    unreadStatus: string;
    markRead: string;
    createNotification: string;
    type: string;
    titleLabel: string;
    messageLabel: string;
    targetUserId: string;
    createButton: string;
    success: string;
    totalNotifications: string;
    noNotifications: string;
  };
};

export const appCopy: Record<Locale, AppCopy> = {
  en: {
    appName: "Plasticon",
    refresh: "Refresh",
    refreshAll: "Refresh all",
    load: "Load",
    save: "Save",
    delete: "Delete",
    signOut: "Sign out",
    backToDashboard: "Back to dashboard",
    commandCenterLabel: "Smart Factory Management System",
    dashboard: {
      title: "Operations Dashboard",
      subtitle:
        "A live overview of production, inventory, reports, and notifications.",
      inventory: "Inventory",
      production: "Production",
      reports: "Reports",
      notifications: "Notifications",
      adminPanel: "Open Admin Panel",
      adminShortcutsTitle: "Admin shortcuts",
      adminShortcutsSubtitle:
        "Jump directly to the admin areas that matter most.",
      settingsShortcut: "Settings",
      userFallback: "User",
      emailFallback: "user@example.com",
      roleFallback: "Role pending from backend",
      workspaceStatusLabel: "Workspace status",
      workspaceStatusValue: "Live, protected, bilingual",
      activityLabel: "Platform health",
      activityValue: "Connected and ready",
      kpiQualityLabel: "Quality cadence",
      kpiQualityValue: "Checks every 2 hours",
      kpiThroughputLabel: "Production rhythm",
      kpiThroughputValue: "Shifts operating normally",
    },
    admin: {
      title: "Admin Control Center",
      subtitle: "Manage users and global settings from one panel.",
      usersTab: "Users",
      attendanceTab: "Attendance & Absence",
      payrollTab: "Payroll",
      productionTab: "Production Settings",
      systemTab: "System Settings",
      settingsOverviewTab: "Settings Overview",
      shiftsTab: "Shifts",
      machinesTab: "Machines",
      auditLogsTab: "Audit Logs",
      dashboardTab: "Dashboard Analytics",
      chatTab: "Chat",
      usersTitle: "Users",
      attendanceTitle: "Attendance & Absence",
      payrollTitle: "Payroll",
      productionTitle: "Production settings",
      systemTitle: "System settings",
      loadingUsers: "Loading users...",
      loadingAttendance: "Loading attendance...",
      loadingPayroll: "Loading payroll...",
      loadingProduction: "Loading production settings...",
      loadingSystem: "Loading system settings...",
      loadingShifts: "Loading shifts...",
      loadingMachines: "Loading machines...",
      loadingAuditLogs: "Loading audit logs...",
      loadingDashboard: "Loading dashboard analytics...",
      noShifts: "No shifts available",
      noMachines: "No machines available",
      noPayrolls: "No payroll records",
      noAuditLogs: "No audit logs found",
      addNewMachine: "Add Machine",
      shiftStart: "Start",
      shiftEnd: "End",
      machineType: "Type",
      machineStatus: "Status",
      auditEntity: "Entity",
      auditAction: "Action",
      totalUsers: "Total users",
      activeUsers: "Active users",
      totalMachines: "Total machines",
      operationalMachines: "Operational machines",
      totalShifts: "Total shifts",
      todayTotalHours: "Today's total hours",
      thisMonthPayroll: "This month payroll",
      productionToday: "Production today",
      inventoryItems: "Inventory items",
      lowStockItems: "Low stock items",
      openChat: "Open chat",
      chatTabDescription: "Use this tab to access the internal chat module.",
      addNewUser: "Add New User",
      id: "ID",
      name: "Name",
      username: "Username",
      email: "Email",
      role: "Role",
      status: "Status",
      actions: "Actions",
      active: "Active",
      deleted: "Deleted",
      inactive: "Inactive",
      saveChanges: "Save",
      productionPiecesPerCarton: "Pieces per carton",
      qualityCheckIntervalMinutes: "Quality check interval (minutes)",
      qualityCheckReminderMinutes: "Quality check reminder (minutes)",
      inventoryAuditFrequency: "Inventory audit frequency",
      shiftEndReminderMinutes: "Shift end reminder (minutes)",
      weeklyReportDayOfWeek: "Weekly report day (1-7)",
      weeklyReportTime: "Weekly report time (HH:mm)",
      monthlyReportDayOfMonth: "Monthly report day (1-31)",
      monthlyReportTime: "Monthly report time (HH:mm)",
      systemSettingLoaded: "Last loaded system setting ID",
      dateFrom: "From date",
      dateTo: "To date",
      clearFilters: "Clear filters",
      reportPeriod: "Report period",
      recordsShown: "Records shown",
      recordsInRange: "Records in range",
      presentEmployees: "Employees present",
      absentEmployees: "Employees absent",
      totalLateMinutes: "Total late minutes",
      totalOvertimeMinutes: "Total overtime minutes",
      totalHours: "Total hours",
      overtimeHours: "Overtime hours",
      workedHours: "Worked hours",
      baseSalary: "Base salary",
      overtimeSalary: "Overtime salary",
      totalPayout: "Total payout",
      calculatedAt: "Calculated at",
      exportPdf: "Export PDF",
      edit: "Edit",
      cancel: "Cancel",
      checkInLabel: "Check in",
      checkOutLabel: "Check out",
      attendanceReportTitle: "Attendance report",
      payrollReportTitle: "Payroll report",
      employeeReport: "Employee report",
      userUpdated: "User updated successfully",
      userUpdateFailed: "Failed to update user",
      deleteUserConfirm: "Are you sure you want to delete this user?",
      deleteUserFailed: "Failed to delete user",
      roleLabels: {
        ADMIN: "Admin",
        ENGINEER: "Engineer",
        ACCOUNTANT: "Accountant",
        WORKER: "Worker",
      },
      productTypeLabels: {
        CAPS: "Caps",
        PREFORM: "Preform",
      },
      auditFrequencyLabels: {
        DAILY: "Daily",
        WEEKLY: "Weekly",
        MONTHLY: "Monthly",
      },
    },
    inventory: {
      title: "Inventory Control",
      subtitle: "Track raw materials and create IN/OUT transactions.",
      createTransaction: "Create transaction",
      material: "Material",
      selectMaterial: "Select material",
      type: "Type",
      quantity: "Quantity",
      referenceType: "Reference type",
      referenceId: "Reference ID (optional)",
      saveTransaction: "Save transaction",
      rawMaterialsStock: "Raw materials stock",
      allTransactions: "All transactions",
      myTransactions: "My transactions",
      loadingMaterials: "Loading materials...",
      loadingTransactions: "Loading transactions...",
      lastTransaction: "Last",
      noTransactions: "No transactions",
      totalMaterials: "Materials",
      totalTransactions: "Transactions",
      transactionTypeLabels: {
        IN: "IN",
        OUT: "OUT",
      },
      referenceTypeLabels: {
        PRODUCTION: "Production",
        ADJUSTMENT: "Adjustment",
        MANUAL: "Manual",
        OTHER: "Other",
      },
    },
    production: {
      title: "Production",
      subtitle: "Log daily output and review your own production records.",
      newEntry: "New production entry",
      productionDate: "Production date",
      shiftId: "Shift ID",
      machineId: "Machine ID",
      cartons: "Cartons",
      notes: "Notes",
      saveProduction: "Save production",
      myRecords: "My production records",
      allRecords: "All production records",
      loading: "Loading production data...",
      totalMine: "My records",
      totalAll: "All records",
    },
    reports: {
      title: "Reports",
      subtitle:
        "Inspect production, sales, and inventory indicators from one place.",
      summaryLabel: "Reporting hub",
      dailyProduction: "Daily production",
      weeklyProduction: "Weekly production",
      monthlySales: "Monthly sales",
      yearlySales: "Yearly sales",
      inventorySnapshot: "Inventory snapshot",
      inventoryActivity: "Inventory activity",
      attendanceActivity: "Attendance & Absence",
      payrollActivity: "Payroll activity",
      week: "Week",
      day: "Day",
      month: "Month",
      year: "Year",
      period: "Period",
      generatedAt: "Generated at",
      threshold: "Threshold",
      load: "Load",
      downloadPdf: "Download PDF",
      pdfNoData: "Load report data first before downloading PDF.",
      pdfDownloadFailed: "Failed to generate PDF report.",
      adminNotice: "This area is intended for accountant and admin users.",
      loadingDaily: "Loading daily production report...",
      loadingWeekly: "Loading weekly production report...",
      loadingMonthly: "Loading monthly sales report...",
      loadingYearly: "Loading yearly sales report...",
      loadingInventory: "Loading inventory snapshot...",
      loadingInventoryActivity: "Loading inventory activity report...",
      loadingAttendanceActivity: "Loading attendance report...",
      loadingPayrollActivity: "Loading payroll report...",
      noReport: "No report loaded yet.",
      loaded: "Loaded",
      yes: "Yes",
      no: "No",
      items: "items",
    },
    notifications: {
      title: "Notifications",
      subtitle:
        "Review alerts, mark them as read, and broadcast system notices if you are an admin.",
      summaryLabel: "Notification center",
      inbox: "Inbox",
      unread: "Unread",
      markAllRead: "Mark all read",
      loading: "Loading notifications...",
      read: "Read",
      unreadStatus: "Unread",
      markRead: "Mark read",
      createNotification: "Create notification",
      type: "Type",
      titleLabel: "Title",
      messageLabel: "Message",
      targetUserId: "Target user ID (optional)",
      createButton: "Create notification",
      success: "Notification created successfully.",
      totalNotifications: "Notifications",
      noNotifications: "No notifications yet.",
    },
  },
  ar: {
    appName: "بلاستيكون",
    refresh: "تحديث",
    refreshAll: "تحديث الكل",
    load: "تحميل",
    save: "حفظ",
    delete: "حذف",
    signOut: "تسجيل الخروج",
    backToDashboard: "العودة للوحة الرئيسية",
    commandCenterLabel: "مركز قيادة ERP",
    dashboard: {
      title: "لوحة العمليات",
      subtitle: "نظرة مباشرة على الإنتاج والمخزون والتقارير والإشعارات.",
      inventory: "المخزون",
      production: "الإنتاج",
      reports: "التقارير",
      notifications: "الإشعارات",
      adminPanel: "فتح لوحة المدير",
      adminShortcutsTitle: "اختصارات الأدمن",
      adminShortcutsSubtitle: "انتقل مباشرة إلى أقسام الإدارة الأكثر أهمية.",
      settingsShortcut: "الإعدادات",
      userFallback: "مستخدم",
      emailFallback: "user@example.com",
      roleFallback: "الدور قيد الإعداد من الباك إند",
      workspaceStatusLabel: "حالة مساحة العمل",
      workspaceStatusValue: "مباشر، محمي، ثنائي اللغة",
      activityLabel: "حالة المنصة",
      activityValue: "متصل وجاهز",
      kpiQualityLabel: "إيقاع الجودة",
      kpiQualityValue: "فحص كل ساعتين",
      kpiThroughputLabel: "وتيرة الإنتاج",
      kpiThroughputValue: "الشفتات تعمل بشكل طبيعي",
    },
    admin: {
      title: "مركز التحكم الإداري",
      subtitle: "إدارة المستخدمين والإعدادات العامة من لوحة واحدة.",
      usersTab: "المستخدمون",
      attendanceTab: "الحضور والغياب",
      payrollTab: "الرواتب",
      productionTab: "إعدادات الإنتاج",
      systemTab: "إعدادات النظام",
      settingsOverviewTab: "ملخص الإعدادات",
      shiftsTab: "الشفتات",
      machinesTab: "الماكينات",
      auditLogsTab: "سجل التدقيق",
      dashboardTab: "لوحة التحليلات",
      chatTab: "الدردشة",
      usersTitle: "المستخدمون",
      attendanceTitle: "الحضور والغياب",
      payrollTitle: "الرواتب",
      productionTitle: "إعدادات الإنتاج",
      systemTitle: "إعدادات النظام",
      loadingUsers: "جارٍ تحميل المستخدمين...",
      loadingAttendance: "جارٍ تحميل الحضور...",
      loadingPayroll: "جارٍ تحميل الرواتب...",
      loadingProduction: "جارٍ تحميل إعدادات الإنتاج...",
      loadingSystem: "جارٍ تحميل إعدادات النظام...",
      loadingShifts: "جارٍ تحميل الشفتات...",
      loadingMachines: "جارٍ تحميل الماكينات...",
      loadingAuditLogs: "جارٍ تحميل سجل التدقيق...",
      loadingDashboard: "جارٍ تحميل تحليلات اللوحة...",
      noShifts: "لا توجد شفتات",
      noMachines: "لا توجد ماكينات",
      noPayrolls: "لا توجد سجلات رواتب",
      noAuditLogs: "لا توجد سجلات تدقيق",
      addNewMachine: "إضافة ماكينة",
      shiftStart: "بداية",
      shiftEnd: "نهاية",
      machineType: "النوع",
      machineStatus: "الحالة",
      auditEntity: "الكيان",
      auditAction: "الإجراء",
      totalUsers: "إجمالي المستخدمين",
      activeUsers: "المستخدمون النشطون",
      totalMachines: "إجمالي الماكينات",
      operationalMachines: "الماكينات التشغيلية",
      totalShifts: "إجمالي الشفتات",
      todayTotalHours: "إجمالي ساعات اليوم",
      thisMonthPayroll: "رواتب هذا الشهر",
      productionToday: "إنتاج اليوم",
      inventoryItems: "عناصر المخزون",
      lowStockItems: "عناصر منخفضة المخزون",
      openChat: "فتح الدردشة",
      chatTabDescription:
        "استخدم هذا التبويب للوصول إلى وحدة الدردشة الداخلية.",
      addNewUser: "إضافة مستخدم جديد",
      id: "الرقم",
      name: "الاسم",
      username: "اسم المستخدم",
      email: "البريد الإلكتروني",
      role: "الدور",
      status: "الحالة",
      actions: "الإجراءات",
      active: "نشط",
      deleted: "محذوف",
      inactive: "غير نشط",
      saveChanges: "حفظ",
      productionPiecesPerCarton: "عدد القطع في الكرتونة",
      qualityCheckIntervalMinutes: "فاصل فحص الجودة (بالدقائق)",
      qualityCheckReminderMinutes: "تذكير فحص الجودة (بالدقائق)",
      inventoryAuditFrequency: "تكرار جرد المخزون",
      shiftEndReminderMinutes: "تذكير نهاية الشفت (بالدقائق)",
      weeklyReportDayOfWeek: "يوم التقرير الأسبوعي (1-7)",
      weeklyReportTime: "وقت التقرير الأسبوعي (HH:mm)",
      monthlyReportDayOfMonth: "يوم التقرير الشهري (1-31)",
      monthlyReportTime: "وقت التقرير الشهري (HH:mm)",
      systemSettingLoaded: "آخر إعداد نظام تم تحميله، المعرف",
      dateFrom: "من تاريخ",
      dateTo: "إلى تاريخ",
      clearFilters: "مسح الفلاتر",
      reportPeriod: "فترة التقرير",
      recordsShown: "السجلات الظاهرة",
      recordsInRange: "السجلات ضمن النطاق",
      presentEmployees: "الموظفون الحاضرون",
      absentEmployees: "الموظفون الغائبون",
      totalLateMinutes: "إجمالي دقائق التأخير",
      totalOvertimeMinutes: "إجمالي دقائق الإضافي",
      totalHours: "إجمالي الساعات",
      overtimeHours: "ساعات الإضافي",
      workedHours: "ساعات العمل",
      baseSalary: "الراتب الأساسي",
      overtimeSalary: "بدل الإضافي",
      totalPayout: "إجمالي المدفوعات",
      calculatedAt: "تم الحساب عند",
      exportPdf: "تصدير PDF",
      edit: "تعديل",
      cancel: "إلغاء",
      checkInLabel: "وقت الدخول",
      checkOutLabel: "وقت الخروج",
      attendanceReportTitle: "تقرير الحضور",
      payrollReportTitle: "تقرير الرواتب",
      employeeReport: "تقرير الموظف",
      userUpdated: "تم تحديث المستخدم بنجاح",
      userUpdateFailed: "فشل تحديث المستخدم",
      deleteUserConfirm: "هل أنت متأكد أنك تريد حذف هذا المستخدم؟",
      deleteUserFailed: "فشل حذف المستخدم",
      roleLabels: {
        ADMIN: "مدير",
        ENGINEER: "مهندس",
        ACCOUNTANT: "محاسب",
        WORKER: "عامل",
      },
      productTypeLabels: {
        CAPS: "أغطية",
        PREFORM: "بريفورم",
      },
      auditFrequencyLabels: {
        DAILY: "يومي",
        WEEKLY: "أسبوعي",
        MONTHLY: "شهري",
      },
    },
    inventory: {
      title: "التحكم بالمخزون",
      subtitle: "تابع المواد الخام وأنشئ حركات IN/OUT بسهولة.",
      createTransaction: "إنشاء حركة",
      material: "المادة",
      selectMaterial: "اختر المادة",
      type: "النوع",
      quantity: "الكمية",
      referenceType: "نوع المرجع",
      referenceId: "معرّف المرجع (اختياري)",
      saveTransaction: "حفظ الحركة",
      rawMaterialsStock: "مخزون المواد الخام",
      allTransactions: "كل الحركات",
      myTransactions: "حركاتي",
      loadingMaterials: "جارٍ تحميل المواد...",
      loadingTransactions: "جارٍ تحميل الحركات...",
      lastTransaction: "آخر حركة",
      noTransactions: "لا توجد حركات",
      totalMaterials: "المواد",
      totalTransactions: "الحركات",
      transactionTypeLabels: {
        IN: "إدخال",
        OUT: "إخراج",
      },
      referenceTypeLabels: {
        PRODUCTION: "إنتاج",
        ADJUSTMENT: "تسوية",
        MANUAL: "يدوي",
        OTHER: "أخرى",
      },
    },
    production: {
      title: "الإنتاج",
      subtitle: "سجّل الإنتاج اليومي وراجع السجلات الخاصة بك.",
      newEntry: "إدخال إنتاج جديد",
      productionDate: "تاريخ الإنتاج",
      shiftId: "معرّف الشفت",
      machineId: "معرّف الماكينة",
      cartons: "الكرتونات",
      notes: "ملاحظات",
      saveProduction: "حفظ الإنتاج",
      myRecords: "سجلاتي",
      allRecords: "كل سجلات الإنتاج",
      loading: "جارٍ تحميل بيانات الإنتاج...",
      totalMine: "سجلاتي",
      totalAll: "كل السجلات",
    },
    reports: {
      title: "التقارير",
      subtitle: "اعرض مؤشرات الإنتاج والمبيعات والمخزون من مكان واحد.",
      summaryLabel: "مركز التقارير",
      dailyProduction: "الإنتاج اليومي",
      weeklyProduction: "الإنتاج الأسبوعي",
      monthlySales: "المبيعات الشهرية",
      yearlySales: "المبيعات السنوية",
      inventoryActivity: "حركة المخزون",
      attendanceActivity: "الحضور والغياب",
      payrollActivity: "الرواتب",
      inventorySnapshot: "لقطة المخزون",
      week: "الأسبوع",
      day: "اليوم",
      month: "الشهر",
      year: "السنة",
      period: "الفترة",
      generatedAt: "تم الإنشاء عند",
      threshold: "الحد",
      load: "تحميل",
      downloadPdf: "تنزيل PDF",
      pdfNoData: "حمّل بيانات التقرير أولاً قبل تنزيل ملف PDF.",
      pdfDownloadFailed: "فشل إنشاء تقرير PDF.",
      adminNotice: "هذه الصفحة مخصصة للمحاسب والمدير.",
      loadingDaily: "جارٍ تحميل تقرير الإنتاج اليومي...",
      loadingWeekly: "جارٍ تحميل تقرير الإنتاج الأسبوعي...",
      loadingMonthly: "جارٍ تحميل تقرير المبيعات الشهرية...",
      loadingYearly: "جارٍ تحميل تقرير المبيعات السنوية...",
      loadingInventory: "جارٍ تحميل لقطة المخزون...",
      loadingInventoryActivity: "جارٍ تحميل تقرير حركة المخزون...",
      loadingAttendanceActivity: "جارٍ تحميل تقرير الحضور...",
      loadingPayrollActivity: "جارٍ تحميل تقرير الرواتب...",
      noReport: "لا يوجد تقرير محمّل بعد.",
      loaded: "محمّل",
      yes: "نعم",
      no: "لا",
      items: "عناصر",
    },
    notifications: {
      title: "الإشعارات",
      subtitle:
        "راجع التنبيهات وعلّمها كمقروءة، وأرسل إشعارات للنظام إذا كنت مديرًا.",
      summaryLabel: "مركز الإشعارات",
      inbox: "الوارد",
      unread: "غير مقروء",
      markAllRead: "تعيين الكل كمقروء",
      loading: "جارٍ تحميل الإشعارات...",
      read: "مقروء",
      unreadStatus: "غير مقروء",
      markRead: "تعيين كمقروء",
      createNotification: "إنشاء إشعار",
      type: "النوع",
      titleLabel: "العنوان",
      messageLabel: "الرسالة",
      targetUserId: "معرّف المستخدم المستهدف (اختياري)",
      createButton: "إنشاء الإشعار",
      success: "تم إنشاء الإشعار بنجاح.",
      totalNotifications: "الإشعارات",
      noNotifications: "لا توجد إشعارات بعد.",
    },
  },
};
