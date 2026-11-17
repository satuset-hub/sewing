import { PageHeader } from "@/components/shared/page-header"; import { Card,CardContent } from "@/components/ui/card"; import { ThemeForm } from "@/components/admin/theme-form";
export default function AddTheme(){return <><PageHeader eyebrow="Tema kelas" title="Tambah tema baru"/><Card className="max-w-3xl"><CardContent className="p-6"><ThemeForm/></CardContent></Card></>}
