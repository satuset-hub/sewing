import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";
export function Card({className,...props}:HTMLAttributes<HTMLDivElement>){return <div className={cn("rounded-3xl border bg-white soft-shadow",className)} {...props}/>}
export function CardHeader({className,...props}:HTMLAttributes<HTMLDivElement>){return <div className={cn("p-6 pb-3",className)} {...props}/>}
export function CardTitle({className,...props}:HTMLAttributes<HTMLHeadingElement>){return <h3 className={cn("font-serif text-xl font-bold",className)} {...props}/>}
export function CardContent({className,...props}:HTMLAttributes<HTMLDivElement>){return <div className={cn("p-6 pt-3",className)} {...props}/>}
