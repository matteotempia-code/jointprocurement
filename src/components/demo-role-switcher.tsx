"use client";

import { switchDemoUser } from "@/app/actions";
import { roleNameLabel } from "@/lib/presentation/role";

type DemoUser = { id: string; name: string; assignments: { role: { name: string } }[] };
export function DemoRoleSwitcher({users,currentId}:{users:DemoUser[];currentId:string}) {
  return <form action={switchDemoUser} className="role-switcher"><label htmlFor="demo-user">Persona demo</label><select id="demo-user" name="userId" defaultValue={currentId} onChange={event=>event.currentTarget.form?.requestSubmit()}>{users.map(user=><option value={user.id} key={user.id}>{user.name} · {roleNameLabel(user.assignments[0]?.role.name)}</option>)}</select></form>;
}
