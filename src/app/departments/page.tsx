import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { DepartmentClient } from "./client";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { handoffService } from "@/services/handoff.service";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Департаменты | ДЖАРВИС",
  description: "Управление департаментами и передачей задач.",
};

export default async function DepartmentsPage() {
  const departments = await db.department.findMany({
    orderBy: { createdAt: "desc" },
  });

  const activeHandoffs = await handoffService.listActiveHandoffs();

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Департаменты</h2>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4 bg-zinc-950 border-cyan-400/20">
          <CardHeader>
            <CardTitle>Список Департаментов</CardTitle>
            <CardDescription>
              Существующие отделы для группировки специализированных агентов.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <DepartmentClient />
            {departments.length === 0 ? (
              <div className="text-zinc-500 py-4 text-center">Нет созданных департаментов.</div>
            ) : (
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                {departments.map((dept) => (
                  <div key={dept.id} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 relative overflow-hidden">
                    {dept.color && (
                      <div className="absolute top-0 left-0 w-1 h-full" style={{ backgroundColor: dept.color }} />
                    )}
                    <h3 className="font-semibold text-zinc-100">{dept.name}</h3>
                    <p className="text-xs text-zinc-500 font-mono mt-1 mb-2">Key: {dept.key}</p>
                    <p className="text-sm text-zinc-400">{dept.description || "Нет описания"}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-3 bg-zinc-950 border-cyan-400/20">
          <CardHeader>
            <CardTitle>Активные Передачи (Handoffs)</CardTitle>
            <CardDescription>Задачи в процессе передачи между департаментами.</CardDescription>
          </CardHeader>
          <CardContent>
            {activeHandoffs.length === 0 ? (
              <div className="text-zinc-500 py-4 text-center">Нет активных передач.</div>
            ) : (
              <div className="space-y-4">
                {activeHandoffs.map((handoff) => (
                  <div key={handoff.id} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-mono text-cyan-400 bg-cyan-400/10 px-2 py-0.5 rounded-full">
                        {handoff.status}
                      </span>
                      <span className="text-xs text-zinc-500">
                        {new Date(handoff.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-zinc-300">
                      <span className="font-medium text-white">{handoff.fromDepartment}</span>
                      <span className="text-zinc-600">→</span>
                      <span className="font-medium text-white">{handoff.toDepartment}</span>
                    </div>
                    <p className="text-xs text-zinc-500 mt-2">Trigger: {handoff.triggerEvent}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
