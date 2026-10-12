export const portal = "staff" as const;
export const basePath=(process.env.NEXT_PUBLIC_BASE_PATH??"").replace(/\/$/,"");
export function supportsPush(){return typeof window!=="undefined"&&"serviceWorker" in navigator&&"PushManager" in window&&"Notification" in window;}
export function applicationKey(value:string){const b=atob(value.replace(/-/g,"+").replace(/_/g,"/").padEnd(Math.ceil(value.length/4)*4,"="));return Uint8Array.from(b,c=>c.charCodeAt(0));}
export function registerWorker(){return navigator.serviceWorker.register(`${basePath}/ess-sw.js`,{scope:`${basePath}/`});}

export const hiddenPreferenceTypes:string[]=[];
