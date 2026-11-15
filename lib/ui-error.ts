export function uiError(message: unknown): string {
  if (typeof message !== "string" || !message) return "حصلت مشكلة. جرّب تاني.";
  if (/[\u0600-\u06ff]/.test(message)) return message;
  if (/Check your student code and password/i.test(message))
    return "راجع كود الطالب وكلمة المرور.";
  if (/Check your details/i.test(message))
    return "راجع البيانات. كلمة المرور 12 حرف على الأقل، والرقم القومي 14 رقم. لو الكود متسجل، جرّب تسجّل دخولك.";
  if (/Please wait/i.test(message)) return "استنّى شوية وجرّب تاني.";
  if (/Login required/i.test(message)) return "سجّل دخولك الأول.";
  if (/Register for this event first/i.test(message))
    return "أكد مشاركتك في الفعالية الأول، وبعدين امسح الرمز.";
  if (/Attendance is not open/i.test(message))
    return "تسجيل الحضور مش مفتوح دلوقتي. بيبدأ قبل الفعالية بساعة وبيقف بعدها بساعة.";
  if (/Invalid QR|Invalid attendance code/i.test(message))
    return "ده مش رمز حضور الفعالية. امسح الرمز من جوّه التطبيق.";
  if (/Event not found/i.test(message)) return "الفعالية مش موجودة.";
  if (/Forbidden/i.test(message)) return "الخطوة دي للقادة بس.";
  if (/Only phone number and email/i.test(message))
    return "تقدر تغيّر رقم الموبايل والإيميل بس.";
  if (/valid phone number/i.test(message)) return "راجع رقم الموبايل.";
  if (/valid email/i.test(message)) return "راجع الإيميل.";
  if (/fetch|network|connection/i.test(message))
    return "مش قادرين نتصل دلوقتي. جرّب تاني.";
  if (/invalid|expected|too small|too big|at least|characters/i.test(message))
    return "راجع البيانات المكتوبة وجرّب تاني.";
  return "حصلت مشكلة. جرّب تاني.";
}
