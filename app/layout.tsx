import './globals.css'

// O <html> e o <body> vivem em app/[locale]/layout.tsx, porque o atributo
// lang precisa variar por idioma. Este layout existe só porque o Next
// exige um root layout.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children
}
