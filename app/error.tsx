'use client';
export default function ErrorPage({reset}:{reset:()=>void}){return <main className="app-container narrow"><h1>تعذّر تحميل الصفحة</h1><p className="muted">حاول مرة أخرى. لن نعرض تأكيد حفظ إلا بعد إتمام العملية.</p><button className="primary" onClick={reset}>حاول مجددًا</button></main>}
