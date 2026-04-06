export type Locale = "en" | "ar";

type AuthCopy = {
  appName: string;
  appTagline: string;
  heroTitle: string;
  heroDescription: string;
  heroFeatures: Array<{ icon: string; title: string; description: string }>;
  heroStats: Array<{ label: string; value: string }>;
  heroCta: string;
  loginTitle: string;
  loginSubtitle: string;
  registerTitle: string;
  registerSubtitle: string;
  emailLabel: string;
  passwordLabel: string;
  rememberMe: string;
  forgotPassword: string;
  loginButton: string;
  loginHint: string;
  registerButton: string;
  registerHint: string;
  fullNameLabel: string;
  usernameLabel: string;
  nationalIdLabel: string;
  roleLabel: string;
  phoneLabel: string;
  shiftLabel: string;
  profileImageLabel: string;
  confirmPasswordLabel: string;
  namePlaceholder: string;
  usernamePlaceholder: string;
  nationalIdPlaceholder: string;
  phonePlaceholder: string;
  emailPlaceholder: string;
  passwordPlaceholder: string;
  confirmPasswordPlaceholder: string;
  dashboardTitle: string;
  dashboardSubtitle: string;
  dashboardAdminPanel: string;
  dashboardInventory: string;
  dashboardProduction: string;
  dashboardReports: string;
  dashboardNotifications: string;
  dashboardUserFallback: string;
  dashboardEmailFallback: string;
  dashboardRoleFallback: string;
  backToDashboard: string;
  commandCenterLabel: string;
  workspaceStatusLabel: string;
  workspaceStatusValue: string;
  signOut: string;
  loginRouteLabel: string;
  registerRouteLabel: string;
  languageLabel: string;
  languageName: string;
  languageNameAlt: string;
  loginErrorPrefix: string;
  registerErrorPrefix: string;
  registerAdminRequired: string;
  registerRoleHintAdmin: string;
  registerRoleHintWorker: string;
  registerFieldErrorNationalId: string;
  registerFieldErrorUsername: string;
  registerFieldErrorPhone: string;
  registerFieldErrorShift: string;
  registerFieldErrorPassword: string;
  forgotTitle: string;
  forgotSubtitle: string;
  forgotSubmitButton: string;
  forgotSubmitting: string;
  forgotSuccessDefault: string;
  forgotBackHint: string;
  forgotBackAction: string;
  resetTitle: string;
  resetSubtitle: string;
  resetNewPasswordLabel: string;
  resetConfirmPasswordLabel: string;
  resetSubmitButton: string;
  resetSubmitting: string;
  resetMissingToken: string;
  resetMismatch: string;
  resetSuccessDefault: string;
  resetBackHint: string;
  resetBackAction: string;
  verifyTitle: string;
  verifyLoading: string;
  verifyMissingToken: string;
  verifySuccessDefault: string;
  verifyErrorDefault: string;
  verifyBackHint: string;
  verifyBackAction: string;
};

