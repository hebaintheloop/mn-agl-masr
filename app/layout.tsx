import type {Metadata} from 'next';
import './globals.css';
export const metadata:Metadata={title:'من أجل مصر · كلية العلوم',description:'الموقع الرسمي لطلاب من أجل مصر بكلية العلوم. شارك في الفعاليات، تطوع، واصنع أثرًا.'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="ar" dir="rtl" suppressHydrationWarning><head><link rel="stylesheet" href="/assets/fonts.css"/><script dangerouslySetInnerHTML={{__html:`try{document.documentElement.dataset.theme=localStorage.getItem('mam-theme')||(matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light')}catch{}`}}/></head><body>{children}</body></html>}
