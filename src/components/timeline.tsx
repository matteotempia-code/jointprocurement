import { formatDate } from "@/lib/pricing";
export function Timeline({events}:{events:{id:string;action:string;createdAt:Date;actor?:{name:string}|null;metadata:unknown}[]}){return <ol className="timeline">{events.map(e=><li key={e.id}><i/><div><strong>{e.action.replaceAll("_"," ")}</strong><span>{formatDate(e.createdAt)} · {e.actor?.name??"System"}</span></div></li>)}</ol>}