export const authCopy: Record<Locale, AuthCopy> = {
  en: {
    appName: "Plasticon",
    appTagline: "Manufacturing ERP for a smarter production floor.",
    heroTitle: "Run your factory smarter.",
    heroDescription: "Production, inventory, maintenance - fully connected.",
    heroFeatures: [
      {
        icon: "⚙️",
        title: "Production Tracking",
        description:
          "Monitor shifts, output, and machine activity in real time.",
      },
      {
        icon: "📦",
        title: "Inventory Management",
        description:
          "Track stock movement and raw material availability clearly.",
      },
      {
        icon: "🛠",
        title: "Maintenance System",
        description:
          "Log downtime, schedule interventions, and reduce disruptions.",
      },
      {
        icon: "👥",
        title: "Workforce Management",
        description:
          "Handle attendance, roles, and payroll workflows in one flow.",
      },
    ],
    heroStats: [
      { label: "15+ Modules", value: "Operations ready" },
      { label: "Role-based Access", value: "Admin controlled" },
      { label: "Real-time Alerts", value: "Chat + notifications" },
    ],
    heroCta: "Get Started",
    loginTitle: "Sign in",
    loginSubtitle: "Use your Plasticon account to continue.",
    registerTitle: "Create account",
    registerSubtitle: "Add a new team member or system user.",
    emailLabel: "Email address",
    passwordLabel: "Password",
    rememberMe: "Remember me",
    forgotPassword: "Forgot password?",
    loginButton: "Sign in",
    loginHint: "Secure access for your factory team.",
    registerButton: "Create account",
    registerHint: "This form is ready for admin onboarding.",
    fullNameLabel: "Full name",
    usernameLabel: "Username",
    nationalIdLabel: "National ID",
    roleLabel: "Role",
    phoneLabel: "Phone number",
    shiftLabel: "Shift",
    profileImageLabel: "Profile image",
    confirmPasswordLabel: "Confirm password",
    namePlaceholder: "Enter full name",
    usernamePlaceholder: "Choose a username",
    nationalIdPlaceholder: "Enter national ID",
    phonePlaceholder: "Enter phone number",
    emailPlaceholder: "Enter email address",
    passwordPlaceholder: "Enter password",
    confirmPasswordPlaceholder: "Repeat password",
    dashboardTitle: "Welcome to Plasticon",
    dashboardSubtitle: "Your auth layer is ready for the next backend step.",
    dashboardAdminPanel: "Open Admin Panel",
    dashboardInventory: "Inventory",
    dashboardProduction: "Production",
    dashboardReports: "Reports",
    dashboardNotifications: "Notifications",
    dashboardUserFallback: "User",
    dashboardEmailFallback: "user@example.com",
    dashboardRoleFallback: "Role pending from backend",
    backToDashboard: "Back to dashboard",
    commandCenterLabel: "ERP Command Center",
    workspaceStatusLabel: "Workspace status",
    workspaceStatusValue: "Live, protected, bilingual",
    signOut: "Sign out",
    loginRouteLabel: "Login",
    registerRouteLabel: "Register",
    languageLabel: "Language",
    languageName: "English",
    languageNameAlt: "Arabic",
    loginErrorPrefix: "Login failed",
    registerErrorPrefix: "Registration failed",
    registerAdminRequired:
      "Only an admin can create new accounts. Please sign in with an admin account first.",
    registerRoleHintAdmin: "Admin can assign role while creating accounts.",
    registerRoleHintWorker: "Role is locked to WORKER for non-admin users.",
    registerFieldErrorNationalId: "National ID must be exactly 9 digits.",
    registerFieldErrorUsername:
      "Username must be 3-30 characters and use only letters, numbers, or underscore.",
    registerFieldErrorPhone: "Phone number must be exactly 10 digits.",
    registerFieldErrorShift: "Shift must be a valid positive number.",
    registerFieldErrorPassword: "Password must be at least 8 characters.",
    forgotTitle: "Forgot password",
    forgotSubtitle: "Enter your email and we will send a reset link.",
    forgotSubmitButton: "Send reset link",
    forgotSubmitting: "Sending...",
    forgotSuccessDefault:
      "If your email exists, a reset link has been sent. Please check your inbox.",
    forgotBackHint: "Remember your password?",
    forgotBackAction: "Back to login",
    resetTitle: "Reset password",
    resetSubtitle: "Create a new password for your account.",
    resetNewPasswordLabel: "New password",
    resetConfirmPasswordLabel: "Confirm password",
    resetSubmitButton: "Reset password",
    resetSubmitting: "Resetting...",
    resetMissingToken: "Reset token is missing.",
    resetMismatch: "Passwords do not match.",
    resetSuccessDefault: "Password reset successfully.",
    resetBackHint: "Need to sign in?",
    resetBackAction: "Back to login",
    verifyTitle: "Email verification",
    verifyLoading: "Please wait...",
    verifyMissingToken: "Verification token is missing.",
    verifySuccessDefault: "Email verified successfully.",
    verifyErrorDefault: "Verification failed",
    verifyBackHint: "Continue to your account",
    verifyBackAction: "Go to login",
  },
  ar: {
    appName: "بلاستيكون",
    appTagline: "نظام ERP صناعي لإدارة المصنع بشكل أذكى.",
    heroTitle: "شغّل مصنعك بذكاء أعلى.",
    heroDescription: "الإنتاج، المخزون، الصيانة - مترابطة بالكامل.",
    heroFeatures: [
      {
        icon: "⚙️",
        title: "تتبع الإنتاج",
        description: "راقب الشفتات والمخرجات وحركة الماكينات بشكل مباشر.",
      },
      {
        icon: "📦",
        title: "إدارة المخزون",
        description: "تابع حركة المواد الخام والمخزون بوضوح.",
      },
      {
        icon: "🛠",
        title: "نظام الصيانة",
        description: "سجل الأعطال وخطط الصيانة وقلل التوقفات.",
      },
      {
        icon: "👥",
        title: "إدارة القوى العاملة",
        description: "نظّم الحضور والصلاحيات والرواتب من مكان واحد.",
      },
    ],
    heroStats: [
      { label: "15+ وحدة", value: "جاهز للتشغيل" },
      { label: "صلاحيات حسب الدور", value: "إدارة كاملة" },
      { label: "تنبيهات فورية", value: "دردشة + إشعارات" },
    ],
    heroCta: "ابدأ الآن",
    loginTitle: "تسجيل الدخول",
    loginSubtitle: "استخدم حساب Plasticon للمتابعة.",
    registerTitle: "إنشاء حساب",
    registerSubtitle: "أضف مستخدمًا جديدًا للفريق أو للنظام.",
    emailLabel: "البريد الإلكتروني",
    passwordLabel: "كلمة المرور",
    rememberMe: "تذكرني",
    forgotPassword: "نسيت كلمة المرور؟",
    loginButton: "دخول",
    loginHint: "وصول آمن لفريق المصنع.",
    registerButton: "إنشاء الحساب",
    registerHint: "هذه الصفحة جاهزة لإضافة المستخدمين من المدير.",
    fullNameLabel: "الاسم الكامل",
    usernameLabel: "اسم المستخدم",
    nationalIdLabel: "الرقم الوطني",
    roleLabel: "الدور",
    phoneLabel: "رقم الهاتف",
    shiftLabel: "الشفت",
    profileImageLabel: "صورة الملف الشخصي",
    confirmPasswordLabel: "تأكيد كلمة المرور",
    namePlaceholder: "أدخل الاسم الكامل",
    usernamePlaceholder: "اختر اسم المستخدم",
    nationalIdPlaceholder: "أدخل الرقم الوطني",
    phonePlaceholder: "أدخل رقم الهاتف",
    emailPlaceholder: "أدخل البريد الإلكتروني",
    passwordPlaceholder: "أدخل كلمة المرور",
    confirmPasswordPlaceholder: "أعد كتابة كلمة المرور",
    dashboardTitle: "مرحبًا بك في Plasticon",
    dashboardSubtitle: "طبقة الدخول جاهزة للخطوة التالية في الباك إند.",
    dashboardAdminPanel: "فتح لوحة المدير",
    dashboardInventory: "المخزون",
    dashboardProduction: "الإنتاج",
    dashboardReports: "التقارير",
    dashboardNotifications: "الإشعارات",
    dashboardUserFallback: "مستخدم",
    dashboardEmailFallback: "user@example.com",
    dashboardRoleFallback: "الدور قيد الإعداد من الباك إند",
    backToDashboard: "العودة للوحة الرئيسية",
    commandCenterLabel: "مركز قيادة ERP",
    workspaceStatusLabel: "حالة مساحة العمل",
    workspaceStatusValue: "مباشر، محمي، ثنائي اللغة",
    signOut: "تسجيل الخروج",
    loginRouteLabel: "دخول",
    registerRouteLabel: "تسجيل",
    languageLabel: "اللغة",
    languageName: "الإنجليزية",
    languageNameAlt: "العربية",
    loginErrorPrefix: "فشل تسجيل الدخول",
    registerErrorPrefix: "فشل التسجيل",
    registerAdminRequired:
      "فقط المدير يستطيع إنشاء حسابات جديدة. سجل دخول بحساب مدير أولاً.",
    registerRoleHintAdmin: "المدير يستطيع تحديد الدور أثناء إنشاء الحساب.",
    registerRoleHintWorker: "الدور مقفل على WORKER لغير المدير.",
    registerFieldErrorNationalId: "الرقم الوطني يجب أن يكون 9 أرقام فقط.",
    registerFieldErrorUsername:
      "اسم المستخدم يجب أن يكون من 3 إلى 30 حرفًا ويحتوي فقط على أحرف أو أرقام أو _.",
    registerFieldErrorPhone: "رقم الهاتف يجب أن يكون 10 أرقام فقط.",
    registerFieldErrorShift: "رقم الشفت يجب أن يكون رقمًا صحيحًا موجبًا.",
    registerFieldErrorPassword: "كلمة المرور يجب أن تكون 8 أحرف على الأقل.",
    forgotTitle: "نسيت كلمة المرور",
    forgotSubtitle: "أدخل بريدك الإلكتروني وسنرسل لك رابط إعادة التعيين.",
    forgotSubmitButton: "إرسال رابط الاستعادة",
    forgotSubmitting: "جارٍ الإرسال...",
    forgotSuccessDefault:
      "إذا كان البريد موجودًا، تم إرسال رابط إعادة التعيين. يرجى التحقق من صندوق الوارد.",
    forgotBackHint: "تتذكر كلمة المرور؟",
    forgotBackAction: "العودة لتسجيل الدخول",
    resetTitle: "إعادة تعيين كلمة المرور",
    resetSubtitle: "أنشئ كلمة مرور جديدة لحسابك.",
    resetNewPasswordLabel: "كلمة المرور الجديدة",
    resetConfirmPasswordLabel: "تأكيد كلمة المرور",
    resetSubmitButton: "تحديث كلمة المرور",
    resetSubmitting: "جارٍ التحديث...",
    resetMissingToken: "رمز إعادة التعيين غير موجود.",
    resetMismatch: "كلمتا المرور غير متطابقتين.",
    resetSuccessDefault: "تم تحديث كلمة المرور بنجاح.",
    resetBackHint: "تريد تسجيل الدخول؟",
    resetBackAction: "العودة لتسجيل الدخول",
    verifyTitle: "تأكيد البريد الإلكتروني",
    verifyLoading: "يرجى الانتظار...",
    verifyMissingToken: "رمز التحقق غير موجود.",
    verifySuccessDefault: "تم تأكيد البريد الإلكتروني بنجاح.",
    verifyErrorDefault: "فشل التحقق",
    verifyBackHint: "تابع إلى حسابك",
    verifyBackAction: "الذهاب لتسجيل الدخول",
  },
};
